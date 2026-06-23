/**
 * HighlightedSegmentRenderer Organism
 *
 * Renders lesson segments, then applies concept-driven text highlighting as a
 * DOM overlay and opens a modal with the saved question/answer when a highlight
 * is clicked. Manages annotation/selection behavior → organism.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  SegmentRenderer,
  parseMarkdownWithCodeBlocks,
  Box,
  VStack,
  Typography,
  type SegmentRendererProps,
  type LessonSegment,
} from '@almadar/ui';
import { extractHighlightChunks } from '@features/concepts/utils/textHighlighter';
import { applyHighlightingToDOM } from '@features/concepts/utils/domHighlighter';
import { Concept, QuestionAnswer } from '@features/concepts/types';

export interface HighlightedSegmentRendererProps extends SegmentRendererProps {
  concept?: Concept | null;
}

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
      <Box ref={containerRef}>
        <SegmentRenderer segments={segments} {...otherProps} />
      </Box>

      <Modal
        isOpen={selectedQuestion !== null}
        onClose={() => setSelectedQuestion(null)}
        title={selectedQuestion?.question || 'Question'}
        size="lg"
      >
        {selectedQuestion && (
          <VStack gap="md">
            {selectedQuestion.selectedText && (
              <Box
                padding="sm"
                className="bg-surface border-l-4 border-[var(--color-info)] rounded-r-md"
              >
                <Typography variant="caption" weight="medium" className="text-[var(--color-info)] mb-1">
                  Context:
                </Typography>
                <Typography variant="body2" color="muted" className="italic">
                  "{selectedQuestion.selectedText}"
                </Typography>
              </Box>
            )}
            <Box>
              <Typography variant="subheading" weight="semibold" className="mb-2">
                Answer:
              </Typography>
              <Box className="prose max-w-none">
                <SegmentRenderer segments={questionAnswerSegments} />
              </Box>
            </Box>
            {selectedQuestion.timestamp && (
              <Typography variant="caption" color="muted">
                {new Date(selectedQuestion.timestamp).toLocaleString()}
              </Typography>
            )}
          </VStack>
        )}
      </Modal>
    </>
  );
};
