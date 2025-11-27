import React from 'react';

export type ContentFormat = 
  | 'default' 
  | 'concise' 
  | 'tldr'
  | 'bullets' 
  | 'mindmap' 
  | 'friendly' 
  | 'executive'
  | 'flashcards';

interface ContentFormatSelectorProps {
  selectedFormat: ContentFormat;
  onFormatChange: (format: ContentFormat) => void;
  isTransforming?: boolean;
  isChatOpen?: boolean;
}

interface FormatOption {
  id: ContentFormat;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const formatOptions: FormatOption[] = [
  {
    id: 'default',
    label: 'Full',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    description: 'Complete detailed content',
    color: 'slate'
  },
  {
    id: 'tldr',
    label: 'TL;DR',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    description: '2 paragraph summary',
    color: 'gray'
  },
  {
    id: 'concise',
    label: 'Concise',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    description: 'Shorter, direct version',
    color: 'blue'
  },
  {
    id: 'bullets',
    label: 'Bullets',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    description: 'Key points as bullets',
    color: 'purple'
  },
  {
    id: 'mindmap',
    label: 'Mind Map',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    description: 'Visual mind map structure',
    color: 'emerald'
  },
  {
    id: 'friendly',
    label: 'Friendly',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: 'Casual & engaging tone',
    color: 'amber'
  },
  {
    id: 'executive',
    label: 'Summary',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    description: 'Executive overview',
    color: 'indigo'
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    description: 'Interactive flashcards',
    color: 'rose'
  }
];

const ContentFormatSelector: React.FC<ContentFormatSelectorProps> = ({
  selectedFormat,
  onFormatChange,
  isTransforming = false,
  isChatOpen = false
}) => {
  const [hoveredFormat, setHoveredFormat] = React.useState<ContentFormat | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(true);

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      slate: {
        bg: isSelected ? 'bg-slate-600' : 'bg-white',
        border: isSelected ? 'border-slate-600' : 'border-gray-300',
        text: isSelected ? 'text-white' : 'text-slate-600',
        hover: 'hover:bg-slate-50 hover:border-slate-400'
      },
      blue: {
        bg: isSelected ? 'bg-blue-600' : 'bg-white',
        border: isSelected ? 'border-blue-600' : 'border-gray-300',
        text: isSelected ? 'text-white' : 'text-blue-600',
        hover: 'hover:bg-blue-50 hover:border-blue-400'
      },
      purple: {
        bg: isSelected ? 'bg-purple-600' : 'bg-white',
        border: isSelected ? 'border-purple-600' : 'border-gray-300',
        text: isSelected ? 'text-white' : 'text-purple-600',
        hover: 'hover:bg-purple-50 hover:border-purple-400'
      },
      emerald: {
        bg: isSelected ? 'bg-emerald-600' : 'bg-white',
        border: isSelected ? 'border-emerald-600' : 'border-gray-300',
        text: isSelected ? 'text-white' : 'text-emerald-600',
        hover: 'hover:bg-emerald-50 hover:border-emerald-400'
      },
      amber: {
        bg: isSelected ? 'bg-amber-600' : 'bg-white',
        border: isSelected ? 'border-amber-600' : 'border-gray-300',
        text: isSelected ? 'text-white' : 'text-amber-600',
        hover: 'hover:bg-amber-50 hover:border-amber-400'
      },
      indigo: {
        bg: isSelected ? 'bg-indigo-600' : 'bg-white',
        border: isSelected ? 'border-indigo-600' : 'border-gray-300',
        text: isSelected ? 'text-white' : 'text-indigo-600',
        hover: 'hover:bg-indigo-50 hover:border-indigo-400'
      },
      rose: {
        bg: isSelected ? 'bg-rose-600' : 'bg-white',
        border: isSelected ? 'border-rose-600' : 'border-gray-300',
        text: isSelected ? 'text-white' : 'text-rose-600',
        hover: 'hover:bg-rose-50 hover:border-rose-400'
      },
      gray: {
        bg: isSelected ? 'bg-gray-600' : 'bg-white',
        border: isSelected ? 'border-gray-600' : 'border-gray-300',
        text: isSelected ? 'text-white' : 'text-gray-600',
        hover: 'hover:bg-gray-50 hover:border-gray-400'
      }
    };
    return colors[color] || colors.slate;
  };

  // Calculate right position: 1rem (16px) from edge, or chatWidth + 1rem when chat is open
  const getChatWidth = () => {
    const saved = localStorage.getItem('chatWidth');
    return saved ? parseInt(saved, 10) : 390;
  };
  const chatWidth = isChatOpen ? getChatWidth() : 0;
  const rightPosition = isChatOpen ? `calc(${chatWidth}px + 1rem)` : '1rem';
  const selectedOption = formatOptions.find(opt => opt.id === selectedFormat);

  return (
    <>
      {/* Desktop: Right side vertical layout */}
    <div 
      className="fixed top-1/2 -translate-y-1/2 z-10 hidden lg:block transition-all duration-300 ease-in-out"
      style={{ right: rightPosition }}
    >
      <div className={`bg-white rounded-lg shadow-xl border border-gray-200 backdrop-blur-sm bg-white/95 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'p-2' : 'p-2'
      }`}>
        {/* Toggle Button / Selected Format (when collapsed) */}
        <div className="flex flex-col gap-1.5 overflow-visible">
          {isCollapsed ? (
            <div className="relative group">
              <button
                onClick={() => setIsCollapsed(false)}
                onMouseEnter={() => selectedOption && setHoveredFormat(selectedFormat)}
                onMouseLeave={() => setHoveredFormat(null)}
                className={`
                  w-12 h-12 rounded-lg
                  border-2 transition-all duration-200
                  flex items-center justify-center
                  cursor-pointer
                  ${selectedOption ? getColorClasses(selectedOption.color, true).bg : 'bg-brand-600'}
                  ${selectedOption ? getColorClasses(selectedOption.color, true).border : 'border-brand-600'}
                  hover:scale-110 hover:shadow-lg
                  ${isTransforming ? 'animate-pulse' : ''}
                `}
                title="Click to expand format options"
              >
                {isTransforming ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : selectedOption ? (
                  <div className="text-white">
                    {selectedOption.icon}
                  </div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              {/* Tooltip showing current format */}
              {hoveredFormat === selectedFormat && selectedOption && !isTransforming && (
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none z-50">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    <div className="font-semibold">{selectedOption.label}</div>
                    <div className="text-gray-300 text-xs mt-0.5">{selectedOption.description}</div>
                    <div className="text-gray-400 text-xs mt-1">Click to expand</div>
                    {/* Arrow */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2">
                      <div className="border-4 border-transparent border-l-gray-900"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Header with collapse button */}
              <div className="flex items-center justify-center mb-1 pb-1 border-b border-gray-100">
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center transition-colors"
                  title="Collapse"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Format Buttons */}
              {formatOptions.map((option) => {
                const isSelected = option.id === selectedFormat;
                const isHovered = hoveredFormat === option.id;
                const colors = getColorClasses(option.color, isSelected);
                const hoverColors = getColorClasses(option.color, false);
                
                return (
                  <div key={option.id} className="relative group">
                    <button
                      onClick={() => {
                        if (!isTransforming) {
                          onFormatChange(option.id);
                          setIsCollapsed(true); // Auto-collapse after selection
                        }
                      }}
                      onMouseEnter={() => setHoveredFormat(option.id)}
                      onMouseLeave={() => setHoveredFormat(null)}
                      disabled={isTransforming}
                      className={`
                        w-12 h-12 rounded-lg
                        border-2 transition-all duration-200
                        flex items-center justify-center
                        ${isTransforming && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${isHovered && !isSelected 
                          ? `${hoverColors.bg} ${hoverColors.border} ${hoverColors.text} scale-110 shadow-lg`
                          : isHovered && isSelected
                          ? `${colors.bg} ${colors.border} ${colors.text} shadow-lg scale-110 ring-2 ring-white ring-opacity-50`
                          : isSelected
                          ? `${colors.bg} ${colors.border} ${colors.text} shadow-md scale-105`
                          : `${colors.bg} ${colors.border} ${colors.text} ${colors.hover}`
                        }
                        ${!isHovered && !isSelected ? 'hover:scale-110 hover:shadow-lg' : ''}
                        ${isTransforming && isSelected ? 'animate-pulse' : ''}
                      `}
                      title={`${option.label}: ${option.description}`}
                    >
                      {isTransforming && isSelected ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className={isHovered && !isSelected ? hoverColors.text : colors.text}>
                          {option.icon}
                        </div>
                      )}
                    </button>

                    {/* Tooltip */}
                    {isHovered && !isTransforming && (
                      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none z-[100] whitespace-nowrap">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-gray-300 text-xs mt-0.5">{option.description}</div>
                          {/* Arrow */}
                          <div className="absolute left-full top-1/2 -translate-y-1/2">
                            <div className="border-4 border-transparent border-l-gray-900"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>

      {/* Mobile: Bottom horizontal layout */}
      <div 
        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 lg:hidden transition-all duration-300 ease-in-out"
        style={{ marginLeft: isChatOpen ? '-160px' : '0' }}
      >
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex flex-row items-center gap-2 backdrop-blur-sm bg-white/95 max-w-[calc(100vw-2rem)] overflow-x-auto">
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className={`
                w-10 h-10 rounded-lg
                border-2 transition-all duration-200
                flex items-center justify-center
                cursor-pointer flex-shrink-0
                ${selectedOption ? getColorClasses(selectedOption.color, true).bg : 'bg-brand-600'}
                ${selectedOption ? getColorClasses(selectedOption.color, true).border : 'border-brand-600'}
                hover:scale-110 hover:shadow-lg
                ${isTransforming ? 'animate-pulse' : ''}
              `}
              title="Click to expand format options"
            >
              {isTransforming ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : selectedOption ? (
                <div className="text-white">
                  {selectedOption.icon}
                </div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsCollapsed(true)}
                className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0"
                title="Collapse"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {formatOptions.map((option) => {
                const isSelected = option.id === selectedFormat;
                const colors = getColorClasses(option.color, isSelected);
                
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (!isTransforming) {
                        onFormatChange(option.id);
                        setIsCollapsed(true);
                      }
                    }}
                    disabled={isTransforming}
                    className={`
                      w-10 h-10 rounded-lg flex-shrink-0
                      border-2 transition-all duration-200
                      flex items-center justify-center
                      ${isTransforming && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      ${isSelected
                        ? `${colors.bg} ${colors.border} ${colors.text} shadow-md scale-105`
                        : `${colors.bg} ${colors.border} ${colors.text} ${colors.hover}`
                      }
                      ${!isSelected ? 'hover:scale-110 hover:shadow-lg' : ''}
                      ${isTransforming && isSelected ? 'animate-pulse' : ''}
                    `}
                    title={`${option.label}: ${option.description}`}
                  >
                    {isTransforming && isSelected ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className={colors.text}>
                        {option.icon}
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ContentFormatSelector;
