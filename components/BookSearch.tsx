import React, { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useNavigate } from 'react-router-dom';
import { Module } from '../types';
import { loadAllModuleContent, SearchableModule, extractSnippet } from '../services/searchService';

interface BookSearchProps {
  modules: Module[];
  bookId: string;
  isBookView: boolean;
}

interface SearchResult {
  item: SearchableModule;
  score?: number;
  matches?: readonly Fuse.FuseResultMatch[];
}

const BookSearch: React.FC<BookSearchProps> = ({ 
  modules, 
  bookId, 
  isBookView 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchableModules, setSearchableModules] = useState<SearchableModule[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const loadedBookIdRef = useRef<string | null>(null);
  const modulesHashRef = useRef<string>('');

  // Create a stable hash of module IDs to detect actual changes
  const modulesHash = useMemo(() => {
    return modules.map(m => m.id).sort().join(',');
  }, [modules]);

  // Load all module content when component mounts or modules/bookId actually changes
  useEffect(() => {
    if (!isBookView || modules.length === 0) {
      // Reset if not in book view
      if (loadedBookIdRef.current !== null) {
        loadedBookIdRef.current = null;
        setSearchableModules([]);
        modulesHashRef.current = '';
      }
      return;
    }

    // Only load if bookId changed or modules actually changed
    const bookIdChanged = loadedBookIdRef.current !== bookId;
    const modulesChanged = modulesHashRef.current !== modulesHash;
    
    if (!bookIdChanged && !modulesChanged) {
      return; // Already loaded for this book
    }

    const loadContent = async () => {
      setIsLoading(true);
      try {
        const loaded = await loadAllModuleContent(modules);
        setSearchableModules(loaded);
        loadedBookIdRef.current = bookId;
        modulesHashRef.current = modulesHash;
      } catch (error) {
        console.error('Failed to load module content for search:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [bookId, modulesHash, isBookView, modules]);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    if (searchableModules.length === 0) return null;

    return new Fuse(searchableModules, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'description', weight: 0.3 },
        { name: 'content', weight: 0.3 },
      ],
      threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
      minMatchCharLength: 2,
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true, // Search anywhere in the text
      findAllMatches: true,
    });
  }, [searchableModules]);

  // Update dropdown position when it opens or window scrolls/resizes
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      } else {
        setDropdownPosition(null);
      }
    };

    updatePosition();

    if (isOpen) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Perform search when query changes
  useEffect(() => {
    if (!query.trim() || !fuse) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchResults = fuse.search(query);
    const limitedResults = searchResults.slice(0, 10).map(result => ({
      item: result.item,
      score: result.score,
      matches: result.matches,
    }));

    setResults(limitedResults);
    setIsOpen(limitedResults.length > 0);
    setFocusedIndex(-1);
  }, [query, fuse]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      } else if (event.key === 'ArrowDown' && isOpen && results.length > 0) {
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (event.key === 'ArrowUp' && isOpen) {
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
      } else if (event.key === 'Enter' && focusedIndex >= 0 && results[focusedIndex]) {
        event.preventDefault();
        handleSelectModule(results[focusedIndex].item.module.id, query);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, results, focusedIndex, query]);

  const handleSelectModule = (moduleId: string, searchTerm?: string) => {
    const url = `/book/${bookId}/module/${moduleId}`;
    const finalUrl = searchTerm && searchTerm.trim()
      ? `${url}?search=${encodeURIComponent(searchTerm.trim())}`
      : url;
    navigate(finalUrl);
    setQuery('');
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.blur();
  };

  const highlightMatch = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} className="bg-brand-200 text-brand-900 px-0.5 rounded font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getSnippet = (item: SearchableModule, searchTerm: string): string => {
    // Try to find match in content first
    const contentSnippet = extractSnippet(item.content, searchTerm, 80);
    if (contentSnippet.toLowerCase().includes(searchTerm.toLowerCase())) {
      return contentSnippet;
    }
    
    // Fall back to description
    if (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return item.description.length > 150 
        ? item.description.substring(0, 150) + '...'
        : item.description;
    }
    
    // Fall back to beginning of content
    return item.content.substring(0, 150) + (item.content.length > 150 ? '...' : '');
  };

  if (!isBookView) return null;

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={isLoading && searchableModules.length === 0 ? "Loading search..." : "Search book..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && results.length > 0 && setIsOpen(true)}
          disabled={isLoading && searchableModules.length === 0}
          className="w-64 px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {isLoading && searchableModules.length === 0 && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && dropdownPosition && (
        <div 
          className="fixed w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] max-h-96 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          {results.map((result, index) => {
            const snippet = getSnippet(result.item, query);
            return (
              <button
                key={result.item.module.id}
                onClick={() => handleSelectModule(result.item.module.id, query)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                  index === focusedIndex ? 'bg-gray-50' : ''
                } ${index !== results.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      {highlightMatch(result.item.title, query)}
                    </div>
                    {snippet && (
                      <div className="text-xs text-gray-600 line-clamp-2 mt-1">
                        {highlightMatch(snippet, query)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-brand-600 font-medium">
                        Module {result.item.module.id.split('-')[1] || result.item.module.id}
                      </span>
                      {result.score !== undefined && (
                        <span className="text-xs text-gray-400">
                          {Math.round((1 - result.score) * 100)}% match
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && query && results.length === 0 && !isLoading && dropdownPosition && (
        <div 
          className="fixed w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] p-4 text-center text-sm text-gray-500"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          No results found for "{query}"
        </div>
      )}
    </div>
  );
};

export default BookSearch;

