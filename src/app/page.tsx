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
  audience: '',
  purpose: 'inform',
  useLlmExtraction: false,
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
              <div className="mb-4">
                <h2 className="font-semibold text-lg">Configuration</h2>
                <p className="text-sm text-muted-foreground">Choose slides, tone, language, audience, and purpose.</p>
              </div>
              <ConfigBar
                config={config}
                onChange={setConfig}
                disabled={stage === 'generating'}
              />
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
