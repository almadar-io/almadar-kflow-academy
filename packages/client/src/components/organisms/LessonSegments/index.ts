/**
 * LessonSegments Organism Components
 * 
 * Components for rendering lesson content segments including:
 * - Markdown and code blocks
 * - Learning science blocks (activation, connection, reflection)
 * - Quiz blocks (regular and Bloom's taxonomy)
 */

export { CodeBlock } from './CodeBlock';
export type { CodeBlockProps } from './CodeBlock';

export { MarkdownContent } from './MarkdownContent';
export type { MarkdownContentProps } from './MarkdownContent';

export { ActivationBlock } from './ActivationBlock';
export type { ActivationBlockProps } from './ActivationBlock';

export { ConnectionBlock } from './ConnectionBlock';
export type { ConnectionBlockProps } from './ConnectionBlock';

export { ReflectionBlock } from './ReflectionBlock';
export type { ReflectionBlockProps } from './ReflectionBlock';

export { QuizBlock } from './QuizBlock';
export type { QuizBlockProps } from './QuizBlock';

export { BloomQuizBlock } from './BloomQuizBlock';
export type { BloomQuizBlockProps } from './BloomQuizBlock';

export { SegmentRenderer } from './SegmentRenderer';
export type { SegmentRendererProps } from './SegmentRenderer';

export { parseLessonSegments } from './parseLessonSegments';
export { parseMarkdownWithCodeBlocks } from './utils';

export type { Segment, BloomLevel, UserProgress } from './types';
