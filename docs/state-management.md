# State Management

Where each piece of state lives, and why there is no state-management library.

---

## 1. The short answer

**No Redux. No Zustand. No React Query.** One React context, for toasts.

That is not laziness — it comes from asking one question of each piece of state: *who reads it?*

---

## 2. The inventory

| State | Where it lives | Who reads it |
|---|---|---|
| Selected file, preview, consent, validation error | `useImageUpload` (local) | the upload screen only |
| `sessionId` | **the URL** | the analysis screen |
| `reportId` | **the URL** | the report screen |
| Stepper, progress, connection mode | `useAnalysisStream` (local) | the analysis screen only |
| Report data | `useReport` (local) | the report screen only |
| Sanitize result | `useSanitize` (local) | the sanitize screen only |
| Which accordion is open | inside each `Accordion` | that section only |
| Modal open/closed | the component that opens it | that screen only |
| **Toasts** | **React context in the root layout** | **any screen** |

Read down the "who reads it" column. Everything except toasts is read by exactly one screen. Global state solves the problem of *many* consumers; here there is one.

---

## 3. The URL is the most important store

`sessionId` and `reportId` are never held in React state. They live in the URL:

```
/analyze/a1b2-c3d4
/report/rep-a1b2-c3d4
/sanitize/a1b2-c3d4?report=rep-a1b2-c3d4
```

Four things come free:

1. **Refresh works.** Reload the analysis page and it reconnects to the same session. In a store, the id would vanish and the user would be stranded.
2. **The back button works.** It is just navigation.
3. **Reports are shareable and bookmarkable.**
4. **There is one copy of the truth.** A store holding a `sessionId` that disagrees with the URL is a class of bug that cannot occur here.

This is why the app uses real routes instead of the prototype's `go('screen-name')` state machine. The prototype's approach is fine for a click-through demo and wrong for a real application.

One deliberate detail: after `report_ready` the analysis screen uses `router.replace`, not `push`. Going Back should return to the upload page, not to a finished progress bar.

---

## 4. Why toasts get a context

A toast is fired from the download modal, the sanitize screen, and the privacy modal. None of those owns the others, and the toast must render at the bottom of the viewport regardless of who fired it.

That is a genuine cross-cutting concern, so it gets `ToastProvider` in the root layout — about 50 lines of React context, no dependency.

```tsx
const { toast, toastError } = useToast();
toast("Report downloaded (PDF)");
```

Reaching for Redux to hold one string would be the definition of over-engineering.

---

## 5. Why no React Query / SWR

Those libraries solve caching, deduplication, background refetching and invalidation. Check what this app actually does:

- The report is fetched **once** per route visit and never mutated.
- Analysis progress arrives by SSE, not by fetching.
- Nothing is shared between screens, so there is nothing to deduplicate.
- Nothing goes stale within a session.

Every feature would be unused. `useReport` is 40 lines and does the one thing needed:

```ts
useEffect(() => {
  const controller = new AbortController();
  api.getReport(reportId, controller.signal)
     .then(...).catch(...);
  return () => controller.abort();     // cancel if the user navigates away
}, [reportId]);
```

**If the project later added** a report history, or polling that refetches, or optimistic updates — then a data library would start earning its place. It doesn't yet.

---

## 6. Two patterns worth understanding

### Derive state; don't store it

`useReport` does **not** store a `loading` boolean. It stores which id the settled result belongs to, and derives the rest:

```ts
const isCurrent = settled?.forId === reportId;
return { report: isCurrent ? settled.report : null, loading: !isCurrent };
```

Storing `loading` separately invites the classic bug: a slow response for report A arrives after you have navigated to report B, flips `loading` off, and shows A's data on B's page. Deriving it makes that impossible.

It also satisfies React 19's `react-hooks/set-state-in-effect` rule, which flags `setState` called synchronously in an effect body — a real signal that state is being stored where it could be computed.

### Use `useSyncExternalStore` for things outside React

Two values come from outside React: the `prefers-reduced-motion` media query, and the image preview handed over from the upload page.

```ts
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

The third argument is the **server** snapshot. It is what prevents a hydration mismatch: the server renders one thing, the browser corrects it, and React is told to expect that rather than warning about it. A `useState` + `useEffect` pair would cause an extra render and, for the preview, a hydration warning.

---

## 7. The image-preview problem (worth knowing for viva)

The prototype shows your image's thumbnail while it is being analysed. **The SRS defines no endpoint that returns the uploaded image** — the backend stores it privately (NFR-3.3) and deletes it after 24 hours (NFR-4.1).

So the only copy the browser can display is the `File` the user just picked. `lib/utils/sessionPreview.ts` keeps a blob URL in a module-level `Map`, keyed by session id. A module-level variable survives client-side navigation (it is just JavaScript memory) but **not a full page reload**.

Consequence: refresh the analysis page and the thumbnail disappears; a placeholder takes over and analysis continues normally.

That is a deliberate trade. The alternative was inventing a backend endpoint the SRS doesn't have — which the brief explicitly forbids. It is recorded in `implementation-notes.md` as a known limitation with a clear fix if the backend later adds an image URL.
