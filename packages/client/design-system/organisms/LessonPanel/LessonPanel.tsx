/**
 * LessonPanel Organism Component
 * 
 * A panel component for displaying lesson content with editing, generation buttons, prerequisites, and interactive widgets.
 * Uses Card, ButtonGroup molecules and Typography, Button, Icon, Textarea, Badge, Divider atoms.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Edit2, X, Check, Sparkles, FileText, Loader2, Play } from 'lucide-react';
import { Badge, Button, Card, Divider, Input, Typography } from '@almadar/ui';
import { SegmentRenderer, parseLessonSegments } from '../LessonSegments';
import { normalizeLatexDelimiters } from '../../utils/normalizeLatexDelimiters';
import { cn } from '@utils/theme';

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
  // Normalize LaTeX delimiters first so \[...\] / \(...\) math renders
  // via remark-math/KaTeX.
  const parsedSegments = useMemo(() => {
    if (lessonContent) return null; // Use provided lessonContent if available
    if (!renderedLesson || !conceptHasLesson) return null;
    return parseLessonSegments(normalizeLatexDelimiters(renderedLesson));
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
            <Input
              inputType="textarea"
              value={editValue}
              onChange={(e) => setEditValue((e as React.ChangeEvent<HTMLTextAreaElement>).target.value)}
              onKeyDown={handleKeyDown as React.KeyboardEventHandler}
              rows={20}
              className="font-mono text-sm"
              placeholder="Enter lesson markdown content..."
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
                className="prose max-w-none prose-headings:text-[var(--color-foreground)] prose-p:text-[var(--color-foreground)] prose-a:text-[var(--color-primary)] prose-strong:text-[var(--color-foreground)] prose-li:text-[var(--color-foreground)] prose-code:text-[var(--color-foreground)] prose-pre:text-[var(--color-foreground)] prose-blockquote:text-[var(--color-muted-foreground)]"
                dangerouslySetInnerHTML={{ __html: renderedLesson }}
              />
            ) : null}
          </div>
        )}

        {/* Start Learning Button - Inviting single button when no lesson exists */}
        {showGenerationButtons && !conceptHasLesson && onGenerateLesson && (
          <div className="border-t border-border pt-8 flex justify-center">
            <button
              onClick={() => onGenerateLesson(false)}
              disabled={isGenerating}
              className={cn(
                "inline-flex items-center gap-3 px-8 py-4",
                "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]",
                "hover:opacity-90",
                "text-white font-semibold rounded-lg",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-fast",
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
              {onGenerateFlashCards && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={isGeneratingFlashCards ? Loader2 : FileText}
                  onClick={onGenerateFlashCards}
                  disabled={isGenerating || isGeneratingFlashCards}
                  isLoading={isGeneratingFlashCards}
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
