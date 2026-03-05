# Rich Layout Types Design

**Date:** 2026-03-05
**Branch:** feat/continue-development

## Goal

Add three new layout types — `stats-highlight`, `card-grid`, and `comparison-table` — to bring the generated PPTX output closer to the quality of human-designed presentations (reference: Automation_Decision_Framework.pptx).

## Background

Current layouts cover single/two-column bullets, charts, agenda, title, conclusion, and quote-callout. Structured visual layouts (big stats, icon-style cards, side-by-side comparison tables) require structured data, not just a bullet list — so they need a dedicated pipeline stage to generate that data.

---

## Schema

Three optional fields added to `SlideOutline` (and mirrored on `SlideRenderPlan`):

```ts
// src/types/index.ts
statCards?: { value: string; label: string; context?: string }[]
cardItems?: { badge?: string; title: string; bullets: string[] }[]
tableData?: { headers: string[]; rows: string[][] }
```

- `statCards`: 2–4 items; `value` is the big number/stat (e.g. `"78%"`), `label` is the descriptor, `context` is optional small footnote
- `cardItems`: 2–4 cards; `badge` is a short category label (≤2 words), `title` is the card heading, `bullets` are 2–3 supporting points
- `tableData`: `headers` is the first row (column labels), `rows` are the data rows; 2–5 columns, 2–6 rows

---

## Pipeline

A new `structuredDataNode` is inserted in the **agents graph** after `slideWriter`, before the pipeline ends.

**Detection:** The node scans all slides and collects those where:
- `slideType` is one of `findings`, `problem`, `solution`, `benefits`, `implementation`, `background`, or
- `visualSuggestion` matches `/(statistic|percent|comparison|card|table|grid|highlight)/i`

**Single LLM call:** Detected slides are batched into one prompt. The LLM returns a JSON array, one entry per slide, each containing the appropriate structured field(s) (`statCards`, `cardItems`, or `tableData`). Slides that don't map cleanly to any structured type get an empty object.

**State update:** The node merges returned structured data back into each slide's `SlideOutline`.

---

## Layout Routing

`chooseLayout()` in `planning.ts` gains three early checks (before the existing chart/quote-callout logic):

```
if (slide.statCards?.length >= 2)  → 'stats-highlight'
if (slide.cardItems?.length >= 2)  → 'card-grid'
if (slide.tableData)               → 'comparison-table'
```

`buildBaseRenderPlan()` passes the three new optional fields through to `SlideRenderPlan`.

---

## Renderers

### `stats-highlight`

- Background: white
- 2–4 rounded-rect cards laid out horizontally, equal width, centered vertically
- Each card: large bold value (72pt, accent color), label (14pt, dark), optional small context (10pt, muted)
- Slide title rendered above in standard header style

### `card-grid`

- 2–4 cards in a row (or 2×2 grid for 4 cards)
- Each card: filled accent-color rectangle badge at top-left with white badge text (≤2 words), card title below badge (16pt bold), then 2–3 bullet lines (12pt)
- Consistent card width; equal spacing

### `comparison-table`

- Uses PptxGenJS `slide.addTable()`
- Header row: accent fill, white bold text
- Alternating data rows: white / very light accent tint
- Border: thin, divider color
- Column widths auto-distributed across slide body area

---

## Out of Scope

- `process-flow` and `2x2-matrix` layouts (deferred)
- Editable table cells in the app UI
- Per-slide manual override of structured data fields
