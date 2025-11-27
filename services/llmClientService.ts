import { LLMMessage, LLMResponse, LLMConfig } from './llmProvider';

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
    const response = await fetch('/api/llm', {
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
      const error = await response.json();
      throw new Error(error.error || 'LLM request failed');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'LLM request failed');
    }

    return { text: data.text };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('LLM client error: Request timeout (5 minutes)');
      throw new Error('LLM request timed out after 5 minutes. The content may be too large.');
    }
    console.error('LLM client error:', error);
    throw error;
  }
}

