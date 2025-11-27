import { Module, Part } from '../types';
import { withBaseUrl } from '../utils/pathUtils';

export interface BookMetadata {
  name: string;
  description: string;
  author: string;
  requestFramePermissions?: string[];
  parts?: Part[]; // New: parts structure
  modules?: Module[]; // Legacy: flat modules array (for backward compatibility)
}

export interface Book {
  id: string;
  metadata: BookMetadata;
  parts?: Part[]; // New: parts structure
  modules: Module[]; // Flattened modules for backward compatibility
}

/**
 * Loads a book by its ID
 * @param bookId The ID of the book (e.g., 'agentic-patterns')
 * @returns Promise<Book> The loaded book with metadata and modules
 */
/**
 * Flattens parts into a single modules array
 */
function flattenParts(parts: Part[]): Module[] {
  return parts.flatMap(part => part.modules);
}

export async function loadBook(bookId: string): Promise<Book> {
  try {
    // Load metadata (which now includes parts or modules)
    const metadataResponse = await fetch(withBaseUrl(`/books/${bookId}/metadata.json`));
    if (!metadataResponse.ok) {
      throw new Error(`Failed to load metadata for book: ${bookId}`);
    }
    const metadata: BookMetadata = await metadataResponse.json();

    // Resolve relative paths to absolute paths
    // The metadata.json is at /books/{bookId}/metadata.json
    // So relative paths should be resolved relative to /books/{bookId}/
    const bookBasePath = withBaseUrl(`/books/${bookId}`);

    let parts: Part[] | undefined;
    let modules: Module[];

    // Check if metadata uses parts structure (new) or flat modules (legacy)
    if (metadata.parts && Array.isArray(metadata.parts) && metadata.parts.length > 0) {
      // New structure: parts containing modules
      parts = metadata.parts.map(part => ({
        ...part,
        modules: part.modules.map(module => ({
          ...module,
          // Always ensure path has base URL
          path: module.path.startsWith('/') 
            ? withBaseUrl(module.path)
            : `${bookBasePath}/${module.path}`
        }))
      }));
      modules = flattenParts(parts);
    } else if (metadata.modules && Array.isArray(metadata.modules) && metadata.modules.length > 0) {
      // Legacy structure: flat modules array
      modules = metadata.modules.map(module => ({
        ...module,
        // Always ensure path has base URL
        path: module.path.startsWith('/') 
          ? withBaseUrl(module.path)
          : `${bookBasePath}/${module.path}`
      }));
    } else {
      throw new Error(`Invalid metadata: neither parts nor modules array found for book: ${bookId}`);
    }

    return {
      id: bookId,
      metadata,
      parts,
      modules,
    };
  } catch (error) {
    console.error(`Error loading book ${bookId}:`, error);
    throw error;
  }
}

/**
 * Gets the default book ID
 * In the future, this could be configurable or user-selected
 */
export function getDefaultBookId(): string {
  return 'agentic-patterns-principles-practices';
}

/**
 * Lists all available books
 * Returns all book IDs that are available in the books directory
 * First tries to get from API (for dynamic discovery), then falls back to hardcoded list
 */
export async function listAvailableBooks(): Promise<string[]> {
  // In production (GitHub Pages), API endpoints don't exist, so skip the API call
  // Only try API in development mode where the Vite dev server provides the endpoints
  if (import.meta.env.DEV) {
    try {
      // Try to get books from API (for dynamically uploaded books)
      const response = await fetch(withBaseUrl('/api/books'));
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.bookIds) && data.bookIds.length > 0) {
          return data.bookIds;
        }
      }
    } catch (error) {
      // API might not be available, fall through to hardcoded list
    }
  }

  // Fallback to hardcoded list of books that actually exist
  // Update this list to match the actual book directories in the books folder
  return [
    'agentic-patterns-principles-practices',
    'agentic-patterns.local'
  ];
}

/**
 * Loads metadata for all available books
 * @returns Promise<Book[]> Array of all available books with their metadata
 */
export async function loadAllBooks(): Promise<Book[]> {
  const bookIds = await listAvailableBooks();
  const books = await Promise.all(
    bookIds.map(async (bookId) => {
      try {
        return await loadBook(bookId);
      } catch (error) {
        // Silently skip books that don't exist (e.g., in production)
        // Only log in development
        if (import.meta.env.DEV) {
          console.debug(`Book ${bookId} not found, skipping`);
        }
        return null;
      }
    })
  );
  return books.filter((book): book is Book => book !== null);
}

/**
 * Loads suggested questions for a book
 * Checks cache API first (for generated questions), then falls back to static questions.json
 * @param bookId The ID of the book
 * @returns Promise with questions map (moduleId -> questions array)
 */
export async function loadBookQuestions(bookId: string): Promise<Record<string, string[]>> {
  // First, try to load from cache API (for generated questions)
  try {
    const cacheResponse = await fetch(withBaseUrl(`/api/questions?bookId=${encodeURIComponent(bookId)}`));
    if (cacheResponse.ok) {
      const data = await cacheResponse.json();
      if (data.success && data.questions) {
        return data.questions;
      }
    }
  } catch (error) {
    // Cache API might not be available (e.g., in production on GitHub Pages)
    // Fall through to static file
  }

  // Fall back to static questions.json file
  try {
    const response = await fetch(withBaseUrl(`/books/${bookId}/cache/questions.json`));
    if (!response.ok) {
      // Silently return empty object if questions file doesn't exist
      return {};
    }
    return await response.json();
  } catch (error) {
    // Silently return empty object on error
    return {};
  }
}

/**
 * Saves questions to the cache (questions.json file)
 * @param bookId The ID of the book
 * @param questions The questions map to save
 */
export async function saveBookQuestions(bookId: string, questions: Record<string, string[]>): Promise<boolean> {
  try {
    const response = await fetch(withBaseUrl(`/api/questions?bookId=${encodeURIComponent(bookId)}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questions),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log(`Questions saved to file system: ${result.path}`);
        return true;
      }
    }
    return false;
  } catch (error) {
    // Silently fail in production (API not available on GitHub Pages)
    return false;
  }
}

