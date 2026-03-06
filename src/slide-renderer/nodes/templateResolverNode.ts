import { getDeckTemplateById, getDefaultDeckTemplate } from '@/slide-renderer/templates';
import type { SlideRenderPipelineState } from '@/slide-renderer/state';
import type { DeckTemplate } from '@/types/render';

function inferTopicProfileFromSlides(state: SlideRenderPipelineState) {
  const text = state.slides
    .flatMap((slide) => [slide.title, slide.keyMessage ?? '', slide.visualSuggestion ?? ''])
    .join('\n');
  if (/automation|agentic|workflow|tier/i.test(text)) {
    return {
      motif: 'tier-cards-with-arrows',
      palette: {
        background: 'F2F6FA',
        surface: 'FFFFFF',
        text: '0F172A',
        mutedText: '5B6B82',
        accent: '0E7490',
        accentSoft: 'D9EEF2',
        divider: 'C8D7E3',
      },
    };
  }
  return undefined;
}

function withTopicPalette(template: DeckTemplate, state: SlideRenderPipelineState): DeckTemplate {
  const designProfile = state.config.topicDesignProfile ?? inferTopicProfileFromSlides(state);
  const baseProfile = template.renderProfile ?? {
    topBar: 'solid',
    showSlideIndex: true,
    motifStyle: 'minimal',
  };

  if (state.config.topicPalette !== 'auto' || !designProfile) {
    return {
      ...template,
      renderProfile: baseProfile,
    };
  }

  return {
    ...template,
    palette: {
      ...template.palette,
      ...designProfile.palette,
    },
    renderProfile: {
      ...baseProfile,
      topBar: 'none',
      motifStyle: 'geometric',
    },
  };
}

export function templateResolverNode(
  state: SlideRenderPipelineState
): Partial<SlideRenderPipelineState> {
  const baseTemplate = getDeckTemplateById(state.templateId) ?? getDefaultDeckTemplate();
  const template = withTopicPalette(baseTemplate, state);
  return { template };
}
