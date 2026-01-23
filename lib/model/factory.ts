import { LLMProvider } from './types';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import { TiktokenModel } from 'tiktoken';

export function createLLMProvider(modelId: string): LLMProvider {
	if (modelId.startsWith('gemini')) {
		return new GeminiProvider(modelId);
	}
	return new OpenAIProvider(modelId as TiktokenModel);
}
