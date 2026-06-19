/**
 * LessonSegments — re-exports from @almadar/ui
 */

export {
  CodeBlock,
  type CodeBlockProps,
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
  QuizBlock,
  type QuizBlockProps,
} from '@almadar/ui';

export { parseMarkdownWithCodeBlocks } from './utils';

// Re-export types with backward-compat aliases
export type { LessonSegment as Segment, LessonUserProgress as UserProgress, BloomLevel } from '@almadar/ui';
