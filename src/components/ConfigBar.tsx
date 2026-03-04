'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Tone, Language, Purpose, PresentationConfig } from '@/types';

const TONES: Tone[] = ['Standard', 'Professional', 'Casual', 'Academic'];
const LANGUAGES: Language[] = ['English', 'Turkish', 'Spanish', 'French', 'German'];
const PURPOSES: { value: Purpose; label: string }[] = [
  { value: 'inform', label: 'Inform' },
  { value: 'align', label: 'Align' },
  { value: 'decide', label: 'Decide' },
  { value: 'sell', label: 'Sell' },
];
const SLIDE_COUNTS = [3, 5, 7, 10, 15];

interface Props {
  config: PresentationConfig;
  onChange: (config: PresentationConfig) => void;
  disabled?: boolean;
}

export function ConfigBar({ config, onChange, disabled }: Props) {
  const update = (patch: Partial<PresentationConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        value={config.tone}
        onValueChange={(v) => update({ tone: v as Tone })}
        disabled={disabled}
      >
        <SelectTrigger className="w-full input-surface">
          <SelectValue placeholder="Tone" />
        </SelectTrigger>
        <SelectContent>
          {TONES.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(config.slideCount)}
        onValueChange={(v) => update({ slideCount: Number(v) })}
        disabled={disabled}
      >
        <SelectTrigger className="w-full input-surface">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SLIDE_COUNTS.map((n) => (
            <SelectItem key={n} value={String(n)}>{n} slides</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={config.language}
        onValueChange={(v) => update({ language: v as Language })}
        disabled={disabled}
      >
        <SelectTrigger className="w-full input-surface">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l} value={l}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={config.purpose}
        onValueChange={(v) => update({ purpose: v as Purpose })}
        disabled={disabled}
      >
        <SelectTrigger className="w-full input-surface">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PURPOSES.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        type="text"
        placeholder="Audience (e.g. Exec Board)"
        value={config.audience}
        onChange={(e) => update({ audience: e.target.value })}
        disabled={disabled}
        className="input-surface subtle-ring h-11 w-full px-4 text-sm disabled:opacity-50 sm:col-span-2 lg:col-span-4"
      />
    </div>
  );
}
