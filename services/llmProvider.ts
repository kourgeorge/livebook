import { AzureProvider, isAzureConfigured } from './azureService';
import { GeminiProvider, isGeminiConfigured } from './geminiService';

export type LLMProvider = 'gemini' | 'azure';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  text: string;
}

export interface LLMConfig {
  temperature?: number;
  model?: string;
}

export interface LLMProviderInterface {
  sendMessage(
    messages: LLMMessage[],
    systemInstruction?: string,
    config?: LLMConfig
  ): Promise<LLMResponse>;
}

// Factory function to get the configured provider based on environment configuration
// Falls back to the other provider if the configured one is not available
export function getLLMProvider(): LLMProviderInterface {
  const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'azure') as 'gemini' | 'azure';
  
  // Try to use the configured provider
  if (LLM_PROVIDER === 'azure') {
    if (isAzureConfigured()) {
      return new AzureProvider();
    } else if (isGeminiConfigured()) {
      console.warn('Azure OpenAI is not configured. Falling back to Gemini.');
      return new GeminiProvider();
    } else {
      throw new Error('Neither Azure OpenAI nor Gemini is configured. Please set up at least one provider.');
    }
  } else {
    if (isGeminiConfigured()) {
      return new GeminiProvider();
    } else if (isAzureConfigured()) {
      console.warn('Gemini is not configured. Falling back to Azure OpenAI.');
      return new AzureProvider();
    } else {
      throw new Error('Neither Gemini nor Azure OpenAI is configured. Please set up at least one provider.');
    }
  }
}

