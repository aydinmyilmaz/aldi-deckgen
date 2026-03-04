# PPT Generator — Document Upload Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js web app where users upload a document (PDF, DOCX, PPTX, TXT, CSV/Excel), enter a prompt + config (slide count, tone, language), and a multi-agent OpenAI pipeline generates an editable slide outline they can update or delete before selecting a template.

**Architecture:** Three layers — (1) a Next.js 15 App Router frontend with a configuration bar, file upload zone, and editable slide list; (2) a server-side document parser that extracts plain text from each supported file type; (3) a sequential OpenAI agent pipeline (ContentStructure → Outline → SlideWriter) that produces structured slide JSON. The UI renders slides as a draggable list after generation; the web-search input type is explicitly out of scope for this plan.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, LangGraph JS (`@langchain/langgraph` + `@langchain/openai` + `@langchain/core`) for agent orchestration, `pdf-parse` (PDF), `mammoth` (DOCX), `jszip` + `xml2js` (PPTX), `xlsx` (CSV/Excel), `@hello-pangea/dnd` (drag-to-reorder)

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`

**Step 1: Bootstrap the project**

```bash
cd /Users/aydin/Desktop/apps/ppt-generator
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

**Step 2: Install dependencies**

```bash
npm install @langchain/langgraph @langchain/openai @langchain/core openai pdf-parse mammoth jszip xml2js xlsx @hello-pangea/dnd uuid
npm install -D @types/pdf-parse @types/xml2js @types/uuid
npx shadcn@latest init -d
npx shadcn@latest add button textarea select badge card separator
```

**Step 3: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o
EOF
```

> User will replace `your_key_here` with actual key and set `OPENAI_MODEL=gpt-5.2` (or any model name).

**Step 4: Verify dev server starts**

```bash
npm run dev
```
Expected: server starts at http://localhost:3000 with default Next.js page.

**Step 5: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 15 project with TypeScript, Tailwind, shadcn"
```

---

## Task 2: Define Core Types

**Files:**
- Create: `src/types/index.ts`

**Step 1: Write types**

```typescript
// src/types/index.ts

export type Tone = 'Standard' | 'Professional' | 'Casual' | 'Academic';
export type Language = 'English' | 'Turkish' | 'Spanish' | 'French' | 'German';

export interface PresentationConfig {
  tone: Tone;
  slideCount: number;
  language: Language;
  userPrompt: string;
}

export interface SlideOutline {
  id: string;
  index: number;
  title: string;
  bullets: string[];
}

export interface GenerateRequest {
  config: PresentationConfig;
  documentText: string; // extracted plain text from uploaded file
}

export interface GenerateResponse {
  slides: SlideOutline[];
  error?: string;
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add core TypeScript types"
```

---

## Task 3: Document Parser Utilities

Each file type is handled by a dedicated parser function. All return plain `string`.

**Files:**
- Create: `src/lib/parsers/pdfParser.ts`
- Create: `src/lib/parsers/docxParser.ts`
- Create: `src/lib/parsers/pptxParser.ts`
- Create: `src/lib/parsers/xlsxParser.ts`
- Create: `src/lib/parsers/textParser.ts`
- Create: `src/lib/parsers/index.ts`

**Step 1: PDF parser**

```typescript
// src/lib/parsers/pdfParser.ts
import pdfParse from 'pdf-parse';

export async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text.trim();
}
```

**Step 2: DOCX parser**

```typescript
// src/lib/parsers/docxParser.ts
import mammoth from 'mammoth';

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
```

**Step 3: PPTX parser** (PPTX is a ZIP; slides live in `ppt/slides/slide*.xml`)

```typescript
// src/lib/parsers/pptxParser.ts
import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';

export async function parsePptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  const slideTexts: string[] = [];
  for (const fileName of slideFiles) {
    const xml = await zip.files[fileName].async('string');
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    // Walk the XML tree to extract all <a:t> text nodes
    const texts = extractTextNodes(parsed);
    if (texts.length > 0) slideTexts.push(texts.join(' '));
  }
  return slideTexts.join('\n\n');
}

function extractTextNodes(obj: unknown): string[] {
  if (typeof obj === 'string') return [obj];
  if (Array.isArray(obj)) return obj.flatMap(extractTextNodes);
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([key, val]) =>
      key === 'a:t' ? extractTextNodes(val) : extractTextNodes(val)
    );
  }
  return [];
}
```

**Step 4: Excel/CSV parser**

```typescript
// src/lib/parsers/xlsxParser.ts
import * as XLSX from 'xlsx';

export async function parseXlsx(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const lines: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(`Sheet: ${sheetName}\n${csv}`);
  }
  return lines.join('\n\n');
}
```

**Step 5: Plain text parser**

```typescript
// src/lib/parsers/textParser.ts
export async function parseText(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8').trim();
}
```

**Step 6: Router / entry point**

```typescript
// src/lib/parsers/index.ts
import { parsePdf } from './pdfParser';
import { parseDocx } from './docxParser';
import { parsePptx } from './pptxParser';
import { parseXlsx } from './xlsxParser';
import { parseText } from './textParser';

export type SupportedMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'text/csv'
  | 'text/plain';

const EXTENSION_MIME: Record<string, SupportedMimeType> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
};

export function getMimeFromExtension(filename: string): SupportedMimeType | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[ext] ?? null;
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: SupportedMimeType
): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return parsePdf(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocx(buffer);
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return parsePptx(buffer);
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'text/csv':
      return parseXlsx(buffer);
    case 'text/plain':
      return parseText(buffer);
  }
}
```

**Step 7: Commit**

```bash
git add src/lib/parsers/
git commit -m "feat: add document parsers for PDF, DOCX, PPTX, XLSX, TXT"
```

---

## Task 4: LangGraph Agent Pipeline

Three specialized agent nodes wired into a LangGraph `StateGraph`. State flows through the graph; each node reads from state and writes its output back into state. The graph compiles to a single runnable invoked by the API route.

```
START → contentStructureNode → outlineNode → slideWriterNode → END
```

**Files:**
- Create: `src/lib/llm.ts` — shared ChatOpenAI instance
- Create: `src/agents/state.ts` — LangGraph state annotation
- Create: `src/agents/nodes/contentStructureNode.ts`
- Create: `src/agents/nodes/outlineNode.ts`
- Create: `src/agents/nodes/slideWriterNode.ts`
- Create: `src/agents/graph.ts` — StateGraph definition + compile
- Create: `src/agents/index.ts` — public `runGenerationPipeline()` entry point

**Step 1: Shared LLM client**

```typescript
// src/lib/llm.ts
import { ChatOpenAI } from '@langchain/openai';

export function createLLM() {
  return new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL ?? 'gpt-4o',
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7,
  });
}
```

**Step 2: Graph state annotation**

LangGraph uses `Annotation` to declare the shared state that all nodes read from and write to. Each field is typed; nodes return partial updates.

```typescript
// src/agents/state.ts
import { Annotation } from '@langchain/langgraph';
import type { PresentationConfig, SlideOutline } from '@/types';

export const GraphState = Annotation.Root({
  // Inputs — set once before graph runs
  documentText: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),
  config: Annotation<PresentationConfig>({
    reducer: (_, y) => y,
    default: () => ({} as PresentationConfig),
  }),

  // Agent 1 output
  mainTopic: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),
  keyThemes: Annotation<string[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  summary: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),

  // Agent 2 output
  slideTitles: Annotation<Array<{ index: number; title: string }>>({
    reducer: (_, y) => y,
    default: () => [],
  }),

  // Agent 3 output — final result
  slides: Annotation<SlideOutline[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
});

export type PipelineState = typeof GraphState.State;
```

**Step 3: Content Structure Node**

System prompt: extract the main topic, key themes, and a summary from the document.

```typescript
// src/agents/nodes/contentStructureNode.ts
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function contentStructureNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { documentText, config } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a content analyst. Given document text and a user's presentation goal, ` +
      `extract the main topic, 3-7 key themes, and a 2-sentence summary. ` +
      `Respond in ${config.language}. ` +
      `Output ONLY valid JSON: { "mainTopic": string, "keyThemes": string[], "summary": string }`
    ),
    new HumanMessage(
      `User goal: ${config.userPrompt}\n\nDocument text:\n${documentText.slice(0, 8000)}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  return {
    mainTopic: parsed.mainTopic,
    keyThemes: parsed.keyThemes,
    summary: parsed.summary,
  };
}
```

**Step 4: Outline Node**

System prompt: produce exactly N slide titles from the content structure.

```typescript
// src/agents/nodes/outlineNode.ts
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import type { PipelineState } from '../state';

export async function outlineNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { mainTopic, keyThemes, summary, config } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a presentation architect. Create exactly ${config.slideCount} slide titles ` +
      `for a ${config.tone.toLowerCase()} presentation. Slide 1 is always the title/intro slide. ` +
      `Respond in ${config.language}. ` +
      `Output ONLY valid JSON: { "slides": [{ "index": number, "title": string }] }`
    ),
    new HumanMessage(
      `Topic: ${mainTopic}\nSummary: ${summary}\nKey themes: ${keyThemes.join(', ')}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  return { slideTitles: parsed.slides };
}
```

**Step 5: Slide Writer Node**

System prompt: write 3-5 bullet points for each slide title.

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
  const { slideTitles, documentText, config } = state;
  const llm = createLLM();

  const response = await llm.invoke([
    new SystemMessage(
      `You are a slide content writer. For each slide title, write 3-5 concise bullet points. ` +
      `Tone: ${config.tone}. Language: ${config.language}. Use facts from the document where relevant. ` +
      `Output ONLY valid JSON: { "slides": [{ "index": number, "title": string, "bullets": string[] }] }`
    ),
    new HumanMessage(
      `Slide titles: ${JSON.stringify(slideTitles)}\n\nSource document excerpt:\n${documentText.slice(0, 6000)}`
    ),
  ]);

  const parsed = JSON.parse(response.content as string);
  const slides: SlideOutline[] = (
    parsed.slides as Array<{ index: number; title: string; bullets: string[] }>
  ).map((s) => ({ ...s, id: uuidv4() }));

  return { slides };
}
```

**Step 6: Compile the graph**

Wire the three nodes as a linear chain. LangGraph's `StateGraph` manages state passing between nodes automatically.

```typescript
// src/agents/graph.ts
import { StateGraph } from '@langchain/langgraph';
import { GraphState } from './state';
import { contentStructureNode } from './nodes/contentStructureNode';
import { outlineNode } from './nodes/outlineNode';
import { slideWriterNode } from './nodes/slideWriterNode';

const workflow = new StateGraph(GraphState)
  .addNode('contentStructure', contentStructureNode)
  .addNode('outline', outlineNode)
  .addNode('slideWriter', slideWriterNode)
  .addEdge('__start__', 'contentStructure')
  .addEdge('contentStructure', 'outline')
  .addEdge('outline', 'slideWriter')
  .addEdge('slideWriter', '__end__');

export const presentationGraph = workflow.compile();
```

**Step 7: Public entry point**

```typescript
// src/agents/index.ts
import { presentationGraph } from './graph';
import type { PresentationConfig, SlideOutline } from '@/types';

export async function runGenerationPipeline(
  documentText: string,
  config: PresentationConfig
): Promise<SlideOutline[]> {
  const result = await presentationGraph.invoke({ documentText, config });
  return result.slides;
}
```

**Step 8: Commit**

```bash
git add src/lib/llm.ts src/agents/
git commit -m "feat: add 3-node LangGraph pipeline (contentStructure → outline → slideWriter)"
```

---

## Task 5: API Routes

**Files:**
- Create: `src/app/api/upload/route.ts` — receives file, returns extracted text
- Create: `src/app/api/generate/route.ts` — receives config + documentText, returns slides

**Step 1: Upload route** (max 10 MB)

```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseDocument, getMimeFromExtension, SupportedMimeType } from '@/lib/parsers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
  }

  const mimeType = getMimeFromExtension(file.name) as SupportedMimeType | null;
  if (!mimeType) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await parseDocument(buffer, mimeType);

  if (!text || text.length < 10) {
    return NextResponse.json({ error: 'Could not extract text from file' }, { status: 422 });
  }

  return NextResponse.json({ text, charCount: text.length });
}
```

**Step 2: Generate route**

```typescript
// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runGenerationPipeline } from '@/agents';
import type { GenerateRequest } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body: GenerateRequest = await req.json();

  if (!body.documentText || !body.config) {
    return NextResponse.json({ error: 'Missing documentText or config' }, { status: 400 });
  }

  const slides = await runGenerationPipeline(body.documentText, body.config);
  return NextResponse.json({ slides });
}
```

**Step 3: Commit**

```bash
git add src/app/api/
git commit -m "feat: add /api/upload and /api/generate API routes"
```

---

## Task 6: Configuration Bar Component

**Files:**
- Create: `src/components/ConfigBar.tsx`

**Step 1: Write component**

```tsx
// src/components/ConfigBar.tsx
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Tone, Language, PresentationConfig } from '@/types';

const TONES: Tone[] = ['Standard', 'Professional', 'Casual', 'Academic'];
const LANGUAGES: Language[] = ['English', 'Turkish', 'Spanish', 'French', 'German'];
const SLIDE_COUNTS = [3, 5, 7, 10, 15];

interface Props {
  config: PresentationConfig;
  onChange: (config: PresentationConfig) => void;
  disabled?: boolean;
}

export function ConfigBar({ config, onChange, disabled }: Props) {
  const update = (patch: Partial<PresentationConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <div className="flex items-center gap-2">
      {/* Tone */}
      <Select
        value={config.tone}
        onValueChange={(v) => update({ tone: v as Tone })}
        disabled={disabled}
      >
        <SelectTrigger className="w-36 rounded-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TONES.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Slide count */}
      <Select
        value={String(config.slideCount)}
        onValueChange={(v) => update({ slideCount: Number(v) })}
        disabled={disabled}
      >
        <SelectTrigger className="w-32 rounded-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SLIDE_COUNTS.map((n) => (
            <SelectItem key={n} value={String(n)}>{n} slides</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Language */}
      <Select
        value={config.language}
        onValueChange={(v) => update({ language: v as Language })}
        disabled={disabled}
      >
        <SelectTrigger className="w-36 rounded-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l} value={l}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ConfigBar.tsx
git commit -m "feat: add ConfigBar component with tone/slides/language selects"
```

---

## Task 7: File Upload Component

**Files:**
- Create: `src/components/FileUpload.tsx`

**Step 1: Write component**

```tsx
// src/components/FileUpload.tsx
'use client';

import { useRef, useState, DragEvent } from 'react';
import { Button } from '@/components/ui/button';

const ACCEPTED = '.pdf,.txt,.docx,.pptx,.xlsx,.csv';
const ACCEPTED_LABEL = 'PDF, TXT, Word, PowerPoint, Excel/CSV';

interface Props {
  onFileParsed: (text: string, filename: string) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileParsed, onError, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);

  async function handleFile(file: File) {
    setFilename(file.name);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      onFileParsed(data.text, file.name);
    } catch (e) {
      onError((e as Error).message);
      setFilename(null);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>{filename ? `File: ${filename}` : 'No attachments yet'}</span>
        {filename && (
          <button
            className="hover:text-foreground"
            onClick={() => { setFilename(null); onFileParsed('', ''); }}
          >
            Clear all
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <div className="text-3xl mb-2">📎</div>
        {uploading ? (
          <p className="text-sm text-muted-foreground">Parsing document…</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Drag and drop {ACCEPTED_LABEL}, or{' '}
            <span className="text-primary underline">click to browse</span>
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/FileUpload.tsx
git commit -m "feat: add FileUpload component with drag-and-drop and file parsing"
```

---

## Task 8: Slide Card and Slide List Components

**Files:**
- Create: `src/components/SlideCard.tsx`
- Create: `src/components/SlideList.tsx`

**Step 1: SlideCard — inline-editable single slide**

```tsx
// src/components/SlideCard.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SlideOutline } from '@/types';

interface Props {
  slide: SlideOutline;
  dragHandleProps?: Record<string, unknown>;
  onUpdate: (updated: SlideOutline) => void;
  onDelete: (id: string) => void;
}

export function SlideCard({ slide, dragHandleProps, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slide);

  function save() {
    onUpdate(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(slide);
    setEditing(false);
  }

  return (
    <div className="flex gap-4 bg-white border rounded-xl p-4 shadow-sm">
      {/* Drag handle + index */}
      <div
        {...dragHandleProps}
        className="flex-none flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-500 font-mono text-sm cursor-grab select-none"
      >
        ⠿ {slide.index}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input
              className="w-full font-semibold text-base border-b focus:outline-none focus:border-primary"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <textarea
              className="w-full text-sm text-muted-foreground border rounded p-2 focus:outline-none focus:border-primary"
              rows={draft.bullets.length + 1}
              value={draft.bullets.join('\n')}
              onChange={(e) =>
                setDraft({ ...draft, bullets: e.target.value.split('\n').filter(Boolean) })
              }
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={save}>Save</Button>
              <Button size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div onClick={() => setEditing(true)} className="cursor-pointer group">
            <p className="font-semibold text-base group-hover:text-primary transition-colors">
              {slide.title}
            </p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-sm text-muted-foreground">
              {slide.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(slide.id)}
        className="flex-none text-muted-foreground hover:text-destructive transition-colors mt-1"
        title="Delete slide"
      >
        🗑
      </button>
    </div>
  );
}
```

**Step 2: SlideList — draggable list**

```tsx
// src/components/SlideList.tsx
'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { SlideCard } from './SlideCard';
import type { SlideOutline } from '@/types';

interface Props {
  slides: SlideOutline[];
  onChange: (slides: SlideOutline[]) => void;
}

export function SlideList({ slides, onChange }: Props) {
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const reordered = Array.from(slides);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    // Re-index
    onChange(reordered.map((s, i) => ({ ...s, index: i + 1 })));
  }

  function handleUpdate(updated: SlideOutline) {
    onChange(slides.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleDelete(id: string) {
    onChange(
      slides
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, index: i + 1 }))
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="slides">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-3"
          >
            {slides.map((slide, index) => (
              <Draggable key={slide.id} draggableId={slide.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    <SlideCard
                      slide={slide}
                      dragHandleProps={provided.dragHandleProps ?? undefined}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/SlideCard.tsx src/components/SlideList.tsx
git commit -m "feat: add SlideCard (inline editing) and SlideList (drag-to-reorder)"
```

---

## Task 9: Main Page — Wire Everything Together

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Write main page**

```tsx
// src/app/page.tsx
'use client';

import { useState } from 'react';
import { ConfigBar } from '@/components/ConfigBar';
import { FileUpload } from '@/components/FileUpload';
import { SlideList } from '@/components/SlideList';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { PresentationConfig, SlideOutline } from '@/types';

const DEFAULT_CONFIG: PresentationConfig = {
  tone: 'Standard',
  slideCount: 5,
  language: 'English',
  userPrompt: '',
};

type Stage = 'input' | 'generating' | 'slides';

export default function Home() {
  const [config, setConfig] = useState<PresentationConfig>(DEFAULT_CONFIG);
  const [documentText, setDocumentText] = useState('');
  const [slides, setSlides] = useState<SlideOutline[]>([]);
  const [stage, setStage] = useState<Stage>('input');
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!documentText && !config.userPrompt) {
      setError('Please upload a document or enter a description.');
      return;
    }
    setError(null);
    setStage('generating');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, documentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setSlides(data.slides);
      setStage('slides');
    } catch (e) {
      setError((e as Error).message);
      setStage('input');
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <h1 className="text-4xl font-bold text-center text-indigo-600 mb-2">
          Create Presentations with AI
        </h1>
        <p className="text-center text-muted-foreground mb-10">
          Choose a design, set preferences, and generate polished slides in minutes.
        </p>

        {stage !== 'slides' ? (
          <div className="space-y-6">
            {/* Configuration */}
            <div className="bg-white border rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="font-semibold text-lg">Configuration</h2>
                  <p className="text-sm text-muted-foreground">Choose slides, tone, and language preferences.</p>
                </div>
                <ConfigBar
                  config={config}
                  onChange={setConfig}
                  disabled={stage === 'generating'}
                />
              </div>
            </div>

            {/* Content */}
            <div className="bg-white border rounded-2xl p-6">
              <h2 className="font-semibold text-lg mb-3">Content</h2>
              <textarea
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={5}
                placeholder="Tell us about your presentation"
                value={config.userPrompt}
                onChange={(e) => setConfig({ ...config, userPrompt: e.target.value })}
                disabled={stage === 'generating'}
              />
            </div>

            {/* Attachments */}
            <div className="bg-white border rounded-2xl p-6">
              <h2 className="font-semibold text-lg mb-3">Attachments (optional)</h2>
              <FileUpload
                onFileParsed={(text) => setDocumentText(text)}
                onError={setError}
                disabled={stage === 'generating'}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              className="w-full py-6 text-base"
              onClick={generate}
              disabled={stage === 'generating'}
            >
              {stage === 'generating' ? '✨ Generating…' : '✨ Generate Presentation'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabs mock */}
            <div className="flex rounded-full border overflow-hidden">
              <div className="flex-1 text-center py-2 text-sm font-medium bg-white">
                Outline &amp; Content
              </div>
              <div className="flex-1 text-center py-2 text-sm font-medium text-muted-foreground bg-slate-50">
                Select Template
              </div>
            </div>

            <SlideList slides={slides} onChange={setSlides} />

            <Separator />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStage('input')}>
                ← Back
              </Button>
              <Button className="flex-1 py-5 text-base" disabled>
                🖼 Select a Template
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
```

**Step 2: Run dev server and manually test**

```bash
npm run dev
```

1. Open http://localhost:3000
2. Upload a PDF or DOCX
3. Enter a prompt, click Generate
4. Verify slides appear
5. Edit a slide title by clicking it, verify save works
6. Drag a slide to reorder, verify index updates
7. Delete a slide, verify it disappears

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire main page with config, upload, generation, and slide editing"
```

---

## Task 10: Lint, Type-Check, Build Verify

**Step 1: Run linting**

```bash
npm run lint
```
Fix any ESLint errors before proceeding.

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Fix any type errors.

**Step 3: Production build**

```bash
npm run build
```
Expected: build completes with no errors.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix lint/type errors, verify production build passes"
```

---

## Out of Scope (Next Layer)

The following are explicitly deferred:
- Web search input mode (topic → internet → content)
- Template selection and rendering (design layer)
- Authentication / saving presentations
- PPTX file export

---

## Environment Variables Reference

| Variable | Description | Example |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `OPENAI_MODEL` | Model name to pass to ChatOpenAI | `gpt-4o` or `gpt-5.2` |

Create `.env.local` (not committed) with these values before running.
