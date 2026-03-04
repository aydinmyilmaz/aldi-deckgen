'use client';

import { useRef, useState, DragEvent } from 'react';
import { FileText, Loader2, UploadCloud } from 'lucide-react';

const ACCEPTED = '.pdf,.txt,.docx,.pptx,.xlsx,.csv';
const ACCEPTED_LABEL = 'PDF, TXT, Word, PowerPoint, Excel/CSV';

interface Props {
  onFileParsed: (text: string, filename: string) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileParsed, onError, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);

  async function handleFile(file: File) {
    setFilename(file.name);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      onFileParsed(data.text, file.name);
    } catch (e) {
      onError((e as Error).message);
      setFilename(null);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="truncate pr-4">{filename ? `Attached: ${filename}` : 'No attachments yet'}</span>
        {filename && (
          <button
            className="font-medium text-primary/85 transition-colors hover:text-primary"
            onClick={() => { setFilename(null); onFileParsed('', ''); }}
          >
            Clear all
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          hover-lift input-surface border-2 border-dashed p-8 text-center transition-all sm:p-10
          ${dragging ? 'border-primary bg-primary/10' : 'border-primary/25'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-sky-500/20 text-primary">
          {uploading ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
        </div>
        {uploading ? (
          <p className="text-sm font-medium text-muted-foreground">Parsing document...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Drag and drop {ACCEPTED_LABEL}
            </p>
            <p className="text-sm text-muted-foreground">
              or <span className="font-semibold text-primary">click to browse</span>
            </p>
          </div>
        )}
        {!uploading && (
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 px-3 py-1 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            Secure local parsing
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
