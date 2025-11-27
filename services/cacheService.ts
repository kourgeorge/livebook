import { ContentFormat } from '../components/ContentFormatSelector';
import { withBaseUrl } from '../utils/pathUtils';

/**
 * Cache service for storing and retrieving generated content
 * Uses both localStorage for client-side caching and file system for persistent storage
 */
export class CacheService {
  private bookId: string;
  private cachePrefix: string;

  constructor(bookId: string) {
    this.bookId = bookId;
    this.cachePrefix = `book_cache_${bookId}_`;
  }

  /**
   * Generate a cache key for a module and format
   */
  private getCacheKey(moduleId: string, format: ContentFormat): string {
    return `${this.cachePrefix}${moduleId}_${format}`;
  }

  /**
   * Get cached transformed content
   * Checks file system first, then falls back to localStorage
   */
  async getCachedContent(moduleId: string, format: ContentFormat): Promise<string | null> {
    // First, try to get from file system (in development)
    try {
      const response = await fetch(
        withBaseUrl(`/api/cache?bookId=${encodeURIComponent(this.bookId)}&moduleId=${encodeURIComponent(moduleId)}&format=${encodeURIComponent(format)}`)
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          // Also update localStorage for faster access
          const key = this.getCacheKey(moduleId, format);
          localStorage.setItem(key, JSON.stringify({
            content: data.content,
            timestamp: Date.now(),
            format,
            moduleId,
          }));
          return data.content;
        }
      }
    } catch (error) {
      // File system API might not be available (e.g., in production)
      // Fall through to localStorage
    }

    // Fall back to localStorage
    try {
      const key = this.getCacheKey(moduleId, format);
      const cached = localStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is still valid (optional: add expiration)
        return data.content;
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }
    return null;
  }

  /**
   * Save transformed content to cache
   * Saves to both file system (in development) and localStorage
   */
  async setCachedContent(moduleId: string, format: ContentFormat, content: string): Promise<void> {
    // Save to localStorage first (fast, always available)
    try {
      const key = this.getCacheKey(moduleId, format);
      const data = {
        content,
        timestamp: Date.now(),
        format,
        moduleId,
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error writing to localStorage cache:', error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old cache entries');
        this.clearOldCacheEntries();
      }
    }

    // Also save to file system (for persistent storage in development)
    try {
      const response = await fetch(withBaseUrl('/api/cache'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: this.bookId,
          moduleId,
          format,
          content,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`Cache saved to file system: ${result.path}`);
        }
      } else {
        console.warn('Failed to save cache to file system (this is normal in production)');
      }
    } catch (error) {
      // File system API might not be available (e.g., in production)
      // This is expected and not an error
      console.debug('File system cache not available (this is normal in production)');
    }
  }

  /**
   * Clear old cache entries when storage is full
   */
  private clearOldCacheEntries(): void {
    try {
      const keys: Array<{ key: string; timestamp: number }> = [];
      
      // Collect all cache keys with timestamps
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.timestamp) {
              keys.push({ key, timestamp: data.timestamp });
            }
          } catch {
            // Skip invalid entries
          }
        }
      }

      // Sort by timestamp (oldest first) and remove oldest 50%
      keys.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = Math.floor(keys.length / 2);
      
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(keys[i].key);
      }
    } catch (error) {
      console.error('Error clearing old cache entries:', error);
    }
  }

  /**
   * Clear all cache for this book
   */
  clearCache(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; size: number } {
    let count = 0;
    let size = 0;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          count++;
          const value = localStorage.getItem(key) || '';
          size += key.length + value.length;
        }
      }
    } catch (error) {
      console.error('Error getting cache stats:', error);
    }
    
    return { count, size };
  }
}

/**
 * Get cache service instance for a book
 */
export function getCacheService(bookId: string): CacheService {
  return new CacheService(bookId);
}

