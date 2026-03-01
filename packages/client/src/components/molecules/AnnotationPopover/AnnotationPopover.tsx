/**
 * AnnotationPopover Molecule Component
 * 
 * A popover component that displays annotation details (question/answer or note)
 * when a highlighted text is clicked. Supports editing and deletion.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { MessageCircleQuestion, StickyNote, Edit2, Trash2, X, ExternalLink } from 'lucide-react';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { cn } from '../../../utils/theme';
import type { QuestionAnswerItem, NoteItem, AnnotationType } from '../../../features/knowledge-graph/types';

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
        'bg-white dark:bg-gray-800',
        'rounded-lg shadow-xl',
        'border border-gray-200 dark:border-gray-700',
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
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' 
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800'
      )}>
        <div className="flex items-center gap-2">
          {isQuestionType ? (
            <MessageCircleQuestion size={16} className="text-blue-600 dark:text-blue-400" />
          ) : (
            <StickyNote size={16} className="text-yellow-600 dark:text-yellow-400" />
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
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-2 border-l-2 border-gray-300 dark:border-gray-600">
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
              <Typography variant="small" className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                Q:
              </Typography>
              <Typography variant="body" className="text-sm mb-2">
                {truncatedContent}
              </Typography>
              {truncatedAnswer && (
                <>
                  <Typography variant="small" className="font-medium text-green-700 dark:text-green-300 mb-1">
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
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              icon={Edit2}
              onClick={onEdit}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-1.5"
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
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5"
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

