/**
 * QuestionCard Organism Component
 * 
 * A card component for displaying questions with options, help text, navigation, and progress.
 * Uses Card, FormField, ButtonGroup molecules and Typography, Radio, Checkbox, Button, ProgressBar, Icon atoms.
 */

import React, { useState } from 'react';
import { Card } from '../../molecules/Card';
import { FormField } from '../../molecules/FormField';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Typography } from '../../atoms/Typography';
import { Radio } from '../../atoms/Radio';
import { Checkbox } from '../../atoms/Checkbox';
import { Button } from '../../atoms/Button';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Icon } from '../../atoms/Icon';
import { cn } from '../../../utils/theme';

export type QuestionType = 'single-choice' | 'multiple-choice' | 'text';

export interface QuestionOption {
  /**
   * Option ID
   */
  id: string;
  
  /**
   * Option label
   */
  label: string;
  
  /**
   * Option value
   */
  value: string;
}

export interface QuestionCardProps {
  /**
   * Question ID
   */
  id: string;
  
  /**
   * Question text
   */
  question: string;
  
  /**
   * Question type
   * @default 'single-choice'
   */
  type?: QuestionType;
  
  /**
   * Question options (for single/multiple choice)
   */
  options?: QuestionOption[];
  
  /**
   * Help text
   */
  helpText?: string;
  
  /**
   * Current answer
   */
  answer?: string | string[];
  
  /**
   * Callback when answer changes
   */
  onAnswerChange?: (answer: string | string[]) => void;
  
  /**
   * Current question number
   */
  currentQuestion?: number;
  
  /**
   * Total questions
   */
  totalQuestions?: number;
  
  /**
   * Show skip button
   * @default false
   */
  showSkip?: boolean;
  
  /**
   * On skip handler
   */
  onSkip?: () => void;
  
  /**
   * On next handler
   */
  onNext?: () => void;
  
  /**
   * On previous handler
   */
  onPrevious?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  id,
  question,
  type = 'single-choice',
  options = [],
  helpText,
  answer,
  onAnswerChange,
  currentQuestion,
  totalQuestions,
  showSkip = false,
  onSkip,
  onNext,
  onPrevious,
  className,
}) => {
  const [localAnswer, setLocalAnswer] = useState<string | string[]>(answer || (type === 'multiple-choice' ? [] : ''));

  const handleAnswerChange = (value: string | string[]) => {
    setLocalAnswer(value);
    onAnswerChange?.(value);
  };

  const progress = currentQuestion && totalQuestions
    ? (currentQuestion / totalQuestions) * 100
    : undefined;

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Progress */}
        {progress !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Typography variant="small" color="secondary">
                Question {currentQuestion} of {totalQuestions}
              </Typography>
              <Typography variant="small" color="secondary">
                {Math.round(progress)}%
              </Typography>
            </div>
            <ProgressBar value={progress} color="primary" />
          </div>
        )}

        {/* Question */}
        <div>
          <Typography variant="h5" className="mb-4">
            {question}
          </Typography>
          {helpText && (
            <Typography variant="small" color="secondary" className="mb-4">
              {helpText}
            </Typography>
          )}
        </div>

        {/* Options */}
        {type === 'single-choice' && options.length > 0 && (
          <div className="space-y-3 w-full">
            {options.map((option) => (
              <label
                key={option.id}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border cursor-pointer w-full',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  'transition-colors',
                  localAnswer === option.value && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                )}
              >
                <Radio
                  checked={localAnswer === option.value}
                  onChange={() => handleAnswerChange(option.value)}
                  className="[&>div]:w-auto flex-shrink-0"
                />
                <Typography variant="body" className="flex-1 text-left">{option.label}</Typography>
              </label>
            ))}
          </div>
        )}

        {type === 'multiple-choice' && options.length > 0 && (
          <div className="space-y-3 w-full">
            {options.map((option) => {
              const selectedAnswers = Array.isArray(localAnswer) ? localAnswer : [];
              const isChecked = selectedAnswers.includes(option.value);
              
              return (
                <label
                  key={option.id}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border cursor-pointer w-full',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'transition-colors',
                    isChecked && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => {
                      const newAnswers = e.target.checked
                        ? [...selectedAnswers, option.value]
                        : selectedAnswers.filter(v => v !== option.value);
                      handleAnswerChange(newAnswers);
                    }}
                    className="[&>div]:w-auto flex-shrink-0"
                  />
                  <Typography variant="body" className="flex-1 text-left">{option.label}</Typography>
                </label>
              );
            })}
          </div>
        )}

        {type === 'text' && (
          <FormField
            type="textarea"
            inputProps={{
              placeholder: 'Enter your answer...',
              rows: 4,
              value: typeof localAnswer === 'string' ? localAnswer : '',
              onChange: (e) => handleAnswerChange(e.target.value),
            }}
          />
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {showSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            )}
          </div>
          <div className="flex gap-2">
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
        </div>
      </div>
    </Card>
  );
};

QuestionCard.displayName = 'QuestionCard';
