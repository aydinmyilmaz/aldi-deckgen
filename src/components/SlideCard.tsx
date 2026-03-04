'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SlideOutline } from '@/types';

interface Props {
  slide: SlideOutline;
  dragHandleProps?: Record<string, unknown>;
  onUpdate: (updated: SlideOutline) => void;
  onDelete: (id: string) => void;
}

export function SlideCard({ slide, dragHandleProps, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState(slide);

  function save() {
    onUpdate(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(slide);
    setEditing(false);
  }

  return (
    <div className="flex gap-4 bg-white border rounded-xl p-4 shadow-sm">
      {/* Drag handle + index */}
      <div
        {...dragHandleProps}
        className="flex-none flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-500 font-mono text-sm cursor-grab select-none"
      >
        ⠿ {slide.index}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input
              className="w-full font-semibold text-base border-b focus:outline-none focus:border-primary"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            {draft.keyMessage !== undefined && (
              <input
                className="w-full text-sm text-indigo-600 border-b focus:outline-none focus:border-primary"
                placeholder="Key message"
                value={draft.keyMessage ?? ''}
                onChange={(e) => setDraft({ ...draft, keyMessage: e.target.value })}
              />
            )}
            <textarea
              className="w-full text-sm text-muted-foreground border rounded p-2 focus:outline-none focus:border-primary"
              rows={draft.bullets.length + 1}
              value={draft.bullets.join('\n')}
              onChange={(e) =>
                setDraft({ ...draft, bullets: e.target.value.split('\n').filter(Boolean) })
              }
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={save}>Save</Button>
              <Button size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div onClick={() => setEditing(true)} className="cursor-pointer group">
            <p className="font-semibold text-base group-hover:text-primary transition-colors">
              {slide.title}
            </p>
            {slide.keyMessage && (
              <p className="mt-0.5 text-xs font-medium text-indigo-500 italic">
                ↳ {slide.keyMessage}
              </p>
            )}
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-sm text-muted-foreground">
              {slide.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Speaker notes toggle */}
        {slide.speakerNotes && (
          <div className="mt-2">
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => setNotesOpen((o) => !o)}
            >
              {notesOpen ? '▲' : '▼'} Speaker notes
            </button>
            {notesOpen && (
              <p className="mt-1 text-xs text-muted-foreground bg-slate-50 rounded p-2 italic">
                {slide.speakerNotes}
              </p>
            )}
          </div>
        )}

        {/* Visual suggestion */}
        {slide.visualSuggestion && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Visual:</span> {slide.visualSuggestion}
          </p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(slide.id)}
        className="flex-none text-muted-foreground hover:text-destructive transition-colors mt-1"
        title="Delete slide"
      >
        🗑
      </button>
    </div>
  );
}
