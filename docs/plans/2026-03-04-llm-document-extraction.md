# LLM Document Extraction Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional `documentExtractionNode` that uses GPT to divide the raw document into per-slide content blocks before the main pipeline runs.

**Architecture:** A new LangGraph node sits at the start of the graph behind a conditional edge. When `config.useLlmExtraction` is `true`, `__start__` routes to `documentExtractionNode` first; otherwise it skips straight to `extractStyleDna`. Downstream nodes (`outlineNode`, `slideWriterNode`) check for `extractedSlideContent` in state and use it when present.

**Tech Stack:** Next.js 15, LangGraph JS (`@langchain/langgraph`), `@langchain/openai`, TypeScript

---

## Task 1: Add `useLlmExtraction` to config types + `extractedSlideContent` to state

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/agents/state.ts`

**Step 1: Add `useLlmExtraction` to `PresentationConfig`**

In `src/types/index.ts`, add `useLlmExtraction: boolean` to the interface:

```typescript
export interface PresentationConfig {
  tone: Tone;
  slideCount: number;
  language: Language;
  userPrompt: string;
  audience: string;
  purpose: Purpose;
  useLlmExtraction: boolean; // NEW
}
```

**Step 2: Add `ExtractedSlideContent` type**

In `src/types/index.ts`, add after the `Purpose` type:

```typescript
export interface ExtractedSlideContent {
  slideIndex: number;
  topic: string;
  content: string;
}
```

**Step 3: Add `extractedSlideContent` to `GraphState`**

In `src/agents/state.ts`, add a new field between the `styleDna` field and `// Agent 1 output`:

```typescript
// documentExtractionNode output (only populated when config.useLlmExtraction = true)
extractedSlideContent: Annotation<ExtractedSlideContent[]>({
  reducer: (_, y) => y,
  default: () => [],
}),
```

Also add the import at the top:

```typescript
import type { PresentationConfig, SlideOutline, ExtractedSlideContent } from '@/types';
```

**Step 4: Commit**

```bash
git add src/types/index.ts src/agents/state.ts
git commit -m "feat: add useLlmExtraction config flag and extractedSlideContent state field"
```

---

## Task 2: Create `documentExtractionNode`

**Files:**
- Create: `src/agents/nodes/documentExtractionNode.ts`

**Step 1: Write the node**

```typescript
// src/agents/nodes/documentExtractionNode.ts
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function documentExtractionNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { documentText, config } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a document content organizer. ` +
      `Read this document and divide its content into exactly ${config.slideCount} sections — one per slide. ` +
      `For each section provide: the slide index (1-based), a short topic label (3-6 words), ` +
      `and the verbatim key facts from the document that belong on that slide. ` +
      `Do NOT summarize or rewrite — extract and group the actual document content. ` +
      `Respond in ${config.language}. ` +
      `Output ONLY valid JSON: { "slides": [{ "slideIndex": number, "topic": string, "content": string }] }`
    ),
    new HumanMessage(
      `Document text:\n${documentText.slice(0, 10000)}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  return { extractedSlideContent: parsed.slides };
}
```

**Step 2: Commit**

```bash
git add src/agents/nodes/documentExtractionNode.ts
git commit -m "feat: add documentExtractionNode for per-slide content extraction"
```

---

## Task 3: Wire conditional routing into the graph

**Files:**
- Modify: `src/agents/graph.ts`

**Step 1: Read the current graph**

Current `src/agents/graph.ts`:

```typescript
import { StateGraph } from '@langchain/langgraph';
import { GraphState } from './state';
import { styleDnaNode as extractStyleDnaNode } from './nodes/styleDnaNode';
import { contentStructureNode } from './nodes/contentStructureNode';
import { outlineNode } from './nodes/outlineNode';
import { slideWriterNode } from './nodes/slideWriterNode';

const workflow = new StateGraph(GraphState)
  .addNode('extractStyleDna', extractStyleDnaNode)
  .addNode('contentStructure', contentStructureNode)
  .addNode('outline', outlineNode)
  .addNode('slideWriter', slideWriterNode)
  .addEdge('__start__', 'extractStyleDna')
  .addEdge('extractStyleDna', 'contentStructure')
  .addEdge('contentStructure', 'outline')
  .addEdge('outline', 'slideWriter')
  .addEdge('slideWriter', '__end__');

export const presentationGraph = workflow.compile();
```

**Step 2: Replace with conditional routing**

```typescript
// src/agents/graph.ts
import { StateGraph } from '@langchain/langgraph';
import { GraphState } from './state';
import { documentExtractionNode } from './nodes/documentExtractionNode';
import { styleDnaNode as extractStyleDnaNode } from './nodes/styleDnaNode';
import { contentStructureNode } from './nodes/contentStructureNode';
import { outlineNode } from './nodes/outlineNode';
import { slideWriterNode } from './nodes/slideWriterNode';
import type { PipelineState } from './state';

function routeEntry(state: PipelineState): string {
  return state.config.useLlmExtraction ? 'documentExtraction' : 'extractStyleDna';
}

const workflow = new StateGraph(GraphState)
  .addNode('documentExtraction', documentExtractionNode)
  .addNode('extractStyleDna', extractStyleDnaNode)
  .addNode('contentStructure', contentStructureNode)
  .addNode('outline', outlineNode)
  .addNode('slideWriter', slideWriterNode)
  .addConditionalEdges('__start__', routeEntry)
  .addEdge('documentExtraction', 'extractStyleDna')
  .addEdge('extractStyleDna', 'contentStructure')
  .addEdge('contentStructure', 'outline')
  .addEdge('outline', 'slideWriter')
  .addEdge('slideWriter', '__end__');

export const presentationGraph = workflow.compile();
```

**Step 3: Commit**

```bash
git add src/agents/graph.ts
git commit -m "feat: add conditional routing for optional LLM document extraction"
```

---

## Task 4: Update `outlineNode` to use topic hints

**Files:**
- Modify: `src/agents/nodes/outlineNode.ts`

**Step 1: Read current file and add extractedSlideContent usage**

Update the node to pass topic hints to the LLM when available:

```typescript
// src/agents/nodes/outlineNode.ts
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function outlineNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { mainTopic, keyThemes, summary, config, styleDna, extractedSlideContent } = state;
  const llm = createLLM();

  const topicHints = extractedSlideContent.length > 0
    ? `\n\nContent sections already extracted from document:\n${extractedSlideContent.map(s => `Slide ${s.slideIndex}: ${s.topic}`).join('\n')}\nUse these as the basis for your slide titles.`
    : '';

  const response = await llm.invoke([
    new SystemMessage(
      `You are a presentation architect and storyteller. ` +
      `Design exactly ${config.slideCount} slides for a ${config.tone.toLowerCase()} deck. ` +
      `Audience: ${config.audience || 'general'}. Purpose: to ${config.purpose}. ` +
      `\n\nNarrative rule: follow the narrative pattern from the Style DNA below. ` +
      `Slide 1 is always the title/intro. The final slide must reinforce the purpose (${config.purpose}). ` +
      `\n\nStyle DNA:\n${styleDna}` +
      topicHints +
      `\n\nRespond in ${config.language}. ` +
      `Output ONLY valid JSON: { "slides": [{ "index": number, "title": string, "keyMessage": string, "visualSuggestion": string }] }`
    ),
    new HumanMessage(
      `Topic: ${mainTopic}\nSummary: ${summary}\nKey themes: ${keyThemes.join(', ')}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  return { slideTitles: parsed.slides };
}
```

**Step 2: Commit**

```bash
git add src/agents/nodes/outlineNode.ts
git commit -m "feat: outlineNode uses extracted topic hints when LLM extraction is enabled"
```

---

## Task 5: Update `slideWriterNode` to use per-slide content

**Files:**
- Modify: `src/agents/nodes/slideWriterNode.ts`

**Step 1: Read current file and update**

When `extractedSlideContent` is non-empty, build a per-slide content map and pass it to the LLM instead of the raw `documentText` slice:

```typescript
// src/agents/nodes/slideWriterNode.ts
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import { v4 as uuidv4 } from 'uuid';
import type { PipelineState } from '../state';
import type { SlideOutline } from '@/types';

export async function slideWriterNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { slideTitles, documentText, config, styleDna, extractedSlideContent } = state;
  const llm = createLLM();

  // Build source content: per-slide if extraction ran, raw text otherwise
  const sourceContent = extractedSlideContent.length > 0
    ? extractedSlideContent
        .map((s) => `=== Slide ${s.slideIndex} (${s.topic}) ===\n${s.content}`)
        .join('\n\n')
    : documentText.slice(0, 6000);

  const response = await llm.invoke([
    new SystemMessage(
      `You are an executive presentation writer. ` +
      `Write the final slide content — crisp, non-academic, no filler. ` +
      `Audience: ${config.audience || 'general'}. Purpose: to ${config.purpose}. Tone: ${config.tone}. Language: ${config.language}. ` +
      `\n\nCritical: match the wording conventions from the Style DNA below exactly — ` +
      `same headline style, bullet style, sentence length, and register. ` +
      `\n\nStyle DNA:\n${styleDna}` +
      `\n\nFor each slide produce:
- bullets: 3-5 concise bullet points using the source document facts
- speakerNotes: 1-2 sentences for the presenter (what to say, not what's on the slide)
` +
      `Output ONLY valid JSON: { "slides": [{ "index": number, "title": string, "keyMessage": string, "bullets": string[], "speakerNotes": string, "visualSuggestion": string }] }`
    ),
    new HumanMessage(
      `Slide blueprint: ${JSON.stringify(slideTitles)}\n\nSource content:\n${sourceContent}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  const slides: SlideOutline[] = (
    parsed.slides as Array<{
      index: number;
      title: string;
      keyMessage: string;
      bullets: string[];
      speakerNotes: string;
      visualSuggestion: string;
    }>
  ).map((s) => ({ ...s, id: uuidv4() }));

  return { slides };
}
```

**Step 2: Commit**

```bash
git add src/agents/nodes/slideWriterNode.ts
git commit -m "feat: slideWriterNode uses per-slide extracted content when available"
```

---

## Task 6: Add toggle to main page UI

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Read the current page and make two changes**

Change 1 — `DEFAULT_CONFIG`: add `useLlmExtraction: false`

```typescript
const DEFAULT_CONFIG: PresentationConfig = {
  tone: 'Standard',
  slideCount: 5,
  language: 'English',
  userPrompt: '',
  audience: '',
  purpose: 'inform',
  useLlmExtraction: false, // NEW
};
```

Change 2 — add a toggle between the Content textarea card and the Attachments card:

```tsx
{/* AI Extraction Toggle */}
<div className="bg-white border rounded-2xl p-6">
  <label className="flex items-center justify-between cursor-pointer">
    <div>
      <p className="font-semibold text-base">AI Content Extraction</p>
      <p className="text-sm text-muted-foreground mt-0.5">
        Use GPT to organize the document into per-slide content blocks before generating.
      </p>
    </div>
    <button
      role="switch"
      aria-checked={config.useLlmExtraction}
      onClick={() => setConfig({ ...config, useLlmExtraction: !config.useLlmExtraction })}
      disabled={stage === 'generating'}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        disabled:opacity-50
        ${config.useLlmExtraction ? 'bg-indigo-600' : 'bg-slate-200'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
          ${config.useLlmExtraction ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  </label>
</div>
```

Place this card between the Content card and the Attachments card.

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add AI Content Extraction toggle to main page"
```

---

## Task 7: Type-check and build verify

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors before proceeding.

**Step 2: Run lint**

```bash
npm run lint
```

Fix any ESLint errors.

**Step 3: Production build**

```bash
npm run build
```

Expected: build completes with no errors.

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: fix type/lint errors for LLM extraction feature"
```

---

## Out of Scope

- No test suite exists in this project — build/tsc verification is the acceptance gate
- Rate limiting or cost warnings for the extra LLM call are deferred
