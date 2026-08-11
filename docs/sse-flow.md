# SSE Flow — Live Analysis Progress

How the analysis screen updates in real time, and why it also polls.

Covers UC-3 and FR-10.1 – FR-10.5.

---

## 1. What SSE actually is

**Server-Sent Events** is one HTTP GET request that the server refuses to finish. It keeps the connection open and writes lines to it as things happen:

```
event: metadata_done
data: {"stage":"metadata","timestamp":"...","message":"Reading metadata"}

event: ocr_done
data: {"stage":"ocr","timestamp":"...","message":"Reading text (OCR)"}
```

The browser has a built-in client for this — `EventSource`. No library needed.

**Why the SRS chose SSE.** The pipeline takes up to 30 seconds (NFR-1.1). Three options:

| Approach | Problem |
|---|---|
| Wait for one slow request | 30 seconds of blank screen — the exact thing NFR-7.1 and UC-3 exist to prevent |
| Poll every second | 30 requests per user; progress always up to a second stale |
| **SSE** | Server pushes the moment an engine finishes; one connection |

SSE beats WebSockets here because the data only flows one way. The browser never needs to tell the server anything, and SSE is plain HTTP — it works through proxies and needs no protocol upgrade.

---

## 2. The nine events, mapped to the nine steps

`src/lib/constants/analysis.ts` holds the whole mapping as data:

| Step id | Label shown | Completed by |
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

Plus `error`, which is not a stage.

**Why a table instead of nine JSX blocks?** The prototype writes nine near-identical `<li>` elements. Adding a tenth engine there means nine edits and a chance to typo one. Here it is one line in the array, and `AnalysisStepper` is a `.map()`.

---

## 3. The three files

```
lib/sse/analysisStream.ts    opens EventSource, attaches 10 listeners, hands back a close()
hooks/useAnalysisStream.ts   turns events into UI state; owns the fallback
components/analysis/…        renders that state
```

**Why is this not in the page component?** The connection has a lifecycle — open, ten listeners, error, close — that must be torn down when the user navigates away. Miss the teardown and `EventSource` keeps reconnecting to an analysis nobody is watching, forever. Isolating it also means the mock stream can replace it without touching the hook or the UI.

---

## 4. Why the fallback exists (FR-10.4)

`EventSource` is a long-lived connection, and long-lived connections die:

- corporate proxies and load balancers close idle connections after ~60s;
- mobile networks drop them when handing between cell towers and Wi-Fi;
- some networks block SSE outright.

`EventSource` retries automatically, but it can retry into a loop. Meanwhile the user watches a frozen progress bar with no idea anything is wrong.

So UC-3's alternate flow and FR-10.4 specify a fallback:

```
   EventSource open
         │
         ▼
   onerror fires
         │
         ├─► close the stream (stop the automatic retry loop)
         │
         ▼
   GET /api/v1/analyze/status/{session_id}     ── every 3 seconds
         │
         ├─► { stage: "ocr", progress: 33 }    ── keep the stepper moving
         │
         └─► { report_id: "..." }              ── done → go to the report
```

We close the stream deliberately rather than letting `EventSource` retry. Polling always terminates; a silently retrying stream may not.

---

## 5. Both transports produce the same state

This is the design point worth explaining in a viva.

`useAnalysisStream` is a **reducer**. SSE events and poll results are both translated into the *same actions*:

```
SSE  metadata_done        ─┐
                           ├─► dispatch({ type: "step_completed", stepId: "metadata" })
poll { stage: "metadata" } ─┘   (as "sync_to_stage")
```

So the UI has exactly one rendering path. It cannot tell which transport is feeding it, and there is no second code path to keep correct.

The only difference the user sees is one honest line of text:

> Live updates were interrupted — checking for progress every few seconds instead.

### Why a reducer rather than several `useState`s

Nine events, two transports and a timeout all change the same state. With `useState` that is six or seven setters scattered across callbacks that can interleave. With a reducer, every transition is in one function you can read top to bottom.

One subtlety: the reducer sets the state of **all** steps from an index (`advanceTo`) rather than advancing by one. Events can be missed during a reconnect, and polling reports an *absolute* stage. Recomputing from an index makes both paths self-correcting — a missed event heals on the next one. `sync_to_stage` additionally refuses to move backwards, so a late poll cannot undo progress the stream already reported.

---

## 6. Degraded engines are not failures

NFR-2.1 and UC-2's alternate flow: if one engine throws, the orchestration layer marks it unavailable, gives it a neutral weight, and **continues**.

So the stepper has five states, not three:

| State | Look | Meaning |
|---|---|---|
| `pending` | grey ring | not started |
| `active` | spinning blue ring | running |
| `completed` | blue tick | done |
| `warning` | **amber** `!` + "unavailable" | engine failed, pipeline continued |
| `failed` | red `✕` | the pipeline itself stopped |

Amber vs red is not decoration. Amber means "you still get a report, with this engine excluded and overall confidence lowered". Red means "there is no report". The report carries this through with `EngineStatus` per section, so a degraded OCR section says *"the text check couldn't run"* and never *"no text found"* — which would be a false statement in a forensic document.

---

## 7. Ending the stream

Three ways it stops, all handled:

1. **`report_ready`** — FR-10.5 says the server closes; we close from our side too, so `EventSource`'s automatic retry cannot open a fresh connection to a finished analysis.
2. **`error`** — the failure screen renders in place, with the session id and error code shown so they can be quoted against the backend logs (NFR-2.2).
3. **120-second deadline** — FR-10.5's maximum pipeline duration. Without it, a backend that hangs leaves the user on a frozen stepper forever.

And the React cleanup function runs on unmount, which covers the fourth case: the user simply navigates away.

---

## 8. Testing it without a backend

`src/mocks/mockStream.ts` replays the nine events on a 460 ms timer and supports all three paths:

| Path | Trigger |
|---|---|
| normal | any known mock session id |
| degraded engine | session `d1f8-3b60` (the faded-scan case) |
| total failure | any session id starting with `fail-` |

With `NEXT_PUBLIC_ENABLE_PROTOTYPE_TOOLS=true`, all three are one click away in the Prototype map.
