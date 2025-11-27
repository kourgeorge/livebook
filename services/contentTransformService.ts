import { ContentFormat } from "../components/ContentFormatSelector";
import { getCacheService } from "./cacheService";
import { sendLLMMessage } from "./llmClientService";

const getTransformationPrompt = (format: ContentFormat): string => {
  const prompts: Record<ContentFormat, string> = {
    default: `Return the content exactly as provided without modification.`,
    
    concise: `Transform the following markdown content into a concise version that maintains the same structure of sub-sections and headings, but makes all content much shorter and more direct.
    - CRITICAL: You MUST ONLY use information from the provided content below. Do NOT use any prior knowledge about the topic.
    - CRITICAL: Each line in your generated content must be directly traceable to specific lines in the original content. Do not add information that is not present in the original.
    - CRITICAL: The generated content must be true to the original content as much as possible - do not add, remove, or change the meaning of any concepts, facts, or information
    - Minimize hallucination: If a concept is not explicitly stated in the original, do not include it, even if you know it's related to the topic
    - Keep all section headings (##, ###) and sub-section structure exactly as they appear
    - Significantly condense the content within each section while preserving the full idea
    - Use very short, direct sentences - remove verbose explanations and redundancy
    - Keep all key concepts and essential information, but express them more concisely
    - Maintain the logical flow and hierarchy of the original structure
    - Remove examples, lengthy explanations, and filler words while keeping core ideas
    - Do NOT include a title or heading - only return the body content
    Return valid markdown with the same section structure but much shorter content.`,
    
    tldr: `Transform the following markdown content into a tl;dr version limited to 2-4 paragraphs with a maximum of 200 words total. 
    - CRITICAL: You MUST ONLY use information from the provided content below. Do NOT use any prior knowledge about the topic.
    - CRITICAL: Each line in your generated content must be directly traceable to specific lines in the original content. Do not add information that is not present in the original.
    - CRITICAL: The generated content must be true to the original content as much as possible - do not add, remove, or change the meaning of any concepts, facts, or information
    - Minimize hallucination: If a concept is not explicitly stated in the original, do not include it, even if you know it's related to the topic
    - Summarize only the most essential information and key concepts that are explicitly present in the original
    - Use very short, direct sentences
    - Remove all verbose explanations, examples, and redundancy
    - Prioritize the main points and core concepts as stated in the original
    - Maintain markdown format.
    - Ensure the total word count does not exceed 300 words
    - Do NOT include a title or heading - only return the body content.
    - At the end Add a list of the main concepts, keywords and key takeaways (only those explicitly mentioned in the original).`,

    bullets: `Transform the following markdown content into a bullet-point format focusing on key concepts, facts, and takeaways.
    - CRITICAL: You MUST ONLY use information from the provided content below. Do NOT use any prior knowledge about the topic.
    - CRITICAL: Each line in your generated content must be directly traceable to specific lines in the original content. Do not add information that is not present in the original.
    - CRITICAL: The generated content must be true to the original content as much as possible - do not add, remove, or change the meaning of any concepts, facts, or information
    - Minimize hallucination: If a concept is not explicitly stated in the original, do not include it, even if you know it's related to the topic
    - Use hierarchical bullet lists (nested bullets where appropriate)
    - Extract main points from each section as they appear in the original
    - Keep technical terms and important details exactly as they appear in the original
    - Maintain logical flow and structure from the original
    - Use emojis sparingly for visual breaks if helpful
    - Do NOT include a title or heading - only return the body content
    Return valid markdown only.`,

    mindmap: `Transform the following markdown module content into a simple mind map structure using markdown formatting.
    The mindmap should give the reader a high-level overview of the module content and main ideas.
    The nodes of the mindmap should contain few words - up to 5 words. 
    CRITICAL REQUIREMENTS:
    - CRITICAL: You MUST ONLY use information from the provided content below. Do NOT use any prior knowledge about the topic.
    - CRITICAL: Each node in your mindmap must be directly traceable to specific content in the original. Do not add concepts, topics, or ideas that are not explicitly present in the original content.
    - CRITICAL: The generated content must be true to the original content as much as possible - only include concepts, topics, and ideas that are actually present in the original content
    - Minimize hallucination: If a concept is not explicitly stated in the original, do not include it in the mindmap, even if you know it's related to the topic
    - Start with a single H1 heading as the central/root concept (extract the main topic from the original content only)
    - Use ONLY markdown list format with indentation (4 spaces per level)
    - Maximum 4 levels total: H1 (root) -> Level 1 (direct children) -> Level 2 (grandchildren) -> Level 3 (great-grandchildren)
    - Maximum fanout: Each node can have at most 7 direct children. If there are more than 7 concepts at any level, prioritize the most important ones and group related concepts together.
    - Each node label must be SHORT: maximum 5-7 words, no long descriptions
    - Use concise, keyword-style labels (e.g., "Memory & Context" not "Memory and Context Management System")
    - Keep only essential concept names and key terms that appear in the original
    - Use bold (**text**) only for emphasis on key terms within short labels
    - Do NOT include any paragraphs, explanations, or additional text
    - Do NOT include separators (---) or any other formatting
    - Return ONLY the mindmap structure: H1 heading followed by nested lists
    - Format: H1 title, then list items with 4-space indentation for each level
    
    Example format:
    # Main Topic
    - **First Branch**
        - Sub-branch 1
            - Detail 1
            - Detail 2
        - Sub-branch 2
    - **Second Branch**
        - Sub-branch 1
    
    Return ONLY the mindmap, nothing else.`,

    friendly: `Transform the following markdown content into a friendly, conversational, and engaging version while maintaining all technical accuracy.
    - CRITICAL: You MUST ONLY use information from the provided content below. Do NOT use any prior knowledge about the topic.
    - CRITICAL: Each line in your generated content must be directly traceable to specific lines in the original content. Do not add information that is not present in the original.
    - CRITICAL: The generated content must be true to the original content as much as possible - do not add, remove, or change the meaning of any concepts, facts, or information
    - Minimize hallucination: If a concept is not explicitly stated in the original, do not include it, even if you know it's related to the topic
    - Use casual, approachable language to rephrase what's in the original
    - Add friendly transitions and explanations that help clarify the existing content, but do not introduce new concepts
    - Include encouraging phrases
    - Use analogies and examples ONLY to clarify concepts that are already in the original - do not introduce new concepts through analogies
    - Keep technical terms but explain them conversationally using only the explanations present in the original
    - Add personality while staying professional
    - Do NOT include a title or heading - only return the body content
    Return valid markdown only.`,

    executive: `Create an executive summary of the following markdown content.
    - CRITICAL: You MUST ONLY use information from the provided content below. Do NOT use any prior knowledge about the topic.
    - CRITICAL: Each line in your generated content must be directly traceable to specific lines in the original content. Do not add information that is not present in the original.
    - CRITICAL: The generated content must be true to the original content as much as possible - do not add, remove, or change the meaning of any concepts, facts, or information
    - Minimize hallucination: If a concept is not explicitly stated in the original, do not include it, even if you know it's related to the topic
    - Focus on high-level concepts and key takeaways that are explicitly stated in the original
    - Use clear, professional language
    - Highlight main points in bullet format (only points that appear in the original)
    - Include implications and importance ONLY if explicitly stated in the original - do not infer or add implications based on prior knowledge
    - Keep it brief and scannable
    - Maintain markdown structure
    - Do NOT include a title or heading - only return the body content
    Return valid markdown only.`,

    flashcards: `Transform the following markdown content into a set of flashcards in JSON format.
    - CRITICAL: You MUST ONLY use information from the provided content below. Do NOT use any prior knowledge about the topic.
    - CRITICAL: Each flashcard must be directly traceable to specific content in the original. Do not add information that is not present in the original.
    - CRITICAL: The generated content must be true to the original content as much as possible - do not add, remove, or change the meaning of any concepts, facts, or information
    - Minimize hallucination: If a concept is not explicitly stated in the original, do not include it, even if you know it's related to the topic
    - Generate 8-15 flashcards focusing on interesting takeaway ideas and valuable learnings from the content
    - Each flashcard should have:
      - "front": A thought-provoking question that prompts reflection on an interesting idea or takeaway (1-2 sentences max, ideally one question)
      - "back": A clear explanation of the interesting takeaway or learning based ONLY on the original content (2-4 sentences max)
    - Focus on creating flashcards that capture:
      - Interesting insights and key takeaways that provide value
      - Practical learnings and actionable ideas
      - Thought-provoking concepts that deepen understanding
      - Important principles and patterns that can be applied
      - Meaningful connections and relationships between ideas (if explicitly stated)
    - Prioritize interesting, insightful takeaways over basic definitions or simple facts
    - Each flashcard should teach something meaningful - an idea, insight, or learning that the reader can take away
    - Questions should be engaging and prompt deeper thinking about the concepts
    - Answers should be:
      - Accurate and based solely on the original content
      - Clear and easy to understand
      - Focused on the interesting takeaway or learning
      - Concise but complete enough to convey the insight
    - Do NOT include a title or heading - only return the JSON array
    - Return ONLY a valid JSON array in this exact format (no markdown, no code blocks, just raw JSON):
    [
      {"front": "Question or prompt here?", "back": "Answer based on original content only."},
      {"front": "Another question?", "back": "Another answer."}
    ]`
  };

  return prompts[format] || prompts.default;
};

export const transformContent = async (
  content: string,
  format: ContentFormat
): Promise<string> => {
  // Return original content immediately if default format
  if (format === 'default' || !content) {
    return content;
  }

  try {
    // Use API proxy to keep API keys server-side
    // Extract the h1 title (first line starting with #)
    const lines = content.split('\n');
    let titleLine = '';
    let bodyStartIndex = 0;
    
    // Find the first h1 heading
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (trimmedLine.startsWith('# ')) {
        titleLine = lines[i];
        bodyStartIndex = i + 1;
        // Skip empty lines after title
        while (bodyStartIndex < lines.length && lines[bodyStartIndex].trim() === '') {
          bodyStartIndex++;
        }
        break;
      }
    }
    
    // Get the body content (everything after the title)
    const bodyContent = bodyStartIndex > 0 
      ? lines.slice(bodyStartIndex).join('\n')
      : content;

    const systemInstruction = format === 'mindmap' 
      ? `You are a mindmap generation expert. Create simple, visual mindmaps with:
      - CRITICAL: You MUST ONLY use information from the provided content. Do NOT use any prior knowledge about the topic.
      - CRITICAL: Each node must be directly traceable to specific content in the original. Do not add concepts not explicitly present.
      - CRITICAL: The generated content must be true to the original content as much as possible - only include concepts, topics, and ideas that are actually present in the original content
      - Minimize hallucination: Do not include information based on your training data - only what's in the provided content
      - Short, concise node labels (5-7 words max)
      - Maximum 3 hierarchical levels
      - Maximum fanout: Each node can have at most 7 direct children. Prioritize the most important concepts if there are more than 7.
      - Clean markdown list structure
      - No explanations or additional text
      - Return ONLY the mindmap structure`
      : format === 'flashcards'
      ? `You are a flashcard generation expert. Create educational flashcards that focus on interesting takeaway ideas and valuable learnings:
      - CRITICAL: You MUST ONLY use information from the provided content. Do NOT use any prior knowledge about the topic.
      - CRITICAL: Each flashcard must be directly traceable to specific content in the original. Do not add information not explicitly present.
      - CRITICAL: The generated content must be true to the original content as much as possible - do not add, remove, or change the meaning of any concepts, facts, or information
      - Minimize hallucination: Do not include information based on your training data - only what's in the provided content
      - Focus on creating flashcards that capture interesting insights, takeaways, and learnings rather than just definitions or facts
      - Generate thought-provoking questions that prompt reflection on valuable ideas
      - Return ONLY a valid JSON array without any markdown code blocks or additional commentary`
      : `You are a content transformation expert. Your task is to transform markdown content according to specific format instructions while:
      - CRITICAL: You MUST ONLY use information from the provided content. Do NOT use any prior knowledge about the topic.
      - CRITICAL: Each line in your generated content must be directly traceable to specific lines in the original content. Do not add information that is not present in the original.
      - CRITICAL: The generated content must be true to the original content as much as possible - do not add, remove, or change the meaning of any concepts, facts, or information
      - Minimize hallucination: Do not include information based on your training data - only transform what's explicitly in the provided content
      - Maintaining technical accuracy
      - Preserving important information
      - Following markdown syntax rules
      - Returning ONLY the transformed markdown without any additional commentary
      - Do NOT include or modify the module title (h1 heading) - it will be added separately`;

    const transformationPrompt = getTransformationPrompt(format);
    
    const fullPrompt = format === 'mindmap'
      ? `${transformationPrompt}

Here is the content to transform:
"""
${bodyContent}
"""

IMPORTANT: You must ONLY use information from the content above. Do not use any prior knowledge. Each node in your mindmap must correspond to concepts explicitly stated in the content above. Do not add, infer, or complete information based on your training data.

Create a simple mindmap following the format requirements above. Return ONLY the mindmap structure (H1 + nested lists), no other text, no explanations, no commentary.`
      : format === 'flashcards'
      ? `${transformationPrompt}

Here is the content to transform (note: the module title has been removed and will be preserved separately):
"""
${bodyContent}
"""

IMPORTANT: You must ONLY use information from the content above. Do not use any prior knowledge. Each flashcard must correspond to concepts explicitly stated in the content above. Do not add, infer, or complete information based on your training data.

Generate flashcards following the format requirements above. Return ONLY a valid JSON array, no markdown code blocks, no explanations, no commentary.`
      : `${transformationPrompt}

Here is the content to transform (note: the module title has been removed and will be preserved separately):
"""
${bodyContent}
"""

IMPORTANT: You must ONLY use information from the content above. Do not use any prior knowledge. Each line in your generated content must be traceable to specific lines in the content above. Do not add, infer, or complete information based on your training data. Only transform what is explicitly present in the content above.

Transform this content according to the instructions above. Return only the transformed markdown, nothing else. Do NOT include a title.`;

    const messages = [
      { role: 'user' as const, content: fullPrompt }
    ];

    const result = await sendLLMMessage(messages, systemInstruction, {
      temperature: 0.1, // Very low temperature to minimize hallucination and ensure fidelity to original content
    });
    const transformed = result.text || bodyContent;

    // For flashcards format, parse JSON directly
    if (format === 'flashcards') {
      try {
        // Remove markdown code blocks if present
        let jsonText = transformed.trim();
        jsonText = jsonText.replace(/^```json\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim();
        
        // Try to extract JSON from the response
        const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
        
        const flashcards = JSON.parse(jsonText);
        if (Array.isArray(flashcards) && flashcards.length > 0) {
          // Validate flashcard structure
          const validFlashcards = flashcards.filter((card: any) => 
            card && typeof card === 'object' && 
            typeof card.front === 'string' && 
            typeof card.back === 'string' &&
            card.front.trim().length > 0 &&
            card.back.trim().length > 0
          );
          
          if (validFlashcards.length > 0) {
            return JSON.stringify(validFlashcards);
          }
        }
      } catch (parseError) {
        console.error('Error parsing flashcards JSON:', parseError);
        // Return empty array on error
        return JSON.stringify([]);
      }
      // If parsing failed, return empty array
      return JSON.stringify([]);
    }

    // Clean up any markdown code blocks that might wrap the response
    let cleaned = transformed.replace(/^```markdown\n?/i, '').replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim();
    
    // For mindmap format, ensure we only return the mindmap structure
    if (format === 'mindmap') {
      // Remove any explanatory text before or after the mindmap
      // Keep only lines that start with # or - or are empty/whitespace
      const lines = cleaned.split('\n');
      const mindmapLines: string[] = [];
      let inMindmap = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Start collecting when we see H1
        if (trimmed.startsWith('# ')) {
          inMindmap = true;
          mindmapLines.push(line);
        } else if (inMindmap) {
          // Continue collecting list items, empty lines, or stop at non-mindmap content
          if (trimmed === '' || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\s+[-*]/.test(line)) {
            mindmapLines.push(line);
          } else if (trimmed.startsWith('#')) {
            // Another heading might be part of explanation, stop here
            break;
          } else if (trimmed.length > 0 && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
            // Non-list content, likely explanation - stop collecting
            break;
          }
        }
      }
      
      cleaned = mindmapLines.join('\n').trim();
    }
    
    // For non-mindmap formats, prepend the original title if it was found
    // Note: flashcards already returned above, so format cannot be 'flashcards' here
    if (titleLine && format !== 'mindmap') {
      return `${titleLine}\n\n${cleaned}`;
    }
    
    // For mindmap, return as-is (it should already have H1)
    return cleaned || content;
  } catch (error) {
    console.error("Content transformation error:", error);
    // Return original content on error
    return content;
  }
};

/**
 * Get cached or transform content for a specific module
 * @param bookId The book ID
 * @param moduleId The module ID
 * @param content The original content
 * @param format The transformation format
 * @returns The transformed content (from cache or newly generated)
 */
export const getCachedOrTransform = async (
  bookId: string,
  moduleId: string,
  content: string,
  format: ContentFormat
): Promise<string> => {
  // Return original content immediately if default format
  if (format === 'default' || !content) {
    return content;
  }

  // Check cache first
  const cacheService = getCacheService(bookId);
  const cached = await cacheService.getCachedContent(moduleId, format);
  if (cached) {
    return cached;
  }

  // Generate new content
  const transformed = await transformContent(content, format);
  
  // Save to cache (both localStorage and file system)
  await cacheService.setCachedContent(moduleId, format, transformed);

  return transformed;
};

