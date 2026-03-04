import { parsePdf } from './pdfParser';
import { parseDocx } from './docxParser';
import { parsePptx } from './pptxParser';
import { parseXlsx } from './xlsxParser';
import { parseText } from './textParser';

export type SupportedMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'text/csv'
  | 'text/plain';

const EXTENSION_MIME: Record<string, SupportedMimeType> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
};

export function getMimeFromExtension(filename: string): SupportedMimeType | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[ext] ?? null;
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: SupportedMimeType
): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return parsePdf(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocx(buffer);
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return parsePptx(buffer);
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'text/csv':
      return parseXlsx(buffer);
    case 'text/plain':
      return parseText(buffer);
  }
}
