# Development Guide

How to run, develop, and extend the TruthLens frontend.

---

## 1. Requirements

| Tool | Version | Why |
|---|---|---|
| Node.js | **20.9+** | Next.js 16's minimum; Node 18 is unsupported |
| npm | 10+ | ships with Node 20 |

Check with `node -v`.

---

## 2. First run (no backend needed)

```bash
cd frontend/truthlens
npm install
cp .env.example .env.local
```

Then edit `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_ENABLE_PROTOTYPE_TOOLS=true
```

```bash
npm run dev
```

Open <http://localhost:3000>. With mock mode on, the whole application works end to end against sample data — upload, live progress, all four report variants, sanitization, admin.

> **Restart after editing `.env.local`.** `NEXT_PUBLIC_*` values are compiled into the bundle at build time, so hot reload does not pick them up.

---

## 3. Commands

| Command | What it does |
|---|---|
| `npm run dev` | dev server with hot reload (Turbopack) |
| `npm run build` | production build — also runs a full TypeScript check |
| `npm start` | serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | typecheck only, faster than a build |

Run `npx tsc --noEmit && npm run lint` before every commit. Both are currently clean.

---

## 4. The environment variables

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | FastAPI host, **without** `/api/v1`, no trailing slash |
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | `true` serves everything from `src/mocks/` |
| `NEXT_PUBLIC_ENABLE_PROTOTYPE_TOOLS` | `false` | shows the Prototype map reviewer panel |

**`NEXT_PUBLIC_` means public.** These are inlined into the JavaScript bundle and visible to anyone using the site. Never put a secret in one. `.env.local` is git-ignored; `.env.example` is committed as the documented list.

---

## 5. The Prototype map

With `NEXT_PUBLIC_ENABLE_PROTOTYPE_TOOLS=true`, a floating panel appears bottom-right that jumps straight to any UI state:

- all four report variants (safe / privacy-critical / AI-generated / degraded engine)
- analysis running, analysis degraded, analysis failed
- sanitize with regions, sanitize with nothing to blur
- report expired, report 404, sanitize 409, admin

It links to **real routes with real ids** — it does not fake states, so what you see is the actual application.

Ported from the prototype, which labels it *"Reviewer aid — not part of the product UI"*. It is off by default and returns `null` unless the flag is set, so it cannot ship to users by accident. **Turn it on for your viva** — you can demonstrate every edge case without staging the conditions that produce it.

---

## 6. Connecting the real backend

1. Start FastAPI on port 8000.
2. Set `NEXT_PUBLIC_USE_MOCK_API=false` and restart `npm run dev`.
3. Enable CORS on FastAPI for `http://localhost:3000`, **including the SSE route**.

See `api-integration.md` §5 for the exact settings and the four assumptions to verify.

**If the report screen is blank:** open DevTools → Network. A CORS error, a 404, or a field-name mismatch will be visible there. Field mismatches are fixed in `lib/api/mappers.ts` alone.

---

## 7. Common tasks

### Change a colour, radius or shadow

`src/app/globals.css`, inside `@theme`. Tailwind v4 is CSS-first — there is no `tailwind.config.js`. `--color-blue` automatically produces `bg-blue`, `text-blue`, `border-blue`.

### Change the maximum upload size

`src/lib/constants/upload.ts`. **Change it on the backend too** — the client check is only for fast feedback and can be bypassed (FR-1.2, FR-1.3).

### Add a pipeline stage

`src/lib/constants/analysis.ts` — one entry in `ANALYSIS_STEPS`, plus the event name in `types/analysis.ts`. The stepper picks it up automatically.

### Change the disclaimer

`src/config/site.ts`. It is written once and reused on the landing page and the report (FR-9.6, FR-11.5).

### Add a route

Create `src/app/<name>/page.tsx`, then add a builder to `src/lib/constants/routes.ts` and link via `routes.<name>()` — never a raw string.

### Add a report section

See `component-architecture.md` §6 — four steps.

---

## 8. Things that will trip you up

**`params` is a Promise.** Next.js 16 made route params async. Every dynamic page is `async` and does `const { id } = await params`. Reading them synchronously will not compile.

**`cn()` does not merge classes.** Passing `className="hidden"` to a component that already sets `inline-flex` does *not* reliably override it — Tailwind resolves same-group utilities by stylesheet order, not `className` order. Use `className` for properties the component doesn't set; change the structure when you need to change one it does. This caused a real mobile layout bug; see the comment in `lib/utils/cn.ts`.

**`setState` inside an effect is a lint error.** React 19's `react-hooks/set-state-in-effect` rule. Usually it means the value should be *derived* rather than stored (see `useReport`), or read with `useSyncExternalStore` (see `usePrefersReducedMotion`).

**Mock data must stay typed.** `src/mocks/reports.ts` declares its cases as real `Report` objects. If you change `types/report.ts`, the mocks fail to compile — which is the point. Never loosen them with `as any`.

**Turbopack is the default bundler** in Next 16. No `--turbopack` flag is needed.

---

## 9. Verification checklist

Before calling a change done:

1. `npx tsc --noEmit` — clean
2. `npm run lint` — clean
3. `npm run build` — succeeds
4. `npm run dev`, then check the affected route at **1280px and 375px**
5. Browser console — no errors
6. Tab through the screen — focus visible, nothing unreachable
7. If you touched the report, check all four Prototype-map variants

The current implementation passes all of these, plus 19 automated browser checks and 13 accessibility checks.
