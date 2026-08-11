# Frontend Architecture

This explains **why the frontend is shaped the way it is**. If you only read one document before your viva, read this one.

---

## 1. The one-sentence version

The TruthLens frontend is a Next.js App Router application where **routes are thin**, **logic lives in hooks**, **network access lives in one API layer**, and **the report is built from small independent sections** — so that when the FastAPI backend changes, only one or two files change with it.

---

## 2. Where everything lives, and why

```
src/
├── app/          ROUTES        — what URL shows what. Almost no logic.
├── components/   UI            — what things look like.
├── hooks/        BEHAVIOUR     — what happens over time.
├── lib/          PLUMBING      — network, validation, formatting, constants.
├── types/        CONTRACTS     — the shape of backend data.
├── config/       ENVIRONMENT   — values that change per deployment.
└── mocks/        FAKE DATA     — for developing without a backend.
```

Each folder answers a different question, and that is the test for whether a new file belongs in it.

### `app/` — routes

Six routes, and each page file is under 25 lines. A page's whole job is to unwrap the URL parameter and render a component:

```tsx
// src/app/report/[reportId]/page.tsx — the entire file, essentially
export default async function ReportPage({ params }) {
  const { reportId } = await params;   // Next.js 16: params is a Promise
  return <ReportView reportId={reportId} />;
}
```

**Why keep pages thin?** A page is tied to a URL and cannot be reused or tested in isolation. Everything worth reusing or testing goes into a component or a hook, which can. It also keeps the Server/Client boundary obvious: the page stays a Server Component, and only the interactive view below it ships JavaScript.

### `components/` — one job per component

Split into `ui/` (generic — a Button knows nothing about forensics) and feature folders (`upload/`, `analysis/`, `report/`, `sanitize/`, `admin/`).

The rule that keeps report components small: **each section receives only its own slice of the report.**

```tsx
<MetadataSection metadata={report.metadata} />   // not: report={report}
```

`MetadataSection` cannot accidentally depend on the AI score, so changing the AI section cannot break it.

### `hooks/` — behaviour over time

Anything with a lifecycle: `useImageUpload`, `useAnalysisStream`, `useReport`, `useSanitize`, `useToast`.

**Why separate these from components?** A component describes one moment — what the screen looks like right now. A hook describes a sequence — pick a file, validate it, upload it, navigate. Mixing them produces components where the JSX is buried under `useEffect`s. Separated, `app/page.tsx` reads like a description of the screen, and `useImageUpload.ts` reads like a description of the flow.

### `lib/` — plumbing

`api/` (network), `sse/` (the event stream), `validation/`, `utils/`, `constants/`. None of it imports React; all of it is plain TypeScript you could call from a test with no browser.

### `types/` — the contract with the backend

`report.ts` is the important one: it is the single description of what a forensic report looks like. If FastAPI renames a field, TypeScript points at every place that breaks.

---

## 3. How data flows, end to end

```
   ┌─────────┐   File
   │    /    │──────────► useImageUpload ──► api.uploadImage() ──► POST /api/v1/upload
   └─────────┘                                                            │
                                                                   session_id
                                                                          │
                                                                          ▼
   ┌────────────────────┐                                    router.push(/analyze/{id})
   │ /analyze/[session] │◄───────────────────────────────────────────────┘
   └────────────────────┘
            │
            ├─► useAnalysisStream ──► EventSource  GET /api/v1/analyze/stream/{id}
            │        │                     │
            │        │              (stream drops)
            │        │                     ▼
            │        └──────────────► poll GET /api/v1/analyze/status/{id} every 3s
            │
            └─► report_ready { report_id } ──► router.replace(/report/{report_id})
                                                          │
                                                          ▼
   ┌───────────────────┐                        useReport ──► GET /api/v1/reports/{id}
   │ /report/[reportId]│◄──────────────────────────────────────────┘
   └───────────────────┘                              │
            │                                    toReport(raw)  ← all uncertainty lives here
            │                                         │
            │                                    typed Report
            │                                         │
            │        ┌────────────────────────────────┴──────────────────────┐
            │        ▼           ▼            ▼           ▼          ▼       ▼
            │   ScoreSummary  Metadata  OCR  Privacy  Forensics  AI  Regional  Recommendations
            │
            └─► "Sanitize image" ──► /sanitize/{session}?report={reportId}
                                              │
                                       useSanitize ──► POST /api/v1/sanitize/{session}
```

**The thing to notice:** each arrow crosses exactly one boundary. The page never calls `fetch`. The component never parses JSON. The hook never builds a URL. If a bug appears, the layer it lives in is obvious.

---

## 4. Server Components vs Client Components

Next.js App Router renders on the server by default. A file needs `"use client"` only when it uses state, effects, or browser APIs.

| File | Kind | Why |
|---|---|---|
| `app/layout.tsx` | Server | Just structure |
| `app/report/[reportId]/page.tsx` | Server | Just unwraps `params` |
| `components/report/ReportView.tsx` | **Client** | Fetches, holds state |
| `components/ui/Card.tsx` | Server | Pure markup |
| `components/ui/Modal.tsx` | **Client** | Keyboard handling, focus |

**Why it matters:** Server Components send zero JavaScript to the browser. `Card`, `KeyValueList`, `FindingList` and most report sections are static markup, so they cost nothing at runtime. Marking everything `"use client"` would work, but would ship the whole app as JavaScript for no benefit.

---

## 5. Styling

Tailwind CSS v4, which is **CSS-first** — there is no `tailwind.config.js`. Every design token is declared in `src/app/globals.css`:

```css
@theme {
  --color-blue: #1877f2;
  --color-page: #f0f2f5;
  --radius-card: 10px;
  --shadow-card: 0 1px 2px rgb(0 0 0 / .1), 0 0 0 1px rgb(0 0 0 / .03);
}
```

Tailwind turns those into `bg-blue`, `bg-page`, `rounded-card`, `shadow-card` automatically. The values are copied from the prototype's `:root` block, so the implementation is verifiably the same design — you can diff them.

**One trap worth knowing.** `cn()` joins class names; it does not *merge* them. If a component already sets `inline-flex` and you pass `className="hidden"`, which one wins is decided by their order in Tailwind's generated stylesheet, not by your `className` string. This actually bit the header (both buttons stayed visible and the page scrolled sideways on mobile). The fix is to change the structure, not to layer another utility on top. See the comment in `src/lib/utils/cn.ts`.

---

## 6. What this architecture buys you

| If this changes… | You edit… |
|---|---|
| Backend URL / port | `.env.local` |
| A report field is renamed | `types/report.ts` + `lib/api/mappers.ts` |
| An endpoint path changes | `lib/api/services.ts` |
| A new SSE event is added | `lib/constants/analysis.ts` |
| The disclaimer wording | `config/site.ts` |
| The brand colour | `app/globals.css` |
| How OCR findings look | `components/report/OCRSection.tsx` |
| Backend goes live | `NEXT_PUBLIC_USE_MOCK_API=false` |

Every row is one or two files. That is the measure of whether the separation was worth it.

---

## 7. What was deliberately NOT done

- **No Redux / Zustand / MobX.** See `state-management.md`.
- **No React Query / SWR.** Each screen fetches one thing, once. There is nothing to cache or invalidate.
- **No component library.** The prototype has a specific visual language; adopting Material or shadcn would mean fighting it.
- **No `tailwind-merge` / `clsx`.** Not needed once components don't take conflicting utilities.
- **No barrel `index.ts` files.** Direct imports keep "where does this come from?" answerable by reading the import.
- **No test framework yet.** Honest gap — see `implementation-notes.md`.

The dependency list is `next`, `react`, `react-dom`, `lucide-react`. That is the whole runtime.
