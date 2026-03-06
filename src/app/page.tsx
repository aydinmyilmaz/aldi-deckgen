'use client';

import { useRef, useState, useEffect } from 'react';
import { Download, FileStack, LayoutTemplate, Sparkles, WandSparkles } from 'lucide-react';
import { ConfigBar } from '@/components/ConfigBar';
import { FileUpload } from '@/components/FileUpload';
import { SlideList } from '@/components/SlideList';
import { TemplatePicker } from '@/components/TemplatePicker';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { PresentationConfig, SlideOutline } from '@/types';
import type { DeckTemplateId } from '@/types/render';

const DEFAULT_CONFIG: PresentationConfig = {
  tone: 'Standard',
  slideCount: 5,
  language: 'English',
  userPrompt: '',
  audience: '',
  purpose: 'inform',
  useLlmExtraction: false,
  useRelatedImages: false,
  designMode: 'hybrid',
  qualityGate: 'balanced',
  topicPalette: 'auto',
};

type Stage = 'input' | 'generating' | 'slides';

const STAGE_LABELS: Record<string, { label: string; hint: string; emojis: string[] }> = {
  documentExtraction: { label: 'Organizing document…',       hint: 'Splitting extracted text into per-slide content blocks', emojis: ['📄','📋','🗂️','📑'] },
  extractStyleDna:    { label: 'Analyzing writing style…',   hint: 'Capturing tone, structure & language patterns',          emojis: ['🔍','🧬','✍️','🎨'] },
  contentStructure:   { label: 'Identifying key themes…',    hint: 'Finding main topics and supporting points',              emojis: ['🧠','💡','🗺️','🔑'] },
  blueprintRouter:    { label: 'Choosing blueprint…',        hint: 'Selecting domain blueprint when relevant',               emojis: ['🗺️','📐','🧭','🔀'] },
  topicDesign:        { label: 'Designing visual language…', hint: 'Picking topic-aware palette and motif',                  emojis: ['🎨','🖌️','✨','🌈'] },
  outline:            { label: 'Building slide outline…',    hint: 'Structuring the flow and titling slides',               emojis: ['📝','🏗️','📐','🗒️'] },
  slideWriter:        { label: 'Writing slide content…',     hint: 'Creating bullets, key messages & speaker notes',        emojis: ['✍️','💬','📊','🖊️'] },
  imageQueryPlanner:  { label: 'Planning images…',           hint: 'Generating search queries for slide visuals',           emojis: ['🖼️','📸','🔎','🌄'] },
  contentReviewer:    { label: 'Reviewing quality…',         hint: 'Checking rules — may trigger a revision pass',          emojis: ['🧐','✅','🔬','📋'] },
  planPlotSpec:       { label: 'Validating plot specs…',     hint: 'Grounding plot data in source content',                 emojis: ['📈','🔢','📉','🧮'] },
  planPlots:          { label: 'Rendering charts…',          hint: 'Generating chart visuals via Python renderer',          emojis: ['📊','📈','🎯','⚙️'] },
  visualQa:           { label: 'Running visual QA…',         hint: 'Converting slides to images and checking quality',      emojis: ['👁️','🔍','✨','🎯'] },
};

export default function Home() {
  const [config, setConfig] = useState<PresentationConfig>(DEFAULT_CONFIG);
  const [documentText, setDocumentText] = useState('');
  const [slides, setSlides] = useState<SlideOutline[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<DeckTemplateId>('reveal-black');
  const [stage, setStage] = useState<Stage>('input');
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const templateSectionRef = useRef<HTMLElement | null>(null);
  const [stageInfo, setStageInfo] = useState<{ label: string; hint: string; step: number; emojis: string[] }>({
    label: 'Starting…', hint: '', step: 0, emojis: ['⚡','🚀','✨','💫'],
  });
  const [emojiIdx, setEmojiIdx] = useState(0);

  useEffect(() => {
    if (stage !== 'generating') return;
    setEmojiIdx(0);
    const id = setInterval(() => setEmojiIdx((i) => (i + 1) % stageInfo.emojis.length), 600);
    return () => clearInterval(id);
  }, [stage, stageInfo.emojis]);

  async function generate() {
    if (!documentText && !config.userPrompt) {
      setError('Please upload a document or enter a description.');
      return;
    }
    setError(null);
    setStage('generating');
    const totalSteps = config.useLlmExtraction ? 5 : 4;
    let step = 0;
    setStageInfo({ label: 'Preparing…', hint: 'Sending your content to the AI pipeline', step: 0, emojis: ['⚡','🚀','✨','💫'] });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, documentText }),
      });
      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          const event = JSON.parse(raw) as { type: string; node?: string; slides?: SlideOutline[]; message?: string };
          if (event.type === 'error') throw new Error(event.message);
          if (event.type === 'stage' && event.node) {
            step += 1;
            const info = STAGE_LABELS[event.node] ?? { label: 'Processing…', hint: '', emojis: ['⚡','🔄','✨','💫'] };
            setStageInfo({ ...info, step });
          }
          if (event.type === 'done' && event.slides) {
            setSlides(event.slides);
            setStage('slides');
          }
        }
      }
      void totalSteps;
    } catch (e) {
      setError((e as Error).message);
      setStage('input');
    }
  }

  async function exportPptx() {
    if (slides.length === 0) {
      setError('No slides to export.');
      return;
    }

    setError(null);
    setIsExporting(true);

    try {
      const firstTitle = slides.find((slide) => slide.index === 1)?.title ?? 'presentation';
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides,
          config,
          templateId: selectedTemplateId,
          fileName: firstTitle,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to render PPTX');
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') ?? '';
      const match = contentDisposition.match(/filename="(.+)"/i);
      const fileName = match?.[1] ?? 'presentation.pptx';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsExporting(false);
    }
  }

  function focusTemplateSection() {
    templateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSlideImageRefresh(slide: SlideOutline, mode: 'refresh' | 'generate') {
    try {
      const res = await fetch('/api/slide-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slide, mode }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'Failed to load slide image');
      }

      const image = (data as { image?: Partial<SlideOutline> }).image;
      if (!image) {
        throw new Error('No image returned');
      }

      setSlides((current) =>
        current.map((item) =>
          item.id === slide.id
            ? {
                ...item,
                ...image,
              }
            : item
        )
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 text-center fade-in-up sm:mb-12">
          <span className="glass-chip">
            <Sparkles className="size-4" />
            AI Deck Studio
          </span>
          <h1 className="section-title mt-4">
            Create Presentations with AI
          </h1>
          <p className="section-subtitle">
            Choose a design, set preferences, and generate polished slides in minutes.
          </p>
        </header>

        {stage !== 'slides' ? (
          <div className="space-y-6 fade-in-up">
            <section className="surface-card hover-lift p-6 sm:p-8">
              <div className="mb-5">
                <p className="section-label">Setup</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Configuration</h2>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">Choose slides, tone, language, audience, and purpose.</p>
              </div>
              <ConfigBar
                config={config}
                onChange={setConfig}
                disabled={stage === 'generating'}
              />
            </section>

            <section className="surface-card hover-lift p-6 sm:p-8">
              <div className="mb-4">
                <p className="section-label">Input</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Content</h2>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  Describe your presentation topic. No file required — AI generates slides from your description alone.
                </p>
              </div>
              <Textarea
                rows={6}
                placeholder="e.g. A 5-slide overview of our Q4 sales strategy targeting enterprise clients"
                value={config.userPrompt}
                onChange={(e) => setConfig({ ...config, userPrompt: e.target.value })}
                disabled={stage === 'generating'}
                className="resize-none text-base"
              />
            </section>

            <section className="surface-card hover-lift p-6 sm:p-8">
              <div className="space-y-5">
                <div>
                  <p className="section-label">Enhancement</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">AI Enhancements</p>
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-base font-semibold text-foreground">AI Content Extraction</p>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                      Use GPT to organize the document into per-slide content blocks before generating.
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={config.useLlmExtraction}
                    onClick={() => setConfig({ ...config, useLlmExtraction: !config.useLlmExtraction })}
                    disabled={stage === 'generating'}
                    className={`
                    subtle-ring relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50
                    ${config.useLlmExtraction ? 'bg-primary' : 'bg-slate-300'}
                  `}
                  >
                    <span
                      className={`
                      inline-block h-6 w-6 transform rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.2)] transition-transform
                      ${config.useLlmExtraction ? 'translate-x-7' : 'translate-x-1'}
                    `}
                    />
                  </button>
                </label>

                <Separator className="bg-border/60" />

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-base font-semibold text-foreground">Related Images (Pexels)</p>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                      Ask AI to generate per-slide image search queries for optional visual enrichment.
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={config.useRelatedImages}
                    onClick={() => setConfig({ ...config, useRelatedImages: !config.useRelatedImages })}
                    disabled={stage === 'generating'}
                    className={`
                    subtle-ring relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50
                    ${config.useRelatedImages ? 'bg-primary' : 'bg-slate-300'}
                  `}
                  >
                    <span
                      className={`
                      inline-block h-6 w-6 transform rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.2)] transition-transform
                      ${config.useRelatedImages ? 'translate-x-7' : 'translate-x-1'}
                    `}
                    />
                  </button>
                </label>
              </div>
            </section>

            <section className="surface-card hover-lift p-6 sm:p-8">
              <div className="mb-4">
                <p className="section-label">Optional</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Attachments</h2>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  Upload a document to ground the AI in your source material. Supports PDF, DOCX, PPTX, XLSX, CSV, TXT.
                </p>
              </div>
              <FileUpload
                onFileParsed={(text) => setDocumentText(text)}
                onError={setError}
                disabled={stage === 'generating'}
              />
            </section>

            {error && (
              <p className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button
              className="h-auto w-full gap-1 py-5 text-base sm:text-lg"
              onClick={generate}
              disabled={stage === 'generating'}
            >
              {stage === 'generating' ? (
                <>
                  <span className="flex items-center gap-2">
                    <span className="text-lg leading-none" style={{ display: 'inline-block', minWidth: '1.4rem', textAlign: 'center' }}>
                      {stageInfo.emojis[emojiIdx]}
                    </span>
                    {stageInfo.label}
                  </span>
                  {stageInfo.hint && (
                    <span className="text-xs font-normal opacity-75">{stageInfo.hint}</span>
                  )}
                </>
              ) : (
                <>
                  <WandSparkles className="size-4" />
                  Generate Presentation
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5 fade-in-up">
            <div className="surface-card flex overflow-hidden rounded-full border p-1">
              <div className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-foreground">
                <FileStack className="size-4" />
                Outline &amp; Content
              </div>
              <button
                type="button"
                onClick={focusTemplateSection}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
              >
                <LayoutTemplate className="size-4" />
                Select Template ↓
              </button>
            </div>

            {error && (
              <p className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <SlideList
              slides={slides}
              onChange={setSlides}
              onImageRefresh={handleSlideImageRefresh}
              imageActionsDisabled={isExporting}
            />

            <section ref={templateSectionRef} className="surface-card hover-lift p-5 sm:p-6">
              <div className="mb-4">
                <p className="section-label">Template</p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">Select a Slide Design</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is the active selector. Pick one template, then export your .pptx.
                </p>
              </div>
              <TemplatePicker
                selectedTemplateId={selectedTemplateId}
                onSelect={setSelectedTemplateId}
                disabled={isExporting}
              />
            </section>

            <Separator className="bg-border/70" />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => setStage('input')}>
                ← Back
              </Button>
              <Button className="h-11 flex-1 text-base" onClick={exportPptx} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <span className="animate-spin text-base">⚙️</span>
                    Building deck...
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Export .pptx
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
