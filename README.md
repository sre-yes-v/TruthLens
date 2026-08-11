# TruthLens

**AI-Powered Image Forensics, Privacy Analysis and Authenticity Assessment System**

BCA final-year project. TruthLens accepts an uploaded image and returns a structured forensic report: what the image reveals about you, whether it shows signs of editing, how likely it is to be AI-generated, and — from visible clues only — which Kerala region it probably comes from. It then offers a one-click sanitized copy with metadata stripped and sensitive regions blurred.

> TruthLens produces **probabilistic, evidence-based assessments — not legal verdicts** of authenticity.

---

## Repository layout

```
TruthLens/
├── frontend/truthlens/    Next.js frontend  ← implemented
├── backend/               FastAPI backend   ← not started
└── docs/                  SRS, prototype, and architecture documentation
```

---

## What is built

The **frontend is complete** and runs end to end against mock data. The FastAPI backend does not exist yet; the frontend is written to connect to it without a rewrite.

| Flow | Route | Status |
|---|---|---|
| Upload & validation | `/` | ✅ |
| Live analysis (SSE + polling fallback) | `/analyze/[sessionId]` | ✅ |
| Forensic report | `/report/[reportId]` | ✅ |
| Sanitization | `/sanitize/[sessionId]` | ✅ |
| Report expired | `/expired` | ✅ |
| Admin monitoring | `/admin` | ✅ UI (no SRS endpoint — mock only) |

---

## Requirements

- **Node.js 20.9+** (Next.js 16 minimum; Node 18 is unsupported)
- npm 10+

---

## Installation

```bash
cd frontend/truthlens
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

To see the whole application without a backend, set `NEXT_PUBLIC_USE_MOCK_API=true` in `.env.local` first.

---

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | FastAPI host, **without** `/api/v1`, no trailing slash |
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | `true` serves all data from `src/mocks/` |
| `NEXT_PUBLIC_ENABLE_PROTOTYPE_TOOLS` | `false` | shows the Prototype map reviewer panel |

`NEXT_PUBLIC_*` values are compiled into the browser bundle — **never put a secret in one**. `.env.local` is git-ignored; `.env.example` is the committed reference. Restart the dev server after changing them.

---

## Commands

```bash
npm run dev          # dev server (Turbopack), hot reload
npm run build        # production build + full TypeScript check
npm start            # serve the production build
npm run lint         # ESLint
npx tsc --noEmit     # typecheck only
```

---

## Mock mode

```env
NEXT_PUBLIC_USE_MOCK_API=true
```

Runs the entire frontend against in-memory sample data — no backend, no network. Four sample reports cover the outcomes the UI must handle:

| Sample | Demonstrates |
|---|---|
| Street photo with ID card | Critical privacy risk, strong Kerala regional evidence |
| Landscape photo | Likely authentic, empty findings, insufficient regional evidence |
| Possibly AI-generated | High AI probability, metadata stripped |
| Low-quality scan | A **degraded engine** — pipeline completes with OCR unavailable |

The mock also reproduces backend *behaviour*: a 409 when sanitizing an incomplete session, a 404 for a missing report, and realistic latency so loading states are visible.

Mock code lives in `src/mocks/` and is **never** imported by the real API layer. The switch is one line in `src/lib/api/index.ts`.

---

## Architecture overview

```
src/
├── app/          routes — thin; unwrap the URL and render a component
├── components/   ui/ (generic) + upload/ analysis/ report/ sanitize/ admin/
├── hooks/        behaviour over time (upload, SSE stream, report, sanitize, toast)
├── lib/          api/ sse/ validation/ utils/ constants/
├── types/        the contract with the backend
├── config/       environment + product copy
└── mocks/        sample data, kept separate from production code
```

Principles: pages hold no logic; components receive typed props for their own slice only; all network access goes through one API layer; all uncertainty about the backend's response shape is quarantined in `lib/api/mappers.ts`.

Built with Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, and `lucide-react`. That is the entire dependency list — no state-management library, no data-fetching library, no component library.

---

## Connecting the FastAPI backend

1. Start FastAPI on port 8000.
2. Set `NEXT_PUBLIC_USE_MOCK_API=false` and `NEXT_PUBLIC_API_BASE_URL` to its host.
3. Enable CORS for the frontend origin, **including the SSE route**:

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)
```

The frontend calls exactly the eight endpoints in SRS §9.1–9.2 and invents none. Full details, plus the assumptions to verify, are in [docs/api-integration.md](docs/api-integration.md).

---

## Documentation

| Document | What it covers |
|---|---|
| [frontend-architecture.md](docs/frontend-architecture.md) | Why the folders exist, how data flows, what was deliberately not done |
| [api-integration.md](docs/api-integration.md) | The API layer, error handling, mock switch, where to edit when the backend changes |
| [component-architecture.md](docs/component-architecture.md) | Component split, the report's seven sections, responsive and accessibility work |
| [state-management.md](docs/state-management.md) | Where each piece of state lives, and why there is no Redux |
| [sse-flow.md](docs/sse-flow.md) | Server-Sent Events, and why the polling fallback is required |
| [development-guide.md](docs/development-guide.md) | Running, common tasks, and the things that will trip you up |
| [implementation-notes.md](docs/implementation-notes.md) | Prototype ↔ SRS discrepancies, deliberate deviations, **known limitations** |
| [implementation-plan.md](docs/implementation-plan.md) | The Phase 1 analysis this implementation was built from |

Source material: `docs/truthlens_prototype.html` (visual source of truth) and `docs/TruthLens_SRS-final.docx` (functional source of truth).

---

## Verification status

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm run build` | succeeds, 7 routes |
| Browser checks (all routes, 4 report variants, failure paths, 1280px + 375px) | 19/19 pass |
| Accessibility checks (focus trap, ARIA, live regions, labels) | 13/13 pass |
| Console errors | none |

Known gaps are listed honestly in [implementation-notes.md](docs/implementation-notes.md) §C — most importantly: no committed automated test suite, no auth on `/admin`, and no backend endpoint serving the analysed image.
