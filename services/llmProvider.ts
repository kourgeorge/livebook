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

// No-op provider that returns a friendly message when LLM is not configured
class NoOpProvider implements LLMProviderInterface {
  async sendMessage(
    messages: LLMMessage[],
    systemInstruction?: string,
    config?: LLMConfig
  ): Promise<LLMResponse> {
    return {
      text: "I'm sorry, but the AI assistant is not currently configured. Please set up an LLM provider (Azure OpenAI or Gemini) by configuring the necessary API keys in your environment variables."
    };
  }
}

// Check if any LLM provider is configured
export function isLLMConfigured(): boolean {
  return isAzureConfigured() || isGeminiConfigured();
}

// Factory function to get the configured provider based on environment configuration
// Falls back to the other provider if the configured one is not available
// Returns a no-op provider if no LLM is configured (allows app to function without LLM)
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
      console.warn('No LLM provider is configured. The app will function in read-only mode.');
      return new NoOpProvider();
    }
  } else {
    if (isGeminiConfigured()) {
      return new GeminiProvider();
    } else if (isAzureConfigured()) {
      console.warn('Gemini is not configured. Falling back to Azure OpenAI.');
      return new AzureProvider();
    } else {
      console.warn('No LLM provider is configured. The app will function in read-only mode.');
      return new NoOpProvider();
    }
  }
}

