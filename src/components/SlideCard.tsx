'use client';

import { useState } from 'react';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { ChevronDown, ChevronUp, ExternalLink, GripVertical, ImagePlus, Loader2, PencilLine, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SlideOutline } from '@/types';

interface Props {
  slide: SlideOutline;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  onUpdate: (updated: SlideOutline) => void;
  onDelete: (id: string) => void;
  onImageRefresh: (slide: SlideOutline, mode: 'refresh' | 'generate') => Promise<void>;
  imageActionsDisabled?: boolean;
}

export function SlideCard({
  slide,
  dragHandleProps,
  onUpdate,
  onDelete,
  onImageRefresh,
  imageActionsDisabled,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [draft, setDraft] = useState(slide);

  function save() {
    onUpdate(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(slide);
    setEditing(false);
  }

  async function handleImageAction(mode: 'refresh' | 'generate') {
    setImageLoading(true);
    try {
      await onImageRefresh(slide, mode);
    } finally {
      setImageLoading(false);
    }
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

      <div className="w-52 flex-none space-y-2">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-slate-50/70">
          {slide.imageThumbUrl || slide.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.imageThumbUrl || slide.imageUrl}
              alt={slide.imageAlt || `${slide.title} image`}
              className="h-28 w-full object-cover"
            />
          ) : (
            <div className="flex h-28 items-center justify-center text-muted-foreground">
              <ImagePlus className="size-5" />
            </div>
          )}
        </div>

        {slide.imageQuery && (
          <p className="line-clamp-2 text-[11px] text-muted-foreground">
            Query: <span className="font-medium text-foreground">{slide.imageQuery}</span>
          </p>
        )}

        {slide.imagePexelsUrl && (
          <a
            href={slide.imagePexelsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Source
            <ExternalLink className="size-3" />
          </a>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 flex-1"
            onClick={() => void handleImageAction(slide.imageUrl ? 'refresh' : 'generate')}
            disabled={imageLoading || imageActionsDisabled}
          >
            {imageLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Loading
              </>
            ) : slide.imageUrl ? (
              <>
                <RefreshCw className="size-3.5" />
                Refresh
              </>
            ) : (
              <>
                <ImagePlus className="size-3.5" />
                Generate
              </>
            )}
          </Button>
        </div>
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
