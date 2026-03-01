import React, { useState, useEffect, useRef } from 'react';
import { FlashCard } from '../../concepts/types';
import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

interface FlashCardsStudyProps {
  flashCards: FlashCard[];
  onComplete?: () => void;
}

const FlashCardsStudy: React.FC<FlashCardsStudyProps> = ({ flashCards, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    // Reset when flash cards change
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudiedCards(new Set());
  }, [flashCards]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      // Mark as studied when flipped
      setStudiedCards(prev => new Set(prev).add(currentIndex));
    }
  };

  const handleNext = () => {
    if (currentIndex < flashCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else if (onComplete) {
      // All cards studied
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudiedCards(new Set());
  };

  // Touch/swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.touches[0].clientX;
    const deltaX = currentX.current - startX.current;
    
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${deltaX}px) rotateY(${isFlipped ? 180 : 0}deg)`;
      cardRef.current.style.opacity = `${1 - Math.abs(deltaX) / 200}`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const deltaX = currentX.current - startX.current;
    const threshold = 100;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - previous
        handlePrevious();
      } else if (deltaX < 0 && currentIndex < flashCards.length - 1) {
        // Swipe left - next
        handleNext();
      }
    }

    // Reset card position
    if (cardRef.current) {
      cardRef.current.style.transform = `rotateY(${isFlipped ? 180 : 0}deg)`;
      cardRef.current.style.opacity = '1';
    }
  };

  if (flashCards.length === 0) {
    return null;
  }

  const currentCard = flashCards[currentIndex];
  const progress = ((currentIndex + 1) / flashCards.length) * 100;
  const allStudied = studiedCards.size === flashCards.length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header with progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Study Cards
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentIndex + 1} / {flashCards.length}
            </span>
            <button
              onClick={handleReset}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Reset cards"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card Container */}
      <div className="relative mb-6" style={{ perspective: '1000px', minHeight: '400px' }}>
        <div
          ref={cardRef}
          className="relative w-full h-96 cursor-pointer transition-all duration-300"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
          }}
          onClick={handleFlip}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Front of card */}
          <div
            className="absolute inset-0 w-full h-full rounded-xl shadow-xl"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
            }}
          >
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl w-full h-full flex flex-col justify-center items-center p-8">
              <div className="text-sm text-indigo-100 mb-4 font-medium uppercase tracking-wider">
                Question
              </div>
              <p className="text-2xl font-semibold text-center leading-relaxed">
                {currentCard.front}
              </p>
              <div className="mt-8 text-xs text-indigo-100/80">
                Tap to flip
              </div>
            </div>
          </div>

          {/* Back of card */}
          <div
            className="absolute inset-0 w-full h-full rounded-xl shadow-xl"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 text-white rounded-xl w-full h-full flex flex-col justify-center items-center p-8">
              <div className="text-sm text-purple-100 mb-4 font-medium uppercase tracking-wider">
                Answer
              </div>
              <p className="text-xl text-center leading-relaxed">
                {currentCard.back}
              </p>
              <div className="mt-8 text-xs text-purple-100/80">
                Tap to flip back
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {studiedCards.has(currentIndex) && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✓ Studied
            </span>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === flashCards.length - 1}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Completion Message */}
      {allStudied && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
          <p className="text-green-700 dark:text-green-300 font-medium">
            🎉 Great job! You've studied all {flashCards.length} cards.
          </p>
        </div>
      )}

      {/* Swipe hint for mobile */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        Swipe left/right to navigate • Tap card to flip
      </p>
    </div>
  );
};

export default FlashCardsStudy;

