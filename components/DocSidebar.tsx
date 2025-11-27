import React from 'react';
import { Module, Part } from '../types';

interface DocSidebarProps {
  modules: Module[];
  parts?: Part[];
  activeModuleId: string;
  bookName?: string;
  onSelectModule: (id: string) => void;
  onGoHome: () => void;
}

const DocSidebar: React.FC<DocSidebarProps> = ({ modules, parts, activeModuleId, bookName, onSelectModule, onGoHome }) => {
  // If parts are provided, use them; otherwise fall back to flat modules
  const hasParts = parts && parts.length > 0;
  let moduleIndex = 0;

  return (
    <div className="w-64 bg-paper border-r border-gray-200 h-full overflow-y-auto flex-shrink-0 hidden md:block z-10">
      <div className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors" onClick={onGoHome}>
        <h2 className="font-bold text-ink flex items-center font-sans">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
             Learning Map
        </h2>
      </div>
      <div className="p-4">
        {bookName && (
          <h2 className="text-lg font-serif font-bold text-ink mb-2">{bookName}</h2>
        )}
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 font-sans">Table of Contents</h3>
        {hasParts ? (
          <div className="space-y-4">
            {parts.map((part, partIndex) => (
              <div key={part.id} className="space-y-2">
                {/* Part Header */}
                <div className="bg-brand-50 border-l-4 border-brand-500 rounded-r px-3 py-2 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                      PART {partIndex + 1}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">
                    {part.title}
                  </h4>
                  {part.description && (
                    <p className="text-xs text-gray-600 mt-1 leading-tight">
                      {part.description}
                    </p>
                  )}
                </div>
                {/* Modules in Part */}
                <ul className="space-y-1 pl-2 border-l-2 border-gray-100">
                  {part.modules.map((module) => {
                    moduleIndex++;
                    return (
                      <li key={module.id}>
                        <button
                          onClick={() => onSelectModule(module.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            activeModuleId === module.id
                              ? 'bg-brand-50 text-brand-700 font-bold shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <span className="opacity-50 text-xs mr-2 font-mono">{moduleIndex.toString().padStart(2, '0')}</span>
                          {module.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {modules.map((module, index) => (
              <li key={module.id}>
                <button
                  onClick={() => onSelectModule(module.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeModuleId === module.id
                      ? 'bg-brand-50 text-brand-700 font-bold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="opacity-50 text-xs mr-2 font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                  {module.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
export default DocSidebar;