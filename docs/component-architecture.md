# Component Architecture

Why the UI is split the way it is, and what each component is for.

---

## 1. The two layers

```
components/
├── ui/        GENERIC — knows nothing about image forensics
└── <feature>/ SPECIFIC — knows about reports, uploads, sanitization
```

The test is simple: **could this component appear in a completely different application?** `Button`, `Modal`, `Accordion` — yes, so they live in `ui/`. `ScoreSummary`, `RegionalEvidenceSection` — no, so they live in `report/`.

This is not folder decoration. It tells you the dependency direction: feature components import from `ui/`, never the reverse. A change to `PrivacySection` cannot break `Button`.

---

## 2. The `ui/` primitives

Each one exists because the prototype repeats a pattern; the CSS class it replaces is named so you can compare directly against `truthlens_prototype.html`.

| Component | Prototype CSS | Used by |
|---|---|---|
| `Button`, `IconButton`, `buttonClasses` | `.btn`, `.icon-btn` | everywhere |
| `Card`, `FieldLabel`, `Eyebrow` | `.card`, `.field-label`, `.eyebrow` | every screen |
| `Banner`, `DegradedNotice`, `MiniDisclaimer` | `.banner`, `.degraded`, `.mini-disc` | errors, caveats |
| `Badge`, `Tag` | `.acc-tag`/`.band-*`, `.tag` | report sections |
| `ProgressBar`, `Spinner` | `.progress-line`, spinner keyframes | analysis, scores |
| `ScoreRing` | `.ring` + `#ringProg` | report |
| `Accordion`, `SectionColumns` | `.acc`, `.cols` | report |
| `KeyValueList`, `FindingList`, `EmptyState` | `.kvlist`, `ul.findings`, `.empty` | report, admin |
| `Modal`, `ModalOption` | `.overlay`/`.modal`, `.opt-row` | privacy, download |
| `DetectionImage` | `.detimg`, `.bbox`, `.redact` | OCR, privacy, sanitize |

### `buttonClasses` — why a class-string export

Some "buttons" in the design are **navigation**: "New analysis", "Back to report", "Sanitize image". Those must be real `<a>`/`<Link>` elements, not `<button>`s.

Wrapping a `Link` in a `Button` produces `<button><a>…</a></button>` — invalid HTML that breaks middle-click, open-in-new-tab, and the browser's own link handling. So `buttonClasses()` exports just the appearance:

```tsx
<Link href={routes.home()} className={buttonClasses({ size: "sm" })}>New analysis</Link>
```

Identical look, correct semantics.

### `Modal` — what "accessible dialog" actually requires

The prototype toggles a CSS class. A real dialog has four more obligations, and without them a keyboard or screen-reader user simply cannot use it:

1. Focus moves **into** the dialog on open, and **back to the trigger** on close.
2. Tab is **trapped** — it wraps at the ends instead of escaping to the page behind.
3. **Escape** closes it.
4. `role="dialog"` + `aria-modal="true"` + `aria-labelledby` announce what it is.

All four are implemented and all four are verified by the browser test suite.

### `DetectionImage` — the missing-image problem

The SRS defines no endpoint that returns the analysed image or the ELA map (it stores `ela_map_ref` and `sanitized_image_ref` — *references*). So `src` is optional everywhere. When it is absent the component draws the prototype's gradient placeholder rather than a broken image, and **still draws the bounding boxes**, because their coordinates come from the report and are meaningful on their own.

Boxes use fractional coordinates (0–1) converted to CSS percentages, so the overlay scales correctly at any viewport width.

---

## 3. The report: seven sections, seven files

The single most important structural decision. The report is **not** one big component:

```
ReportView                        ← 4 states, then composition. ~150 lines.
├── ReportHeader                  ← disclaimer + actions + session line
├── ScoreSummary                  ← ScoreRing + 3 SubScores
├── MetadataSection               ← FR-2.x
├── OCRSection                    ← FR-3.x
├── PrivacySection                ← FR-4.x
├── ForensicsSection              ← FR-6.x
├── AIAnalysisSection             ← FR-7.x
├── RegionalEvidenceSection       ← FR-8.x
└── RecommendationsSection        ← FR-11.2
```

**Each section receives only its own slice:**

```tsx
<MetadataSection metadata={report.metadata} />     // ✅
<MetadataSection report={report} />                // ❌ — could read anything
```

Three consequences:

1. To change how OCR findings look, you open one file, and nothing else can break.
2. A section can be rendered in isolation with a hand-written prop — testable without the whole report.
3. Each section maps to one group of functional requirements, so you can point at a file and cite the FR it implements.

### The three states every section handles

This is a forensic tool, so these must stay distinct:

| State | Renders | Means |
|---|---|---|
| `status !== "ok"` | `DegradedNotice` (amber) | the engine **didn't run** |
| findings empty | `EmptyState` (grey) | the engine ran and **found nothing** |
| findings present | the content | results |

"No faces detected" and "the face detector failed" are completely different statements to someone deciding whether to post a photo. Collapsing them would be a factual error in the report.

### Requirements the components enforce

Some rules are not styling — they are behaviour the SRS mandates:

- **`RegionalEvidenceSection`** — FR-8.7: when `sufficient_evidence` is false it shows "not enough evidence to name a region" and the raw clues. It never falls back to displaying the top candidate anyway. FR-8.8's "not GPS geolocation" caveat renders unconditionally.
- **`AIAnalysisSection`** — FR-7.6: a probability plus a confidence level plus the contributing signals. Never a yes/no label. The browser test asserts the strings "AI-generated: Yes/No" never appear.
- **`ReportHeader`** — FR-11.5: the disclaimer is first, not dismissible, and inside the sticky region so it stays visible while scrolling.
- **`ScoreSummary`** — NFR-7.2: every score carries a one-line plain-language explanation, not just a number.

---

## 4. Responsive behaviour

Designed per screen, not by shrinking the desktop layout:

| Screen | Desktop | Mobile |
|---|---|---|
| Header | full "How images are handled" | shortened to "Privacy"; brand truncates; actions never shrink |
| Report summary | 220px ring + sub-scores side by side | stacked |
| Report sections | two columns (image / findings) | one column, image first |
| Sanitize | before/after side by side | stacked — two 4:3 panels on a phone are too small to compare |
| Admin stats | 4 across | 2 across at `sm`, 1 on phones |
| Admin audit log | full table | table scrolls **inside its own container**; the page never scrolls sideways |

**A real bug this caught.** The header originally used two buttons toggled with `hidden` / `sm:inline-flex`. Both stayed visible, because `Button` already applies `inline-flex` and Tailwind resolves same-group utilities by stylesheet order, not `className` order. The page was 457px wide in a 375px viewport. Fixed by changing the structure — one button whose label shortens — and documented in `lib/utils/cn.ts` so it doesn't recur.

---

## 5. Accessibility, and what is verified

| Concern | Implementation |
|---|---|
| Keyboard upload | the dropzone is a `<label>` wrapping a real `<input type="file">` — the browser handles focus and activation, so there is no custom `tabIndex`/`onKeyDown` to get wrong |
| Focus visibility | `:focus-visible` ring on every interactive element (`globals.css`) |
| Skip link | "Skip to content" as the first focusable element |
| Modal | focus trap, restore, Escape, `aria-modal`, `aria-labelledby` |
| Accordion | real `<button>` with `aria-expanded` + `aria-controls`; panel is `role="region"` |
| Live progress | stepper is `aria-live="polite"`; bar is `role="progressbar"` with `aria-valuenow` |
| Toasts | `aria-live="polite"` container always present, so announcements aren't missed |
| Images | `role="img"` + `aria-label` including the detection count; decorative layers `aria-hidden` |
| Icon-only buttons | `IconButton` **requires** a `label` prop — you cannot forget it |
| Reduced motion | honoured globally in CSS **and** in `ScoreRing`'s JS animation |
| Colour | never the only signal — bands carry text ("Critical"), signals carry ▲/▼ plus a label |

All 13 of these are asserted by the browser test suite in the scratchpad script, and all pass.

---

## 6. Adding a new report section

Concretely, if the backend adds a tenth engine:

1. Add its type to `types/report.ts` (extending `EngineSection`, so degraded handling is free).
2. Map it in `lib/api/mappers.ts`.
3. Create `components/report/NewSection.tsx` — copy the shape of `MetadataSection`.
4. Render it in `ReportView`.

Four steps, four files, no existing component modified except the one line in `ReportView`.
