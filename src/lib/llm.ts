import { ChatOpenAI } from '@langchain/openai';

export function createLLM() {
  return new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL ?? 'gpt-4o',
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7,
  });
}
