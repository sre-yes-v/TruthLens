# TruthLens Frontend — Implementation Plan

**Phase 1 deliverable.** Written before any implementation code, from two sources:

- `docs/truthlens_prototype.html` — source of truth for **visual design and UX**
- `docs/TruthLens_SRS-final.docx` — source of truth for **functional behaviour and the API contract**

---

## 1. Current repository analysis

```
TruthLens/
├── README.md            (1 line, placeholder)
├── backend/             (empty — FastAPI not started yet)
├── docs/
│   ├── truthlens_prototype.html
│   └── TruthLens_SRS-final.docx
└── frontend/truthlens/  (a fresh create-next-app scaffold)
```

### What already exists

| Item | Value | Consequence for the plan |
|---|---|---|
| Next.js | **16.2.10** | `params` in pages is a **Promise** (async request APIs, breaking change in 16). Turbopack is the default bundler. `next lint` is removed — lint via the ESLint CLI, which `package.json` already does. |
| React | **19.2.4** | Fine. Server Components by default; interactive pieces get `"use client"`. |
| Tailwind | **4.3.2** | **No `tailwind.config.js`.** v4 is CSS-first: design tokens are declared with `@theme` inside `globals.css` and become utilities automatically. This is where the prototype's palette will live. |
| TypeScript | 5.x, `strict: true` | Already what we want. No change needed. |
| App Router dir | `app/` at project root | Will move to `src/app/` (see §2). |
| Path alias | `@/*` → `./*` | Will become `@/*` → `./src/*`. |
| Icon library | none installed | Prototype uses hand-written inline SVGs. We add **`lucide-react`** — it is tree-shaken, matches the prototype's 1.8–2px stroke line-icon style, and removes ~40 copy-pasted SVG blobs. |
| `app/page.tsx`, `globals.css` | default Next.js template | Both are replaced wholesale. |
| Dark mode | template ships `prefers-color-scheme: dark` overrides | **Removed.** The prototype has no dark theme; keeping a half-built one would be a visual regression. |
| `AGENTS.md` | "read `node_modules/next/dist/docs/` before writing code" | Followed — the Next 16 upgrade guide drove the async-`params` and Turbopack decisions above. |

### Conclusion

The scaffold is usable as-is. **No re-init, no framework change, no version bumps.** The only dependency added is `lucide-react`; the only config edits are the `tsconfig` path alias (for `src/`) and replacing `globals.css`.

---

## 2. Proposed folder structure

Adopting the structure from the brief, with the deviations noted below.

```
frontend/truthlens/
├── .env.example
├── src/
│   ├── app/                          # routes only — thin, no business logic
│   │   ├── layout.tsx                # <html>, Header, ToastProvider
│   │   ├── page.tsx                  # / — upload
│   │   ├── globals.css               # Tailwind import + @theme design tokens
│   │   ├── analyze/[sessionId]/page.tsx
│   │   ├── report/[reportId]/page.tsx
│   │   ├── sanitize/[sessionId]/page.tsx
│   │   ├── expired/page.tsx
│   │   └── admin/page.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # generic, knows nothing about forensics
│   │   ├── layout/                   # Header, PageContainer, Footer
│   │   ├── upload/  analysis/  report/  sanitize/  admin/  modals/
│   │   └── dev/PrototypeMap.tsx      # reviewer aid, flag-gated
│   │
│   ├── lib/
│   │   ├── api/                      # client.ts, services.ts, index.ts (real/mock seam)
│   │   ├── sse/analysisStream.ts     # EventSource wrapper + polling fallback
│   │   ├── validation/imageValidation.ts
│   │   ├── constants/                # analysis steps, routes, scoring bands
│   │   └── utils/                    # cn, formatters, errors, download, sessionPreview
│   │
│   ├── hooks/                        # useAnalysisStream, useReport, useSanitize, useToast…
│   ├── types/                        # api, analysis, report, sanitize, admin
│   ├── config/                       # env + site config, read from process.env once
│   └── mocks/                        # mock adapter — never imported by lib/api/services.ts
└── …
```

### Deviations from the suggested structure, and why

1. **`src/` prefix added.** Keeps app code separate from the ~10 config files at the project root. Requires the `tsconfig` alias change; Next.js supports `src/app` natively.
2. **`lib/api/` is not one file per endpoint.** The brief suggested `upload.ts`, `analysis.ts`, `reports.ts`, `sanitize.ts`, `admin.ts`. There are only **8 endpoints total**; five files averaging 15 lines each is folder-count theatre. Instead: `client.ts` (transport + error normalisation), `services.ts` (all 8 functions, grouped and commented by area), `index.ts` (the real-vs-mock switch). One file to open when the backend changes.
3. **No `AnalysisStatus.tsx` / `UploadValidation.tsx` components.** Validation is a pure function (`lib/validation`), not a component; analysis status is two lines of text inside `AnalysisProgress`. Wrapping them would be abstraction without a reason.
4. **`components/dev/PrototypeMap.tsx`** added — the prototype's reviewer aid, rendered only when `NEXT_PUBLIC_ENABLE_PROTOTYPE_TOOLS=true`.

---

## 3. Route structure

The prototype is a single-page state machine (`go('screen-x')`). That is fine for a click-through demo and wrong for production: no deep links, no browser back, no refresh survival. Mapping to real routes:

| Prototype screen | Route | Why a route |
|---|---|---|
| `screen-landing` | `/` | Entry point. |
| `screen-analyzing` | `/analyze/[sessionId]` | The session ID is real state from the backend; it belongs in the URL so a refresh reconnects the SSE stream instead of losing the analysis. |
| `screen-report` | `/report/[reportId]` | Deep-linkable and shareable; the report outlives the analysis. |
| `screen-sanitize` | `/sanitize/[sessionId]` | Keyed by **session**, matching `POST /api/v1/sanitize/{session_id}`. |
| `screen-expired` | `/expired` | A real destination — the prototype's landing footer links straight to it. |
| `screen-admin` | `/admin` | Separate audience, separate route. |
| `screen-failed` | **no route** — a state of `/analyze/[sessionId]` | A failed pipeline *is* the outcome of that session. A separate URL would have no session context and would be reachable when nothing had failed. |

**Six routes, not seven.** Two small connective decisions:

- `/sanitize/[sessionId]?report=<reportId>` — the back-to-report link needs a report ID, and the sanitize endpoint is keyed by session. A query param carries it without inventing a second dynamic segment.
- Because Next 16 makes `params` a Promise, every dynamic page is `async` and does `const { sessionId } = await params`.

### Navigation flow

```
  /  ──POST /api/v1/upload──▶  /analyze/{session_id}
                                     │  SSE report_ready → report_id
                                     ├──▶ /report/{report_id} ──▶ /sanitize/{session_id}?report=…
                                     └──▶ failed state (in place, no navigation)

  /report/{id} → report gone (404/410) ──▶ /expired
```

---

## 4. Component map

`Prototype element → component → route`. Generic primitives first; feature components compose them.

### UI primitives (`components/ui/`)

| Prototype CSS | Component | Variants |
|---|---|---|
| `.btn` `.primary` `.ghost` `.danger` `.lg` `.sm` | `Button` | variant × size, `disabled` |
| `.icon-btn` | `IconButton` | — |
| `.card` `.pad` | `Card` | `padded` |
| `.banner .err/.warn/.info/.ok` | `Banner` | 4 tones |
| `.tag`, `.acc-tag`, `.band-*` | `Tag`, `Badge` | tone: low/mod/high/crit/neutral |
| `.progress-line` | `ProgressBar` | — |
| `.ring` + `#ringProg` | `ScoreRing` | animated, respects reduced-motion |
| `.acc` accordion | `Accordion` | `defaultOpen` |
| `.kvlist` | `KeyValueList` | — |
| `ul.findings` | `FindingList` | — |
| `.empty` | `EmptyState` | — |
| `.degraded` | `DegradedNotice` | — |
| `.mini-disc` | `MiniDisclaimer` | — |
| `.overlay` + `.modal` | `Modal` | focus trap, Esc, overlay click |
| `.toast` | `Toast` + `ToastProvider`/`useToast` | — |
| spinner keyframes | `Spinner` | — |
| `.detimg` + `.bbox` + `.redact` | `DetectionImage` | boxes, blurred/redacted |

### Feature components

| Route | Composition |
|---|---|
| `/` | `UploadDropzone` · `SampleImageChips` · `FilePreviewCard` · `ConsentCheckbox` · `DisclaimerStrip` · `LandingFooter` |
| `/analyze/[sessionId]` | `AnalysisHeader` · `AnalysisProgress` · `AnalysisStepper` · `SanitizeLockNote` · `AnalysisFailed` |
| `/report/[reportId]` | `DisclaimerBanner` · `ReportActions` · `ReportMeta` · `ScoreSummary`(`ScoreRing` + `SubScore`×3) · `MetadataSection` · `OCRSection` · `PrivacySection` · `ForensicsSection` · `AIAnalysisSection` · `RegionalEvidenceSection` · `RecommendationsSection` |
| `/sanitize/[sessionId]` | `SanitizeProgress` · `BeforeAfterViewer` · `SanitizationSummary` · `SanitizeActions` |
| `/admin` | `SystemHealth` · `AdminStats` · `EngineFailureList` · `ActivityLog` |
| global | `Header` · `PrivacyModal` · `DownloadModal` · `PrototypeMap` (flag-gated) |

Every report section takes **typed props for its slice of the report only** — `MetadataSection` receives `MetadataFindings`, not the whole `Report`. Sections stay independently testable and none of them reach into global state.

---

## 5. API map

All eight SRS endpoints, versioned under `/api/v1`. No invented endpoints.

| SRS endpoint | Service function | Used by |
|---|---|---|
| `POST /api/v1/upload` | `uploadImage(file, onProgress?)` | `/` |
| `GET /api/v1/analyze/stream/{session_id}` | `openAnalysisStream(sessionId, handlers)` | `/analyze/[sessionId]` |
| `GET /api/v1/analyze/status/{session_id}` | `getAnalysisStatus(sessionId)` | SSE fallback poll |
| `GET /api/v1/reports/{report_id}` | `getReport(reportId)` | `/report/[reportId]` |
| `GET /api/v1/reports/{report_id}/download` | `downloadReport(reportId, format)` | Download modal |
| `POST /api/v1/sanitize/{session_id}` | `sanitizeImage(sessionId)` | `/sanitize/[sessionId]` |
| `GET /api/v1/sanitize/{session_id}/download` | `downloadSanitizedImage(sessionId)` | `/sanitize/[sessionId]` |
| `DELETE /api/v1/sessions/{session_id}` | `deleteSession(sessionId)` | Privacy modal ("delete the session") |

**Admin has no SRS endpoint.** The prototype shows an admin screen, so the frontend defines the `AdminService` interface and types and is served by the mock adapter only; the real implementation throws a clear "not implemented in the SRS API" error rather than silently faking success.

Error normalisation, in `client.ts`, uses the SRS shape verbatim:

```json
{ "error_code": "string", "message": "string", "session_id": "string|null" }
```

Any non-conforming failure (network down, HTML error page, CORS) is coerced into the same shape with a synthetic `error_code`, so **the UI only ever handles one error type**.

Base URL comes from `NEXT_PUBLIC_API_BASE_URL`, read once in `config/env.ts`. No component ever sees a URL string.

---

## 6. SSE map

Nine SRS events → nine prototype stepper rows. Driven by a typed table, not JSX:

| Step id | Prototype label | Completed by SSE event |
|---|---|---|
| `upload` | Upload received | `upload_received` |
| `metadata` | Reading metadata | `metadata_done` |
| `ocr` | Reading text (OCR) | `ocr_done` |
| `privacy` | Detecting sensitive objects | `privacy_done` |
| `forensics` | Checking for manipulation | `forensics_done` |
| `ai_assessment` | Estimating AI generation | `ai_assessment_done` |
| `regional` | Inferring region | `regional_done` |
| `scoring` | Scoring authenticity | `scoring_done` |
| `report` | Preparing report | `report_ready` |

Plus `error`. Step states: `pending | active | completed | warning | failed` — `warning` is how a **degraded engine** (UC-2 alternate flow / NFR-2.1) renders: amber marker, "unavailable", pipeline continues.

**Why the fallback exists (FR-10.4, UC-3 alternate flow):** `EventSource` is a long-lived HTTP connection. Proxies, corporate networks and mobile hand-offs kill idle connections; the browser retries but can loop. Rather than leaving the user on a frozen stepper, on stream error we close it and poll `GET /analyze/status/{session_id}` every 3 s, which returns `{stage, progress}` — enough to keep the same stepper moving to completion.

```
EventSource ──error──▶ close ──▶ poll status every 3s ──▶ report_ready / failed
```

Both paths feed **one** reducer, so the UI cannot tell them apart. Lives in `lib/sse/analysisStream.ts` + `hooks/useAnalysisStream.ts`, never in a page component.

---

## 7. State map

No Redux, no Zustand, no React Query. What the app actually needs:

| State | Where it lives | Why |
|---|---|---|
| Selected file, preview, validation error, consent | `useImageUpload` (local, `/` only) | Dies with the page; nothing else reads it. |
| `sessionId`, `reportId` | **URL** | Free persistence, deep links, working back button. |
| Stepper state, progress, connection mode | `useAnalysisStream` (local to `/analyze`) | Derived entirely from the event stream. |
| Report data | `useReport` (fetch-on-mount, local) | Read once per route. |
| Sanitize result | `useSanitize` (local) | Read once per route. |
| Toasts | `ToastProvider` context (root layout) | The one genuinely cross-cutting concern — any page can fire one. |
| Image preview across upload → analyze | in-memory `Map` keyed by session id | See the note below. |

**The preview-across-navigation problem.** The prototype shows the uploaded thumbnail on the analysis screen. The SRS defines no endpoint that returns the uploaded image, so the only source is the local `File`. A blob URL in a module-level `Map` carries it across the client-side navigation; a hard refresh loses it and the UI falls back to a neutral placeholder. This is deliberate — the alternative is inventing a backend endpoint. Recorded in `implementation-notes.md`.

---

## 8. Prototype ↔ SRS discrepancies to record

Found while comparing the two, all destined for `docs/implementation-notes.md`:

1. **Image-serving endpoints don't exist.** The prototype renders the uploaded image, an ELA heat map, and before/after sanitize panels. The SRS stores `ela_map_ref` / `sanitized_image_ref` as *references* and lists no endpoint to fetch them. → Types carry optional URL fields; `DetectionImage` renders the prototype's placeholder when absent.
2. **Upload path.** UC-1 says `POST /api/upload`; §9.1 says `POST /api/v1/upload`. → **`/api/v1/upload`** (§9.1 is the API design section and the whole surface is versioned).
3. **Scoring-weights cross-reference.** FR-9.1/9.2 cite "Section 9.7", which in the final document is §6.9. Cosmetic; no frontend impact.
4. **Consent checkbox.** The prototype gates "Analyze image" behind a consent checkbox; NFR-4.4 requires an upfront notice but defines no consent field on the upload request. → Enforced **client-side only**, not sent to the backend.
5. **Admin UI has no API.** As above — mock-only, with a real interface defined.
6. **Report expiry.** The prototype shows "expires in 24h" and an expired screen; the SRS sets 24 h retention (NFR-4.1) but the report response has no expiry field. → Optional `expires_at` in the type; the label is hidden when absent rather than hard-coding "24h".
7. **Download formats.** The prototype's dialog offers PDF and JSON; FR-11.3 mandates both. `GET /reports/{id}/download` takes no documented format parameter. → Sent as `?format=pdf|json`, flagged as needing backend confirmation.

---

## 9. Implementation phases

| Phase | Content | Verified by |
|---|---|---|
| 1 | This document | — |
| 2 | `src/` move, `@theme` tokens, layout, UI primitives, config, types, API client, SSE abstraction | typecheck + lint + `/` renders |
| 3 | Upload flow | manual: drop, pick, oversize, wrong type, consent gate |
| 4 | Analysis flow: stepper, SSE hook, polling fallback, failure | mock stream drives all 9 steps + degraded + failed |
| 5 | Report UI, all 7 sections | all four mock cases render |
| 6 | Sanitization flow | loading → before/after → summary → download |
| 7 | Edge cases: expired, degraded, empty, 409, network failure | each reachable via the prototype map |
| 8 | Admin page + adapter interface | `/admin` matches prototype |
| 9 | Documentation set, README, `.env.example` | — |

After every phase: `npx tsc --noEmit`, `npm run lint`, `npm run dev`, check the route at desktop **and** mobile width, check the browser console. Errors are fixed before the next phase starts.

---

## 10. Guardrails held throughout

- Prototype governs pixels; SRS governs behaviour; disagreements are documented, never silently resolved.
- No invented endpoints, no invented features.
- No fake binary "real/fake" verdict — probabilistic framing only (FR-7.6, FR-9.6).
- The disclaimer stays prominent (FR-11.5).
- Mock data never imported by production API code.
- The prototype map ships disabled.
- No `any` in report data.
