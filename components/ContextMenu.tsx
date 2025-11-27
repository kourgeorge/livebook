import React, { useEffect, useRef } from 'react';
import { Position } from '../types';

interface ContextMenuProps {
  position: Position;
  onClose: () => void;
  onCopy: () => void;
  onAskAI: () => void;
  selectedText: string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ position, onClose, onCopy, onAskAI, selectedText }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!selectedText) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-2 w-56 text-sm overflow-hidden animate-fade-in"
      style={{ top: position.y, left: position.x }}
    >
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Selected Action</span>
      </div>
      <button 
        onClick={onCopy}
        className="w-full text-left px-4 py-3 hover:bg-brand-50 text-gray-700 hover:text-brand-700 flex items-center transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
        Copy Text
      </button>
      <button 
        onClick={onAskAI}
        className="w-full text-left px-4 py-3 hover:bg-brand-50 text-gray-700 hover:text-brand-700 flex items-center transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        Ask AI about this
      </button>
    </div>
  );
};

export default ContextMenu;