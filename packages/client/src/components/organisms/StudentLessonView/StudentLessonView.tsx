/**
 * StudentLessonView Organism Component
 * 
 * A full lesson view component with header, flash cards section, lesson content, assessment, and navigation.
 * Uses Card, FlashCard, AssessmentCard, ButtonGroup, ProgressCard molecules and Typography, Button, ProgressBar, Badge, Divider atoms.
 */

import React from 'react';
import { Card } from '../../molecules/Card';
import { FlashCard } from '../FlashCard';
import { AssessmentCard } from '../AssessmentCard';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { ProgressCard } from '../../molecules/ProgressCard';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Badge } from '../../atoms/Badge';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export interface StudentLessonViewProps {
  /**
   * Lesson ID
   */
  id: string;
  
  /**
   * Lesson title
   */
  title: string;
  
  /**
   * Lesson description
   */
  description?: string;
  
  /**
   * Lesson content
   */
  content: React.ReactNode;
  
  /**
   * Flashcards for this lesson
   */
  flashcards?: Array<{
    id: string;
    front: string;
    back: string;
  }>;
  
  /**
   * Assessment questions
   */
  assessment?: {
    questions: Array<{
      id: string;
      question: string;
      type: 'single-choice' | 'multiple-choice' | 'text';
      options?: Array<{ id: string; label: string; value: string }>;
    }>;
  };
  
  /**
   * Lesson progress (0-100)
   */
  progress?: number;
  
  /**
   * Is completed
   */
  completed?: boolean;
  
  /**
   * On previous lesson
   */
  onPrevious?: () => void;
  
  /**
   * On next lesson
   */
  onNext?: () => void;
  
  /**
   * On complete lesson
   */
  onComplete?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const StudentLessonView: React.FC<StudentLessonViewProps> = ({
  id,
  title,
  description,
  content,
  flashcards = [],
  assessment,
  progress,
  completed = false,
  onPrevious,
  onNext,
  onComplete,
  className,
}) => {
  return (
    <div className={cn('w-full max-w-4xl mx-auto space-y-6', className)}>
      {/* Header */}
      <Card>
        <div className="space-y-4">
          <div>
            <Typography variant="h3" className="mb-2">
              {title}
            </Typography>
            {description && (
              <Typography variant="body" color="secondary">
                {description}
              </Typography>
            )}
          </div>

          {progress !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Typography variant="small" color="secondary">
                  Progress
                </Typography>
                <Typography variant="small" color="secondary">
                  {progress}%
                </Typography>
              </div>
              <ProgressBar value={progress} color={completed ? 'success' : 'primary'} />
            </div>
          )}

          {completed && (
            <Badge variant="success" size="lg">
              Lesson Completed!
            </Badge>
          )}
        </div>
      </Card>

      <Divider />

      {/* Lesson Content */}
      <Card>
        <Typography variant="h5" className="mb-4">
          Lesson Content
        </Typography>
        <div className="prose dark:prose-invert max-w-none">
          {content}
        </div>
      </Card>

      {/* Flashcards Section */}
      {flashcards.length > 0 && (
        <>
          <Divider />
          <Card>
            <Typography variant="h5" className="mb-4">
              Flashcards
            </Typography>
            <div className="space-y-4">
              {flashcards.map((card) => (
                <FlashCard
                  key={card.id}
                  id={card.id}
                  front={card.front}
                  back={card.back}
                />
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Assessment Section */}
      {assessment && (
        <>
          <Divider />
          <AssessmentCard
            id={`assessment-${id}`}
            title="Lesson Assessment"
            description="Test your understanding of this lesson."
            questions={assessment.questions.map(q => ({
              id: q.id,
              question: q.question,
              type: q.type,
              options: q.options,
            }))}
            onSubmit={(answers) => console.log('Assessment submitted:', answers)}
          />
        </>
      )}

      {/* Navigation */}
      <Divider />
      <div className="flex justify-between">
        <div>
          {onPrevious && (
            <Button variant="secondary" onClick={onPrevious}>
              Previous Lesson
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {!completed && onComplete && (
            <Button variant="success" onClick={onComplete}>
              Mark as Complete
            </Button>
          )}
          {onNext && (
            <Button variant="primary" onClick={onNext}>
              Next Lesson
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

StudentLessonView.displayName = 'StudentLessonView';
