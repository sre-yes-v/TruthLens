# API Integration

How the frontend talks to the FastAPI backend — and where to edit when the backend changes.

---

## 1. Why there is an "API layer" at all

The naive way is to call `fetch` in the component that needs data:

```tsx
// DON'T
const res = await fetch("http://localhost:8000/api/v1/reports/" + id);
const data = await res.json();
```

Five problems, every time you write it:

1. The URL is hardcoded, so deploying means editing components.
2. `res.ok` is not checked — a 404 becomes a crash inside the render.
3. `data` is `any`, so a typo in a field name fails at runtime, not compile time.
4. A network failure throws a different error type than a 422 does.
5. There is no way to run the app without a backend.

The API layer fixes all five once, so no component ever has to.

---

## 2. The four files

```
src/lib/api/
├── client.ts     transport — URLs, fetch, error normalisation
├── services.ts   the 8 SRS endpoints, one function each
├── mappers.ts    raw JSON → typed Report
├── contract.ts   the interface both real and mock implement
└── index.ts      the real-vs-mock switch          ← the only place that chooses
```

Read them in that order and the whole layer takes about ten minutes.

### `client.ts` — transport

Builds URLs and normalises errors:

```ts
export function apiUrl(path: string): string {
  return `${env.apiBaseUrl}${API_VERSION_PREFIX}${path}`;
  //      http://localhost:8000   /api/v1        /upload
}
```

The `/api/v1` prefix lives here, not in the environment variable, so `NEXT_PUBLIC_API_BASE_URL` stays a plain host and bumping to v2 is a code change (which it should be — v2 is not a deployment detail).

### `services.ts` — the endpoints

One function per SRS endpoint. All eight, no more:

| SRS §9.1–9.2 | Function |
|---|---|
| `POST /api/v1/upload` | `uploadImage(file)` |
| `GET /api/v1/analyze/stream/{session_id}` | `openAnalysisStream(sessionId, handlers)` |
| `GET /api/v1/analyze/status/{session_id}` | `getAnalysisStatus(sessionId)` |
| `GET /api/v1/reports/{report_id}` | `getReport(reportId)` |
| `GET /api/v1/reports/{report_id}/download` | `downloadReport(reportId, format)` |
| `POST /api/v1/sanitize/{session_id}` | `sanitizeImage(sessionId)` |
| `GET /api/v1/sanitize/{session_id}/download` | `downloadSanitizedImage(sessionId)` |
| `DELETE /api/v1/sessions/{session_id}` | `deleteSession(sessionId)` |

No invented endpoints. The admin screen has no SRS endpoint, so `getAdminOverview()` **throws `not_implemented`** in the real client rather than quietly returning fake numbers.

### `mappers.ts` — where uncertainty is quarantined

SRS §9.3 is explicitly an *abbreviated* schema, and the backend doesn't exist yet. So there is real uncertainty about exact field names. The rule:

> **All uncertainty lives in `mappers.ts`. Everything downstream gets a fully typed `Report`.**

```ts
const raw = await apiRequest<unknown>(`/reports/${reportId}`);
return toReport(raw);          // unknown in, Report out
```

`toReport` reads each field defensively, applies SRS-documented defaults when the backend omits something, and never lets an `any` escape:

```ts
// FR-9.3's band boundaries, re-applied when the backend omits risk_level
risk_level: oneOf(raw.risk_level, RISK_LEVELS, riskLevelFromScore(authenticity)),
```

Note it re-applies *documented rules*, it does not invent them. `sufficient_evidence` defaults by re-checking FR-8.7's actual condition (is there a plate, STD code, or place name at ≥50% confidence?) rather than guessing `true`.

---

## 3. One error type for the whole app

SRS §9.4 fixes the error body:

```json
{ "error_code": "string", "message": "string", "session_id": "string|null" }
```

`client.ts` converts **everything** into that shape plus an HTTP status — a 422, a 500, an HTML error page from a proxy, a dropped connection, an offline browser. Failures that never reached the backend get a client-side code (`network_error`, `stream_disconnected`, `request_aborted`, `not_implemented`), so you can always tell whose fault it was.

The result: components never write `catch (e: any)`, and the UI branches on a stable machine value:

```ts
if (isExpiredError(error)) router.replace(routes.expired());   // 404 / 410
if (isSanitizeConflict(error)) showTheFR57Explanation();       // 409
```

`describeError()` in `lib/utils/errors.ts` turns a code into a title and a sentence a non-technical user can act on. Unknown codes fall back to the backend's own `message`, which SRS §9.4 requires to be human-readable — so a user never sees a raw code.

---

## 4. Mock mode

```
NEXT_PUBLIC_USE_MOCK_API=true
```

`lib/api/index.ts` is the entire switch:

```ts
export const api: TruthLensApi = env.useMockApi ? mockApi : realApi;
```

Both sides implement `TruthLensApi`, so **TypeScript guarantees the mock cannot drift out of sync** — change a signature and both implementations fail to compile.

The mock does more than return data; it reproduces the *behaviour* the UI has to handle: a 409 on sanitizing an unknown session, a 404 on a missing report, and realistic latency so loading states are visible. `src/mocks/` is never imported by `services.ts`.

---

## 5. Connecting the real backend

1. Set `NEXT_PUBLIC_API_BASE_URL` to the FastAPI host and `NEXT_PUBLIC_USE_MOCK_API=false`.
2. Enable CORS on FastAPI for the frontend origin — **including the SSE route**, which browsers treat as a cross-origin request like any other:

   ```python
   from fastapi.middleware.cors import CORSMiddleware
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000"],
       allow_methods=["GET", "POST", "DELETE"],
       allow_headers=["*"],
   )
   ```
3. Check these, which the frontend assumes and the SRS does not fully pin down:
   - the upload field is named `file` (`services.ts` → `formData.append("file", file)`);
   - the SSE endpoint sends **named** events (`event: metadata_done`), not anonymous `data:` lines;
   - `report_ready`'s payload contains `report_id`;
   - `/reports/{id}/download` accepts `?format=pdf|json`.
4. Do not let the backend send `Content-Type` for the upload — the browser sets the multipart boundary itself, and `client.ts` deliberately omits the header for that reason.

---

## 6. Where to edit when things change

| Backend change | File |
|---|---|
| Host, port, protocol | `.env.local` |
| API version `/api/v1` → `/api/v2` | `lib/api/client.ts` (`API_VERSION_PREFIX`) |
| An endpoint path or method | `lib/api/services.ts` |
| A report field name | `lib/api/mappers.ts`, then `types/report.ts` |
| A new field appears | `types/report.ts` first, then `mappers.ts` |
| A new SSE event | `types/analysis.ts` + `lib/constants/analysis.ts` |
| A new error code needing custom copy | `lib/utils/errors.ts` (`describeError`) |
| Admin API becomes real | `lib/api/services.ts` (`getAdminOverview`) — nothing else |

Notice that no row says "and then update the components".
