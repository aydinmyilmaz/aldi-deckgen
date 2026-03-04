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
