import { sendLLMMessage } from "./llmClientService";

/**
 * Generate suggested questions for a module based on its content
 * @param moduleTitle The title of the module
 * @param moduleDescription The description of the module
 * @param moduleContent The full content of the module
 * @returns Array of 3-5 suggested questions
 */
export const generateQuestions = async (
  moduleTitle: string,
  moduleDescription: string,
  moduleContent: string
): Promise<string[]> => {
  try {
    // Use API proxy to keep API keys server-side
    // Extract a summary or key sections from the content (first 2000 chars to avoid token limits)
    const contentPreview = moduleContent.substring(0, 2000);
    
    const systemInstruction = `
      You are an expert educational content assistant. Your task is to generate 3-5 engaging, thought-provoking questions that help learners explore and understand the key concepts in a module.
      
      The questions should:
      - Be specific to the module content
      - Encourage deep thinking and understanding
      - Cover different aspects of the topic (conceptual, practical, comparative)
      - Be clear and concise (one sentence each)
      - Not be too basic or too advanced
      
      Return ONLY a JSON array of question strings, nothing else. Example format: ["Question 1?", "Question 2?", "Question 3?"]
    `;

    const prompt = `Generate 3-5 engaging questions for this module:

Title: ${moduleTitle}
Description: ${moduleDescription}

Content Preview:
"""
${contentPreview}
"""

Generate questions that help learners explore the key concepts in this module. Return only a JSON array of question strings.`;

    const messages = [
      { role: 'user' as const, content: prompt }
    ];

    const result = await sendLLMMessage(messages, systemInstruction, {
      temperature: 0.7,
    });
    const responseText = result.text || '[]';
    
    // Try to parse JSON from the response
    // The model might wrap it in markdown code blocks
    let jsonText = responseText.trim();
    jsonText = jsonText.replace(/^```json\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim();
    
    try {
      const questions = JSON.parse(jsonText);
      if (Array.isArray(questions) && questions.length > 0) {
        // Ensure we have strings and limit to 5 questions
        return questions
          .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
          .slice(0, 5)
          .map((q: string) => q.trim());
      }
    } catch (parseError) {
      console.error('Error parsing questions JSON:', parseError);
      // Fallback: try to extract questions from text
      const lines = responseText.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               (trimmed.includes('?') || 
                trimmed.match(/^\d+[\.\)]/) || 
                trimmed.startsWith('-') || 
                trimmed.startsWith('*'));
      });
      
      if (lines.length > 0) {
        return lines
          .map(line => line.replace(/^[\d\-*\.\)\s]+/, '').trim())
          .filter(q => q.length > 0 && q.includes('?'))
          .slice(0, 5);
      }
    }
    
    // Default fallback questions
    return [
      `Can you explain the main concepts in ${moduleTitle}?`,
      `What are the key takeaways from this module?`,
      `How can I apply the concepts from ${moduleTitle} in practice?`,
    ];
  } catch (error) {
    console.error("Error generating questions:", error);
    // Return default questions on error
    return [
      `Can you explain the main concepts in ${moduleTitle}?`,
      `What are the key takeaways from this module?`,
      `How can I apply the concepts from ${moduleTitle} in practice?`,
    ];
  }
};

/**
 * Generate suggested questions for a book cover based on its metadata
 * @param bookName The name of the book
 * @param bookDescription The description of the book
 * @param modules Array of module objects with title and description
 * @returns Array of 3-5 suggested questions
 */
export const generateBookCoverQuestions = async (
  bookName: string,
  bookDescription: string,
  modules: Array<{ title: string; description?: string }>
): Promise<string[]> => {
  try {
    // Use API proxy to keep API keys server-side
    // Create a summary of modules
    const modulesSummary = modules
      .map((module, index) => `${index + 1}. ${module.title}${module.description ? `: ${module.description}` : ''}`)
      .join('\n');
    
    const systemInstruction = `
      You are an expert educational content assistant. Your task is to generate 3-5 engaging, thought-provoking questions that help learners explore and understand what they can learn from this book.
      
      The questions should:
      - Be specific to the book's overall topic and scope
      - Encourage exploration of the book's content
      - Cover different aspects (overview, learning path, practical applications)
      - Be clear and concise (one sentence each)
      - Help learners understand what they'll gain from reading this book
      - Reference the book's topics and chapters naturally
      
      Return ONLY a JSON array of question strings, nothing else. Example format: ["Question 1?", "Question 2?", "Question 3?"]
    `;

    const prompt = `Generate 3-5 engaging questions for this book:

Book Name: ${bookName}
Description: ${bookDescription}

Chapters/Modules:
${modulesSummary}

Generate questions that help learners understand what they can learn from this book and explore its content. Return only a JSON array of question strings.`;

    const messages = [
      { role: 'user' as const, content: prompt }
    ];

    const result = await sendLLMMessage(messages, systemInstruction, {
      temperature: 0.7,
    });
    const responseText = result.text || '[]';
    
    // Try to parse JSON from the response
    // The model might wrap it in markdown code blocks
    let jsonText = responseText.trim();
    jsonText = jsonText.replace(/^```json\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim();
    
    try {
      const questions = JSON.parse(jsonText);
      if (Array.isArray(questions) && questions.length > 0) {
        // Ensure we have strings and limit to 5 questions
        return questions
          .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
          .slice(0, 5)
          .map((q: string) => q.trim());
      }
    } catch (parseError) {
      console.error('Error parsing questions JSON:', parseError);
      // Fallback: try to extract questions from text
      const lines = responseText.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               (trimmed.includes('?') || 
                trimmed.match(/^\d+[\.\)]/) || 
                trimmed.startsWith('-') || 
                trimmed.startsWith('*'));
      });
      
      if (lines.length > 0) {
        return lines
          .map(line => line.replace(/^[\d\-*\.\)\s]+/, '').trim())
          .filter(q => q.length > 0 && q.includes('?'))
          .slice(0, 5);
      }
    }
    
    // Default fallback questions
    return [
      `What will I learn from ${bookName}?`,
      `What are the main topics covered in this book?`,
      `How can I get started with ${bookName}?`,
    ];
  } catch (error) {
    console.error("Error generating book cover questions:", error);
    // Return default questions on error
    return [
      `What will I learn from ${bookName}?`,
      `What are the main topics covered in this book?`,
      `How can I get started with ${bookName}?`,
    ];
  }
};

