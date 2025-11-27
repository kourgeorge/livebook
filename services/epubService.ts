import JSZip from 'jszip';
import TurndownService from 'turndown';

export interface EpubChapter {
  id: string;
  title: string;
  description?: string;
  content: string;
  originalContent?: string; // For EPUBs, this is the same as content (already converted from HTML)
  order: number;
}

export interface EpubMetadata {
  title: string;
  author: string;
  description?: string;
  language?: string;
  publisher?: string;
  date?: string;
}

export interface ParsedEpub {
  metadata: EpubMetadata;
  chapters: EpubChapter[];
}

/**
 * Parses an EPUB file and extracts metadata and chapters
 * @param file The EPUB file to parse
 * @returns Promise<ParsedEpub> The parsed EPUB with metadata and chapters
 */
export async function parseEpub(file: File): Promise<ParsedEpub> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Parse OPF file to get metadata and spine (reading order)
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) {
    throw new Error('Invalid EPUB: META-INF/container.xml not found');
  }
  
  const opfPath = extractOpfPath(containerXml);
  const opfContent = await zip.file(opfPath)?.async('string');
  if (!opfContent) {
    throw new Error(`Invalid EPUB: ${opfPath} not found`);
  }
  
  // Parse metadata from OPF
  const metadata = parseMetadata(opfContent);
  
  // Parse manifest and spine to get chapter order
  const { manifest, spine } = parseManifestAndSpine(opfContent);
  
  // Extract base path for resources
  const opfBasePath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
  
  // Try to extract chapter titles from navigation document (NCX or HTML nav)
  const chapterTitles = await extractChapterTitles(zip, opfContent, opfBasePath, manifest);
  
  // Parse chapters in spine order
  const chapters: EpubChapter[] = [];
  let chapterIndex = 0;
  const extractedTitles: string[] = []; // Track extracted titles to detect book title repetition
  
  for (let i = 0; i < spine.length; i++) {
    const itemId = spine[i];
    const manifestItem = manifest[itemId];
    
    if (!manifestItem) {
      console.warn(`Manifest item not found for spine item: ${itemId}`);
      continue;
    }
    
    // Skip non-HTML items (images, CSS, etc.)
    if (!manifestItem.mediaType?.includes('html') && !manifestItem.mediaType?.includes('xhtml')) {
      continue;
    }
    
    // Resolve chapter path relative to OPF file location
    let chapterPath = manifestItem.href;
    if (!chapterPath.startsWith('/')) {
      // Relative path - resolve against OPF base path
      chapterPath = opfBasePath + chapterPath;
    } else {
      // Absolute path - remove leading slash
      chapterPath = chapterPath.substring(1);
    }
    
    // Normalize path separators
    chapterPath = chapterPath.replace(/\\/g, '/');
    
    const chapterContent = await zip.file(chapterPath)?.async('string');
    
    if (chapterContent) {
      chapterIndex++;
      const { title: extractedTitle, content } = extractChapterContent(chapterContent, chapterPath);
      
      // Use title from navigation if available (most reliable)
      let chapterTitle = chapterTitles[chapterPath] || chapterTitles[itemId];
      
      // If no navigation title, use extracted title, but check if it's the book title
      if (!chapterTitle && extractedTitle) {
        // If this title appears multiple times, it's likely the book title, not chapter title
        extractedTitles.push(extractedTitle);
        const titleCount = extractedTitles.filter(t => t === extractedTitle).length;
        
        // If title matches book title or appears more than once, don't use it
        if (extractedTitle !== metadata.title && titleCount <= 1) {
          chapterTitle = extractedTitle;
        }
      }
      
      // Final fallback
      if (!chapterTitle) {
        chapterTitle = `Chapter ${chapterIndex}`;
      }
      
      const markdownContent = convertHtmlToMarkdown(content);
      chapters.push({
        id: `chapter-${chapterIndex}`,
        title: chapterTitle,
        content: markdownContent,
        originalContent: markdownContent, // For EPUBs, markdown is already the "original" after HTML conversion
        order: chapterIndex,
      });
    }
  }
  
  return {
    metadata,
    chapters,
  };
}

/**
 * Extracts the OPF file path from container.xml
 */
function extractOpfPath(containerXml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(containerXml, 'text/xml');
  const rootfile = doc.querySelector('rootfile[media-type="application/oebps-package+xml"]');
  return rootfile?.getAttribute('full-path') || 'OEBPS/content.opf';
}

/**
 * Parses metadata from OPF file
 */
function parseMetadata(opfContent: string): EpubMetadata {
  const parser = new DOMParser();
  const doc = parser.parseFromString(opfContent, 'text/xml');
  
  // Helper to get text content, handling namespaces
  const getText = (tagName: string): string | undefined => {
    // Try with dc: prefix first
    let element = doc.querySelector(`metadata > dc\\:${tagName}`);
    if (!element) {
      // Try without namespace
      element = doc.querySelector(`metadata > ${tagName}`);
    }
    if (!element) {
      // Try with any namespace
      const elements = doc.getElementsByTagName(tagName);
      if (elements.length > 0) {
        element = elements[0];
      }
    }
    return element?.textContent?.trim();
  };
  
  return {
    title: getText('title') || 'Untitled',
    author: getText('creator') || 'Unknown Author',
    description: getText('description'),
    language: getText('language'),
    publisher: getText('publisher'),
    date: getText('date'),
  };
}

/**
 * Parses manifest and spine from OPF file
 */
function parseManifestAndSpine(opfContent: string): {
  manifest: Record<string, { href: string; mediaType: string | null }>;
  spine: string[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(opfContent, 'text/xml');
  
  // Parse manifest
  const manifest: Record<string, { href: string; mediaType: string | null }> = {};
  const manifestItems = doc.querySelectorAll('manifest > item');
  manifestItems.forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    if (id && href) {
      manifest[id] = { href, mediaType };
    }
  });
  
  // Parse spine (reading order)
  const spine: string[] = [];
  const spineItems = doc.querySelectorAll('spine > itemref');
  spineItems.forEach((item) => {
    const idref = item.getAttribute('idref');
    if (idref) {
      spine.push(idref);
    }
  });
  
  return { manifest, spine };
}

/**
 * Extracts chapter titles from navigation documents (NCX or HTML nav)
 */
async function extractChapterTitles(
  zip: JSZip,
  opfContent: string,
  opfBasePath: string,
  manifest: Record<string, { href: string; mediaType: string | null }>
): Promise<Record<string, string>> {
  const titles: Record<string, string> = {};
  
  // Parse OPF to find navigation document
  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, 'text/xml');
  
  // Look for NCX file (EPUB 2)
  const ncxId = opfDoc.querySelector('spine')?.getAttribute('toc');
  if (ncxId) {
    const ncxItem = manifest[ncxId];
    if (ncxItem) {
      let ncxPath = ncxItem.href;
      if (!ncxPath.startsWith('/')) {
        ncxPath = opfBasePath + ncxPath;
      } else {
        ncxPath = ncxPath.substring(1);
      }
      ncxPath = ncxPath.replace(/\\/g, '/');
      
      const ncxContent = await zip.file(ncxPath)?.async('string');
      if (ncxContent) {
        const ncxDoc = parser.parseFromString(ncxContent, 'text/xml');
        const navPoints = ncxDoc.querySelectorAll('navPoint');
        
        navPoints.forEach((navPoint) => {
          const text = navPoint.querySelector('navLabel > text')?.textContent?.trim();
          const content = navPoint.querySelector('content');
          const src = content?.getAttribute('src');
          
          if (text && src) {
            // Extract file path from src (may have anchor like #chapter1)
            const filePath = src.split('#')[0];
            // Resolve relative to NCX location
            const ncxBasePath = ncxPath.substring(0, ncxPath.lastIndexOf('/') + 1);
            const fullPath = filePath.startsWith('/') 
              ? filePath.substring(1)
              : (ncxBasePath + filePath).replace(/\\/g, '/');
            titles[fullPath] = text;
          }
        });
      }
    }
  }
  
  // Look for HTML nav (EPUB 3)
  const navItems = opfDoc.querySelectorAll('manifest > item[media-type="application/xhtml+xml"]');
  for (const item of Array.from(navItems)) {
    const id = item.getAttribute('id');
    const properties = item.getAttribute('properties');
    if (properties?.includes('nav')) {
      let navPath = item.getAttribute('href');
      if (navPath) {
        if (!navPath.startsWith('/')) {
          navPath = opfBasePath + navPath;
        } else {
          navPath = navPath.substring(1);
        }
        navPath = navPath.replace(/\\/g, '/');
        
        const navContent = await zip.file(navPath)?.async('string');
        if (navContent) {
          const navDoc = parser.parseFromString(navContent, 'text/html');
          const navLinks = navDoc.querySelectorAll('nav[epub\\:type="toc"] a, nav[role="doc-toc"] a');
          
          navLinks.forEach((link) => {
            const text = link.textContent?.trim();
            const href = link.getAttribute('href');
            if (text && href) {
              const filePath = href.split('#')[0];
              const navBasePath = navPath.substring(0, navPath.lastIndexOf('/') + 1);
              const fullPath = filePath.startsWith('/')
                ? filePath.substring(1)
                : (navBasePath + filePath).replace(/\\/g, '/');
              titles[fullPath] = text;
            }
          });
        }
      }
    }
  }
  
  return titles;
}

/**
 * Extracts title and content from HTML chapter
 */
function extractChapterContent(htmlContent: string, chapterPath?: string): { title: string | null; content: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // Try to find title - prefer h1, then h2, then title tag
  // Skip if it's the book title (often repeated in each chapter)
  let titleElement = doc.querySelector('h1');
  if (!titleElement) {
    titleElement = doc.querySelector('h2');
  }
  if (!titleElement) {
    titleElement = doc.querySelector('title');
  }
  
  let title = titleElement?.textContent?.trim() || null;
  
  // Get body content - try to get the main content area
  const body = doc.body;
  if (!body) {
    return { title, content: htmlContent };
  }
  
  // Try to find main content area (article, main, or div with class containing "content")
  let contentElement = body.querySelector('article, main, [class*="content"], [class*="chapter"], [class*="text"]');
  if (!contentElement) {
    contentElement = body;
  }
  
  const content = contentElement.innerHTML;
  
  return { title, content };
}

/**
 * Converts HTML content to Markdown using Turndown
 */
function convertHtmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  
  if (!body) return '';
  
  // Remove script, style, and navigation elements
  const elementsToRemove = body.querySelectorAll('script, style, nav, header, footer, [class*="nav"], [class*="toc"]');
  elementsToRemove.forEach((el) => el.remove());
  
  // Initialize Turndown with options
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  });
  
  // Convert to markdown
  let markdown = turndownService.turndown(body.innerHTML);
  
  // Clean up extra whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();
  
  return markdown;
}

