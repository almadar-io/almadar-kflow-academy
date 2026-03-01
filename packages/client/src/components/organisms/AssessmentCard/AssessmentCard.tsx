/**
 * AssessmentCard Organism Component
 * 
 * A card component for assessments with header, questions, answer inputs, submit button, and results.
 * Uses Card, FormField, ButtonGroup, Alert, ProgressCard molecules and Typography, Button, ProgressBar, Badge atoms.
 */

import React, { useState } from 'react';
import { Card } from '../../molecules/Card';
import { FormField } from '../../molecules/FormField';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Alert } from '../../molecules/Alert';
import { ProgressCard } from '../../molecules/ProgressCard';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Badge } from '../../atoms/Badge';
import { QuestionCard, QuestionOption } from '../QuestionCard';
import { cn } from '../../../utils/theme';

export interface AssessmentQuestion {
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
   */
  type: 'single-choice' | 'multiple-choice' | 'text';
  
  /**
   * Question options
   */
  options?: QuestionOption[];
  
  /**
   * Correct answer(s)
   */
  correctAnswer?: string | string[];
  
  /**
   * Points for this question
   */
  points?: number;
}

export interface AssessmentCardProps {
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
   * Assessment questions
   */
  questions: AssessmentQuestion[];
  
  /**
   * Current question index
   */
  currentQuestionIndex?: number;
  
  /**
   * Answers (questionId -> answer)
   */
  answers?: Record<string, string | string[]>;
  
  /**
   * Callback when answer changes
   */
  onAnswerChange?: (questionId: string, answer: string | string[]) => void;
  
  /**
   * On submit handler
   */
  onSubmit?: (answers: Record<string, string | string[]>) => void;
  
  /**
   * Show results
   * @default false
   */
  showResults?: boolean;
  
  /**
   * Score (when results shown)
   */
  score?: number;
  
  /**
   * Total possible score
   */
  totalScore?: number;
  
  /**
   * Loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  id,
  title,
  description,
  questions,
  currentQuestionIndex = 0,
  answers = {},
  onAnswerChange,
  onSubmit,
  showResults = false,
  score,
  totalScore,
  loading = false,
  className,
}) => {
  const [localAnswers, setLocalAnswers] = useState<Record<string, string | string[]>>(answers);
  const [currentIndex, setCurrentIndex] = useState(currentQuestionIndex);

  const currentQuestion = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length * 100;

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    const newAnswers = { ...localAnswers, [questionId]: answer };
    setLocalAnswers(newAnswers);
    onAnswerChange?.(questionId, answer);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit?.(localAnswers);
  };

  const calculateScore = () => {
    if (!showResults) return { score: 0, total: 0 };
    
    let correct = 0;
    let total = 0;

    questions.forEach((q) => {
      const points = q.points || 1;
      total += points;
      
      if (q.correctAnswer) {
        const userAnswer = localAnswers[q.id];
        const isCorrect = Array.isArray(q.correctAnswer)
          ? Array.isArray(userAnswer) && 
            q.correctAnswer.length === userAnswer.length &&
            q.correctAnswer.every(ans => userAnswer.includes(ans))
          : userAnswer === q.correctAnswer;
        
        if (isCorrect) correct += points;
      }
    });

    return { score: correct, total };
  };

  const results = showResults ? calculateScore() : null;
  const displayScore = score !== undefined ? score : results?.score || 0;
  const displayTotal = totalScore !== undefined ? totalScore : results?.total || questions.length;
  const percentage = displayTotal > 0 ? Math.round((displayScore / displayTotal) * 100) : 0;

  if (showResults && results) {
    return (
      <Card className={cn('', className)}>
        <div className="space-y-6">
          <div className="text-center">
            <Typography variant="h4" className="mb-2">
              Assessment Results
            </Typography>
            <Typography variant="body" color="secondary">
              {title}
            </Typography>
          </div>

          <ProgressCard
            title="Your Score"
            progress={percentage}
            progressVariant={percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'danger'}
            statistics={[
              { label: 'Score', value: `${displayScore}/${displayTotal}` },
              { label: 'Percentage', value: `${percentage}%` },
            ]}
          />

          <div className="space-y-4">
            <Typography variant="h6">Question Review</Typography>
            {questions.map((q, idx) => {
              const userAnswer = localAnswers[q.id];
              const isCorrect = q.correctAnswer
                ? (Array.isArray(q.correctAnswer)
                    ? Array.isArray(userAnswer) &&
                      q.correctAnswer.length === userAnswer.length &&
                      q.correctAnswer.every(ans => userAnswer.includes(ans))
                    : userAnswer === q.correctAnswer)
                : null;

              return (
                <div
                  key={q.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    isCorrect === true ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                    isCorrect === false ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                    'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Typography variant="body" weight="semibold">
                      Question {idx + 1}
                    </Typography>
                    {isCorrect !== null && (
                      <Badge variant={isCorrect ? 'success' : 'danger'} size="sm">
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    )}
                  </div>
                  <Typography variant="body" className="mb-2">
                    {q.question}
                  </Typography>
                  <div className="text-sm">
                    <Typography variant="small" color="secondary">
                      Your answer: {Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer || 'No answer'}
                    </Typography>
                    {q.correctAnswer && (
                      <Typography variant="small" color="secondary" className="mt-1">
                        Correct answer: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                      </Typography>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Typography variant="h4" className="mb-2">
            {title}
          </Typography>
          {description && (
            <Typography variant="body" color="secondary">
              {description}
            </Typography>
          )}
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Typography variant="small" color="secondary">
              Question {currentIndex + 1} of {questions.length}
            </Typography>
            <Typography variant="small" color="secondary">
              {Math.round(progress)}%
            </Typography>
          </div>
          <ProgressBar value={progress} color="primary" />
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <QuestionCard
            id={currentQuestion.id}
            question={currentQuestion.question}
            type={currentQuestion.type}
            options={currentQuestion.options}
            answer={localAnswers[currentQuestion.id]}
            onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
            currentQuestion={currentIndex + 1}
            totalQuestions={questions.length}
            onNext={currentIndex < questions.length - 1 ? handleNext : undefined}
            onPrevious={currentIndex > 0 ? handlePrevious : undefined}
          />
        )}

        {/* Submit */}
        {currentIndex === questions.length - 1 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmit}
              loading={loading}
            >
              Submit Assessment
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

AssessmentCard.displayName = 'AssessmentCard';
