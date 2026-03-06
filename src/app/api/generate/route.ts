import { NextRequest } from 'next/server';
import { streamGenerationPipeline } from '@/agents';
import type { GenerateRequest } from '@/types';
import { normalizePresentationConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min — requires Vercel Pro

export async function POST(req: NextRequest) {
  const body: GenerateRequest = await req.json();

  if (!body.config) {
    return new Response(JSON.stringify({ type: 'error', message: 'Missing config' }), { status: 400 });
  }

  const normalizedConfig = normalizePresentationConfig(body.config);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamGenerationPipeline(body.documentText, normalizedConfig)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: (e as Error).message ?? 'Generation failed' })}\n\n`)
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
