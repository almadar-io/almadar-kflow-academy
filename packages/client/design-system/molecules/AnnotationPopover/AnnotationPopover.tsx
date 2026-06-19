/**
 * AnnotationPopover Molecule Component
 * 
 * A popover component that displays annotation details (question/answer or note)
 * when a highlighted text is clicked. Supports editing and deletion.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { MessageCircleQuestion, StickyNote, Edit2, Trash2, X, ExternalLink } from 'lucide-react';
import { Typography, Button } from '@almadar/ui';
import { cn } from '@utils/theme';
import type { QuestionAnswerItem, NoteItem, AnnotationType } from '@features/knowledge-graph/types';

export interface AnnotationPopoverProps {
  /**
   * Type of annotation
   */
  type: AnnotationType;
  
  /**
   * The annotation data
   */
  annotation: QuestionAnswerItem | NoteItem;
  
  /**
   * Position for the popover
   */
  position: {
    top: number;
    left: number;
  };
  
  /**
   * Whether the popover is open
   */
  isOpen: boolean;
  
  /**
   * Callback to close the popover
   */
  onClose: () => void;
  
  /**
   * Callback to view full question/answer in modal
   */
  onViewFull?: () => void;
  
  /**
   * Callback to edit the annotation
   */
  onEdit?: () => void;
  
  /**
   * Callback to delete the annotation
   */
  onDelete?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Type guard for QuestionAnswerItem
 */
function isQuestion(annotation: QuestionAnswerItem | NoteItem): annotation is QuestionAnswerItem {
  return 'question' in annotation && 'answer' in annotation;
}

/**
 * AnnotationPopover component
 */
export const AnnotationPopover: React.FC<AnnotationPopoverProps> = ({
  type,
  annotation,
  position,
  isOpen,
  onClose,
  onViewFull,
  onEdit,
  onDelete,
  className,
}) => {
  if (!isOpen) return null;

  const isQuestionType = type === 'question';
  const content = isQuestionType && isQuestion(annotation) 
    ? annotation.question 
    : (annotation as NoteItem).text;
  const answer = isQuestionType && isQuestion(annotation) ? annotation.answer : null;

  // Truncate content for preview
  const truncatedContent = content.length > 150 
    ? content.substring(0, 150) + '...' 
    : content;
  const truncatedAnswer = answer && answer.length > 200 
    ? answer.substring(0, 200) + '...' 
    : answer;

  const popover = (
    <div
      className={cn(
        'fixed z-[9999] w-80 max-w-[90vw]',
        'bg-card',
        'rounded-lg shadow-xl',
        'border border-border',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 border-b',
        isQuestionType
          ? 'bg-info/10 border-info/20'
          : 'bg-warning/10 border-warning/20'
      )}>
        <div className="flex items-center gap-2">
          {isQuestionType ? (
            <MessageCircleQuestion size={16} className="text-info" />
          ) : (
            <StickyNote size={16} className="text-warning" />
          )}
          <Typography variant="small" className="font-semibold">
            {isQuestionType ? 'Question' : 'Note'}
          </Typography>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={X}
          onClick={onClose}
          className="p-1 h-6 w-6"
          title="Close"
        >
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Selected text context */}
        {annotation.selectedText && (
          <div className="bg-muted rounded-md p-2 border-l-2 border-border">
            <Typography variant="small" color="muted" className="text-xs italic">
              "{annotation.selectedText.length > 80 
                ? annotation.selectedText.substring(0, 80) + '...' 
                : annotation.selectedText}"
            </Typography>
          </div>
        )}

        {/* Main content */}
        <div>
          {isQuestionType ? (
            <>
              <Typography variant="small" className="font-medium text-info mb-1">
                Q:
              </Typography>
              <Typography variant="body" className="text-sm mb-2">
                {truncatedContent}
              </Typography>
              {truncatedAnswer && (
                <>
                  <Typography variant="small" className="font-medium text-success mb-1">
                    A:
                  </Typography>
                  <Typography variant="body" color="muted" className="text-sm">
                    {truncatedAnswer}
                  </Typography>
                </>
              )}
            </>
          ) : (
            <Typography variant="body" className="text-sm">
              {truncatedContent}
            </Typography>
          )}
        </div>

        {/* Timestamp */}
        <Typography variant="small" color="muted" className="text-xs">
          {new Date(annotation.timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted rounded-b-lg">
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              icon={Edit2}
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground p-1.5"
              title="Edit"
            >
              <span className="sr-only">Edit</span>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={onDelete}
              className="text-error hover:text-error/80 p-1.5"
              title="Delete"
            >
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
        
        {onViewFull && (content.length > 150 || (answer && answer.length > 200)) && (
          <Button
            variant="ghost"
            size="sm"
            iconRight={ExternalLink}
            onClick={onViewFull}
            className="text-sm"
          >
            View Full
          </Button>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(popover, document.body);
};

AnnotationPopover.displayName = 'AnnotationPopover';

