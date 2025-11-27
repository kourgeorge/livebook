import React from 'react';
import { Module, Part } from '../types';
import { BookMetadata } from '../services/bookService';

interface LearningMapProps {
  modules: Module[];
  parts?: Part[];
  bookMetadata?: BookMetadata;
  onModuleSelect: (moduleId: string) => void;
  activeModuleId: string | null;
}

const LearningMap: React.FC<LearningMapProps> = ({ modules, parts, bookMetadata, onModuleSelect, activeModuleId }) => {
  const hasParts = parts && parts.length > 0;
  const displayModules = hasParts ? parts.flatMap(part => part.modules) : modules;

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-16 animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-ink mb-4">
          {bookMetadata?.name || 'Livebook'}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          {bookMetadata?.description || 'A comprehensive interactive course for AI Engineers. Master the architecture of intelligent agents through hands-on patterns and real-world applications.'}
        </p>
        {bookMetadata?.author && (
          <p className="text-sm text-gray-500 mt-4">
            Maintained by <span className="font-semibold text-gray-700">{bookMetadata.author}</span>
          </p>
        )}
      </div>

      {/* Learning Path - Vertical Timeline Style */}
      <div className="relative max-w-4xl mx-auto">
        {/* Vertical Timeline Line */}
        <div className="hidden md:block absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-200 via-brand-400 to-brand-600 rounded-full"></div>

        <div className="space-y-8">
          {hasParts ? (
            parts.map((part, partIndex) => (
              <div key={part.id} className="space-y-8">
                {/* Part Header */}
                <div className="relative flex items-start gap-6">
                  <div className="hidden md:flex relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-brand-600 text-white border-4 border-white shadow-lg">
                      P{partIndex + 1}
                    </div>
                  </div>
                  <div className="flex-1 bg-white rounded-xl p-6 border-2 border-brand-300 shadow-sm">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">{part.title}</h2>
                    {part.description && (
                      <p className="text-gray-600">{part.description}</p>
                    )}
                  </div>
                </div>
                {/* Modules in Part */}
                {part.modules.map((module, moduleIndex) => {
                  const globalIndex = parts.slice(0, partIndex).reduce((acc, p) => acc + p.modules.length, 0) + moduleIndex;
                  const isActive = activeModuleId === module.id;
                  const isCompleted = false; // Could track completion state
                  const moduleNum = globalIndex + 1;

                  return (
                    <div
                      key={module.id}
                      className="relative flex items-start gap-6 group cursor-pointer"
                      onClick={() => onModuleSelect(module.id)}
                    >
                      {/* Timeline Node */}
                      <div className="hidden md:flex relative z-10 flex-shrink-0">
                        <div className={`
                          w-16 h-16 rounded-full flex items-center justify-center text-2xl
                          border-4 transition-all duration-300
                          ${isActive 
                            ? 'bg-brand-600 border-brand-700 shadow-lg shadow-brand-200 scale-110' 
                            : isCompleted
                            ? 'bg-green-500 border-green-600'
                            : 'bg-white border-gray-300 group-hover:border-brand-400 group-hover:bg-brand-50'
                          }
                        `}>
                          {isCompleted ? '✓' : moduleNum}
                        </div>
                      </div>

                      {/* Content Card */}
                      <div className={`
                        flex-1 bg-white rounded-xl p-6 border-2 transition-all duration-300
                        ${isActive 
                          ? 'border-brand-500 shadow-xl shadow-brand-100 ring-4 ring-brand-100 transform scale-[1.02]' 
                          : 'border-gray-200 hover:border-brand-300 hover:shadow-lg'
                        }
                      `}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
                                Module {moduleNum}
                              </span>
                              {isActive && (
                                <span className="text-xs font-bold uppercase tracking-wider text-white bg-brand-600 px-3 py-1 rounded-full animate-pulse">
                                  Current
                                </span>
                              )}
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">
                              {module.title.replace(`Module ${moduleNum}: `, '')}
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-4">
                              {module.description}
                            </p>
                            <button className={`
                              text-sm font-semibold transition-colors
                              ${isActive 
                                ? 'text-brand-700 hover:text-brand-800' 
                                : 'text-brand-600 hover:text-brand-700'
                              }
                            `}>
                              {isActive ? 'Continue Reading →' : 'Start Module →'}
                            </button>
                          </div>
                          
                          {/* Mobile Module Number */}
                          <div className="md:hidden flex-shrink-0">
                            <div className={`
                              w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white
                              ${isActive ? 'bg-brand-600' : 'bg-gray-400'}
                            `}>
                              {moduleNum}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            displayModules.map((module, index) => {
              const isActive = activeModuleId === module.id;
              const isCompleted = false; // Could track completion state
              const moduleNum = index + 1;

              return (
                <div
                  key={module.id}
                  className="relative flex items-start gap-6 group cursor-pointer"
                  onClick={() => onModuleSelect(module.id)}
                >
                  {/* Timeline Node */}
                  <div className="hidden md:flex relative z-10 flex-shrink-0">
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center text-2xl
                      border-4 transition-all duration-300
                      ${isActive 
                        ? 'bg-brand-600 border-brand-700 shadow-lg shadow-brand-200 scale-110' 
                        : isCompleted
                        ? 'bg-green-500 border-green-600'
                        : 'bg-white border-gray-300 group-hover:border-brand-400 group-hover:bg-brand-50'
                      }
                    `}>
                      {isCompleted ? '✓' : moduleNum}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className={`
                    flex-1 bg-white rounded-xl p-6 border-2 transition-all duration-300
                    ${isActive 
                      ? 'border-brand-500 shadow-xl shadow-brand-100 ring-4 ring-brand-100 transform scale-[1.02]' 
                      : 'border-gray-200 hover:border-brand-300 hover:shadow-lg'
                    }
                  `}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
                            Module {moduleNum}
                          </span>
                          {isActive && (
                            <span className="text-xs font-bold uppercase tracking-wider text-white bg-brand-600 px-3 py-1 rounded-full animate-pulse">
                              Current
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">
                          {module.title.replace(`Module ${moduleNum}: `, '')}
                        </h3>
                        <p className="text-gray-600 leading-relaxed mb-4">
                          {module.description}
                        </p>
                        <button className={`
                          text-sm font-semibold transition-colors
                          ${isActive 
                            ? 'text-brand-700 hover:text-brand-800' 
                            : 'text-brand-600 hover:text-brand-700'
                          }
                        `}>
                          {isActive ? 'Continue Reading →' : 'Start Module →'}
                        </button>
                      </div>
                      
                      {/* Mobile Module Number */}
                      <div className="md:hidden flex-shrink-0">
                        <div className={`
                          w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white
                          ${isActive ? 'bg-brand-600' : 'bg-gray-400'}
                        `}>
                          {moduleNum}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-16 max-w-4xl mx-auto">
        <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-brand-400 to-brand-600 h-full transition-all duration-500"
            style={{ 
              width: activeModuleId 
                ? `${((displayModules.findIndex(m => m.id === activeModuleId) + 1) / displayModules.length) * 100}%`
                : '0%'
            }}
          ></div>
        </div>
        <p className="text-center text-sm text-gray-500 mt-3">
          {activeModuleId 
            ? `Module ${displayModules.findIndex(m => m.id === activeModuleId) + 1} of ${displayModules.length}`
            : ''
          }
        </p>
      </div>
    </div>
  );
};

export default LearningMap;
