import { NextRequest } from 'next/server';
import { runSlideRenderPipeline } from '@/slide-renderer';
import type { SlideRenderRequest } from '@/types/render';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SlideRenderRequest;

    if (!body?.slides || body.slides.length === 0) {
      return new Response(JSON.stringify({ error: 'Slides are required' }), { status: 400 });
    }
    if (!body?.templateId) {
      return new Response(JSON.stringify({ error: 'templateId is required' }), { status: 400 });
    }
    if (!body?.config) {
      return new Response(JSON.stringify({ error: 'config is required' }), { status: 400 });
    }

    const result = await runSlideRenderPipeline(body);
    const buffer = Buffer.from(result.base64, 'base64');

    return new Response(buffer, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to render presentation';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
