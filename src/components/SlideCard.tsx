'use client';

import { useState } from 'react';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { ChevronDown, ChevronUp, GripVertical, PencilLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SlideOutline } from '@/types';

interface Props {
  slide: SlideOutline;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
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
    <div className="slide-card hover-lift flex gap-4 p-4 sm:p-6">
      <div
        {...dragHandleProps}
        className="flex h-11 w-11 flex-none cursor-grab select-none items-center justify-center rounded-2xl border border-border/70 bg-slate-50/90 text-slate-500"
      >
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <GripVertical className="size-4" />
          {slide.index}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-3">
            <input
              className="subtle-ring w-full rounded-xl border border-border bg-white px-3 py-2 text-base font-semibold"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            {draft.keyMessage !== undefined && (
              <input
                className="subtle-ring w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-primary"
                placeholder="Key message"
                value={draft.keyMessage ?? ''}
                onChange={(e) => setDraft({ ...draft, keyMessage: e.target.value })}
              />
            )}
            <textarea
              className="subtle-ring w-full rounded-xl border border-border bg-white p-3 text-sm text-muted-foreground"
              rows={draft.bullets.length + 1}
              value={draft.bullets.join('\n')}
              onChange={(e) =>
                setDraft({ ...draft, bullets: e.target.value.split('\n').filter(Boolean) })
              }
            />
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={save}>Save</Button>
              <Button size="sm" variant="outline" onClick={cancel}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div onClick={() => setEditing(true)} className="group cursor-pointer">
            <div className="mb-1.5 flex items-start justify-between gap-4">
              <p className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary sm:text-2xl sm:leading-tight">
                {slide.title}
              </p>
              <span className="hidden flex-none items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex">
                <PencilLine className="size-3.5" />
                Edit
              </span>
            </div>
            <p className="sr-only">Click to edit slide</p>
            {slide.keyMessage && (
              <p className="mt-1 text-sm font-medium text-primary italic">
                {slide.keyMessage}
              </p>
            )}
            <ul className="mt-3 space-y-1.5 list-disc pl-5 text-sm text-muted-foreground sm:text-base">
              {slide.bullets.map((b, i) => (
                <li key={i} className="leading-relaxed">{b}</li>
              ))}
            </ul>
          </div>
        )}

        {slide.speakerNotes && (
          <div className="mt-4">
            <button
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setNotesOpen((o) => !o)}
            >
              {notesOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              Speaker notes
            </button>
            {notesOpen && (
              <p className="mt-2 rounded-xl border border-border/80 bg-slate-50/80 p-3 text-xs italic text-muted-foreground">
                {slide.speakerNotes}
              </p>
            )}
          </div>
        )}

        {slide.visualSuggestion && (
          <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
            <span className="font-semibold text-foreground">Visual:</span> {slide.visualSuggestion}
          </p>
        )}
      </div>

      <button
        onClick={() => onDelete(slide.id)}
        className="mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
        title="Delete slide"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
