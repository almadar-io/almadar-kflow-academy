/**
 * PlacementTest Organism Component
 * 
 * Displays and manages placement test questions and results.
 * Uses Card, Radio, Textarea, ProgressBar, Button, Badge, Spinner atoms and Card molecule.
 */

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Button } from '../../atoms/Button';
import { Badge } from '../../atoms/Badge';
import { Typography } from '../../atoms/Typography';
import { Textarea } from '../../atoms/Textarea';
import { Radio } from '../../atoms/Radio';
import { Spinner } from '../../atoms/Spinner';
import { Alert } from '../../molecules/Alert';
import { Icon } from '../../atoms/Icon';
import { cn } from '../../../utils/theme';

export interface PlacementQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface PlacementAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  answeredAt: number;
}

export interface PlacementTestResult {
  assessedLevel: 'beginner' | 'intermediate' | 'advanced';
  beginnerScore: number;
  intermediateScore: number;
  advancedScore: number;
}

export interface PlacementTestProps {
  /**
   * Test questions
   */
  questions: PlacementQuestion[];
  
  /**
   * Current question index
   */
  currentQuestionIndex?: number;
  
  /**
   * Answers map
   */
  answers?: Map<string, PlacementAnswer>;
  
  /**
   * Test result
   */
  result?: PlacementTestResult;
  
  /**
   * Is loading
   */
  isLoading?: boolean;
  
  /**
   * Error message
   */
  error?: string | null;
  
  /**
   * Show results
   */
  showResults?: boolean;
  
  /**
   * On answer select
   */
  onAnswerSelect?: (questionId: string, answer: string | string[]) => void;
  
  /**
   * On next question
   */
  onNext?: () => void;
  
  /**
   * On previous question
   */
  onPrevious?: () => void;
  
  /**
   * On submit test
   */
  onSubmit?: () => void;
  
  /**
   * On skip test
   */
  onSkip?: () => void;
  
  /**
   * On complete (after results shown)
   */
  onComplete?: (result: { assessedLevel: 'beginner' | 'intermediate' | 'advanced' }) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({
  questions,
  currentQuestionIndex: providedCurrentIndex = 0,
  answers: providedAnswers,
  result,
  isLoading = false,
  error = null,
  showResults = false,
  onAnswerSelect,
  onNext,
  onPrevious,
  onSubmit,
  onSkip,
  onComplete,
  className,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(providedCurrentIndex);
  const [answers, setAnswers] = useState<Map<string, PlacementAnswer>>(providedAnswers || new Map());

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Array.from(answers.values()).filter(a => a.answer).length;

  const handleAnswerSelect = (questionId: string, answer: string | string[]) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, {
      questionId,
      answer,
      isCorrect: false,
      answeredAt: Date.now(),
    });
    setAnswers(newAnswers);
    if (onAnswerSelect) {
      onAnswerSelect(questionId, answer);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      if (onNext) {
        onNext();
      }
    } else {
      if (onSubmit) {
        onSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      if (onPrevious) {
        onPrevious();
      }
    }
  };

  // Loading state
  if (isLoading && questions.length === 0) {
    return (
      <Card className={cn('w-full max-w-3xl mx-auto', className)}>
        <div className="flex flex-col items-center justify-center py-8 sm:py-12">
          <Spinner size="lg" />
          <Typography variant="body" color="secondary" className="mt-4">
            Generating placement test questions...
          </Typography>
        </div>
      </Card>
    );
  }

  // Results screen
  if (showResults && result) {
    const levelColors = {
      beginner: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
      intermediate: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400',
      advanced: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400',
    };

    return (
      <Card className={cn('w-full max-w-3xl mx-auto', className)}>
        <div className="text-center mb-6 sm:mb-8">
          <Icon icon={CheckCircle2} size="xl" className="text-green-500 mx-auto mb-4" />
          <Typography variant="h3" className="mb-2">
            Placement Test Complete!
          </Typography>
          <Typography variant="body" color="secondary">
            We've assessed your current knowledge level
          </Typography>
        </div>

        <div className="space-y-6">
          {/* Assessed Level */}
          <Card variant="outlined">
            <Typography variant="h6" className="mb-4">
              Your Level
            </Typography>
            <Badge
              variant="default"
              className={cn('inline-block px-4 py-2 rounded-lg font-semibold', levelColors[result.assessedLevel])}
            >
              {result.assessedLevel.charAt(0).toUpperCase() + result.assessedLevel.slice(1)}
            </Badge>
            <Typography variant="body" color="secondary" className="mt-3">
              Based on your answers, we've determined you're at an{' '}
              <span className="font-semibold">{result.assessedLevel}</span> level. Your learning path
              will be tailored to this level.
            </Typography>
          </Card>

          {/* Score Breakdown */}
          <Card variant="outlined">
            <Typography variant="h6" className="mb-4">
              Score Breakdown
            </Typography>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Typography variant="body" color="secondary">Beginner Questions</Typography>
                  <Typography variant="body" className="font-semibold">
                    {Math.round(result.beginnerScore * 100)}%
                  </Typography>
                </div>
                <ProgressBar value={result.beginnerScore * 100} size="sm" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Typography variant="body" color="secondary">Intermediate Questions</Typography>
                  <Typography variant="body" className="font-semibold">
                    {Math.round(result.intermediateScore * 100)}%
                  </Typography>
                </div>
                <ProgressBar value={result.intermediateScore * 100} size="sm" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <Typography variant="body" color="secondary">Advanced Questions</Typography>
                  <Typography variant="body" className="font-semibold">
                    {Math.round(result.advancedScore * 100)}%
                  </Typography>
                </div>
                <ProgressBar value={result.advancedScore * 100} size="sm" />
              </div>
            </div>
          </Card>

          {/* Continue Button */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                if (onComplete) {
                  onComplete({
                    assessedLevel: result.assessedLevel,
                  });
                }
              }}
            >
              Continue to Learning Path
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('w-full max-w-3xl mx-auto', className)}>
        <Alert variant="error" title="Error">
          {error}
        </Alert>
        {onSkip && (
          <div className="mt-4">
            <Button variant="secondary" onClick={onSkip}>
              Skip Placement Test
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // No questions yet
  if (!currentQuestion || questions.length === 0) {
    return (
      <Card className={cn('w-full max-w-3xl mx-auto', className)}>
        <div className="text-center py-8 sm:py-12">
          <Typography variant="body" color="secondary" className="mb-4">
            {isLoading ? 'Generating questions...' : 'No questions available'}
          </Typography>
          {!isLoading && onSkip && (
            <Button variant="secondary" onClick={onSkip}>
              Skip Placement Test
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Question display
  return (
    <div className={cn('w-full max-w-3xl mx-auto', className)}>
      {/* Header */}
      <div className="mb-6 relative">
        {onSkip && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="absolute top-0 right-0"
          >
            Skip Test
          </Button>
        )}
        <Typography variant="h3" className="mb-2 pr-32">
          Placement Test
        </Typography>
        <Typography variant="body" color="secondary">
          Answer these questions to help us tailor your learning path to your current level.
        </Typography>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <Typography variant="body" color="secondary">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Typography>
          <Typography variant="body" color="secondary">
            {answeredCount} answered
          </Typography>
        </div>
        <ProgressBar value={progress} size="md" />
      </div>

      {/* Question Card */}
      <Card
        className="mb-4 sm:mb-6"
        header={
          <>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default">
                {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
              </Badge>
            </div>
            <Typography variant="h5" className="mb-2">
              {currentQuestion.question}
            </Typography>
          </>
        }
      >

        {/* Answer Options */}
        {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswer?.answer === option;
              return (
                <div
                  key={index}
                  onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                  className={cn(
                    'flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition',
                    isSelected
                      ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <Radio
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(currentQuestion.id, option)}
                    name={`question-${currentQuestion.id}`}
                    value={option}
                  />
                  <Typography variant="body" className="flex-1">
                    {option}
                  </Typography>
                </div>
              );
            })}
          </div>
        )}

        {currentQuestion.type === 'true_false' && (
          <div className="space-y-3 mb-6">
            {['True', 'False'].map((option) => {
              const isSelected = currentAnswer?.answer === option;
              return (
                <div
                  key={option}
                  onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                  className={cn(
                    'flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition',
                    isSelected
                      ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <Radio
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(currentQuestion.id, option)}
                    name={`question-${currentQuestion.id}`}
                    value={option}
                  />
                  <Typography variant="body" className="flex-1">
                    {option}
                  </Typography>
                </div>
              );
            })}
          </div>
        )}

        {currentQuestion.type === 'short_answer' && (
          <div className="mb-6">
            <Textarea
              value={typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : ''}
              onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
            />
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          {currentQuestionIndex > 0 && (
            <Button variant="secondary" onClick={handlePrevious}>
              Previous
            </Button>
          )}
        </div>

        <Button
          variant="primary"
          onClick={handleNext}
          disabled={!currentAnswer?.answer || isLoading}
          loading={isLoading}
        >
          {isLoading
            ? 'Submitting...'
            : currentQuestionIndex === questions.length - 1
            ? 'Submit Test'
            : 'Next'}
        </Button>
      </div>

      {/* Question Indicators */}
      <div className="mt-6 flex gap-2 justify-center flex-wrap">
        {questions.map((q, index) => {
          const answer = answers.get(q.id);
          const isAnswered = answer && answer.answer;
          const isCurrent = index === currentQuestionIndex;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={cn(
                'w-8 h-8 rounded-full text-sm transition',
                isCurrent
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white ring-2 ring-indigo-300 dark:ring-indigo-400'
                  : isAnswered
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
              title={q.question}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

PlacementTest.displayName = 'PlacementTest';
