import type { PipelineState } from '../state';
import type { TopicDesignProfile } from '@/types';

type TopicPaletteRule = {
  motif: string;
  match: RegExp;
  palette: TopicDesignProfile['palette'];
};

const TOPIC_PALETTE_RULES: TopicPaletteRule[] = [
  {
    motif: 'tier-cards-with-arrows',
    match: /automation|agentic|workflow|orchestration|tier/i,
    palette: {
      background: 'F2F6FA',
      surface: 'FFFFFF',
      text: '0F172A',
      mutedText: '5B6B82',
      accent: '0E7490',
      accentSoft: 'D9EEF2',
      divider: 'C8D7E3',
    },
  },
  {
    motif: 'risk-governance-grid',
    match: /risk|governance|compliance|control/i,
    palette: {
      background: 'F8F5EE',
      surface: 'FFFFFF',
      text: '1F2937',
      mutedText: '6B7280',
      accent: '8B5E34',
      accentSoft: 'F3E6D8',
      divider: 'D8C7B4',
    },
  },
];

function buildTopicText(state: PipelineState): string {
  return [
    state.config.userPrompt,
    state.mainTopic,
    state.summary,
    ...state.keyThemes,
    state.documentText.slice(0, 1200),
  ]
    .filter(Boolean)
    .join('\n');
}

function selectTopicDesign(topicText: string): TopicDesignProfile {
  for (const rule of TOPIC_PALETTE_RULES) {
    if (rule.match.test(topicText)) {
      return { motif: rule.motif, palette: rule.palette };
    }
  }

  return {
    motif: 'minimal-editorial',
    palette: {
      background: 'F8FAFC',
      surface: 'FFFFFF',
      text: '0F172A',
      mutedText: '64748B',
      accent: '2563EB',
      accentSoft: 'DBEAFE',
      divider: 'CBD5E1',
    },
  };
}

export function topicDesignNode(
  state: PipelineState
): Partial<PipelineState> {
  const topicText = buildTopicText(state);
  const topicDesignProfile = selectTopicDesign(topicText);

  if (state.config.topicPalette === 'fixed') {
    return { topicDesignProfile: undefined };
  }

  return {
    topicDesignProfile,
    config: {
      ...state.config,
      topicDesignProfile,
    },
  };
}

