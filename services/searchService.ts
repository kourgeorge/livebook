import { Module } from '../types';

export interface SearchableModule {
  module: Module;
  content: string;
  title: string;
  description: string;
}

/**
 * Loads all module content for a book to enable full-text search
 * @param modules Array of module metadata
 * @returns Promise with array of searchable modules (with content loaded)
 */
export async function loadAllModuleContent(modules: Module[]): Promise<SearchableModule[]> {
  const searchableModules = await Promise.all(
    modules.map(async (module) => {
      let content = '';
      
      if (module.path) {
        try {
          const response = await fetch(module.path);
          if (response.ok) {
            content = await response.text();
          }
        } catch (error) {
          console.warn(`Failed to load content for module ${module.id}:`, error);
        }
      }

      return {
        module,
        content,
        title: module.title,
        description: module.description || '',
      };
    })
  );

  return searchableModules;
}

/**
 * Extracts a snippet from content around a match
 * @param content Full content text
 * @param searchTerm Term to find
 * @param contextLength Number of characters before/after to include
 * @returns Snippet with highlighted term
 */
export function extractSnippet(content: string, searchTerm: string, contextLength: number = 100): string {
  const lowerContent = content.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const index = lowerContent.indexOf(lowerTerm);
  
  if (index === -1) {
    // If exact match not found, return first part of content
    return content.substring(0, contextLength * 2) + '...';
  }

  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + searchTerm.length + contextLength);
  
  let snippet = content.substring(start, end);
  
  // Add ellipsis if needed
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  return snippet;
}

