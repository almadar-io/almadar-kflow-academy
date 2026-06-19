import React, { useEffect, useRef, useState } from 'react';
import { extractHighlightChunks } from '../utils/textHighlighter';
import { applyHighlightingToDOM } from '../utils/domHighlighter';
import { Modal, SegmentRenderer, parseMarkdownWithCodeBlocks, type SegmentRendererProps, type LessonSegment } from '@almadar/ui';
import { Concept, QuestionAnswer } from '../types';

interface HighlightedSegmentRendererProps extends SegmentRendererProps {
  concept?: Concept | null;
}

/**
 * Wrapper component that applies text highlighting to rendered segments
 * This component renders segments normally, then applies highlighting as a DOM overlay
 */
export const HighlightedSegmentRenderer: React.FC<HighlightedSegmentRendererProps> = ({
  segments,
  concept,
  ...otherProps
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionAnswer | null>(null);
  const [questionAnswerSegments, setQuestionAnswerSegments] = useState<LessonSegment[]>([]);

  // Parse answer markdown when question is selected
  useEffect(() => {
    if (selectedQuestion?.answer) {
      const parsed = parseMarkdownWithCodeBlocks(selectedQuestion.answer);
      setQuestionAnswerSegments(parsed);
    } else {
      setQuestionAnswerSegments([]);
    }
  }, [selectedQuestion]);

  const handleQuestionClick = (questionAnswer: QuestionAnswer) => {
    setSelectedQuestion(questionAnswer);
  };

  useEffect(() => {
    if (!containerRef.current || !concept) return;

    // Wait for next tick to ensure DOM is fully rendered
    let cleanupFn: (() => void) | undefined;
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) return;

      // Extract highlight chunks from concept
      const highlightChunks = extractHighlightChunks(concept);
      if (highlightChunks.length === 0) return;

      // Apply highlighting to the DOM and store cleanup function
      cleanupFn = applyHighlightingToDOM(
        containerRef.current,
        highlightChunks,
        concept,
        handleQuestionClick
      );
    }, 100); // Small delay to ensure React has finished rendering

    return () => {
      clearTimeout(timeoutId);
      // Call cleanup function if it exists
      if (cleanupFn) {
        cleanupFn();
      }
      // Also manually cleanup highlighting when component unmounts or concept changes
      if (containerRef.current) {
        const spans = containerRef.current.querySelectorAll('span[data-highlight="true"]');
        if (spans && spans.length > 0) {
          spans.forEach((span) => {
            const parent = span.parentNode;
            if (parent) {
              const textNode = document.createTextNode(span.textContent || '');
              parent.replaceChild(textNode, span);
              parent.normalize();
            }
          });
        }
      }
    };
  }, [segments, concept]);

  return (
    <>
      <div ref={containerRef}>
        <SegmentRenderer segments={segments} {...otherProps} />
      </div>

      {/* Question Answer Dialog */}
      <Modal
        isOpen={selectedQuestion !== null}
        onClose={() => setSelectedQuestion(null)}
        title={selectedQuestion?.question || 'Question'}
        size="lg"
      >
        {selectedQuestion && (
          <div className="space-y-4">
            {selectedQuestion.selectedText && (
              <div className="bg-surface border-l-4 border-info p-3 rounded-r-md">
                <p className="text-xs font-medium text-info mb-1">
                  Context:
                </p>
                <p className="text-sm text-muted-foreground italic">
                  "{selectedQuestion.selectedText}"
                </p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Answer:
              </h4>
              <div className="prose max-w-none">
                <SegmentRenderer segments={questionAnswerSegments} />
              </div>
            </div>
            {selectedQuestion.timestamp && (
              <div className="text-xs text-muted-foreground">
                {new Date(selectedQuestion.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

