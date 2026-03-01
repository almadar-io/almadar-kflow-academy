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
import { Concept } from '../types';

// Import learning science components
import { ActivationBlock } from './ActivationBlock';
import { ConnectionBlock } from './ConnectionBlock';
import { ReflectionBlock } from './ReflectionBlock';
import { BloomQuizBlock } from './BloomQuizBlock';

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
      const handle = () => {
        savedScrollLeftRef.current = el.scrollLeft;
      };
      el.addEventListener('scroll', handle, { passive: true });
      return () => el.removeEventListener('scroll', handle as any);
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
            WebkitOverflowScrolling: 'touch' as any,
            maxHeight: '60vh',
            overscrollBehavior: 'auto',
            touchAction: 'pan-x pan-y',
            contain: 'paint',
            backgroundColor: '#1f2937',
            borderRadius: '0.75rem',
            padding: '1rem',
          }}
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
  | { type: 'code'; language: string; content: string }
> => {
  const segments: Array<
    | { type: 'markdown'; content: string }
    | { type: 'code'; language: string; content: string }
  > = [];

  // Regex to match fenced code blocks: ```language\ncode\n``` or ```\ncode\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add markdown before the code block
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) {
      segments.push({ type: 'markdown' as const, content: before });
    }

    // Add the code block (ensure language is always a string)
    const language = match[1] || 'text';
    segments.push({
      type: 'code' as const,
      language,
      content: match[2].trim(),
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
    {content}
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

// Parse lesson content to extract all segments including learning science tags
export const parseLessonSegments = (
  lesson: string | undefined
): Segment[] => {
  if (!lesson) {
    return [];
  }

  // Remove <prq> tags from lesson content since we display prerequisites separately
  let content = lesson.replace(/<prq>[\s\S]*?<\/prq>/gi, '').trim();

  const segments: Segment[] = [];

  // 1. Extract <activate> tag (should be first)
  const activateMatch = content.match(/<activate>([\s\S]*?)<\/activate>/i);
  if (activateMatch) {
    segments.push({
      type: 'activate',
      question: activateMatch[1].trim()
    });
    content = content.replace(activateMatch[0], '').trim();
  }

  // 2. Extract <connect> tag (should be after activate)
  const connectMatch = content.match(/<connect>([\s\S]*?)<\/connect>/i);
  if (connectMatch) {
    segments.push({
      type: 'connect',
      content: connectMatch[1].trim()
    });
    content = content.replace(connectMatch[0], '').trim();
  }

  // 3. Parse the rest: markdown, code, reflect, bloom, and regular quiz tags
  // Build a comprehensive regex to match all special tags
  const tagRegex = new RegExp(
    '(' +
    // Reflect tags
    '<reflect>([\\s\\S]*?)<\\/reflect>|' +
    // Bloom tags (with nested question/answer)
    '<bloom\\s+level="(remember|understand|apply|analyze|evaluate|create)">([\\s\\S]*?)<\\/bloom>|' +
    // Regular quiz tags (backward compatibility)
    '<question>([\\s\\S]*?)<\\/question>\\s*<answer>([\\s\\S]*?)<\\/answer>' +
    ')',
    'gi'
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(content)) !== null) {
    // Add markdown/code before this match
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) {
      const parsedSegments = parseMarkdownWithCodeBlocks(before);
      segments.push(...parsedSegments);
    }

    // Determine which tag was matched
    if (match[0].startsWith('<reflect>')) {
      // Reflect tag
      segments.push({
        type: 'reflect',
        prompt: match[2].trim()
      });
    } else if (match[0].startsWith('<bloom')) {
      // Bloom tag - extract level and nested question/answer
      const level = match[3] as BloomLevel;
      const bloomContent = match[4];

      const questionMatch = bloomContent.match(/<question>([\s\S]*?)<\/question>/i);
      const answerMatch = bloomContent.match(/<answer>([\s\S]*?)<\/answer>/i);

      if (questionMatch && answerMatch) {
        segments.push({
          type: 'bloom',
          level,
          question: questionMatch[1].trim(),
          answer: answerMatch[1].trim()
        });
      }
    } else {
      // Regular quiz tag (backward compatibility)
      segments.push({
        type: 'quiz',
        question: match[5].trim(),
        answer: match[6].trim()
      });
    }

    lastIndex = tagRegex.lastIndex;
  }

  // Parse remaining content (markdown and code blocks)
  const remaining = content.slice(lastIndex);
  if (remaining.trim()) {
    const parsedSegments = parseMarkdownWithCodeBlocks(remaining);
    segments.push(...parsedSegments);
  }

  return segments;
};

// Bloom's Taxonomy cognitive levels
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

// Type for segment (markdown, code, quiz, or learning science tags)
export type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'quiz'; question: string; answer: string }
  | { type: 'activate'; question: string }
  | { type: 'connect'; content: string }
  | { type: 'reflect'; prompt: string }
  | { type: 'bloom'; level: BloomLevel; question: string; answer: string };


// Shared component to render segments in a container
export interface SegmentRendererProps {
  segments: Segment[];
  className?: string;
  containerClassName?: string;
  concept?: Concept | null; // Concept for text highlighting
  // User progress tracking props
  userProgress?: {
    activationResponse?: string;
    reflectionNotes?: string[];
    bloomAnswered?: Record<number, boolean>;
  };
  onSaveActivation?: (response: string) => void;
  onSaveReflection?: (index: number, note: string) => void;
  onAnswerBloom?: (index: number, level: BloomLevel) => void;
}

export const SegmentRenderer: React.FC<SegmentRendererProps> = ({
  segments,
  className = '',
  containerClassName = 'border border-gray-200 dark:border-gray-700 rounded-lg p-2 md:p-4 overflow-x-auto lesson-markdown space-y-6 touch-auto',
  concept,
  userProgress,
  onSaveActivation,
  onSaveReflection,
  onAnswerBloom
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
        }
        return null;
      })}
    </div>
  );
};

