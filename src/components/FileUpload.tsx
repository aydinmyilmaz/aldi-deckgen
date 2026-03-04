'use client';

import { useRef, useState, DragEvent } from 'react';

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
    <div>
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>{filename ? `File: ${filename}` : 'No attachments yet'}</span>
        {filename && (
          <button
            className="hover:text-foreground"
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
          border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <div className="text-3xl mb-2">📎</div>
        {uploading ? (
          <p className="text-sm text-muted-foreground">Parsing document…</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Drag and drop {ACCEPTED_LABEL}, or{' '}
            <span className="text-primary underline">click to browse</span>
          </p>
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
