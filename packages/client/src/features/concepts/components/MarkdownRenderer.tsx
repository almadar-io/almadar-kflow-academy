import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import MarkdownRenderer from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { normalizeLatexDelimiters } from '@design-system/utils/normalizeLatexDelimiters';
import { Concept } from '../types';

// Upstream components from @almadar/ui
export {
  ActivationBlock,
  ReflectionBlock,
  BloomQuizBlock,
  ConnectionBlock,
  SegmentRenderer,
  parseLessonSegments,
  CodeRunnerPanel,
} from '@almadar/ui';
export type {
  ActivationBlockProps,
  ReflectionBlockProps,
  BloomQuizBlockProps,
  ConnectionBlockProps,
  SegmentRendererProps,
  CodeSimulationOutput,
} from '@almadar/ui';

// Re-export LessonSegment as Segment for backward compatibility
export type { LessonSegment as Segment, LessonUserProgress as UserProgress } from '@almadar/ui';
export type { BloomLevel } from '@almadar/ui';

// Isolated code block component with scroll preservation
export const CodeBlock = React.memo(
  ({ language, codeContent }: { language: string; codeContent: string }) => {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const savedScrollLeftRef = useRef<number>(0);
    const [copied, setCopied] = useState(false);

    // Save scrollLeft before updates
    useLayoutEffect(() => {
      const el = scrollRef.current;
      return () => {
        if (el) savedScrollLeftRef.current = el.scrollLeft;
      };
    }, [language, codeContent]);

    // Restore scrollLeft after updates
    useLayoutEffect(() => {
      const el = scrollRef.current;
      if (el) el.scrollLeft = savedScrollLeftRef.current;
    }, [language, codeContent]);

    // Native scroll listener to keep position updated
    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      const handle: EventListener = () => {
        savedScrollLeftRef.current = el.scrollLeft;
      };
      el.addEventListener('scroll', handle, { passive: true });
      return () => el.removeEventListener('scroll', handle);
    }, [language, codeContent]);

    // Copy to clipboard handler
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(codeContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    };

    return (
      <div className="relative group">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 p-2 rounded-md bg-gray-700/80 hover:bg-gray-600/80 text-gray-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Copy code"
          title="Copy code"
        >
          {copied ? (
            <Check size={16} className="text-green-400" />
          ) : (
            <Copy size={16} />
          )}
        </button>
        <div
          ref={scrollRef}
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxHeight: '60vh',
            overscrollBehavior: 'auto',
            touchAction: 'pan-x pan-y',
            contain: 'paint',
            backgroundColor: '#1f2937',
            borderRadius: '0.75rem',
            padding: '1rem',
          } as React.CSSProperties & { WebkitOverflowScrolling: 'touch' }}
        >
          <SyntaxHighlighter
            PreTag="div"
            language={language}
            style={dark}
            customStyle={{
              backgroundColor: 'transparent',
              borderRadius: 0,
              padding: 0,
              margin: 0,
              whiteSpace: 'pre',
              minWidth: '100%'
            }}
          >
            {codeContent}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  },
  (prev, next) => prev.language === next.language && prev.codeContent === next.codeContent,
);

// Parse markdown content to extract code blocks
export const parseMarkdownWithCodeBlocks = (
  content: string
): Array<
  | { type: 'markdown'; content: string }
  | { type: 'code'; language: string; content: string; runnable?: boolean }
> => {
  const segments: Array<
    | { type: 'markdown'; content: string }
    | { type: 'code'; language: string; content: string; runnable?: boolean }
  > = [];

  // Regex to match fenced code blocks including optional -runnable suffix
  const codeBlockRegex = /```([\w-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add markdown before the code block
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) {
      segments.push({ type: 'markdown' as const, content: before });
    }

    // Add the code block (ensure language is always a string)
    const rawLanguage = match[1] || 'text';
    const runnable = rawLanguage.endsWith('-runnable');
    const language = runnable
      ? rawLanguage.slice(0, -'-runnable'.length) || 'text'
      : rawLanguage;
    segments.push({
      type: 'code' as const,
      language,
      content: match[2].trim(),
      runnable,
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  // Add remaining markdown
  const remaining = content.slice(lastIndex);
  if (remaining.trim()) {
    segments.push({ type: 'markdown' as const, content: remaining });
  }

  return segments;
};

// Simplified markdown renderer that only handles inline code (fenced code blocks are handled separately)
export const MarkdownContent = React.memo<{
  content: string;
}>(({ content }) => {
  const normalizedContent = normalizeLatexDelimiters(content);
  return (
    <MarkdownRenderer
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[
        [rehypeRaw, {}],
        [rehypeKatex, { strict: false, throwOnError: false }]
      ]}
      components={{
      code({
        inline,
        className,
        children,
        ...props
      }: {
        inline?: boolean;
        className?: string;
        children: React.ReactNode;
      } & React.HTMLAttributes<HTMLElement>) {
        // Only handle inline code here - fenced code blocks are parsed out separately
        return (
          <code
            {...props}
            className={className}
            style={{
              backgroundColor: '#1f2937',
              color: '#e5e7eb',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
            }}
          >
            {children}
          </code>
        );
      },
    }}
  >
    {normalizedContent}
  </MarkdownRenderer>
  );
}, (prev, next) => prev.content === next.content);

// Quiz block component
export const QuizBlock: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [revealed, setRevealed] = useState(false);

  const questionSegments = useMemo(() => parseMarkdownWithCodeBlocks(question), [question]);
  const answerSegments = useMemo(() => parseMarkdownWithCodeBlocks(answer), [answer]);

  return (
    <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/20 p-4 my-4 space-y-3">
      <div className="font-semibold text-indigo-900 dark:text-indigo-200 space-y-2">
        {questionSegments.map((segment, idx) =>
          segment.type === 'markdown' ? (
            <MarkdownContent key={`q-md-${idx}`} content={segment.content} />
          ) : (
            <CodeBlock key={`q-code-${idx}`} language={segment.language || 'text'} codeContent={segment.content} />
          )
        )}
      </div>
      <button
        type="button"
        className="inline-flex items-center rounded-md bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition"
        onClick={() => setRevealed(prev => !prev)}
      >
        {revealed ? 'Hide Answer' : 'Reveal Answer'}
      </button>
      {revealed && (
        <div className="rounded-lg bg-white/80 dark:bg-gray-800/80 p-3 text-sm text-slate-800 dark:text-gray-200 shadow-sm border border-indigo-100 dark:border-indigo-800 prose max-w-none space-y-2">
          {answerSegments.map((segment, idx) =>
            segment.type === 'markdown' ? (
              <MarkdownContent key={`a-md-${idx}`} content={segment.content} />
            ) : (
              <CodeBlock key={`a-code-${idx}`} language={segment.language || 'text'} codeContent={segment.content} />
            )
          )}
        </div>
      )}
    </div>
  );
};
