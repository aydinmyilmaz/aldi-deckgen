import { detectAutomationBlueprintIntent } from '@/agents/blueprints';
import type { BlueprintId, PresentationConfig } from '@/types';
import type { PipelineState } from '../state';

function resolveBlueprintId(state: PipelineState): BlueprintId | undefined {
  if (state.config.designMode === 'hybrid' && state.config.slideCount < 10) {
    return undefined;
  }

  const combinedText = [
    state.config.userPrompt,
    state.documentText.slice(0, 2400),
    state.mainTopic,
    state.summary,
    ...state.keyThemes,
  ]
    .filter(Boolean)
    .join('\n');

  if (detectAutomationBlueprintIntent(combinedText)) {
    return 'automation-decision-framework-13';
  }
  return undefined;
}

function applyBlueprintConfig(
  config: PresentationConfig,
  blueprintId: BlueprintId | undefined
): PresentationConfig {
  if (!blueprintId) {
    return { ...config, blueprintId: undefined };
  }

  return {
    ...config,
    blueprintId,
    slideCount: blueprintId === 'automation-decision-framework-13' ? 13 : config.slideCount,
  };
}

export function blueprintRouterNode(
  state: PipelineState
): Partial<PipelineState> {
  const mode = state.config.designMode;
  if (mode === 'general') {
    return { config: { ...state.config, blueprintId: undefined } };
  }

  const explicit = state.config.blueprintId;
  const detected = resolveBlueprintId(state);
  const blueprintId = mode === 'blueprint' ? explicit ?? detected ?? 'automation-decision-framework-13' : explicit ?? detected;

  return {
    config: applyBlueprintConfig(state.config, blueprintId),
  };
}
