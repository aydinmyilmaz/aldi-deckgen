# LLM Document Extraction Agent — Design Document

**Date:** 2026-03-04
**Status:** Approved

## Goal

Add an optional LLM-based document extraction agent that organizes the raw document text into per-slide content blocks before the main pipeline runs. When enabled, downstream agents receive structured, slide-ready content instead of a raw text dump.

## Pipeline Change

```
__start__ ──[useLlmExtraction=true]──► documentExtraction ──► extractStyleDna ──► contentStructure ──► outline ──► slideWriter
          ──[useLlmExtraction=false]─────────────────────────► extractStyleDna ──► contentStructure ──► outline ──► slideWriter
```

Implemented as a `addConditionalEdges` from `'__start__'` in LangGraph.

## New Node: `documentExtractionNode`

**Purpose:** Read the full document and divide its content into exactly `config.slideCount` content blocks — one per slide. Returns actual document content grouped by topic, NOT summaries.

**Prompt intent:**
> "You are a document content organizer. Read this document and divide its content into exactly N sections for N slides. For each section: slide index, a short topic label, and the verbatim key facts from the document that belong on that slide. Do NOT summarize. Extract and group, do not rewrite."

**Output (new state field):**
```typescript
extractedSlideContent: Array<{
  slideIndex: number;
  topic: string;    // short label used by outlineNode as a title hint
  content: string;  // actual text/facts from document for this slide
}>
```

## Config Change

Add to `PresentationConfig`:
```typescript
useLlmExtraction: boolean; // default: false
```

## State Change

Add to `GraphState`:
```typescript
extractedSlideContent: Annotation<Array<{ slideIndex: number; topic: string; content: string }>>
```

## Downstream Impact

| Node | When extractedSlideContent is non-empty |
|------|----------------------------------------|
| `outlineNode` | Uses `topic` labels as hints for slide titles |
| `slideWriterNode` | Matches each slide to its content block by index; uses `block.content` as source instead of `documentText.slice(0, 6000)` |

## UI Change

Add a toggle switch labelled **"AI Content Extraction"** in the Content section of `page.tsx`, between the textarea and the Attachments card. Disabled during generation.

## Files to Change

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `useLlmExtraction: boolean` to `PresentationConfig` |
| `src/agents/state.ts` | Add `extractedSlideContent` field |
| `src/agents/nodes/documentExtractionNode.ts` | **New** node |
| `src/agents/graph.ts` | Add node + conditional routing from `__start__` |
| `src/agents/nodes/outlineNode.ts` | Use `extractedSlideContent[].topic` as hints when available |
| `src/agents/nodes/slideWriterNode.ts` | Use per-slide `content` when available |
| `src/app/page.tsx` | Add toggle to UI, add `useLlmExtraction: false` to DEFAULT_CONFIG |
