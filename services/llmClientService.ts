import { LLMMessage, LLMResponse, LLMConfig } from './llmProvider';
import { withBaseUrl } from '../utils/pathUtils';

/**
 * Client-side LLM service that proxies requests through the backend API
 * This keeps API keys secure on the server side
 */
export async function sendLLMMessage(
  messages: LLMMessage[],
  systemInstruction?: string,
  config?: LLMConfig
): Promise<LLMResponse> {
  // Create an AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

  try {
    const response = await fetch(withBaseUrl('/api/llm'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        systemInstruction,
        config,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = 'LLM request failed';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      // Return a user-friendly error message instead of throwing
      return {
        text: `I'm sorry, but I encountered an error: ${errorMessage}. The LLM service may not be configured. Please check your API keys.`
      };
    }

    const data = await response.json();
    if (!data.success) {
      // Return a user-friendly error message instead of throwing
      return {
        text: `I'm sorry, but I encountered an error: ${data.error || 'LLM request failed'}. The LLM service may not be configured. Please check your API keys.`
      };
    }

    return { text: data.text };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('LLM client error: Request timeout (5 minutes)');
      return {
        text: 'I\'m sorry, but the request timed out after 5 minutes. The content may be too large. Please try with a smaller request.'
      };
    }
    console.error('LLM client error:', error);
    // Return a user-friendly error message instead of throwing
    return {
      text: `I'm sorry, but I encountered an error: ${error.message || 'LLM service unavailable'}. The LLM service may not be configured. Please check your API keys.`
    };
  }
}

