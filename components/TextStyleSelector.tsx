import React from 'react';

export type TextSize = 'small' | 'medium' | 'large';
export type FontType = 'serif' | 'sans' | 'mono';

interface TextStyleSelectorProps {
  selectedSize: TextSize;
  selectedFont: FontType;
  onSizeChange: (size: TextSize) => void;
  onFontChange: (font: FontType) => void;
}

interface SizeOption {
  id: TextSize;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface FontOption {
  id: FontType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const sizeOptions: SizeOption[] = [
  {
    id: 'small',
    label: 'Small',
    icon: <span className="text-[10px] font-bold leading-none">A</span>,
    description: 'Compact text size'
  },
  {
    id: 'medium',
    label: 'Medium',
    icon: <span className="text-sm font-bold leading-none">A</span>,
    description: 'Standard text size'
  },
  {
    id: 'large',
    label: 'Large',
    icon: <span className="text-lg font-bold leading-none">A</span>,
    description: 'Larger text size'
  }
];

const fontOptions: FontOption[] = [
  {
    id: 'serif',
    label: 'Serif',
    icon: <span className="text-sm font-serif">a</span>,
    description: 'Classic serif font'
  },
  {
    id: 'sans',
    label: 'Sans',
    icon: <span className="text-sm font-sans">a</span>,
    description: 'Modern sans-serif'
  },
  {
    id: 'mono',
    label: 'Mono',
    icon: <span className="text-sm font-mono">a</span>,
    description: 'Monospace font'
  }
];

const TextStyleSelector: React.FC<TextStyleSelectorProps> = ({
  selectedSize,
  selectedFont,
  onSizeChange,
  onFontChange
}) => {
  const [isSizeOpen, setIsSizeOpen] = React.useState(false);
  const [isFontOpen, setIsFontOpen] = React.useState(false);
  const sizeDropdownRef = React.useRef<HTMLDivElement>(null);
  const fontDropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedSizeOption = sizeOptions.find(opt => opt.id === selectedSize);
  const selectedFontOption = fontOptions.find(opt => opt.id === selectedFont);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target as Node)) {
        setIsSizeOpen(false);
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setIsFontOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-row items-center gap-2">
      {/* Size Dropdown */}
      <div ref={sizeDropdownRef} className="relative">
        <button
          onClick={() => {
            setIsSizeOpen(!isSizeOpen);
            setIsFontOpen(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-brand-400 transition-all duration-200 cursor-pointer"
        >
          <span className="text-gray-600">{selectedSizeOption?.icon}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-3 w-3 text-gray-400 transition-transform ${isSizeOpen ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isSizeOpen && (
          <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[120px]">
            {sizeOptions.map((option) => {
              const isSelected = option.id === selectedSize;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    onSizeChange(option.id);
                    setIsSizeOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-brand-50 transition-colors ${
                    isSelected ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Font Dropdown */}
      <div ref={fontDropdownRef} className="relative">
        <button
          onClick={() => {
            setIsFontOpen(!isFontOpen);
            setIsSizeOpen(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-brand-400 transition-all duration-200 cursor-pointer"
        >
          <span className="text-gray-600">{selectedFontOption?.icon}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-3 w-3 text-gray-400 transition-transform ${isFontOpen ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isFontOpen && (
          <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[120px]">
            {fontOptions.map((option) => {
              const isSelected = option.id === selectedFont;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    onFontChange(option.id);
                    setIsFontOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-brand-50 transition-colors ${
                    isSelected ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextStyleSelector;

