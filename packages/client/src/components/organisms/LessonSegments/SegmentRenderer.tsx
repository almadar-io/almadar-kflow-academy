/**
 * SegmentRenderer Component
 * 
 * Shared component to render segments in a container.
 * Handles all segment types: markdown, code, quiz, activate, connect, reflect, bloom.
 */

import React from 'react';
import { MarkdownContent } from '@almadar/ui';
import { CodeBlock } from './CodeBlock';
import { QuizBlock } from './QuizBlock';
import { ActivationBlock } from './ActivationBlock';
import { ConnectionBlock } from './ConnectionBlock';
import { ReflectionBlock } from './ReflectionBlock';
import { BloomQuizBlock } from './BloomQuizBlock';
import { CodeRunnerPanel, type CodeSimulationOutput } from '@design-system/organisms/CodeRunnerPanel';
import {
  InteractiveOrbitalPanel,
  type InteractiveOrbitalPanelProps,
} from '@design-system/organisms/InteractiveOrbitalPanel';
import type { Segment, BloomLevel, UserProgress } from './types';

export interface SegmentRendererProps {
  segments: Segment[];
  className?: string;
  containerClassName?: string;
  // User progress tracking props
  userProgress?: UserProgress;
  onSaveActivation?: (response: string) => void;
  onSaveReflection?: (index: number, note: string) => void;
  onAnswerBloom?: (index: number, level: BloomLevel) => void;
  /** Callback that simulates executing runnable code blocks */
  onRunCodeSimulation?: (code: string, language: string) => Promise<CodeSimulationOutput>;
  /** Concept context used by interactive visualization generators */
  concept?: InteractiveOrbitalPanelProps['concept'];
  /** Callback that generates an interactive orbital schema for a visualization marker */
  onGenerateInteractiveOrbital?: InteractiveOrbitalPanelProps['onGenerate'];
  /** Whether to auto-generate visualizations as soon as the segment is rendered */
  autoGenerateVisualizations?: boolean;
}

export const SegmentRenderer: React.FC<SegmentRendererProps> = ({
  segments,
  className = '',
  containerClassName = 'border border-gray-200 dark:border-gray-700 rounded-lg p-2 md:p-4 overflow-x-auto lesson-markdown space-y-6 touch-auto',
  userProgress,
  onSaveActivation,
  onSaveReflection,
  onAnswerBloom,
  onRunCodeSimulation,
  concept,
  onGenerateInteractiveOrbital,
  autoGenerateVisualizations,
}) => {
  if (segments.length === 0) {
    return null;
  }

  // Track indices for reflect and bloom segments
  let reflectIndex = 0;
  let bloomIndex = 0;

  return (
    <div className={containerClassName}>
      {segments.map((segment, index) => {
        if (segment.type === 'markdown') {
          return <MarkdownContent key={`md-${index}`} content={segment.content} />;
        } else if (segment.type === 'code') {
          if (segment.runnable && onRunCodeSimulation) {
            return (
              <CodeRunnerPanel
                key={`code-${index}`}
                language={segment.language}
                code={segment.content}
                runnable
                onRun={(code) => onRunCodeSimulation(code, segment.language)}
              />
            );
          }
          return (
            <CodeBlock
              key={`code-${index}`}
              language={segment.language}
              codeContent={segment.content}
            />
          );
        } else if (segment.type === 'quiz') {
          return (
            <QuizBlock
              key={`quiz-${index}`}
              question={segment.question}
              answer={segment.answer}
            />
          );
        } else if (segment.type === 'activate') {
          return (
            <ActivationBlock
              key={`activate-${index}`}
              question={segment.question}
              savedResponse={userProgress?.activationResponse}
              onSave={onSaveActivation || (() => { })}
            />
          );
        } else if (segment.type === 'connect') {
          return (
            <ConnectionBlock
              key={`connect-${index}`}
              content={segment.content}
            />
          );
        } else if (segment.type === 'reflect') {
          const currentReflectIndex = reflectIndex++;
          return (
            <ReflectionBlock
              key={`reflect-${index}`}
              prompt={segment.prompt}
              index={currentReflectIndex}
              savedNote={userProgress?.reflectionNotes?.[currentReflectIndex]}
              onSave={(note: string) => onSaveReflection?.(currentReflectIndex, note)}
            />
          );
        } else if (segment.type === 'bloom') {
          const currentBloomIndex = bloomIndex++;
          return (
            <BloomQuizBlock
              key={`bloom-${index}`}
              level={segment.level}
              question={segment.question}
              answer={segment.answer}
              index={currentBloomIndex}
              isAnswered={userProgress?.bloomAnswered?.[currentBloomIndex]}
              onAnswer={() => onAnswerBloom?.(currentBloomIndex, segment.level)}
            />
          );
        } else if (segment.type === 'visualization') {
          if (!concept || !onGenerateInteractiveOrbital) {
            return null;
          }
          return (
            <InteractiveOrbitalPanel
              key={`visualize-${index}`}
              type={segment.visualizationType}
              description={segment.description}
              concept={concept}
              onGenerate={onGenerateInteractiveOrbital}
              autoGenerate={autoGenerateVisualizations ?? false}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

SegmentRenderer.displayName = 'SegmentRenderer';
