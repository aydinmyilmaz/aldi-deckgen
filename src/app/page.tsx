'use client';

import { useState } from 'react';
import { FileStack, LayoutTemplate, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { ConfigBar } from '@/components/ConfigBar';
import { FileUpload } from '@/components/FileUpload';
import { SlideList } from '@/components/SlideList';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { PresentationConfig, SlideOutline } from '@/types';

const DEFAULT_CONFIG: PresentationConfig = {
  tone: 'Standard',
  slideCount: 5,
  language: 'English',
  userPrompt: '',
  audience: '',
  purpose: 'inform',
  useLlmExtraction: false,
};

type Stage = 'input' | 'generating' | 'slides';

const STAGE_LABELS: Record<string, { label: string; hint: string }> = {
  documentExtraction: { label: 'Organizing document into slide blocks…', hint: 'LLM is splitting the extracted text into per-slide content sections' },
  extractStyleDna:    { label: 'Analyzing writing style…',    hint: 'Capturing tone, structure & language patterns' },
  contentStructure:   { label: 'Identifying key themes…',     hint: 'Finding main topics and supporting points' },
  outline:            { label: 'Building slide outline…',     hint: 'Structuring the flow and titling slides' },
  slideWriter:        { label: 'Writing slide content…',      hint: 'Creating bullets, key messages & speaker notes' },
  contentReviewer:    { label: 'Reviewing quality…',          hint: 'Checking rules — may trigger a revision pass' },
};

export default function Home() {
  const [config, setConfig] = useState<PresentationConfig>(DEFAULT_CONFIG);
  const [documentText, setDocumentText] = useState('');
  const [slides, setSlides] = useState<SlideOutline[]>([]);
  const [stage, setStage] = useState<Stage>('input');
  const [error, setError] = useState<string | null>(null);
  const [stageInfo, setStageInfo] = useState<{ label: string; hint: string; step: number }>({
    label: 'Starting…', hint: '', step: 0,
  });

  async function generate() {
    if (!documentText && !config.userPrompt) {
      setError('Please upload a document or enter a description.');
      return;
    }
    setError(null);
    setStage('generating');
    const totalSteps = config.useLlmExtraction ? 5 : 4;
    let step = 0;
    setStageInfo({ label: 'Preparing…', hint: 'Sending your content to the AI pipeline', step: 0 });

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
            const info = STAGE_LABELS[event.node] ?? { label: 'Processing…', hint: '' };
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
              </div>
              <Textarea
                rows={6}
                placeholder="Tell us about your presentation"
                value={config.userPrompt}
                onChange={(e) => setConfig({ ...config, userPrompt: e.target.value })}
                disabled={stage === 'generating'}
                className="resize-none text-base"
              />
            </section>

            <section className="surface-card hover-lift p-6 sm:p-8">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="section-label">Enhancement</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">AI Content Extraction</p>
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
            </section>

            <section className="surface-card hover-lift p-6 sm:p-8">
              <div className="mb-4">
                <p className="section-label">Optional</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Attachments</h2>
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
                    <Loader2 className="size-4 animate-spin" />
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
              <div className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-muted-foreground">
                <LayoutTemplate className="size-4" />
                Select Template
              </div>
            </div>

            <SlideList slides={slides} onChange={setSlides} />

            <Separator className="bg-border/70" />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => setStage('input')}>
                ← Back
              </Button>
              <Button className="h-11 flex-1 text-base" disabled>
                Select a Template
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
