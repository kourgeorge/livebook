import { AzureOpenAI } from 'openai';
import { LLMProviderInterface, LLMMessage, LLMResponse, LLMConfig } from './llmProvider';

const AZURE_ENDPOINT = (process.env.AZURE_ENDPOINT || '').trim();
const AZURE_API_KEY = (process.env.AZURE_API_KEY || '').trim();
const AZURE_DEPLOYMENT_NAME = (process.env.AZURE_DEPLOYMENT_NAME || 'gpt-4o').trim();
const AZURE_API_VERSION = (process.env.OPENAI_API_VERSION || process.env.AZURE_API_VERSION || '2024-02-15-preview').trim();

let client: AzureOpenAI | null = null;

// Only initialize if both endpoint and API key are provided and not empty
if (AZURE_ENDPOINT && AZURE_API_KEY) {
  try {
    client = new AzureOpenAI({
      endpoint: AZURE_ENDPOINT,
      apiKey: AZURE_API_KEY,
      apiVersion: AZURE_API_VERSION,
    });
  } catch (error) {
    console.error('Failed to initialize Azure OpenAI client:', error);
    client = null;
  }
}

// Check if Azure is configured
export function isAzureConfigured(): boolean {
  return !!(AZURE_ENDPOINT && AZURE_API_KEY && client);
}

export class AzureProvider implements LLMProviderInterface {
  async sendMessage(
    messages: LLMMessage[],
    systemInstruction?: string,
    config?: LLMConfig
  ): Promise<LLMResponse> {
    if (!client) {
      throw new Error('Azure OpenAI is not configured. Please set AZURE_ENDPOINT, AZURE_API_KEY, and AZURE_DEPLOYMENT_NAME.');
    }

    const deploymentName = config?.model || AZURE_DEPLOYMENT_NAME;
    const temperature = config?.temperature ?? 0.7;

    // Convert messages format for Azure OpenAI
    const chatMessages: any[] = [];
    
    // Add system message if provided
    if (systemInstruction) {
      chatMessages.push({
        role: 'system',
        content: systemInstruction,
      });
    }

    // Convert user and assistant messages
    for (const msg of messages) {
      if (msg.role === 'system') {
        // System messages are handled separately above
        continue;
      }
      chatMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    try {
      const response = await client.chat.completions.create({
        model: deploymentName,
        messages: chatMessages,
        temperature,
      });

      const text = response.choices[0]?.message?.content || 'No response generated.';
      return { text };
    } catch (error) {
      console.error('Azure OpenAI API Error:', error);
      throw error;
    }
  }
}

