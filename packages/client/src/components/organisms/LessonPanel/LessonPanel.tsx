/**
 * LessonPanel Organism Component
 * 
 * A panel component for displaying lesson content with editing, generation buttons, prerequisites, and interactive widgets.
 * Uses Card, ButtonGroup molecules and Typography, Button, Icon, Textarea, Badge, Divider atoms.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Edit2, X, Check, Sparkles, FileText, Loader2, Play } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { FormField } from '../../molecules/FormField';
import { Badge } from '../../atoms/Badge';
import { Divider } from '../../atoms/Divider';
import { SegmentRenderer, parseLessonSegments } from '../LessonSegments';
import { cn } from '../../../utils/theme';

export interface Prerequisite {
  /**
   * Prerequisite ID
   */
  id: string;
  
  /**
   * Prerequisite name
   */
  name: string;
}

export interface LessonPanelProps {
  /**
   * Rendered lesson content (markdown or HTML)
   */
  renderedLesson: string;
  
  /**
   * Whether concept has a lesson
   */
  conceptHasLesson: boolean;
  
  /**
   * Callback to generate lesson
   */
  onGenerateLesson?: (simple?: boolean) => void;
  
  /**
   * Is generating lesson
   * @default false
   */
  isGenerating?: boolean;
  
  /**
   * Prerequisites list
   */
  prerequisites?: Prerequisite[];
  
  /**
   * Callback when viewing prerequisite
   */
  onViewPrerequisite?: (prerequisiteName: string) => void;
  
  /**
   * Callback to add prerequisite
   */
  onAddPrerequisite?: (prerequisiteName: string) => void;
  
  /**
   * Callback to remove prerequisite
   */
  onRemovePrerequisite?: (prerequisiteName: string) => void;
  
  /**
   * Callback to generate flashcards
   */
  onGenerateFlashCards?: () => void;
  
  /**
   * Is generating flashcards
   * @default false
   */
  isGeneratingFlashCards?: boolean;
  
  /**
   * Show generation buttons
   * @default false
   */
  showGenerationButtons?: boolean;
  
  /**
   * Is editing mode
   * @default false
   */
  isEditing?: boolean;
  
  /**
   * Callback to start editing
   */
  onEdit?: () => void;
  
  /**
   * Callback to cancel editing
   */
  onCancelEdit?: () => void;
  
  /**
   * Callback to save lesson
   */
  onSaveLesson?: (lesson: string) => void;
  
  /**
   * Lesson content (for editing)
   */
  lessonContent?: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const LessonPanel: React.FC<LessonPanelProps> = ({
  renderedLesson,
  conceptHasLesson,
  onGenerateLesson,
  isGenerating = false,
  prerequisites = [],
  onViewPrerequisite,
  onAddPrerequisite,
  onRemovePrerequisite,
  onGenerateFlashCards,
  isGeneratingFlashCards = false,
  showGenerationButtons = false,
  isEditing = false,
  onEdit,
  onCancelEdit,
  onSaveLesson,
  lessonContent,
  className,
}) => {
  const [editValue, setEditValue] = useState(renderedLesson);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Parse lesson segments if lessonContent is not provided
  const parsedSegments = useMemo(() => {
    if (lessonContent) return null; // Use provided lessonContent if available
    if (!renderedLesson || !conceptHasLesson) return null;
    return parseLessonSegments(renderedLesson);
  }, [renderedLesson, conceptHasLesson, lessonContent]);

  useEffect(() => {
    setEditValue(renderedLesson);
  }, [renderedLesson]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (onSaveLesson) {
      onSaveLesson(editValue);
    }
  };

  const handleCancel = () => {
    setEditValue(renderedLesson);
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <Card className={cn('', className)}>
      <div className="space-y-4">
        {/* Header with Edit button */}
        {conceptHasLesson && !isEditing && onEdit && (
          <div className="flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
              icon={Edit2}
              onClick={onEdit}
            >
              Edit Lesson
            </Button>
          </div>
        )}

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div>
            <Typography variant="small" color="secondary" className="mb-2">
              Prerequisites:
            </Typography>
            <div className="flex flex-wrap gap-2">
              {prerequisites.map((prereq) => (
                <button
                  key={prereq.id}
                  type="button"
                  onClick={() => onViewPrerequisite?.(prereq.name)}
                  className="cursor-pointer"
                >
                  <Badge
                    variant="default"
                    size="sm"
                  >
                    {prereq.name}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lesson Content */}
        {isEditing ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Typography variant="h6">Edit Lesson</Typography>
              <div className="flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  icon={Check}
                  onClick={handleSave}
                >
                  Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={X}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
            <FormField
              type="textarea"
              inputProps={{
                value: editValue,
                onChange: (e) => setEditValue(e.target.value),
                onKeyDown: handleKeyDown,
                rows: 20,
                className: 'font-mono text-sm',
                placeholder: 'Enter lesson markdown content...',
              }}
            />
            <Typography variant="small" color="secondary" className="mt-2">
              Press Ctrl+Enter (or Cmd+Enter on Mac) to save, or Escape to cancel
            </Typography>
          </div>
        ) : (
          <div>
            {lessonContent ? (
              lessonContent
            ) : parsedSegments && parsedSegments.length > 0 ? (
              <SegmentRenderer segments={parsedSegments} />
            ) : renderedLesson ? (
              <div
                className="prose dark:prose-invert max-w-none prose-gray dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-200 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-strong:text-gray-900 dark:prose-strong:text-white prose-li:text-gray-700 dark:prose-li:text-gray-200 prose-code:text-gray-900 dark:prose-code:text-gray-200 prose-pre:text-gray-900 dark:prose-pre:text-gray-200 prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300"
                dangerouslySetInnerHTML={{ __html: renderedLesson }}
              />
            ) : null}
          </div>
        )}

        {/* Start Learning Button - Inviting single button when no lesson exists */}
        {showGenerationButtons && !conceptHasLesson && onGenerateLesson && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 flex justify-center">
            <button
              onClick={() => onGenerateLesson(false)}
              disabled={isGenerating}
              className={cn(
                "inline-flex items-center gap-3 px-8 py-4",
                "bg-gradient-to-r from-indigo-600 to-purple-600",
                "hover:from-indigo-700 hover:to-purple-700",
                "text-white font-semibold rounded-lg",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200",
                "disabled:opacity-75 disabled:cursor-not-allowed",
                "text-lg"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating Your Lesson...
                </>
              ) : (
                <>
                  <Play size={20} className="fill-white" />
                  Start Learning
                </>
              )}
            </button>
          </div>
        )}

        {/* Regeneration Buttons - When lesson exists, show options to regenerate */}
        {showGenerationButtons && conceptHasLesson && (
          <>
            <Divider />
            <div className="flex flex-wrap gap-3">
              {onGenerateLesson && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={isGenerating ? Loader2 : Sparkles}
                    onClick={() => onGenerateLesson(true)}
                    disabled={isGenerating}
                    loading={isGenerating}
                  >
                    Quick Lesson
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={isGenerating ? Loader2 : Sparkles}
                    onClick={() => onGenerateLesson(false)}
                    disabled={isGenerating}
                    loading={isGenerating}
                  >
                    Detailed Lesson
                  </Button>
                </>
              )}
              {onGenerateFlashCards && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={isGeneratingFlashCards ? Loader2 : FileText}
                  onClick={onGenerateFlashCards}
                  disabled={isGenerating || isGeneratingFlashCards}
                  loading={isGeneratingFlashCards}
                >
                  Generate Flash Cards
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

LessonPanel.displayName = 'LessonPanel';
