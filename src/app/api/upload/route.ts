import { NextRequest, NextResponse } from 'next/server';
import { parseDocument, getMimeFromExtension, SupportedMimeType } from '@/lib/parsers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
