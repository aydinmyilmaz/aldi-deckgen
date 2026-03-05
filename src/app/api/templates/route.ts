import { NextResponse } from 'next/server';
import { getTemplateLibrary } from '@/slide-renderer';

export const runtime = 'nodejs';

export async function GET() {
  const templates = getTemplateLibrary().map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    backgroundStyle: template.backgroundStyle,
    source: template.source,
    palette: template.palette,
  }));

  return NextResponse.json({ templates });
}
