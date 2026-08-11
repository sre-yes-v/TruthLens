# Implementation Notes

Every place where the prototype and the SRS disagreed, where the SRS was silent, or where a deliberate deviation was made — with the reasoning.

This is the honest-limitations document. **Read it before your viva**; these are exactly the questions an examiner asks.

---

## A. Prototype ↔ SRS discrepancies

### A1. No endpoint serves the analysed image *(highest impact)*

**Prototype:** renders the uploaded image on the analysis screen, with detection boxes in the OCR and privacy sections, an ELA heat map, and before/after sanitization panels.

**SRS:** §8.1 stores `ela_map_ref` and `sanitized_image_ref` and §8.2 says binary artifacts live "on disk/object storage… referenced by path/URL". §9.1 lists **no endpoint that returns an image**, only the sanitized-image *download*. NFR-3.3 requires uploads to be stored under non-guessable names, isolated from any directly served path.

**Resolution.** Image URLs are optional throughout: `Report.image_url`, `ForensicFindings.ela_map_url`, `SanitizeResult.original_image_url` / `sanitized_image_url`. `DetectionImage` renders the prototype's gradient placeholder when a URL is absent, **and still draws the bounding boxes** — their coordinates come from the report and are meaningful on their own. The ELA section shows an explicit note rather than a dead download link.

**If the backend adds image endpoints:** populate those fields in `lib/api/mappers.ts`. No component changes.

### A2. Upload path — `/api/upload` vs `/api/v1/upload`

UC-1 step 4 says `POST /api/upload`; §9.1 says `POST /api/v1/upload`. **Using `/api/v1/upload`** — §9.1 is the API design section and §9 states the whole surface is versioned.

### A3. Recommendations: strings or objects?

§9.3 types `recommendations` as `[ "string" ]`. The prototype colours each one by severity (red action / blue info / green ok).

**Resolution.** `Recommendation` carries a severity, and `mappers.ts` accepts **both**: an object keeps its severity, a bare string defaults to `"info"` — the neutral tone, so a minimal backend never makes the report look more alarming than the evidence warrants.

### A4. Consent checkbox is client-side only

The prototype gates "Analyze image" behind a consent checkbox. NFR-4.4 requires an upfront notice, but §9.1 defines no consent field on `POST /upload`.

**Resolution.** Enforced in the UI, **not sent to the backend**. It is a UX gate satisfying NFR-4.4's "clear, upfront notice", not a recorded legal consent. If consent must be auditable, the backend needs a field and this must be revisited.

### A5. Report expiry is displayed but not specified

The prototype shows "expires in 24h" and an expired screen. NFR-4.1 sets a 24-hour retention default, but §9.3's response has no expiry field.

**Resolution.** `expires_at` is optional. `formatExpiry()` returns `null` when it is absent or past, and the label is **hidden** rather than hard-coding "24h" — the frontend should not assert a deletion time it cannot verify.

### A6. Download format parameter

FR-11.3 requires both JSON and rendered (PDF/HTML) forms, but §9.1 documents one path with no format parameter.

**Resolution.** Sent as `?format=pdf|json`. **Needs backend confirmation** — if FastAPI uses a different mechanism (an `Accept` header, or two paths), change `services.ts#downloadReport` only.

### A7. Admin screen has no API

The prototype has a full admin screen; UC-7 names the administrator actor. **No admin endpoint exists in §9.**

**Resolution.** The screen is fully built, typed (`types/admin.ts`), and served by the mock adapter. The real `getAdminOverview()` **throws `not_implemented`** with an explanatory message shown in the UI. No fake numbers are ever rendered against a real backend.

### A8. Sample images are mock-only

The prototype's "Or try a sample" chips map to its four mock cases. There are no sample image files in the repository, so against a real backend a chip would have nothing to upload.

**Resolution.** The chips render only when `NEXT_PUBLIC_USE_MOCK_API=true`. To enable them for real: add images to `public/samples/`, fetch one in `SampleImageChips`, and pass the resulting `File` to `onSampleSelected` — the rest of the flow already works.

### A9. Section cross-reference error in the SRS

FR-9.1 and FR-9.2 cite "Section 9.7" for the scoring weights; in the final document that content is §6.9 and §9 is the API design. Cosmetic, no frontend impact. Worth correcting in a future SRS revision.

---

## B. Deliberate deviations from the prototype

| # | Deviation | Reason |
|---|---|---|
| B1 | Real routes instead of one page with `go('screen')` | Deep links, refresh survival, working back button. The prototype's state machine is fine for a click-through, wrong for production. |
| B2 | Lucide line icons instead of emoji (📄🔤🛡️🔍🤖📍) in accordion headers | The tile is styled `bg-blue-tint text-blue`; emoji ignore `color` and render inconsistently across platforms. Every other icon in the prototype is a line icon, so this is *more* consistent with its design language, not less. |
| B3 | Analysis failure renders inside `/analyze/[sessionId]` | A failed pipeline is the outcome of *that session*. A separate route would carry no session context and be reachable when nothing failed. |
| B4 | "View an expired report" removed from the landing footer | A demo affordance, not product UI. Still reachable from the Prototype map. |
| B5 | Header shows "Privacy" instead of "How images are handled" below 640px | The full label made the header 457px wide in a 375px viewport. |
| B6 | Dropzone is a `<label>` + real file input | The prototype's `<div onclick>` is unreachable by keyboard. |
| B7 | No dark mode | The Next.js template shipped `prefers-color-scheme` overrides; the prototype has no dark theme, and a half-built one would be a visual regression. Removed. |
| B8 | Downloads fetched as Blobs, not `<a download>` | Lets us show a loading state and turn a failure into a toast, instead of navigating the user to a raw JSON error page. |
| B9 | Privacy modal offers "Delete this session now" when a session is known | Uses the real `DELETE /api/v1/sessions/{id}` endpoint to honour §11's promise that a user can delete everything before retention expiry. The prototype only *states* this. |

---

## C. Known limitations

### C1. The analysis thumbnail does not survive a page reload

The preview is a blob URL in a module-level `Map` (`lib/utils/sessionPreview.ts`). Module memory survives client-side navigation but not a reload, so refreshing the analysis page replaces the thumbnail with a placeholder. Analysis itself is unaffected.

Direct consequence of A1 — there is no endpoint to re-fetch the image from. **Fix:** if the backend adds an image URL, read it there instead.

### C2. No automated test suite in the repository

Verification was done with a Playwright script (19 route/state checks and 13 accessibility checks, all passing) run from a scratch directory. It is not committed, so there is no `npm test`.

**Honest assessment:** for a single-developer academic project this is a reasonable trade-off given NFR-6.2 targets coverage on the *engine layer*, but it is a real gap. The highest-value tests to add first would be unit tests for `lib/api/mappers.ts` and `lib/validation/imageValidation.ts` — both are pure functions with no React involved.

### C3. `/admin` has no authentication

The SRS lists JWT in its acronyms but defines no admin auth requirement or endpoint. Adding a login would be inventing a feature the specification does not have.

**This must be addressed before any real deployment** — the route is currently open to anyone who knows the URL. It belongs in a future SRS revision.

### C4. Client validation is not a security boundary

`lib/validation/imageValidation.ts` checks MIME type and size for fast feedback only. It can be bypassed from the browser console. The backend must independently enforce FR-1.3 (content vs declared type), FR-1.5 (corrupted files → 422) and NFR-3.2 (magic-byte sniffing). The UI correctly handles a server-side rejection of a file that passed the client check.

### C5. Assumptions about the backend that need confirming

Listed here so they can be checked in one place:

1. The upload form field is named `file`.
2. The SSE stream sends **named** events (`event: metadata_done`), not anonymous `data:` lines.
3. `report_ready`'s payload contains `report_id`.
4. `/reports/{id}/download` accepts `?format=pdf|json`.
5. `/analyze/status/{id}` returns a `stage` matching an event or step name (both spellings are accepted).
6. A degraded engine is signalled by `degraded: true` on the stage event, and by `status` on the report section.

Items 1–4 are single-line changes in `services.ts`; 5–6 are in `lib/constants/analysis.ts` and `mappers.ts`.

### C6. Scoring weights are not shown

FR-9.5 requires the contributing findings **and their respective weights** to be listed. The UI shows the contributing findings (the AI signal list, the evidence chain, the sub-scores) but not numeric weights, because §9.3's response contains no weights field — `authenticity_scores.contributing_weights` exists in the database schema (§8.1) but is not exposed by the API.

**To close this:** add `contributing_weights` to the report response, then render it in `ScoreSummary`. Flagged as a genuine partial gap against FR-9.5.

---

## D. SRS requirements the UI actively enforces

Not just displayed — these are rules the code holds to, and each is worth being able to point at:

| Requirement | Where |
|---|---|
| FR-7.6 — never a binary AI verdict | `AIAnalysisSection` shows probability + confidence + signals; asserted by the browser test |
| FR-8.7 — no region without medium+ evidence | `RegionalEvidenceSection` shows "insufficient evidence"; `mappers.ts` re-derives sufficiency when the backend omits it |
| FR-8.8 — regional inference is not GPS | caveat renders unconditionally |
| FR-9.6 / FR-11.5 — disclaimer prominent | first element of `ReportHeader`, non-dismissible, inside the sticky region; also on the landing page |
| FR-5.7 — no sanitizing before the report | 409 handled with the actual reason; no retry button, because retrying cannot help |
| NFR-2.1 — degraded ≠ empty | `EngineStatus` per section; amber `DegradedNotice` vs grey `EmptyState` |
| FR-2.8 — absent metadata is a finding | `metadata_present` flag, surfaced as "Metadata stripped" |
| FR-3.10 — low-confidence findings annotated | shown with an explicit "(low confidence, 58%)" note |
| NFR-7.2 — every score gets a sentence | `ScoreSummary`'s `describe*` helpers |
| FR-10.4 — polling fallback | implemented, not a TODO; visible to the user when it engages |
| FR-10.5 — 120s pipeline deadline | hard timeout in `useAnalysisStream` |
