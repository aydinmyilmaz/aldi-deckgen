import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';

export async function parsePptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  const slideTexts: string[] = [];
  for (const fileName of slideFiles) {
    const xml = await zip.files[fileName].async('string');
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const texts = extractTextNodes(parsed);
    if (texts.length > 0) slideTexts.push(texts.join(' '));
  }
  return slideTexts.join('\n\n');
}

function extractTextNodes(obj: unknown): string[] {
  if (typeof obj === 'string') return [obj];
  if (Array.isArray(obj)) return obj.flatMap(extractTextNodes);
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([key, val]) =>
      key === 'a:t' ? extractTextNodes(val) : extractTextNodes(val)
    );
  }
  return [];
}
