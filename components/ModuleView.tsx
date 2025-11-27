
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useSearchParams } from 'react-router-dom';
import { Module } from '../types';
import ContentFormatSelector, { ContentFormat } from './ContentFormatSelector';
import TextStyleSelector, { TextSize, FontType } from './TextStyleSelector';
import { getCachedOrTransform } from '../services/contentTransformService';
import MindMapFlow from './MindMapFlow';
import { isValidMindmap } from '../utils/mindmapValidator';
import FlashcardDeck from './FlashcardDeck';

interface ModuleViewProps {
  module: Module;
  modules: Module[];
  bookId: string;
  content: string; // Raw markdown content
  onTextSelect: (text: string) => void;
  onUpdateContent: (newContent: string) => void;
  isChatOpen?: boolean;
}

const ModuleView: React.FC<ModuleViewProps> = ({ module, modules, bookId, content, onTextSelect, onUpdateContent, isChatOpen = false }) => {
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat>('default');
  const [displayContent, setDisplayContent] = useState<string>(content);
  const [isTransforming, setIsTransforming] = useState(false);
  const [originalContent, setOriginalContent] = useState<string>(content);
  const [textSize, setTextSize] = useState<TextSize>('medium');
  const [fontType, setFontType] = useState<FontType>('serif');
  const [isMindmapValid, setIsMindmapValid] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('search');
  const contentRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef<boolean>(false);

  // Update original content when module content changes
  useEffect(() => {
    setOriginalContent(content);
    setDisplayContent(content);
    setSelectedFormat('default'); // Reset to default when content changes
    hasScrolledRef.current = false; // Reset scroll flag when module changes
  }, [content, module.id]);

  // Transform content when format changes
  useEffect(() => {
    const transformContent = async () => {
      if (selectedFormat === 'default') {
        setDisplayContent(originalContent);
        setIsMindmapValid(false);
        return;
      }

      setIsTransforming(true);
      setIsMindmapValid(false);
      
      try {
        const transformed = await getCachedOrTransform(bookId, module.id, originalContent, selectedFormat);
        setDisplayContent(transformed);
        
        // Validate mindmap format if mindmap is selected
        if (selectedFormat === 'mindmap') {
          const isValid = isValidMindmap(transformed);
          setIsMindmapValid(isValid);
          
          if (!isValid) {
            console.warn('Generated content is not a valid mindmap format');
          }
        } else {
          setIsMindmapValid(false);
        }
      } catch (error) {
        console.error('Error transforming content:', error);
        setDisplayContent(originalContent);
        setIsMindmapValid(false);
      } finally {
        setIsTransforming(false);
      }
    };

    transformContent();
  }, [selectedFormat, originalContent, bookId, module.id]);

  // Scroll to search term after content is rendered
  useEffect(() => {
    if (searchTerm && displayContent && !isTransforming && !hasScrolledRef.current) {
      // Only scroll for markdown formats (not mindmap or flashcards)
      if (selectedFormat !== 'mindmap' && selectedFormat !== 'flashcards') {
        // Wait for DOM to be fully rendered - check if content is actually in DOM
        const attemptScroll = () => {
          if (!contentRef.current) return false;
          
          // Check if there's actual rendered content (not just the container)
          const hasContent = contentRef.current.querySelector('p, h1, h2, h3, h4, h5, h6, li') !== null;
          if (!hasContent) return false;
          
          scrollToSearchTerm(searchTerm);
          hasScrolledRef.current = true;
          
          // Clear search param after scrolling
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('search');
          setSearchParams(newSearchParams, { replace: true });
          
          return true;
        };
        
        // Try immediately, then with delays
        let timeout1: NodeJS.Timeout | null = null;
        let timeout2: NodeJS.Timeout | null = null;
        
        if (!attemptScroll()) {
          timeout1 = setTimeout(() => {
            if (!attemptScroll()) {
              timeout2 = setTimeout(() => {
                attemptScroll();
              }, 500);
            }
          }, 300);
        }
        
        return () => {
          if (timeout1) clearTimeout(timeout1);
          if (timeout2) clearTimeout(timeout2);
        };
      }
    }
  }, [searchTerm, displayContent, isTransforming, selectedFormat, searchParams, setSearchParams]);

  const scrollToSearchTerm = (term: string) => {
    if (!contentRef.current) {
      console.log('Scroll: contentRef not available');
      return;
    }
    
    const searchLower = term.toLowerCase().trim();
    if (!searchLower) {
      console.log('Scroll: empty search term');
      return;
    }

    console.log('Scroll: searching for term:', searchLower);

    // Find the scrollable container (main element)
    const scrollContainer = contentRef.current.closest('main') as HTMLElement;
    if (!scrollContainer) {
      console.log('Scroll: could not find main container');
      return;
    }

    // First, try to find text using TreeWalker (more precise)
    let bestMatch: { node: Node; index: number } | null = null;
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent || '';
      const index = text.toLowerCase().indexOf(searchLower);
      if (index !== -1) {
        bestMatch = { node, index };
        break;
      }
    }
    
    // Fallback: search in all text-containing elements (p, h1, h2, h3, li, etc.)
    let targetElement: HTMLElement | null = null;
    
    if (bestMatch) {
      try {
        const range = document.createRange();
        range.setStart(bestMatch.node, bestMatch.index);
        range.setEnd(bestMatch.node, bestMatch.index + term.length);
        
        let element = range.commonAncestorContainer as Element;
        if (element.nodeType === Node.TEXT_NODE) {
          element = element.parentElement as Element;
        }
        targetElement = element as HTMLElement;
      } catch (error) {
        console.warn('Error creating range:', error);
      }
    }
    
    // If TreeWalker didn't work, try searching in block elements
    if (!targetElement) {
      const blockElements = contentRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote');
      for (const el of Array.from(blockElements)) {
        const text = el.textContent || '';
        if (text.toLowerCase().includes(searchLower)) {
          targetElement = el as HTMLElement;
          break;
        }
      }
    }
    
    if (!targetElement) {
      console.log('Scroll: term not found in content');
      return;
    }

    console.log('Scroll: found element, scrolling...', targetElement);

    try {
      // Scroll to the element with some offset for the header
      const headerOffset = 120;
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = targetElement.getBoundingClientRect();
      const scrollTop = scrollContainer.scrollTop;
      const relativeTop = elementRect.top - containerRect.top + scrollTop;
      
      scrollContainer.scrollTo({
        top: relativeTop - headerOffset,
        behavior: 'smooth'
      });
      
      // Temporarily highlight the element
      const originalBg = targetElement.style.backgroundColor;
      targetElement.style.backgroundColor = 'rgb(254 240 138)'; // yellow-200
      targetElement.style.transition = 'background-color 0.3s';
      setTimeout(() => {
        targetElement!.style.backgroundColor = originalBg;
        setTimeout(() => {
          if (targetElement) {
            targetElement.style.transition = '';
          }
        }, 300);
      }, 2000);
    } catch (error) {
      console.warn('Error scrolling to search term:', error);
    }
  };

  if (!module) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Module data is missing.</p>
      </div>
    );
  }

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      onTextSelect(selection.toString());
    }
  };

  // Extract title from content (first h1 heading)
  const extractTitle = (content: string): string => {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    return '';
  };

  // Extract body content (everything after the first h1)
  const extractBody = (content: string): string => {
    const lines = content.split('\n');
    let bodyStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('# ')) {
        bodyStartIndex = i + 1;
        // Skip empty lines after title
        while (bodyStartIndex < lines.length && lines[bodyStartIndex].trim() === '') {
          bodyStartIndex++;
        }
        break;
      }
    }
    return bodyStartIndex > 0 ? lines.slice(bodyStartIndex).join('\n') : content;
  };

  const moduleTitle = extractTitle(originalContent);
  const bodyContent = isTransforming ? extractBody(originalContent) : extractBody(displayContent);

  // Calculate module number (1-based, padded to 2 digits to match table of contents)
  const moduleIndex = module ? modules.findIndex(m => m.id === module.id) : -1;
  const moduleNumber = moduleIndex !== -1 ? (moduleIndex + 1).toString().padStart(2, '0') : 'Unknown';

  // Format label mapping
  const formatLabels: Record<ContentFormat, string> = {
    'default': 'Full',
    'tldr': 'TL;DR',
    'concise': 'Concise',
    'bullets': 'Bullets',
    'mindmap': 'Mind Map',
    'friendly': 'Friendly',
    'executive': 'Summary',
    'flashcards': 'Flashcards'
  };

  // Text size mapping
  const sizeClasses: Record<TextSize, string> = {
    'small': 'text-base',
    'medium': 'text-lg',
    'large': 'text-xl'
  };

  // Font type mapping
  const fontClasses: Record<FontType, string> = {
    'serif': 'font-serif',
    'sans': 'font-sans',
    'mono': 'font-mono'
  };

  // Get base prose class based on size
  const getProseSizeClass = (): string => {
    switch (textSize) {
      case 'small': return 'prose prose-sm';
      case 'medium': return 'prose prose-lg';
      case 'large': return 'prose prose-xl';
      default: return 'prose prose-lg';
    }
  };

  return (
    <>
      {/* Floating Format Selector Toolbar */}
      <ContentFormatSelector
        selectedFormat={selectedFormat}
        onFormatChange={setSelectedFormat}
        isTransforming={isTransforming}
        isChatOpen={isChatOpen}
      />

      <div ref={contentRef} className={`${selectedFormat === 'mindmap' || selectedFormat === 'flashcards' ? 'max-w-full' : 'max-w-3xl'} mx-auto pb-24 transition-all duration-300 relative`} onMouseUp={handleSelection}>
        {/* Sticky Header with Module Number and Text Style Selector */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 mb-4 py-3 -mx-6 px-6 flex items-center justify-between">
          <h4 className="text-brand-600 font-bold uppercase tracking-widest text-sm">Module {moduleNumber}</h4>
          {/* Text Style Selector - Right side */}
      <TextStyleSelector
        selectedSize={textSize}
        selectedFont={fontType}
        onSizeChange={setTextSize}
        onFontChange={setFontType}
      />
        </header>

        {selectedFormat === 'mindmap' ? (
          <div className="w-full">
            <div className="mb-4">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                {formatLabels[selectedFormat]} Format
              </p>
            </div>
            {isTransforming ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4"></div>
                  <p className="text-gray-500 text-sm">Generating mindmap...</p>
                </div>
              </div>
            ) : isMindmapValid ? (
              <MindMapFlow content={displayContent} />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-96 border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="text-center mb-4">
                  <p className="text-gray-500 mb-2 font-semibold">Unable to generate valid mindmap</p>
                  <p className="text-gray-400 text-sm mb-4">Please try again or use a different format</p>
                </div>
                {displayContent && (
                  <details className="w-full max-w-2xl">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 mb-2">
                      Show generated content (for debugging)
                    </summary>
                    <pre className="text-xs bg-gray-50 p-4 rounded border border-gray-200 overflow-auto max-h-64">
                      {displayContent.substring(0, 1000)}
                      {displayContent.length > 1000 && '...'}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        ) : selectedFormat === 'flashcards' ? (
          <div className="w-full">
            <div className="mb-4">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                {formatLabels[selectedFormat]} Format
              </p>
            </div>
            {isTransforming ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4"></div>
                  <p className="text-gray-500 text-sm">Generating flashcards...</p>
                </div>
              </div>
            ) : (
              <FlashcardDeck content={displayContent} />
            )}
          </div>
        ) : (
        <>
          <div className={`${getProseSizeClass()} prose-slate max-w-none ${fontClasses[fontType]} transition-all duration-300 ${
            selectedFormat === 'friendly' ? 'friendly-format' :
            selectedFormat === 'bullets' ? 'bullets-format' :
            selectedFormat === 'executive' ? 'executive-format' : ''
          }`}>
            {/* Title and Format Label - Always visible */}
            {moduleTitle && (
              <div>
                <h1 className={`${textSize === 'small' ? 'text-3xl md:text-4xl' : textSize === 'medium' ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl'} ${fontClasses[fontType]} font-bold text-ink mb-6 mt-8 transition-all duration-300`}>
                  {moduleTitle}
                </h1>
                {selectedFormat !== 'default' && (
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide -mt-4 mb-6">
                    {formatLabels[selectedFormat]} Format
                  </p>
                )}
              </div>
            )}

            {/* Body Content - Conditionally shown */}
            {isTransforming ? (
              <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4"></div>
                  <p className="text-gray-500 text-sm">Generating {formatLabels[selectedFormat]} format...</p>
                </div>
              </div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
              h1: ({node, ...props}) => (
                <h1 className={`${textSize === 'small' ? 'text-3xl md:text-4xl' : textSize === 'medium' ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl'} ${fontClasses[fontType]} font-bold text-ink mb-6 mt-8 transition-all duration-300`} {...props} />
              ),
                h2: ({node, ...props}) => <h2 className={`${textSize === 'small' ? 'text-xl' : textSize === 'medium' ? 'text-2xl' : 'text-3xl'} ${fontClasses[fontType]} font-bold text-gray-900 mb-4 mt-10 border-l-4 border-brand-500 pl-4 transition-all duration-300`} {...props} />,
                h3: ({node, ...props}) => <h3 className={`${textSize === 'small' ? 'text-lg' : textSize === 'medium' ? 'text-xl' : 'text-2xl'} ${fontClasses[fontType]} font-bold text-gray-800 mt-6 mb-2 transition-all duration-300`} {...props} />,
              p: ({node, ...props}) => <p className={`${sizeClasses[textSize]} ${fontClasses[fontType]} mb-4 leading-relaxed text-gray-800 transition-all duration-300 ${
                selectedFormat === 'friendly' ? (textSize === 'small' ? 'text-lg' : textSize === 'medium' ? 'text-xl' : 'text-2xl') : ''
              }`} {...props} />,
              ul: ({node, ...props}) => <ul className={`${sizeClasses[textSize]} ${fontClasses[fontType]} ml-6 list-disc text-gray-700 my-1 pl-2 leading-relaxed transition-all duration-300 ${
                  selectedFormat === 'bullets' ? 'space-y-2' : ''
              }`} {...props} />,
              ol: ({node, ...props}) => <ol className={`${sizeClasses[textSize]} ${fontClasses[fontType]} ml-6 list-decimal text-gray-700 my-1 pl-2 leading-relaxed transition-all duration-300`} {...props} />,
              li: ({node, ...props}) => <li className={`${fontClasses[fontType]} pl-1 my-1 transition-all duration-300`} {...props} />,
              blockquote: ({node, ...props}) => (
                <blockquote className={`${sizeClasses[textSize]} ${fontClasses[fontType]} border-l-4 border-brand-500 pl-4 italic text-gray-600 my-6 bg-gray-50 py-3 pr-4 rounded-r transition-all duration-300`} {...props} />
              ),
              img: ({node, ...props}) => {
                let src = (typeof props.src === 'string') ? props.src : undefined;
                // Handle relative paths for images
                if (src && !src.startsWith('http') && !src.startsWith('/') && module?.path) {
                   // Get the directory of the current module path
                   const basePath = module.path.substring(0, module.path.lastIndexOf('/'));
                   src = `${basePath}/${src}`;
                }
                return (
                  <figure className="my-8">
                      <img 
                          {...props} 
                          src={src} 
                          className="rounded-lg shadow-md max-w-full mx-auto border border-gray-100" 
                          alt={props.alt || "Module Illustration"}
                      />
                      {props.alt && (
                          <figcaption className="text-center text-xs text-gray-500 mt-2 italic font-sans">
                              {props.alt}
                          </figcaption>
                      )}
                  </figure>
                );
              },
              code(props: any) {
                const {node, inline, className, children, ...rest} = props;
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <div className="my-8 rounded-lg overflow-hidden shadow-lg border border-gray-200">
                      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center border-b border-slate-700">
                           <span className="text-xs font-mono text-brand-300 uppercase">{match[1]}</span>
                      </div>
                      <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: '1rem' }}
                      {...rest}
                      >
                      {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={`bg-gray-100 text-brand-700 px-1 py-0.5 rounded font-mono text-sm ${className || ''}`} {...rest}>
                    {children}
                  </code>
                );
              }
                }}
              >
                {bodyContent}
              </ReactMarkdown>
            )}
          </div>
        </>
        )}
      </div>
    </>
  );
};

export default ModuleView;
