/**
 * LessonSegments Organism Components
 * 
 * Components for rendering lesson content segments including:
 * - Markdown and code blocks
 * - Learning science blocks (activation, connection, reflection)
 * - Quiz blocks (regular and Bloom's taxonomy)
 */

export { CodeBlock } from '@design-system/molecules/markdown/CodeBlock';
export type { CodeBlockProps } from '@design-system/molecules/markdown/CodeBlock';

export { MarkdownContent, type MarkdownContentProps } from '@almadar/ui';

export { ActivationBlock } from './ActivationBlock';
export type { ActivationBlockProps } from './ActivationBlock';

export { ConnectionBlock } from './ConnectionBlock';
export type { ConnectionBlockProps } from './ConnectionBlock';

export { ReflectionBlock } from './ReflectionBlock';
export type { ReflectionBlockProps } from './ReflectionBlock';

export { QuizBlock } from '@design-system/molecules/learning/QuizBlock';
export type { QuizBlockProps } from '@design-system/molecules/learning/QuizBlock';

export { BloomQuizBlock } from './BloomQuizBlock';
export type { BloomQuizBlockProps } from './BloomQuizBlock';

export { SegmentRenderer } from './SegmentRenderer';
export type { SegmentRendererProps } from './SegmentRenderer';

export { parseLessonSegments } from './parseLessonSegments';
export { parseMarkdownWithCodeBlocks } from './utils';

export type { Segment, BloomLevel, UserProgress } from './types';
