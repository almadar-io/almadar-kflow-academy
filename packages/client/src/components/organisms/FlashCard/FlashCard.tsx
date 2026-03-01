/**
 * FlashCard Organism Component
 * 
 * A flashcard component with front/back sides, flip animation, navigation, and progress.
 * Uses Card, ButtonGroup molecules and Typography, Button, Icon, ProgressBar, Badge atoms.
 */

import React, { useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Badge } from '../../atoms/Badge';
import { cn } from '../../../utils/theme';

export interface FlashCardProps {
  /**
   * Card ID
   */
  id: string;
  
  /**
   * Front side content (question)
   */
  front: string;
  
  /**
   * Back side content (answer)
   */
  back: string;
  
  /**
   * Is flipped
   */
  flipped?: boolean;
  
  /**
   * Callback when flip state changes
   */
  onFlipChange?: (flipped: boolean) => void;
  
  /**
   * Is studied
   */
  studied?: boolean;
  
  /**
   * Callback when marked as studied
   */
  onMarkStudied?: () => void;
  
  /**
   * Callback when reset
   */
  onReset?: () => void;
  
  /**
   * Current card number
   */
  currentCard?: number;
  
  /**
   * Total cards
   */
  totalCards?: number;
  
  /**
   * On next card
   */
  onNext?: () => void;
  
  /**
   * On previous card
   */
  onPrevious?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  id,
  front,
  back,
  flipped: controlledFlipped,
  onFlipChange,
  studied = false,
  onMarkStudied,
  onReset,
  currentCard,
  totalCards,
  onNext,
  onPrevious,
  className,
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleFlip = () => {
    const newFlipped = !flipped;
    if (controlledFlipped === undefined) {
      setInternalFlipped(newFlipped);
    }
    onFlipChange?.(newFlipped);
  };

  const progress = currentCard && totalCards
    ? (currentCard / totalCards) * 100
    : undefined;

  return (
    <div className={cn('relative w-full max-w-md mx-auto', className)}>
      {/* Progress */}
      {progress !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="small" color="secondary">
              Card {currentCard} of {totalCards}
            </Typography>
            <Typography variant="small" color="secondary">
              {Math.round(progress)}%
            </Typography>
          </div>
          <ProgressBar value={progress} color="primary" />
        </div>
      )}

      {/* Flashcard */}
      <div
        className="relative w-full h-64"
        style={{ perspective: '1000px' }}
        onClick={handleFlip}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front Side */}
          <div
            className={cn(
              'absolute inset-0 w-full h-full',
              'bg-white dark:bg-gray-800 rounded-lg shadow-lg',
              'flex items-center justify-center p-6',
              'cursor-pointer'
            )}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
          >
            <div className="text-center">
              <Typography variant="small" color="secondary" className="mb-2">
                Question
              </Typography>
              <Typography variant="h5" className="mb-4">
                {front}
              </Typography>
              <Typography variant="small" color="muted">
                Click to flip
              </Typography>
            </div>
          </div>

          {/* Back Side */}
          <div
            className={cn(
              'absolute inset-0 w-full h-full',
              'bg-white dark:bg-gray-800 rounded-lg shadow-lg',
              'flex items-center justify-center p-6',
              'cursor-pointer'
            )}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-center">
              <Typography variant="small" color="secondary" className="mb-2">
                Answer
              </Typography>
              <Typography variant="h5" className="mb-4">
                {back}
              </Typography>
              {studied && (
                <Badge variant="success" size="sm" className="mt-2">
                  Studied
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <div className="flex justify-center gap-2">
          {onMarkStudied && (
            <Button
              variant="success"
              size="sm"
              icon={Check}
              onClick={(e) => {
                e.stopPropagation();
                onMarkStudied();
              }}
            >
              Mark as Studied
            </Button>
          )}
          {onReset && (
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
            >
              Reset
            </Button>
          )}
        </div>

        {/* Navigation */}
        {(onNext || onPrevious) && (
          <div className="flex justify-center gap-2">
            {onPrevious && (
              <Button variant="secondary" size="sm" onClick={onPrevious}>
                Previous
              </Button>
            )}
            {onNext && (
              <Button variant="primary" size="sm" onClick={onNext}>
                Next
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

FlashCard.displayName = 'FlashCard';
