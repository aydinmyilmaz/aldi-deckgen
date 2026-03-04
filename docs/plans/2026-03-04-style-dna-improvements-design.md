# Style DNA Improvements — Design Document

**Date:** 2026-03-04
**Status:** Approved

## Goal

Incorporate "Style DNA" extraction from the reference prompt into the existing pipeline. The uploaded document is treated as both a **content source** and a **style/structure reference**. All agents receive the extracted style profile and use it to produce output that matches the document's presentation conventions.

## Pipeline Change: 3-node → 4-node

```
__start__ → styleDnaNode → contentStructureNode → outlineNode → slideWriterNode → __end__
```

### New node: `styleDnaNode`
Analyzes extracted document text and produces a `styleDna` string (JSON) containing:
- **Tone & wording rules** — sentence length, formality, verb style, certainty level, use of qualifiers
- **Narrative pattern** — how the story flows (e.g., context → insight → action)
- **Headline conventions** — how slide titles are typically phrased
- **Bullet style** — short phrases vs. full sentences, use of numbers
- **Communication register** — executive-ready / academic / technical / casual

## Config Changes

Add to `PresentationConfig`:
- `audience: string` — free text (e.g. "Exec Board", "Product team")
- `purpose: Purpose` — `'inform' | 'align' | 'decide' | 'sell'`

## SlideOutline Enrichment

Add optional fields:
- `keyMessage?: string` — the "so what" of the slide (1 sentence)
- `speakerNotes?: string` — 1-2 line presenter note
- `visualSuggestion?: string` — chart type / icon concept

## Files Affected

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `audience`, `purpose`, `Purpose` type; enrich `SlideOutline` |
| `src/agents/state.ts` | Add `styleDna` field |
| `src/agents/nodes/styleDnaNode.ts` | **New** — Style DNA extraction |
| `src/agents/nodes/contentStructureNode.ts` | Use styleDna + audience + purpose |
| `src/agents/nodes/outlineNode.ts` | Use styleDna + purpose, include keyMessage + visualSuggestion |
| `src/agents/nodes/slideWriterNode.ts` | Use styleDna + audience, output speakerNotes |
| `src/agents/graph.ts` | Add styleDnaNode as first node |
| `src/components/ConfigBar.tsx` | Add audience text input + purpose select |
| `src/components/SlideCard.tsx` | Show keyMessage + speakerNotes (collapsible) |
| `src/app/page.tsx` | Add audience/purpose to DEFAULT_CONFIG |
