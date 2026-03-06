#!/usr/bin/env npx tsx
/**
 * End-to-end test against the live Vercel deployment.
 * Usage: npx tsx scripts/test-vercel.ts
 */
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const BASE_URL = 'https://aldi-deckgen.vercel.app';
const DOC_PATH = path.join(process.cwd(), 'data', 'Document 3.docx');

async function step(label: string, fn: () => Promise<unknown>) {
  process.stdout.write(`\n[${label}] `);
  const start = Date.now();
  try {
    const result = await fn();
    console.log(`✓  ${Date.now() - start}ms`);
    return result;
  } catch (e) {
    console.log(`✗  ${(e as Error).message}`);
    process.exit(1);
  }
}

async function main() {
  console.log(`Testing ${BASE_URL}\n`);

  // 1. Upload the document
  const documentText = await step('Upload /api/upload', async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(DOC_PATH), 'Document 3.docx');
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      // @ts-expect-error node FormData headers
      headers: form.getHeaders(),
      // @ts-expect-error node FormData
      body: form,
    });
    const body = await res.json().catch(() => ({})) as { text?: string; error?: string };
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    console.log(`  charCount=${(body.text ?? '').length}`);
    return body.text ?? '';
  });

  // 2. Generate slides (SSE stream)
  const slides = await step('Generate /api/generate (5 slides)', async () => {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentText,
        config: {
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
        },
      }),
    });
    if (!res.body) throw new Error('No response stream');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let foundSlides = null;

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
        const event = JSON.parse(raw) as { type: string; node?: string; slides?: unknown[]; message?: string };
        if (event.type === 'stage') process.stdout.write(`  → ${event.node}`);
        if (event.type === 'error') throw new Error(event.message);
        if (event.type === 'done') foundSlides = event.slides;
      }
    }
    if (!foundSlides) throw new Error('No slides in response');
    console.log(`  → done (${(foundSlides as unknown[]).length} slides)`);
    return foundSlides;
  });

  // 3. Render PPTX
  await step('Render /api/render', async () => {
    const res = await fetch(`${BASE_URL}/api/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slides,
        config: {
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
        },
        templateId: 'reveal-black',
        fileName: 'test-output',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(process.cwd(), 'data', 'test-output.pptx');
    fs.writeFileSync(outPath, buf);
    console.log(`  saved → data/test-output.pptx (${(buf.length / 1024).toFixed(0)} KB)`);
  });

  console.log('\n✓ All steps passed\n');
}

main();
