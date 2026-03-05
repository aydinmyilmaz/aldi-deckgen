'use client';

import { useEffect, useState } from 'react';
import type { DeckTemplateId } from '@/types/render';

interface TemplateCard {
  id: DeckTemplateId;
  name: string;
  description: string;
  backgroundStyle: 'solid-clean' | 'cool-gradient' | 'dark-radial' | 'warm-paper' | 'neon-glow';
  source: {
    project: string;
    themeName: string;
    url: string;
    license: string;
  };
  palette: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    accentSoft: string;
    divider: string;
  };
}

interface Props {
  selectedTemplateId: DeckTemplateId;
  onSelect: (templateId: DeckTemplateId) => void;
  disabled?: boolean;
}

function getPreviewBackground(template: TemplateCard): string {
  switch (template.backgroundStyle) {
    case 'cool-gradient':
      return `radial-gradient(circle at 15% 15%, #${template.palette.accentSoft}, #${template.palette.background} 55%)`;
    case 'dark-radial':
      return `radial-gradient(circle at 50% -10%, #${template.palette.surface}, #${template.palette.background} 62%)`;
    case 'warm-paper':
      return `radial-gradient(circle at 100% 0%, #${template.palette.accentSoft}, #${template.palette.background} 60%)`;
    case 'neon-glow':
      return `radial-gradient(circle at 85% 12%, #${template.palette.accentSoft}, #${template.palette.background} 58%)`;
    case 'solid-clean':
    default:
      return `#${template.palette.background}`;
  }
}

export function TemplatePicker({ selectedTemplateId, onSelect, disabled }: Props) {
  const [templates, setTemplates] = useState<TemplateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/templates');
        const data = (await res.json()) as { templates?: TemplateCard[]; error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load templates');
        if (mounted) setTemplates(data.templates ?? []);
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading template library...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const selected = template.id === selectedTemplateId;
        return (
          <button
            key={template.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(template.id)}
            className={[
              'group rounded-2xl border p-3 text-left transition-all',
              selected ? 'border-primary ring-2 ring-primary/30' : 'border-border/80 hover:border-primary/40',
              disabled ? 'opacity-60 pointer-events-none' : 'hover:shadow-md',
            ].join(' ')}
          >
            <div
              className="mb-3 overflow-hidden rounded-xl border border-border/60"
              style={{ background: getPreviewBackground(template) }}
            >
              <div className="h-2.5" style={{ background: `#${template.palette.accent}` }} />
              <div className="p-2.5">
                <div
                  className="mb-1 h-2.5 w-3/4 rounded"
                  style={{ background: `#${template.palette.text}` }}
                />
                <div
                  className="mb-2 h-2 w-1/2 rounded"
                  style={{ background: `#${template.palette.mutedText}` }}
                />
                <div
                  className="h-8 rounded-md border"
                  style={{
                    borderColor: `#${template.palette.divider}`,
                    background: `#${template.palette.surface}`,
                  }}
                />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">{template.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Source: {template.source.project} / {template.source.themeName} ({template.source.license})
            </p>
          </button>
        );
      })}
    </div>
  );
}
