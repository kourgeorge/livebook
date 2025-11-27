import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardDeckProps {
  content: string; // JSON string of flashcards
}

const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ content }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  // Parse flashcards from JSON content
  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setFlashcards(parsed);
        setCurrentIndex(0);
        setIsFlipped(false);
      }
    } catch (error) {
      console.error('Error parsing flashcards:', error);
      setFlashcards([]);
    }
  }, [content]);

  const currentCard = flashcards[currentIndex];
  const totalCards = flashcards.length;

  const handleNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, totalCards]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  const handleShuffle = useCallback(() => {
    const shuffledCards = [...flashcards];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }
    setFlashcards(shuffledCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShuffled(true);
  }, [flashcards]);

  const handleReset = useCallback(() => {
    // Re-parse original content to restore order
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setFlashcards(parsed);
        setCurrentIndex(0);
        setIsFlipped(false);
        setShuffled(false);
      }
    } catch (error) {
      console.error('Error resetting flashcards:', error);
    }
  }, [content]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (isFlipped) {
          handleNext();
        } else {
          handleFlip();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isFlipped) {
          handlePrevious();
        } else {
          handleFlip();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleFlip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, handleNext, handlePrevious, handleFlip]);

  if (flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-gray-500 mb-2 font-semibold">No flashcards available</p>
          <p className="text-gray-400 text-sm">Unable to parse flashcard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      {/* 3D Transform Styles */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
      
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">
            Card {currentIndex + 1} of {totalCards}
          </span>
          {shuffled && (
            <span className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
              Shuffled
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShuffle}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Shuffle cards"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Shuffle
          </button>
          {shuffled && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Reset to original order"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Flashcard */}
      <div className="relative perspective-1000">
        <div
          className={`relative w-full h-96 transition-transform duration-500 transform-style-preserve-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={handleFlip}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front of card */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rounded-xl shadow-xl border-2 ${
              isFlipped ? 'opacity-0' : 'opacity-100'
            }`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
              backgroundColor: '#ffffff',
              borderColor: '#e5e7eb',
            }}
          >
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-6 py-4 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold uppercase tracking-wide">Question</span>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="text-center w-full">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-lg max-w-none"
                    components={{
                      p: ({ node, ...props }) => <p className="text-2xl font-medium text-gray-800 leading-relaxed" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                    }}
                  >
                    {currentCard.front}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <p className="text-xs text-gray-500 text-center">
                  Click or press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">F</kbd> to flip
                </p>
              </div>
            </div>
          </div>

          {/* Back of card */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rounded-xl shadow-xl border-2 ${
              isFlipped ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              backgroundColor: '#ffffff',
              borderColor: '#e5e7eb',
            }}
          >
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold uppercase tracking-wide">Answer</span>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="text-center w-full">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-lg max-w-none"
                    components={{
                      p: ({ node, ...props }) => <p className="text-lg text-gray-700 leading-relaxed" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                      ul: ({ node, ...props }) => <ul className="text-left list-disc list-inside space-y-2 text-gray-700" {...props} />,
                      ol: ({ node, ...props }) => <ol className="text-left list-decimal list-inside space-y-2 text-gray-700" {...props} />,
                    }}
                  >
                    {currentCard.back}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <p className="text-xs text-gray-500 text-center">
                  Click or press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">F</kbd> to flip back
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            currentIndex === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <div className="flex items-center gap-2">
          {flashcards.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setIsFlipped(false);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-rose-600 w-8'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              title={`Go to card ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === totalCards - 1}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            currentIndex === totalCards - 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md'
          }`}
        >
          Next
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">←</kbd> / <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">→</kbd> Navigate • <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Space</kbd> / <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">F</kbd> Flip
        </p>
      </div>
    </div>
  );
};

export default FlashcardDeck;

