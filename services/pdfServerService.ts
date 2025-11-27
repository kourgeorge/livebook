// Dynamic import for pdfjs-dist to handle Node.js environment
let pdfjsLib: any;

async function getPdfJsLib() {
  if (!pdfjsLib) {
    // Import pdfjs-dist - it works in Node.js for text extraction
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.min.mjs');
  }
  return pdfjsLib;
}

// Configure PDF.js for Node.js environment
if (typeof process !== 'undefined') {
  // Use canvas for Node.js (requires canvas package, but we'll use a simpler approach)
  // For now, we'll use the basic text extraction which doesn't require canvas
}

interface PdfChapter {
  id: string;
  title: string;
  description?: string;
  content: string;
  originalContent?: string;
  order: number;
}

interface PdfMetadata {
  title: string;
  author: string;
  description?: string;
  language?: string;
  publisher?: string;
  date?: string;
}

interface ParsedPdfResult {
  metadata: PdfMetadata;
  chapters: PdfChapter[];
}

interface ProgressCallback {
  (progress: { page: number; totalPages: number; percentage: number }): void;
}

/**
 * Normalizes text while preserving paragraph structure
 */
function normalizeText(text: string): string {
  let normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  const paragraphs = normalized.split(/\n\n+/);
  
  const normalizedParagraphs = paragraphs
    .map(para => {
      const cleaned = para
        .replace(/\n/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim();
      
      if (!cleaned) return '';
      return cleaned;
    })
    .filter(para => para.length > 0);
  
  return normalizedParagraphs.join('\n\n');
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

/**
 * Extracts text from PDF buffer (server-side)
 * Processes pages in chunks to avoid memory issues
 * @param fileBuffer PDF file buffer
 * @param onProgress Optional progress callback
 */
export async function extractPdfText(
  fileBuffer: Buffer,
  onProgress?: ProgressCallback
): Promise<ParsedPdfResult> {
  try {
    // Get pdfjs library
    const pdfjs = await getPdfJsLib();
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(fileBuffer),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    
    // Extract metadata
    const metadataInfo = await pdf.getMetadata();
    const metadata = parseMetadata(metadataInfo);
    
    // Extract text from all pages
    const chapters: PdfChapter[] = [];
    const numPages = pdf.numPages;
    
    let currentChapter: { title: string; content: string[] } | null = null;
    let chapterIndex = 0;
    
    // Process pages in batches to avoid memory issues
    const BATCH_SIZE = 10;
    
    for (let batchStart = 1; batchStart <= numPages; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, numPages);
      
      // Process batch of pages
      for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
        try {
          // Report progress
          if (onProgress) {
            onProgress({
              page: pageNum,
              totalPages: numPages,
              percentage: Math.round((pageNum / numPages) * 100),
            });
          }
          
          const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text items
        const pageLines: string[] = [];
        let currentLine = '';
        
        for (const item of textContent.items as any[]) {
          const text = item.str || '';
          const hasEOL = item.hasEOL;
          
          currentLine += text;
          
          if (hasEOL) {
            if (currentLine.trim()) {
              pageLines.push(currentLine.trim());
            }
            currentLine = '';
          }
        }
        
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }
        
        if (pageLines.length === 0) {
          continue;
        }
        
        // Try to detect chapter headings
        const firstLine = pageLines[0]?.trim() || '';
        
        const isChapterHeading = firstLine.length < 100 && 
          (firstLine.match(/^(chapter|part|section)\s+\d+/i) || 
           firstLine.match(/^\d+\.\s+[A-Z]/) ||
           (firstLine.length < 50 && firstLine === firstLine.toUpperCase() && firstLine.length > 3));
        
        if (isChapterHeading && currentChapter) {
          // Save previous chapter
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
          currentChapter = {
            title: firstLine,
            content: pageLines.slice(1),
          };
        } else if (currentChapter) {
          // Continue current chapter
          currentChapter.content.push(...pageLines);
        } else {
          // No chapter detected yet, start with a default chapter
          currentChapter = {
            title: 'Introduction',
            content: pageLines,
          };
        }
        } catch (pageError: any) {
          console.warn(`Error processing page ${pageNum}:`, pageError.message);
          // Continue with next page
          continue;
        }
      }
      
      // Yield to event loop after each batch to avoid blocking
      await new Promise(resolve => setImmediate(resolve));
    }
    
    // Add the last chapter
    if (currentChapter) {
      chapters.push({
        id: `chapter-${chapterIndex}`,
        title: currentChapter.title,
        content: normalizeText(currentChapter.content.join(' ')),
        order: chapterIndex,
      });
    }
    
    // If no chapters were detected, split into reasonable-sized chapters
    if (chapters.length === 0 && currentChapter) {
      const allContent = currentChapter.content;
      const targetChapters = Math.max(1, Math.ceil(numPages / 10));
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
    
    // Clean up chapter content
    chapters.forEach(chapter => {
      const normalizedContent = normalizeText(chapter.content);
      chapter.originalContent = normalizedContent;
      chapter.content = normalizedContent;
    });
    
    return {
      metadata,
      chapters,
    };
  } catch (error: any) {
    console.error('Error extracting PDF text:', error);
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

