import * as pdfjsLib from 'pdfjs-dist';
import { sendLLMMessage } from './llmClientService';

// Configure PDF.js worker to use local file
if (typeof window !== 'undefined') {
  // Use the worker file from the public directory
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface PdfChapter {
  id: string;
  title: string;
  description?: string;
  content: string;
  originalContent?: string; // Original extracted text before LLM reformatting
  order: number;
}

export interface PdfMetadata {
  title: string;
  author: string;
  description?: string;
  language?: string;
  publisher?: string;
  date?: string;
}

export interface ParsedPdf {
  metadata: PdfMetadata;
  chapters: PdfChapter[];
}

/**
 * Parses a PDF file and extracts metadata and chapters
 * @param file The PDF file to parse
 * @param skipReformatting If true, skips LLM reformatting and returns raw extracted text
 * @returns Promise<ParsedPdf> The parsed PDF with metadata and chapters
 */
export async function parsePdf(file: File, skipReformatting: boolean = false): Promise<ParsedPdf> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Extract metadata
  const metadataInfo = await pdf.getMetadata();
  const metadata = parseMetadata(metadataInfo);
  
  // Extract text from all pages
  const chapters: PdfChapter[] = [];
  const numPages = pdf.numPages;
  
  // For PDFs, we'll treat each page or group of pages as a chapter
  // We'll try to detect chapter breaks based on headings or page breaks
  let currentChapter: { title: string; content: string[] } | null = null;
  let chapterIndex = 0;
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Extract text items - preserve ALL characters including punctuation
    // Simply concatenate text items and respect EOL markers
    const pageLines: string[] = [];
    let currentLine = '';
    
    for (const item of textContent.items as any[]) {
      const text = item.str || '';
      const hasEOL = item.hasEOL;
      
      // Always append text directly - PDF.js handles spacing
      currentLine += text;
      
      if (hasEOL) {
        // End of line - finish this line
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }
        currentLine = '';
      }
    }
    
    // Add remaining line if any
    if (currentLine.trim()) {
      pageLines.push(currentLine.trim());
    }
    
    if (pageLines.length === 0) {
      continue;
    }
    
    // Try to detect chapter headings (lines that are short, all caps, or numbered)
    const firstLine = pageLines[0]?.trim() || '';
    
    // Heuristic: if first line is short and looks like a chapter title
    const isChapterHeading = firstLine.length < 100 && 
      (firstLine.match(/^(chapter|part|section)\s+\d+/i) || 
       firstLine.match(/^\d+\.\s+[A-Z]/) ||
       (firstLine.length < 50 && firstLine === firstLine.toUpperCase() && firstLine.length > 3));
    
    if (isChapterHeading && currentChapter) {
      // Save previous chapter
      console.log(`[Chapter ID] Detected chapter ${chapterIndex}: "${currentChapter.title}"`);
      chapters.push({
        id: `chapter-${chapterIndex}`,
        title: currentChapter.title,
        content: normalizeText(currentChapter.content.join(' ')),
        order: chapterIndex,
      });
      chapterIndex++;
      
      // Start new chapter
      currentChapter = {
        title: firstLine,
        content: pageLines.slice(1),
      };
    } else if (isChapterHeading && !currentChapter) {
      // First chapter
      console.log(`[Chapter ID] Detected first chapter: "${firstLine}"`);
      currentChapter = {
        title: firstLine,
        content: pageLines.slice(1),
      };
    } else if (currentChapter) {
      // Continue current chapter
      currentChapter.content.push(...pageLines);
    } else {
      // No chapter detected yet, start with a default chapter
      console.log(`[Chapter ID] Starting default chapter: "Introduction"`);
      currentChapter = {
        title: 'Introduction',
        content: pageLines,
      };
    }
  }
  
  // Add the last chapter
  if (currentChapter) {
    console.log(`[Chapter ID] Detected final chapter ${chapterIndex}: "${currentChapter.title}"`);
    chapters.push({
      id: `chapter-${chapterIndex}`,
      title: currentChapter.title,
      content: normalizeText(currentChapter.content.join(' ')),
      order: chapterIndex,
    });
  }
  
  // If no chapters were detected, split into reasonable-sized chapters
  if (chapters.length === 0 && currentChapter) {
    // Split the single chapter into multiple chapters if it's too long
    const allContent = currentChapter.content;
    const targetChapters = Math.max(1, Math.ceil(numPages / 10)); // ~10 pages per chapter
    const linesPerChapter = Math.ceil(allContent.length / targetChapters);
    
    for (let i = 0; i < allContent.length; i += linesPerChapter) {
      const chapterLines = allContent.slice(i, i + linesPerChapter);
      chapters.push({
        id: `chapter-${chapters.length + 1}`,
        title: `Chapter ${chapters.length + 1}`,
        content: normalizeText(chapterLines.join(' ')),
        order: chapters.length,
      });
    }
  }
  
  // Clean up chapter content - normalize whitespace
  // Store original content before reformatting
  chapters.forEach(chapter => {
    const normalizedContent = normalizeText(chapter.content);
    chapter.originalContent = normalizedContent; // Store original before LLM reformatting
    chapter.content = normalizedContent;
  });
  
  // Reformat chapters through LLM if available and not skipped
  let finalChapters = chapters;
  if (!skipReformatting) {
  try {
    // Use API proxy to keep API keys server-side
    if (chapters.length > 0) {
        console.log(`[Reformat] Starting reformatting of ${chapters.length} chapters`);
      finalChapters = await reformatChapters(chapters, metadata);
        console.log(`[Reformat] Completed reformatting: ${finalChapters.length} chapters`);
      // Preserve originalContent in reformatted chapters
      finalChapters = finalChapters.map((reformatted, index) => ({
        ...reformatted,
        originalContent: chapters[index]?.originalContent || chapters[index]?.content || '',
      }));
    }
  } catch (error) {
    // If LLM is not configured, use original chapters
    console.warn('LLM not configured, skipping chapter reformatting:', error);
    }
  } else {
    console.log('[Reformat] Skipping LLM reformatting - returning raw extracted text');
  }
  
  return {
    metadata,
    chapters: finalChapters,
  };
}

/**
 * Normalizes text while preserving paragraph structure and ALL punctuation
 * Removes excessive line breaks within paragraphs but preserves paragraph breaks
 * Minimal normalization - only handles whitespace, never touches punctuation
 */
function normalizeText(text: string): string {
  // First, normalize line endings and identify paragraph breaks
  let normalized = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines (3+) to paragraph break (double newline)
    .trim();
  
  // Split by paragraph breaks (double newlines)
  const paragraphs = normalized.split(/\n\n+/);
  
  // Process each paragraph: remove single newlines within paragraph, normalize whitespace
  const normalizedParagraphs = paragraphs
    .map(para => {
      // Within each paragraph, replace single newlines with spaces
      // and collapse multiple spaces/tabs, but NEVER touch punctuation
      const cleaned = para
        .replace(/\n/g, ' ') // Single newlines to spaces within paragraph
        .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
        .trim();
      
      if (!cleaned) return '';
      
      // Return as-is - no punctuation manipulation
      return cleaned;
    })
    .filter(para => para.length > 0);
  
  // Rejoin paragraphs with double newline to preserve paragraph structure
  return normalizedParagraphs.join('\n\n');
}

/**
 * Reformats chapters through LLM while preserving original content
 * Merges empty or very dull chapters with adjacent chapters
 */
async function reformatChapters(
  chapters: PdfChapter[],
  metadata: PdfMetadata
): Promise<PdfChapter[]> {
  if (chapters.length === 0) {
    return chapters;
  }

  const reformattedChapters: PdfChapter[] = [];
  let i = 0;

  while (i < chapters.length) {
    const currentChapter = chapters[i];
    const nextChapter = chapters[i + 1];

    // Check if current chapter is empty or very dull
    const isDull = isChapterDull(currentChapter);

    if (isDull && nextChapter) {
      // Merge with next chapter
      console.log(`[Reformat] Merging chapters ${i} & ${i + 1}: "${currentChapter.title}" + "${nextChapter.title}"`);
      const mergedContent = `${currentChapter.content}\n\n${nextChapter.content}`;
      try {
      const mergedTitle = await reformatChapterContent(
        mergedContent,
        `${currentChapter.title} / ${nextChapter.title}`,
        metadata
      );

      reformattedChapters.push({
        id: currentChapter.id,
        title: mergedTitle.title,
        description: mergedTitle.description,
        content: mergedTitle.content,
        originalContent: currentChapter.originalContent || currentChapter.content,
        order: reformattedChapters.length,
      });
      } catch (error: any) {
        console.error(`[Reformat] Failed to reformat merged chapters ${i} & ${i + 1}, using original:`, error.message);
        // Use original content if reformatting fails
        reformattedChapters.push({
          id: currentChapter.id,
          title: currentChapter.title,
          description: currentChapter.description,
          content: mergedContent,
          originalContent: currentChapter.originalContent || currentChapter.content,
          order: reformattedChapters.length,
        });
      }

      i += 2; // Skip both chapters
    } else if (isDull && !nextChapter) {
      // Last chapter is dull, merge with previous if exists
      if (reformattedChapters.length > 0) {
        const lastChapter = reformattedChapters[reformattedChapters.length - 1];
        console.log(`[Reformat] Merging final dull chapter ${i} with previous: "${currentChapter.title}"`);
        const mergedContent = `${lastChapter.content}\n\n${currentChapter.content}`;
        try {
        const mergedTitle = await reformatChapterContent(
          mergedContent,
          lastChapter.title,
          metadata
        );

        reformattedChapters[reformattedChapters.length - 1] = {
          ...lastChapter,
          title: mergedTitle.title,
          description: mergedTitle.description,
          content: mergedTitle.content,
          originalContent: lastChapter.originalContent || currentChapter.originalContent || currentChapter.content,
        };
        } catch (error: any) {
          console.error(`[Reformat] Failed to reformat merged chapter ${i}, using original:`, error.message);
          // Merge without reformatting if it fails
          reformattedChapters[reformattedChapters.length - 1] = {
            ...lastChapter,
            content: mergedContent,
            originalContent: lastChapter.originalContent || currentChapter.originalContent || currentChapter.content,
          };
        }
      } else {
        // Only chapter and it's dull, still reformat it
        console.log(`[Reformat] Reformatting single dull chapter ${i}: "${currentChapter.title}"`);
        try {
        const reformatted = await reformatChapterContent(
          currentChapter.content,
          currentChapter.title,
          metadata
        );
        reformattedChapters.push({
          id: currentChapter.id,
          title: reformatted.title,
          description: reformatted.description,
          content: reformatted.content,
          originalContent: currentChapter.originalContent || currentChapter.content,
          order: 0,
        });
        } catch (error: any) {
          console.error(`[Reformat] Failed to reformat chapter ${i}, using original:`, error.message);
          reformattedChapters.push({
            id: currentChapter.id,
            title: currentChapter.title,
            description: currentChapter.description,
            content: currentChapter.content,
            originalContent: currentChapter.originalContent || currentChapter.content,
            order: 0,
          });
        }
      }
      i++;
    } else {
      // Normal chapter, reformat it
      console.log(`[Reformat] Reformatting chapter ${i}: "${currentChapter.title}"`);
      try {
      const reformatted = await reformatChapterContent(
        currentChapter.content,
        currentChapter.title,
        metadata
      );
      reformattedChapters.push({
        id: currentChapter.id,
        title: reformatted.title,
        description: reformatted.description,
        content: reformatted.content,
        originalContent: currentChapter.originalContent || currentChapter.content,
        order: reformattedChapters.length,
      });
      } catch (error: any) {
        console.error(`[Reformat] Failed to reformat chapter ${i}, using original:`, error.message);
        // Use original content if reformatting fails
        reformattedChapters.push({
          id: currentChapter.id,
          title: currentChapter.title,
          description: currentChapter.description,
          content: currentChapter.content,
          originalContent: currentChapter.originalContent || currentChapter.content,
          order: reformattedChapters.length,
        });
      }
      i++;
    }
  }

  return reformattedChapters;
}

/**
 * Checks if a chapter is empty or very dull (lacks substantial content)
 */
function isChapterDull(chapter: PdfChapter): boolean {
  const content = chapter.content.trim();
  
  // Empty or very short
  if (content.length < 100) {
    return true;
  }

  // Check for low information density (mostly whitespace, repeated characters, etc.)
  const words = content.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 20) {
    return true;
  }

  // Check if it's mostly repetitive or has very low unique word ratio
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const uniqueRatio = uniqueWords.size / words.length;
  
  // If less than 30% unique words, likely dull/repetitive
  if (uniqueRatio < 0.3 && words.length < 50) {
    return true;
  }

  return false;
}

/**
 * Reformats a single chapter through LLM while preserving original content
 * Handles title, description, and content separately
 */
async function reformatChapterContent(
  content: string,
  title: string,
  metadata: PdfMetadata
): Promise<{ title: string; description?: string; content: string }> {
  // Use API proxy to keep API keys server-side
  const contentSize = Math.round(content.length / 1000);
  console.log(`[Reformat] Calling LLM for chapter reformatting (${contentSize}k chars)`);

  // If content is very large (>200k chars), truncate it to avoid timeouts
  const MAX_CONTENT_LENGTH = 200000; // ~200k characters
  const truncatedContent = content.length > MAX_CONTENT_LENGTH 
    ? content.substring(0, MAX_CONTENT_LENGTH) + '\n\n[... Content truncated due to length ...]'
    : content;

  const prompt = `You are reformatting a chapter extracted from a PDF book. Your task is to process THREE separate parts: TITLE, DESCRIPTION, and CONTENT.

CRITICAL REQUIREMENTS FOR ALL PARTS:
1. PRESERVE ALL ORIGINAL CONTENT EXACTLY: Every word, sentence, fact, and idea from the original must appear in exactly the same order and wording. 
2. DO NOT REWORD, REPHRASE, OR REWRITE: You must use the exact same words from the original text. Do not change "Tool Use Pattern Overview So, we've" to "Sure! Let's dive into the Tool Use Pattern Overview."
3. DO NOT ADD INTRODUCTORY PHRASES: Never add phrases like "Sure!", "Let's dive into", "Welcome to", "Let me explain", or any other introductory text that is not in the original.
4. DO NOT CHANGE SENTENCE STRUCTURE: Keep sentences exactly as they appear. Only fix obvious PDF extraction errors (broken words, missing spaces between words).
5. ONLY ADD MARKDOWN FORMATTING: The ONLY changes you should make are:
   - Adding ##, ###, or #### before identified titles
   - Adding paragraph breaks (double newlines) between sections
   - Fixing obvious PDF extraction errors (e.g., "wor d" → "word")
6. PRESERVE PUNCTUATION: Keep all punctuation marks exactly as they appear in the original.

PART 1 - TITLE:
- Clean up and format the chapter title
- Remove any formatting artifacts from PDF extraction
- Keep it concise and clear
- Preserve the original meaning and key words
- If the title is unclear or missing, create a brief descriptive title based on the content

PART 2 - DESCRIPTION:
- Create a brief 1-2 sentence description of what this chapter covers
- Base it ONLY on the actual content provided
- Do NOT add information not present in the content
- Keep it factual and descriptive

PART 3 - CONTENT FORMATTING AND STRUCTURE:
The content you receive is flat text extracted from a PDF. Your critical task is to identify sentences or phrases that are actually titles or subtitles and restructure them as proper markdown headings.

ABSOLUTELY CRITICAL - NO REWORDING:
- You must use the EXACT words from the original text
- If the text starts with "Tool Use Pattern Overview So, we've...", you MUST output "## Tool Use Pattern Overview\n\nSo, we've..." NOT "Sure! Let's dive into the Tool Use Pattern Overview."
- Do NOT add any introductory phrases, transitions, or explanatory text
- Do NOT rephrase or rewrite sentences
- Do NOT change word order or sentence structure
- The ONLY changes are: adding markdown heading syntax (##, ###, ####) and paragraph breaks

IDENTIFYING TITLES AND SUBTITLES:
You must analyze the flat text and identify which sentences/phrases are titles or subtitles based on:
1. CONTENT ANALYSIS:
   - Short, concise sentences (typically 3-15 words) that introduce a new topic
   - Sentences that summarize or name a concept, section, or topic
   - Phrases that appear to be section labels rather than explanatory text
   - Sentences that are followed by explanatory paragraphs about that topic

2. CONTEXTUAL CLUES:
   - Sentences that appear at the start of a new topic or section
   - Sentences followed by content that elaborates on the topic they introduce
   - Sentences that are more general/abstract than the paragraphs that follow
   - Sentences that serve as organizational markers in the text structure

3. FORMATTING PATTERNS (if visible in the flat text):
   - Sentences that are shorter than surrounding paragraphs
   - Sentences that might have been formatted differently in the original (all caps, bold, etc.)
   - Sentences separated by extra whitespace or paragraph breaks

4. SEMANTIC ANALYSIS:
   - Sentences that name concepts, methods, techniques, or topics
   - Sentences that are declarative statements about what will be discussed
   - Sentences that function as section headers rather than body content

RESTRUCTURING RULES - CRITICAL:
- You MUST convert identified titles/subtitles into proper markdown heading syntax in your output:
  - Main section titles → Format as "## Title Text" (h2 headings with double hash)
  - Subsection titles → Format as "### Title Text" (h3 headings with triple hash)
  - Sub-subsection titles → Format as "#### Title Text" (h4 headings with quadruple hash) when needed
- The output content MUST use markdown heading syntax: sentences identified as titles should appear as "## Title" or "### Subtitle" in the markdown
- Keep the original wording of identified titles/subtitles - only convert them to markdown heading format (add ##, ###, or #### prefix)
- Keep the original wording of ALL body text - never reword, rephrase, or add introductory phrases
- Do NOT create new headings from regular content - only identify and convert existing title-like sentences
- Maintain the original text flow: if a title sentence appears before its content, keep that order
- Examples:
  * If text is "Tool Use Pattern Overview So, we've...", output "## Tool Use Pattern Overview\n\nSo, we've..." (NOT "Sure! Let's dive into...")
  * If you identify "Introduction to Machine Learning" as a title followed by "This chapter covers...", output "## Introduction to Machine Learning\n\nThis chapter covers..." (keep exact words)

ADDITIONAL FORMATTING:
- Organize the content into a well-structured markdown document with proper heading hierarchy
- Use markdown heading syntax (##, ###, ####) for all identified titles/subtitles in the output
- Proper paragraph breaks (double newline) between distinct ideas and after headings
- Fix formatting issues like:
  - Broken sentences that span multiple lines incorrectly
  - Missing paragraph breaks where they should exist
  - Inconsistent spacing
  - Text that should be on separate lines but isn't
- Fix only OBVIOUS PDF extraction errors (broken words like "wor d" → "word", missing spaces)
- DO NOT change capitalization unless it's clearly a PDF error (e.g., "ALL CAPS" at start of sentence → "All caps")
- DO NOT reword, rephrase, or rewrite any sentences
- DO NOT add introductory phrases, transitions, or explanatory text
- Group related paragraphs together under appropriate section headings (formatted as markdown headings)
- PRESERVE ALL ORIGINAL CONTENT EXACTLY: Every word must remain in the same order and wording, just organized with proper markdown heading structure
- The final output must be valid markdown with titles/subtitles formatted as headings (##, ###, ####)
- The structure should make the content more readable while keeping all original information and exact wording

ORIGINAL CHAPTER TITLE: "${title}"
BOOK TITLE: "${metadata.title}"
BOOK AUTHOR: "${metadata.author || 'Unknown'}"

ORIGINAL CONTENT:
"""
${truncatedContent}
"""

IMPORTANT OUTPUT FORMAT:
The "content" field in your JSON response must contain markdown-formatted text where:
- All identified titles/subtitles are formatted as markdown headings using ##, ###, or ####
- All body text uses the EXACT words from the original - no rewording, rephrasing, or adding introductory phrases
- Example: If the flat text contains "Tool Use Pattern Overview So, we've discussed...", the output should be:
  "## Tool Use Pattern Overview\n\nSo, we've discussed..."
  NOT "Sure! Let's dive into the Tool Use Pattern Overview. So, we've discussed..."
- Regular paragraphs remain as normal text with exact original wording
- The content should be well-structured markdown with proper heading hierarchy

Return your response in the following JSON format (no markdown, just raw JSON):
{
  "title": "cleaned and formatted chapter title",
  "description": "brief 1-2 sentence description of the chapter",
  "content": "reformatted markdown content with titles formatted as headings (##, ###, ####) and improved structure"
}`;

  try {
    const systemInstruction = 'You are a text formatting assistant specialized in restructuring flat text from PDFs. Your key skill is identifying sentences that are titles or subtitles based on content, context, and semantic analysis, then converting them to proper markdown headings. CRITICAL: You must preserve all original words exactly - never reword, rephrase, or add introductory phrases. Only add markdown heading syntax (##, ###, ####) and paragraph breaks. Process chapter title, description, and content separately while preserving all original content exactly. Always return valid JSON.';
    
    const messages = [
      { role: 'user' as const, content: prompt }
    ];

    const result = await sendLLMMessage(messages, systemInstruction, {
      temperature: 0.1,
    });
    const responseText = result.text || '';
    
    if (!responseText || responseText.trim().length === 0) {
      console.warn('[Reformat] Empty response from LLM, using original content');
      return { title, content };
    }

    // Try to parse JSON response
    try {
      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonText);

      console.log(`[Reformat] ✓ Completed: "${parsed.title || title}"`);
      return {
        title: parsed.title || title,
        description: parsed.description,
        content: parsed.content || content,
      };
    } catch (parseError) {
      // If JSON parsing fails, try to extract parts manually or return original
      console.warn('[Reformat] Failed to parse JSON response, using original:', parseError);
      
      // Try to extract title, description, and content from text response
      const titleMatch = responseText.match(/title["\s:]+"([^"]+)"/i);
      const descMatch = responseText.match(/description["\s:]+"([^"]+)"/i);
      const contentMatch = responseText.match(/content["\s:]+"([^"]+)"/i) || 
                           responseText.match(/content["\s:]+```[\s\S]*?```/i);

      return {
        title: titleMatch ? titleMatch[1] : title,
        description: descMatch ? descMatch[1] : undefined,
        content: contentMatch ? (contentMatch[1] || content) : content,
      };
    }
  } catch (error: any) {
    console.error(`[Reformat] Error reformatting chapter "${title}":`, error.message || error);
    // Return original content if reformatting fails
    // This ensures the upload can continue even if one chapter fails
    return { title, content };
  }
}

/**
 * Parses metadata from PDF document info
 */
function parseMetadata(metadataInfo: any): PdfMetadata {
  const info = metadataInfo.info || {};
  const metadata: PdfMetadata = {
    title: info.Title || info.title || 'Untitled',
    author: info.Author || info.author || info.Creator || info.creator || 'Unknown Author',
  };
  
  if (info.Subject || info.subject) {
    metadata.description = info.Subject || info.subject;
  }
  
  if (info.Lang || info.lang) {
    metadata.language = info.Lang || info.lang;
  }
  
  if (info.Producer || info.producer) {
    metadata.publisher = info.Producer || info.producer;
  }
  
  if (info.CreationDate || info.ModDate) {
    metadata.date = info.CreationDate || info.ModDate;
  }
  
  return metadata;
}

