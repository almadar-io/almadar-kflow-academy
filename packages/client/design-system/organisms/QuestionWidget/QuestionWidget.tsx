/**
 * QuestionWidget Organism Component
 * 
 * Widget for asking questions about concepts with AI-powered answers.
 * Uses Modal, Button, Textarea, Typography, Card, Spinner atoms/molecules.
 * Integrates with SegmentRenderer for displaying markdown answers.
 * 
 * This is a DUMB component - all state and API calls are managed by the container.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { HelpCircle, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

import { Button, Modal, Spinner, Typography } from '@almadar/ui';
import { SegmentRenderer, parseMarkdownWithCodeBlocks } from '../LessonSegments';

/**
 * Question-answer pair for display
 */
export interface QuestionAnswerDisplay {
  id: string;
  question: string;
  answer: string;
  selectedText?: string;
  timestamp?: number;
}

export interface QuestionWidgetProps {
  /**
   * Whether widget is open (controlled)
   */
  isOpen: boolean;
  
  /**
   * Callback to close widget
   */
  onClose: () => void;
  
  /**
   * Callback when user submits a question
   * Container handles the API call and streaming
   */
  onSubmitQuestion: (question: string) => void;
  
  /**
   * Selected text from lesson (for context display)
   */
  selectedText?: string;
  
  /**
   * Previous questions for this concept (from container)
   */
  questions?: QuestionAnswerDisplay[];
  
  /**
   * Current streaming answer (from container)
   */
  streamingAnswer?: string;
  
  /**
   * Whether currently loading/streaming
   */
  isLoading?: boolean;
  
  /**
   * Whether streaming is complete (show "Ask Another" button)
   */
  isComplete?: boolean;
  
  /**
   * Error message if any
   */
  error?: string;
  
  /**
   * Callback to reset for another question
   */
  onReset?: () => void;
  
  /**
   * Whether to show floating button
   * @default false
   */
  showFloatingButton?: boolean;
  
  /**
   * Callback to open widget (for floating button)
   */
  onOpen?: () => void;
}

export const QuestionWidget: React.FC<QuestionWidgetProps> = ({
  isOpen,
  onClose,
  onSubmitQuestion,
  selectedText,
  questions = [],
  streamingAnswer,
  isLoading = false,
  isComplete = false,
  error,
  onReset,
  showFloatingButton = false,
  onOpen,
}) => {
  const [question, setQuestion] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const questionInputRef = useRef<HTMLTextAreaElement>(null);

  // Parse answer content into segments (markdown and code blocks)
  const answerSegments = useMemo(() => {
    if (!streamingAnswer) return [];
    return parseMarkdownWithCodeBlocks(streamingAnswer);
  }, [streamingAnswer]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && questionInputRef.current && !streamingAnswer) {
      setTimeout(() => {
        questionInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, streamingAnswer]);

  // Clear question when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuestion('');
    }
  }, [isOpen]);

  const handleSubmit = useCallback(() => {
    if (question.trim()) {
      onSubmitQuestion(question.trim());
    }
  }, [question, onSubmitQuestion]);

  const handleReset = useCallback(() => {
    setQuestion('');
    onReset?.();
  }, [onReset]);

  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const modalFooter = (
    <div className="flex items-center justify-end gap-2">
      {isComplete ? (
        <Button
          variant="secondary"
          onClick={handleReset}
        >
          Ask Another Question
        </Button>
      ) : (
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!question.trim() || isLoading}
            isLoading={isLoading}
            icon={Send}
          >
            Ask
          </Button>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Floating Question Icon */}
      {showFloatingButton && onOpen && (
        <button
          onClick={onOpen}
          className="fixed bottom-6 right-6 z-50 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          aria-label="Ask a question"
          title="Ask a question about this lesson"
        >
          <HelpCircle size={24} />
        </button>
      )}

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Ask a Question"
        footer={modalFooter}
        size="lg"
        closeOnOverlayClick={!isLoading}
        closeOnEscape={!isLoading}
      >
        <div className="space-y-4">
          {/* Selected Text Display */}
          {selectedText && (
            <div className="bg-primary/10 border-l-4 border-primary p-3 rounded-r-md">
              <Typography variant="small" className="text-primary mb-1 font-medium">
                Selected text:
              </Typography>
              <Typography variant="body" className="text-foreground italic">
                "{selectedText.length > 200 ? selectedText.substring(0, 200) + '...' : selectedText}"
              </Typography>
            </div>
          )}

          {/* Previous Questions List */}
          {questions.length > 0 && !streamingAnswer && (
            <div className="space-y-3">
              <Typography variant="h6" className="text-sm font-semibold">
                Previous Questions ({questions.length})
              </Typography>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {questions.map((qa) => {
                  const isExpanded = expandedQuestions.has(qa.id);
                  return (
                    <div key={qa.id} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleQuestionExpansion(qa.id)}
                        className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-surface-hover transition-colors"
                      >
                        <Typography variant="body" className="flex-1 truncate font-medium">
                          {qa.question}
                        </Typography>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-muted-foreground flex-shrink-0 ml-2" />
                        ) : (
                          <ChevronDown size={16} className="text-muted-foreground flex-shrink-0 ml-2" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 py-2 bg-surface border-t border-border">
                          {qa.selectedText && (
                            <Typography variant="small" className="mb-2 text-muted-foreground italic">
                              Context: "{qa.selectedText}"
                            </Typography>
                          )}
                          <Typography variant="body" className="text-foreground whitespace-pre-wrap">
                            {qa.answer}
                          </Typography>
                          {qa.timestamp && (
                            <Typography variant="small" className="mt-2 text-muted-foreground">
                              {new Date(qa.timestamp).toLocaleString()}
                            </Typography>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question Input - only show before streaming starts */}
          {!streamingAnswer && !isLoading && (
            <div className="space-y-2">
              <label htmlFor="question" className="block text-sm font-medium text-foreground">
                Your Question
              </label>
              <textarea
                ref={questionInputRef}
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this concept..."
                rows={4}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground placeholder:text-[var(--color-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              />
              <Typography variant="small" className="text-muted-foreground">
                Press Cmd/Ctrl + Enter to submit
              </Typography>
            </div>
          )}

          {/* Streaming/Loading State */}
          {isLoading && !streamingAnswer && (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" className="text-primary" />
              <Typography variant="body" className="ml-3 text-muted-foreground">
                Generating answer...
              </Typography>
            </div>
          )}

          {/* Current Answer Display (Streaming) */}
          {answerSegments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Typography variant="h6" className="text-sm font-semibold">
                  Answer:
                </Typography>
                {isLoading && (
                  <Loader2 size={16} className="animate-spin text-primary" />
                )}
              </div>
              <div className="prose max-w-none">
                <SegmentRenderer segments={answerSegments} />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-error/10 border border-[var(--color-error)]/30 rounded-md p-3">
              <Typography variant="body" className="text-error">
                {error}
              </Typography>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

QuestionWidget.displayName = 'QuestionWidget';
