/**
 * LessonSegments — re-exports from @almadar/ui
 */

export { CodeBlock } from '@design-system/molecules/markdown/CodeBlock';
export type { CodeBlockProps } from '@design-system/molecules/markdown/CodeBlock';

export {
  MarkdownContent,
  type MarkdownContentProps,
  ActivationBlock,
  type ActivationBlockProps,
  ConnectionBlock,
  type ConnectionBlockProps,
  ReflectionBlock,
  type ReflectionBlockProps,
  BloomQuizBlock,
  type BloomQuizBlockProps,
  SegmentRenderer,
  type SegmentRendererProps,
  parseLessonSegments,
  CodeRunnerPanel,
  type CodeSimulationOutput,
} from '@almadar/ui';

export { QuizBlock } from '@design-system/molecules/learning/QuizBlock';
export type { QuizBlockProps } from '@design-system/molecules/learning/QuizBlock';

export { parseMarkdownWithCodeBlocks } from './utils';

// Re-export types with backward-compat aliases
export type { LessonSegment as Segment, LessonUserProgress as UserProgress, BloomLevel } from '@almadar/ui';
