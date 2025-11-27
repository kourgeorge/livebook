import React from 'react';
import { Module, Part } from '../types';
import { BookMetadata } from '../services/bookService';

interface LearningMapProps {
  modules: Module[];
  parts?: Part[];
  onModuleSelect: (moduleId: string) => void;
  activeModuleId: string | null;
  bookMetadata?: BookMetadata;
}

const LearningMapHorizontal: React.FC<LearningMapProps> = ({ modules, parts, onModuleSelect, activeModuleId, bookMetadata }) => {
  const hasParts = parts && parts.length > 0;
  const displayModules = hasParts ? parts.flatMap(part => part.modules) : modules;
  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-ink mb-4">
          {bookMetadata?.name || 'Livebook'}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          A comprehensive interactive course for AI Engineers. Master the architecture of intelligent agents.
        </p>
      </div>

      {/* Horizontal Journey Path */}
      <div className="relative">
        {/* Path Line - SVG for smooth curves */}
        <svg className="hidden lg:block absolute top-24 left-0 w-full h-2 pointer-events-none" style={{ zIndex: 0 }}>
          <path
            d={`M 0 1 Q ${100 / modules.length} 8, ${200 / modules.length} 1 T ${400 / modules.length} 1`}
            stroke="url(#gradient)"
            strokeWidth="2"
            fill="none"
            className="animate-draw"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Simple line fallback */}
        <div className="hidden lg:block absolute top-24 left-0 w-full h-1 bg-gradient-to-r from-gray-200 via-brand-300 to-brand-600 rounded-full" style={{ zIndex: 0 }}></div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative" style={{ zIndex: 1 }}>
          {displayModules.map((module, index) => {
            const isActive = activeModuleId === module.id;
            const moduleNum = index + 1;

            return (
              <div
                key={module.id}
                className="relative group"
                onClick={() => onModuleSelect(module.id)}
              >
                {/* Connection Arrow (hidden on mobile) */}
                {index < displayModules.length - 1 && (
                  <div className="hidden lg:block absolute top-12 -right-3 w-6 h-0.5 bg-brand-300 z-0">
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-8 border-l-brand-300 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                  </div>
                )}

                {/* Module Card */}
                <div className={`
                  relative bg-white rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer h-full
                  ${isActive 
                    ? 'border-brand-500 shadow-2xl shadow-brand-100 ring-4 ring-brand-100 transform scale-105' 
                    : 'border-gray-200 hover:border-brand-300 hover:shadow-xl'
                  }
                `}>
                  {/* Module Number Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`
                      w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold
                      transition-all duration-300
                      ${isActive 
                        ? 'bg-brand-600 text-white shadow-lg scale-110' 
                        : 'bg-gray-100 text-gray-600 group-hover:bg-brand-100 group-hover:text-brand-700'
                      }
                    `}>
                      {moduleNum}
                    </div>
                    {isActive && (
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">
                      Module {moduleNum}
                    </div>
                    <h3 className="text-xl font-serif font-bold text-gray-900 mb-3 line-clamp-2">
                      {module.title.replace(`Module ${moduleNum}: `, '')}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                      {module.description}
                    </p>
                    <div className={`
                      text-sm font-semibold transition-colors inline-flex items-center gap-1
                      ${isActive ? 'text-brand-700' : 'text-brand-600 group-hover:text-brand-700'}
                    `}>
                      {isActive ? 'Continue →' : 'Start →'}
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className={`
                    absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none
                    ${isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-5 bg-brand-600'}
                  `}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-6 py-3">
          <span className="text-sm text-gray-600">
            {activeModuleId 
              ? `Module ${displayModules.findIndex(m => m.id === activeModuleId) + 1} of ${displayModules.length}`
              : `${displayModules.length} Modules Available`
            }
          </span>
          {activeModuleId && (
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                style={{ 
                  width: `${((displayModules.findIndex(m => m.id === activeModuleId) + 1) / displayModules.length) * 100}%`
                }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningMapHorizontal;

