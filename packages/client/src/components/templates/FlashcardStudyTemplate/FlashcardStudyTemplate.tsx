/**
 * FlashcardStudyTemplate Component
 * 
 * Dedicated flashcard study session with spaced repetition.
 * Uses FlashCard, ProgressTracker organisms and ProgressCard, ButtonGroup, Modal molecules.
 */

import React, { useState } from 'react';
import { X, RotateCcw, Shuffle, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { FlashCard } from '../../organisms/FlashCard';
import { Card } from '../../molecules/Card';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Badge } from '../../atoms/Badge';
import { cn } from '../../../utils/theme';

export type Difficulty = 'hard' | 'medium' | 'easy';

export interface StudyStats {
  /**
   * Total cards in session
   */
  total: number;

  /**
   * Cards studied
   */
  studied: number;

  /**
   * Cards marked easy
   */
  easy: number;

  /**
   * Cards marked medium
   */
  medium: number;

  /**
   * Cards marked hard
   */
  hard: number;

  /**
   * Current streak
   */
  streak?: number;
}

export interface FlashcardStudyTemplateProps {
  /**
   * Session title
   */
  title?: string;

  /**
   * Flashcards
   */
  cards: Array<{ id: string; question: string; answer: string }>;

  /**
   * Current card index
   */
  currentIndex?: number;

  /**
   * On index change
   */
  onIndexChange?: (index: number) => void;

  /**
   * On difficulty rating
   */
  onDifficultyRating?: (cardId: string, difficulty: Difficulty) => void;

  /**
   * Study statistics
   */
  stats?: StudyStats;

  /**
   * On shuffle
   */
  onShuffle?: () => void;

  /**
   * On reset
   */
  onReset?: () => void;

  /**
   * On exit
   */
  onExit?: () => void;

  /**
   * On complete
   */
  onComplete?: () => void;

  /**
   * Show completion modal
   */
  showCompletionModal?: boolean;

  /**
   * On close completion modal
   */
  onCloseCompletionModal?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const FlashcardStudyTemplate: React.FC<FlashcardStudyTemplateProps> = ({
  title = 'Flashcard Study',
  cards,
  currentIndex = 0,
  onIndexChange,
  onDifficultyRating,
  stats,
  onShuffle,
  onReset,
  onExit,
  onComplete,
  showCompletionModal = false,
  onCloseCompletionModal,
  className,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const currentCard = cards[currentIndex];
  const progress = stats ? (stats.studied / stats.total) * 100 : ((currentIndex + 1) / cards.length) * 100;
  const isLastCard = currentIndex === cards.length - 1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      onIndexChange?.(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      onIndexChange?.(currentIndex + 1);
    } else {
      onComplete?.();
    }
  };

  const handleDifficulty = (difficulty: Difficulty) => {
    if (currentCard) {
      onDifficultyRating?.(currentCard.id, difficulty);
    }
    handleNext();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        setIsFlipped(!isFlipped);
        break;
      case '1':
        handleDifficulty('hard');
        break;
      case '2':
        handleDifficulty('medium');
        break;
      case '3':
        handleDifficulty('easy');
        break;
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'ArrowRight':
        handleNext();
        break;
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped]);

  return (
    <div className={cn('min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col', className)}>
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 h-12 sm:h-14">
          <Typography variant="h6" className="text-base sm:text-lg truncate flex-1 min-w-0 mr-2">
            {title}
          </Typography>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <Typography variant="small" color="muted" className="text-xs sm:text-sm whitespace-nowrap">
                {currentIndex + 1} / {cards.length}
              </Typography>
              <div className="w-24 sm:w-32">
                <ProgressBar value={progress} color="primary" size="sm" />
              </div>
            </div>

            {stats && (
              <div className="hidden md:flex items-center gap-1 sm:gap-2">
                <Badge variant="danger" size="sm" className="text-xs">Hard: {stats.hard}</Badge>
                <Badge variant="warning" size="sm" className="text-xs">Medium: {stats.medium}</Badge>
                <Badge variant="success" size="sm" className="text-xs">Easy: {stats.easy}</Badge>
              </div>
            )}

            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="sm" icon={Shuffle} onClick={onShuffle} title="Shuffle cards">
                <span className="sr-only">Shuffle cards</span>
              </Button>
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset} title="Reset session">
                <span className="sr-only">Reset session</span>
              </Button>
              <Button variant="ghost" size="sm" icon={X} onClick={() => setShowExitConfirm(true)} title="Exit">
                <span className="sr-only">Exit</span>
              </Button>
            </div>
          </div>
        </div>
        <ProgressBar value={progress} color="primary" size="sm" className="h-1" />
      </header>

      {/* Main content - centered flashcard */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6 min-h-0">
        {currentCard && (
          <div
            className="w-full max-w-2xl cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              className="relative w-full aspect-[4/3] sm:aspect-[4/3] transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                }}
              >
                <Card className="w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8">
                  <div className="text-center px-2 sm:px-4">
                    <Typography variant="small" color="muted" className="mb-3 sm:mb-4 text-xs sm:text-sm">
                      Question
                    </Typography>
                    <Typography variant="h4" className="text-xl sm:text-2xl md:text-3xl">
                      {currentCard.question}
                    </Typography>
                    <Typography variant="small" color="muted" className="mt-4 sm:mt-6 text-xs sm:text-sm">
                      Click or press Space to flip
                    </Typography>
                  </div>
                </Card>
              </div>

              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <Card className="w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8">
                  <div className="text-center px-2 sm:px-4">
                    <Typography variant="small" color="muted" className="mb-3 sm:mb-4 text-xs sm:text-sm">
                      Answer
                    </Typography>
                    <Typography variant="h5" className="text-lg sm:text-xl md:text-2xl">
                      {currentCard.answer}
                    </Typography>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          {isFlipped ? (
            <div className="flex justify-center gap-2 sm:gap-3 md:gap-4">
              <Button variant="danger" size="sm" onClick={() => handleDifficulty('hard')} className="flex-1 max-w-[100px] sm:max-w-[120px] text-xs sm:text-sm">
                😕 <span className="hidden sm:inline">Hard</span>
              </Button>
              <Button variant="warning" size="sm" onClick={() => handleDifficulty('medium')} className="flex-1 max-w-[100px] sm:max-w-[120px] text-xs sm:text-sm">
                🤔 <span className="hidden sm:inline">Medium</span>
              </Button>
              <Button variant="success" size="sm" onClick={() => handleDifficulty('easy')} className="flex-1 max-w-[100px] sm:max-w-[120px] text-xs sm:text-sm">
                ✅ <span className="hidden sm:inline">Easy</span>
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center gap-2">
              <Button variant="secondary" icon={ChevronLeft} onClick={handlePrevious} disabled={currentIndex === 0} size="sm" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <Typography variant="body" color="muted" className="text-xs sm:text-sm text-center flex-1">
                <span className="hidden sm:inline">Tap card to reveal answer</span>
                <span className="sm:hidden">Tap to flip</span>
              </Typography>
              <Button variant="secondary" iconRight={ChevronRight} onClick={handleNext} disabled={isLastCard} size="sm" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Skip</span>
                <span className="sm:hidden">Skip</span>
              </Button>
            </div>
          )}
        </div>
      </footer>

      {/* Keyboard hints */}
      <div className="hidden md:flex justify-center gap-3 sm:gap-4 pb-2 sm:pb-4 text-xs text-gray-500">
        <span>Space: Flip</span>
        <span>←/→: Navigate</span>
        <span>1/2/3: Rate difficulty</span>
      </div>

      {/* Exit confirmation modal */}
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Exit Study Session?"
        size="sm"
      >
        <div className="space-y-4">
          <Typography variant="body" color="secondary">
            Your progress will be saved. You can continue later.
          </Typography>
          {stats && (
            <Card className="bg-gray-50 dark:bg-gray-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Typography variant="h5">{stats.studied}</Typography>
                  <Typography variant="small" color="muted">Studied</Typography>
                </div>
                <div>
                  <Typography variant="h5">{stats.total - stats.studied}</Typography>
                  <Typography variant="small" color="muted">Remaining</Typography>
                </div>
                <div>
                  <Typography variant="h5">{Math.round((stats.studied / stats.total) * 100)}%</Typography>
                  <Typography variant="small" color="muted">Complete</Typography>
                </div>
              </div>
            </Card>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowExitConfirm(false)}
            >
              Continue Studying
            </Button>
            <Button
              variant="danger"
              onClick={onExit}
            >
              Exit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Completion modal */}
      <Modal
        isOpen={showCompletionModal}
        onClose={onCloseCompletionModal || (() => { })}
        title="Session Complete!"
        size="sm"
      >
        <div className="space-y-6 text-center">
          <div className="text-6xl">🎉</div>
          <Typography variant="h4">Great job!</Typography>
          <Typography variant="body" color="secondary">
            You've completed all {cards.length} flashcards in this session.
          </Typography>
          {stats && (
            <Card className="bg-gray-50 dark:bg-gray-700">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Typography variant="h4" className="text-red-600">{stats.hard}</Typography>
                  <Typography variant="small" color="muted">Hard</Typography>
                </div>
                <div>
                  <Typography variant="h4" className="text-yellow-600">{stats.medium}</Typography>
                  <Typography variant="small" color="muted">Medium</Typography>
                </div>
                <div>
                  <Typography variant="h4" className="text-green-600">{stats.easy}</Typography>
                  <Typography variant="small" color="muted">Easy</Typography>
                </div>
              </div>
            </Card>
          )}
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              onClick={onReset}
            >
              Study Again
            </Button>
            <Button
              variant="primary"
              onClick={onExit}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

FlashcardStudyTemplate.displayName = 'FlashcardStudyTemplate';

