import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { NextRequest, NextResponse } from 'next/server';
import { createLLM } from '@/lib/llm';
import { searchPexelsImage } from '@/slide-renderer/pexels';
import type { SlideOutline } from '@/types';

export const runtime = 'nodejs';

interface SlideImageRequest {
  slide: SlideOutline;
  mode?: 'refresh' | 'generate';
}

function fallbackQueryFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7)
    .join(' ');
}

async function generateImageQuery(slide: SlideOutline): Promise<string> {
  const llm = createLLM();
  const response = await llm.invoke([
    new SystemMessage(
      `You create concise stock-photo search queries for business slides.\n` +
      `Return ONLY JSON: {"query": string}\n` +
      `Rules:\n` +
      `- 3 to 8 English words.\n` +
      `- Concrete visual terms (people, objects, scene).\n` +
      `- No brand names, no trademarks.\n` +
      `- If abstract topic, choose a representative workplace scene.`
    ),
    new HumanMessage(
      `Slide:\n${JSON.stringify({
        title: slide.title,
        slideType: slide.slideType,
        keyMessage: slide.keyMessage ?? '',
        bullets: slide.bullets.slice(0, 4),
      })}`
    ),
  ]);

  const raw = (response.content as string)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');

  const parsed = JSON.parse(raw) as { query?: string };
  const query = (parsed.query ?? '').trim();
  if (!query) throw new Error('Model returned empty image query');
  return query.slice(0, 120);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SlideImageRequest;
    const slide = body.slide;
    if (!slide?.id) {
      return NextResponse.json({ error: 'slide is required' }, { status: 400 });
    }

    const apiKey = process.env.PEXELS_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'PEXELS_API_KEY is missing on server. Add it to .env.local and restart Next.js.' },
        { status: 503 }
      );
    }

    let query = (slide.imageQuery ?? '').trim();
    if (!query || body.mode === 'generate') {
      try {
        query = await generateImageQuery(slide);
      } catch {
        query = fallbackQueryFromTitle(slide.title);
      }
    }

    if (!query) {
      return NextResponse.json({ error: 'Could not build a valid image query' }, { status: 422 });
    }

    const page = Math.floor(Math.random() * 20) + 1;
    let picked = await searchPexelsImage(query, apiKey, {
      page,
      perPage: 12,
      excludeImageUrl: slide.imageUrl,
    });
    if (!picked) {
      picked = await searchPexelsImage(query, apiKey, {
        page,
        perPage: 12,
      });
    }

    if (!picked) {
      return NextResponse.json({ error: 'No suitable image found for this slide' }, { status: 404 });
    }

    return NextResponse.json({
      image: {
        imageUrl: picked.imageUrl,
        imageThumbUrl: picked.thumbUrl,
        imageAlt: picked.alt,
        imagePhotographer: picked.photographer,
        imagePhotographerUrl: picked.photographerUrl,
        imagePexelsUrl: picked.pexelsUrl,
        imageAttributionLine: picked.attributionLine,
        imageQuery: picked.query,
        imageIntent: 'optional',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch slide image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
