import { ChatOpenAI } from '@langchain/openai';

export function createLLM() {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o';
  // Reasoning models (o1, o3, o4-mini, …) only support temperature=1 (default)
  const isReasoningModel = /^o\d/.test(model);
  return new ChatOpenAI({
    modelName: model,
    openAIApiKey: process.env.OPENAI_API_KEY,
    ...(isReasoningModel ? {} : { temperature: 0.7 }),
  });
}
