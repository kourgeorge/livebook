import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";
import { LLMProviderInterface, LLMMessage, LLMResponse, LLMConfig } from './llmProvider';
import { sendLLMMessage } from './llmClientService';

const API_KEY = process.env.API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Initialize Gemini client (server-side only - API keys are not exposed to client)
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Check if Gemini is configured (server-side only)
export function isGeminiConfigured(): boolean {
  return !!(API_KEY && ai);
}

// Server-side provider implementation
// Client-side code should use sendLLMMessage from llmClientService instead
export class GeminiProvider implements LLMProviderInterface {
  async sendMessage(
    messages: LLMMessage[],
    systemInstruction?: string,
    config?: LLMConfig
  ): Promise<LLMResponse> {
    if (!ai) {
      throw new Error('Gemini API Key is missing.');
    }

    const model = config?.model || GEMINI_MODEL;
    const temperature = config?.temperature ?? 0.7;

    // Filter and convert messages for Gemini
    const chatHistory = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: systemInstruction || '',
        temperature,
      },
      history: chatHistory,
    });

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('No user message found');
    }

    const result = await chat.sendMessage({ message: lastUserMessage.content });
    return { text: result.text || "I couldn't generate a response." };
  }
}

// Backward compatible function - now uses API proxy to keep API keys server-side
export const sendMessageToGemini = async (
  history: ChatMessage[],
  newMessage: string,
  context: string
): Promise<string> => {
  const systemInstruction = `
    You are an expert AI Assistant for the interactive book "Agentic Design Patterns".
    Your goal is to help users understand complex AI engineering concepts like ReAct, Chain-of-Thought, Multi-Agent Systems, and Tool Use.
    
    The user is currently reading the following content:
    """
    ${context}
    """
    
    Answer the user's questions based on the provided content and your general knowledge of AI engineering. 
    Be concise, helpful, and encourage deep learning. 
    If the user asks for code, prefer Python examples using LangGraph/LangChain syntax where applicable.
  `;

  // Convert ChatMessage[] to LLMMessage[]
  const messages: LLMMessage[] = [
    ...history
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.text,
      })),
    { role: 'user' as const, content: newMessage },
  ];

  try {
    const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'azure') as 'gemini' | 'azure';
    const response = await sendLLMMessage(messages, systemInstruction, {
      model: LLM_PROVIDER === 'azure' ? undefined : GEMINI_MODEL,
    });
    return response.text;
  } catch (error: any) {
    console.error("LLM API Error:", error);
    // sendLLMMessage now returns error messages instead of throwing, 
    // but keep this as a safety net for unexpected errors
    return "I'm sorry, but I encountered an error processing your request. The LLM service may not be configured. Please check your API keys.";
  }
};