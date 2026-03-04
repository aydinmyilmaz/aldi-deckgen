import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '@/lib/llm';
import { getPresentationGuidelines } from '@/lib/presentationGuidelines';
import type { PipelineState } from '../state';

export async function outlineNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const { mainTopic, keyThemes, summary, config, styleDna, extractedSlideContent } = state;
  const llm = createLLM();

  const topicHints = extractedSlideContent.length > 0
    ? `\n\nContent sections already extracted from document:\n${extractedSlideContent.map(s => `Slide ${s.slideIndex}: ${s.topic}`).join('\n')}\nUse these as the basis for your slide titles.`
    : '';

  const guidelines = getPresentationGuidelines(config);

  const response = await llm.invoke([
    new SystemMessage(
      `You are a presentation architect and storyteller. ` +
      `Design exactly ${config.slideCount} slides for a ${config.tone.toLowerCase()} deck. ` +
      `Audience: ${config.audience || 'general'}. Purpose: to ${config.purpose}. ` +
      `\n\nNarrative rule: follow the narrative pattern from the Style DNA below. ` +
      `\n\nSlide structure rules:\n` +
      `- Slide 1: always type "title". Use the main topic as a compelling headline.\n` +
      `- Slides 2 to ${config.slideCount - 1}: assign the most appropriate type for the content from this list:\n` +
      `  agenda, background, problem, objectives, method, findings, solution, implementation, benefits, content\n` +
      `  Choose based on what that slide covers. Not every type must be used — pick what fits.\n` +
      `- Slide ${config.slideCount}: type "conclusion" unless the deck ends with Q&A (type "qna") or sources (type "references").\n` +
      `\n\n${guidelines}` +
      `\n\nStyle DNA:\n${styleDna}` +
      topicHints +
      `\n\nRespond in ${config.language}. ` +
      `Output ONLY valid JSON: { "slides": [{ "index": number, "title": string, "slideType": string, "keyMessage": string, "visualSuggestion": string }] }`
    ),
    new HumanMessage(
      `Topic: ${mainTopic}\nSummary: ${summary}\nKey themes: ${keyThemes.join(', ')}`
    ),
  ]);

  const raw = (response.content as string).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(raw);
  return { slideTitles: parsed.slides };
}
