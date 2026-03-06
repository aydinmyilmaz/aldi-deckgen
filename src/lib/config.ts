import type {
  BlueprintId,
  DesignMode,
  PresentationConfig,
  QualityGate,
  TopicDesignProfile,
  TopicPaletteMode,
} from '@/types';

const DEFAULT_DESIGN_MODE: DesignMode = 'hybrid';
const DEFAULT_QUALITY_GATE: QualityGate = 'balanced';
const DEFAULT_TOPIC_PALETTE: TopicPaletteMode = 'auto';

function isDesignMode(value: unknown): value is DesignMode {
  return value === 'general' || value === 'blueprint' || value === 'hybrid';
}

function isQualityGate(value: unknown): value is QualityGate {
  return value === 'fast' || value === 'balanced' || value === 'strict';
}

function isTopicPaletteMode(value: unknown): value is TopicPaletteMode {
  return value === 'auto' || value === 'fixed';
}

function isBlueprintId(value: unknown): value is BlueprintId {
  return value === 'automation-decision-framework-13';
}

function asColorHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim().replace(/^#/, '').toUpperCase();
  return /^[0-9A-F]{6}$/.test(cleaned) ? cleaned : fallback;
}

function normalizeTopicDesignProfile(value: unknown): TopicDesignProfile | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const motif = typeof candidate.motif === 'string' ? candidate.motif.trim() : '';
  const palette = candidate.palette;
  if (!motif || !palette || typeof palette !== 'object') return undefined;
  const paletteObj = palette as Record<string, unknown>;

  return {
    motif,
    palette: {
      background: asColorHex(paletteObj.background, 'FFFFFF'),
      surface: asColorHex(paletteObj.surface, 'F8FAFC'),
      text: asColorHex(paletteObj.text, '1E293B'),
      mutedText: asColorHex(paletteObj.mutedText, '64748B'),
      accent: asColorHex(paletteObj.accent, '2563EB'),
      accentSoft: asColorHex(paletteObj.accentSoft, 'DBEAFE'),
      divider: asColorHex(paletteObj.divider, 'CBD5E1'),
    },
  };
}

export function normalizePresentationConfig(config: PresentationConfig): PresentationConfig {
  const raw = config as unknown as Record<string, unknown>;
  const designMode = isDesignMode(raw.designMode)
    ? config.designMode
    : DEFAULT_DESIGN_MODE;
  const qualityGate = isQualityGate(raw.qualityGate)
    ? config.qualityGate
    : DEFAULT_QUALITY_GATE;
  const topicPalette = isTopicPaletteMode(raw.topicPalette)
    ? config.topicPalette
    : DEFAULT_TOPIC_PALETTE;
  const blueprintId = isBlueprintId(raw.blueprintId)
    ? config.blueprintId
    : undefined;
  const topicDesignProfile = normalizeTopicDesignProfile(raw.topicDesignProfile);

  return {
    ...config,
    designMode,
    qualityGate,
    topicPalette,
    blueprintId,
    ...(topicDesignProfile ? { topicDesignProfile } : {}),
  };
}
