/**
 * SegmentRenderer Organism Component
 *
 * Renders a list of lesson segments including markdown, code blocks,
 * quizzes, and learning science components (activation, connection,
 * reflection, bloom).
 *
 * Event Contract:
 * - Emits events from child components (ActivationBlock, ReflectionBlock, BloomQuizBlock, etc.)
 * - entityAware: true
 */

import React, { useCallback } from "react";
import { Box, VStack, EmptyState, useEventBus, type EntityDisplayProps } from '@almadar/ui';
import { CodeBlock } from "../molecules/markdown/CodeBlock";
import { MarkdownContent } from "../molecules/markdown/MarkdownContent";
import { ActivationBlock } from "../molecules/learning/ActivationBlock";
import { ConnectionBlock } from "../molecules/learning/ConnectionBlock";
import { ReflectionBlock } from "../molecules/learning/ReflectionBlock";
import { BloomQuizBlock } from "../molecules/learning/BloomQuizBlock";
import { QuizBlock } from "../molecules/learning/QuizBlock";
import { Segment, BloomLevel } from "../utils/parseLessonSegments";

export interface UserProgress {
  /** Saved activation response */
  activationResponse?: string;
  /** Saved reflection notes by index */
  reflectionNotes?: string[];
  /** Bloom questions answered by index */
  bloomAnswered?: Record<number, boolean>;
}

export interface SegmentRendererProps extends EntityDisplayProps {
  /** Array of segments to render */
  segments?: Segment[];
  /** Concept ID for event payloads */
  conceptId?: string;
  /** User progress tracking data */
  userProgress?: UserProgress;
  /** Event name to emit when activation response is saved */
  saveActivationEvent?: string;
  /** Event name to emit when reflection note is saved */
  saveReflectionEvent?: string;
  /** Event name to emit when bloom question is answered */
  answerBloomEvent?: string;
  /** Additional CSS classes for inner wrapper */
  containerClassName?: string;
  /** Display variant */
  variant?: string;
  /** Item actions */
  itemActions?: Array<{
    label: string;
    event: string;
  }>;
  /** Fields to display */
  displayFields?: string[];
  /** Show content flag */
  showContent?: boolean;
  /** Show lessons flag */
  showLessons?: boolean;
  /** Show progress flag */
  showProgress?: boolean;
  /** Actions */
  actions?: Array<{ label: string; event: string }>;
  /** Show modules flag */
  showModules?: boolean;
}

export const SegmentRenderer = ({
  segments = [],
  conceptId,
  userProgress,
  saveActivationEvent,
  saveReflectionEvent,
  answerBloomEvent,
  className,
  containerClassName = "border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6 overflow-x-auto",
}: SegmentRendererProps) => {
  const { emit } = useEventBus();

  const handleSaveActivation = useCallback((response: string) => {
    if (saveActivationEvent) emit(`UI:${saveActivationEvent}`, { response, conceptId });
  }, [emit, saveActivationEvent, conceptId]);

  const handleSaveReflection = useCallback((index: number, note: string) => {
    if (saveReflectionEvent) emit(`UI:${saveReflectionEvent}`, { index, note, conceptId });
  }, [emit, saveReflectionEvent, conceptId]);

  const handleAnswerBloom = useCallback((index: number, level: BloomLevel) => {
    if (answerBloomEvent) emit(`UI:${answerBloomEvent}`, { index, level, conceptId });
  }, [emit, answerBloomEvent, conceptId]);
  if (!segments || segments.length === 0) {
    return <EmptyState message="No lesson content available." />;
  }

  // Track indices for reflect and bloom segments
  let reflectIndex = 0;
  let bloomIndex = 0;

  return (
    <Box className={className}>
      <Box className={containerClassName}>
        <VStack gap="lg">
          {segments.map((segment, index) => {
            if (segment.type === "markdown") {
              return (
                <MarkdownContent
                  key={`md-${index}`}
                  content={segment.content}
                />
              );
            }

            if (segment.type === "code") {
              return (
                <CodeBlock
                  key={`code-${index}`}
                  language={segment.language}
                  code={segment.content}
                />
              );
            }

            if (segment.type === "quiz") {
              return (
                <QuizBlock
                  key={`quiz-${index}`}
                  question={segment.question}
                  answer={segment.answer}
                  index={index}
                />
              );
            }

            if (segment.type === "activate") {
              return (
                <ActivationBlock
                  key={`activate-${index}`}
                  question={segment.question}
                  savedResponse={userProgress?.activationResponse}
                  conceptId={conceptId}
                  onSave={handleSaveActivation}
                />
              );
            }

            if (segment.type === "connect") {
              return (
                <ConnectionBlock
                  key={`connect-${index}`}
                  content={segment.content}
                />
              );
            }

            if (segment.type === "reflect") {
              const currentReflectIndex = reflectIndex++;
              return (
                <ReflectionBlock
                  key={`reflect-${index}`}
                  prompt={segment.prompt}
                  index={currentReflectIndex}
                  savedNote={
                    userProgress?.reflectionNotes?.[currentReflectIndex]
                  }
                  conceptId={conceptId}
                  onSave={(note) =>
                    handleSaveReflection(currentReflectIndex, note)
                  }
                />
              );
            }

            if (segment.type === "bloom") {
              const currentBloomIndex = bloomIndex++;
              return (
                <BloomQuizBlock
                  key={`bloom-${index}`}
                  level={segment.level}
                  question={segment.question}
                  answer={segment.answer}
                  index={currentBloomIndex}
                  isAnswered={userProgress?.bloomAnswered?.[currentBloomIndex]}
                  conceptId={conceptId}
                  onAnswer={() =>
                    handleAnswerBloom(currentBloomIndex, segment.level)
                  }
                />
              );
            }

            return null;
          })}
        </VStack>
      </Box>
    </Box>
  );
};

SegmentRenderer.displayName = "SegmentRenderer";
