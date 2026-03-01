/**
 * AssessmentTemplate Component
 * 
 * Quiz/assessment taking experience with questions, timer, and progress tracking.
 * Uses Header, QuestionCard, AssessmentCard organisms and ProgressCard, ButtonGroup, Modal molecules.
 */

import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Modal } from '../../molecules/Modal';
import { Alert } from '../../molecules/Alert';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Badge } from '../../atoms/Badge';
import { Radio } from '../../atoms/Radio';
import { Checkbox } from '../../atoms/Checkbox';
import { cn } from '../../../utils/theme';

export interface AssessmentQuestion {
  /**
   * Question ID
   */
  id: string;
  
  /**
   * Question text
   */
  text: string;
  
  /**
   * Question type
   */
  type: 'single' | 'multiple' | 'text';
  
  /**
   * Answer options (for single/multiple choice)
   */
  options?: Array<{
    id: string;
    text: string;
  }>;
  
  /**
   * User's answer
   */
  answer?: string | string[];
  
  /**
   * Is answered
   */
  isAnswered?: boolean;
  
  /**
   * Is flagged for review
   */
  isFlagged?: boolean;
}

export interface AssessmentTemplateProps {
  /**
   * Assessment ID
   */
  id: string;
  
  /**
   * Assessment title
   */
  title: string;
  
  /**
   * Assessment description
   */
  description?: string;
  
  /**
   * Questions
   */
  questions: AssessmentQuestion[];
  
  /**
   * Current question index
   */
  currentQuestionIndex?: number;
  
  /**
   * On question change
   */
  onQuestionChange?: (index: number) => void;
  
  /**
   * On answer change
   */
  onAnswerChange?: (questionId: string, answer: string | string[]) => void;
  
  /**
   * On flag toggle
   */
  onFlagToggle?: (questionId: string) => void;
  
  /**
   * Time limit in seconds (optional)
   */
  timeLimit?: number;
  
  /**
   * Time remaining in seconds
   */
  timeRemaining?: number;
  
  /**
   * On time up
   */
  onTimeUp?: () => void;
  
  /**
   * On submit
   */
  onSubmit?: () => void;
  
  /**
   * On exit
   */
  onExit?: () => void;
  
  /**
   * Show submit confirmation
   */
  showSubmitConfirmation?: boolean;
  
  /**
   * On confirm submit
   */
  onConfirmSubmit?: () => void;
  
  /**
   * On cancel submit
   */
  onCancelSubmit?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const AssessmentTemplate: React.FC<AssessmentTemplateProps> = ({
  id,
  title,
  description,
  questions,
  currentQuestionIndex = 0,
  onQuestionChange,
  onAnswerChange,
  onFlagToggle,
  timeLimit,
  timeRemaining,
  onTimeUp,
  onSubmit,
  onExit,
  showSubmitConfirmation = false,
  onConfirmSubmit,
  onCancelSubmit,
  className,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showQuestionNav, setShowQuestionNav] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = questions.filter(q => q.isAnswered).length;
  const progress = (answeredCount / questions.length) * 100;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining !== undefined && timeRemaining < 60;

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      onQuestionChange?.(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      onQuestionChange?.(currentQuestionIndex + 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion) return;
    
    if (currentQuestion.type === 'single') {
      onAnswerChange?.(currentQuestion.id, optionId);
    } else if (currentQuestion.type === 'multiple') {
      const currentAnswers = (currentQuestion.answer as string[]) || [];
      const newAnswers = currentAnswers.includes(optionId)
        ? currentAnswers.filter(a => a !== optionId)
        : [...currentAnswers, optionId];
      onAnswerChange?.(currentQuestion.id, newAnswers);
    }
  };

  return (
    <div className={cn('min-h-screen bg-gray-100 dark:bg-gray-900', className)}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 h-14">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Typography variant="h6" className="hidden sm:block truncate">
              {title}
            </Typography>
            <Typography variant="body" weight="medium" className="sm:hidden truncate text-sm">
              {title}
            </Typography>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Timer */}
            {timeRemaining !== undefined && (
              <div className={cn(
                'flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full',
                isLowTime 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                  : 'bg-gray-100 dark:bg-gray-700'
              )}>
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <Typography variant="body" weight="medium" className="text-xs sm:text-sm">
                  {formatTime(timeRemaining)}
                </Typography>
              </div>
            )}
            
            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2">
              <Typography variant="small" color="muted" className="text-xs sm:text-sm">
                {answeredCount}/{questions.length}
              </Typography>
              <div className="w-16 sm:w-24">
                <ProgressBar value={progress} color="primary" size="sm" />
              </div>
            </div>
            
            {/* Exit button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExitConfirm(true)}
              className="text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Exit</span>
              <span className="sm:hidden">X</span>
            </Button>
          </div>
        </div>
        
        {/* Progress bar */}
        <ProgressBar 
          value={progress} 
          color="primary" 
          size="sm" 
          className="h-1"
        />
      </header>

      {/* Main content */}
      <main className="pt-16 pb-24 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto py-4 sm:py-6 md:py-8">
          {/* Low time warning */}
          {isLowTime && (
            <Alert
              variant="warning"
              title="Time is running out!"
              className="mb-6"
            >
              Less than 1 minute remaining. Consider submitting your answers.
            </Alert>
          )}

          {/* Question card */}
          {currentQuestion && (
            <Card className="mb-6">
              {/* Question header */}
              <div className="flex items-center justify-between mb-6">
                <Badge variant="default">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </Badge>
                <Button
                  variant={currentQuestion.isFlagged ? 'warning' : 'ghost'}
                  size="sm"
                  onClick={() => onFlagToggle?.(currentQuestion.id)}
                >
                  {currentQuestion.isFlagged ? 'Flagged' : 'Flag for review'}
                </Button>
              </div>

              {/* Question text */}
              <Typography variant="h5" className="mb-6">
                {currentQuestion.text}
              </Typography>

              {/* Options */}
              {currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => {
                    const isSelected = currentQuestion.type === 'single'
                      ? currentQuestion.answer === option.id
                      : (currentQuestion.answer as string[])?.includes(option.id);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleOptionSelect(option.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left',
                          'transition-colors',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        {currentQuestion.type === 'single' ? (
                          <Radio
                            checked={isSelected}
                            onChange={() => {}}
                            className="pointer-events-none"
                          />
                        ) : (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}}
                            className="pointer-events-none"
                          />
                        )}
                        <Typography variant="body">
                          {option.text}
                        </Typography>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Question navigation grid */}
          <Card>
            <button
              type="button"
              onClick={() => setShowQuestionNav(!showQuestionNav)}
              className="w-full flex items-center justify-between p-3 sm:p-4"
            >
              <Typography variant="body" weight="medium" className="text-sm sm:text-base">
                Question Navigator
              </Typography>
              <Badge variant="default" className="text-xs sm:text-sm">
                {answeredCount} answered
              </Badge>
            </button>
            
            {showQuestionNav && (
              <div className="mt-4 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 p-3 sm:p-4 pt-0">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onQuestionChange?.(index)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium',
                      'transition-colors',
                      index === currentQuestionIndex && 'ring-2 ring-indigo-600',
                      q.isAnswered
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700',
                      q.isFlagged && 'ring-2 ring-yellow-500'
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Bottom navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            icon={ChevronLeft}
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={currentQuestionIndex === questions.length - 1}
              size="sm"
              className="text-xs sm:text-sm hidden sm:inline-flex"
            >
              Skip
            </Button>
            
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                variant="success"
                icon={CheckCircle}
                onClick={onSubmit}
                size="sm"
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Submit</span>
                <span className="sm:hidden">Done</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                iconRight={ChevronRight}
                onClick={handleNext}
                size="sm"
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
              </Button>
            )}
          </div>
        </div>
      </footer>

      {/* Exit confirmation modal */}
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Exit Assessment?"
        size="sm"
      >
        <div className="space-y-4">
          <Typography variant="body" color="secondary">
            Your progress will be lost. Are you sure you want to exit?
          </Typography>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowExitConfirm(false)}
            >
              Cancel
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

      {/* Submit confirmation modal */}
      <Modal
        isOpen={showSubmitConfirmation}
        onClose={onCancelSubmit || (() => {})}
        title="Submit Assessment?"
        size="sm"
      >
        <div className="space-y-4">
          <Typography variant="body" color="secondary">
            You have answered {answeredCount} of {questions.length} questions.
          </Typography>
          {answeredCount < questions.length && (
            <Alert variant="warning">
              {`${questions.length - answeredCount} questions are unanswered.`}
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={onCancelSubmit}
            >
              Review Answers
            </Button>
            <Button
              variant="success"
              onClick={onConfirmSubmit}
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

AssessmentTemplate.displayName = 'AssessmentTemplate';

