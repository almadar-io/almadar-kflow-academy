/**
 * QuizBlock Component
 * 
 * Regular quiz question component with revealable answer.
 */

import React, { useState, useMemo } from 'react';
import { MarkdownContent } from './MarkdownContent';
import { CodeBlock } from './CodeBlock';
import { parseMarkdownWithCodeBlocks } from './utils';

export interface QuizBlockProps {
  question: string;
  answer: string;
}

export const QuizBlock: React.FC<QuizBlockProps> = ({ question, answer }) => {
  const [revealed, setRevealed] = useState(false);

  const questionSegments = useMemo(() => parseMarkdownWithCodeBlocks(question), [question]);
  const answerSegments = useMemo(() => parseMarkdownWithCodeBlocks(answer), [answer]);

  return (
    <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/20 p-4 my-4 space-y-3">
      <div className="font-semibold text-indigo-900 dark:text-indigo-200 space-y-2">
        {questionSegments.map((segment: { type: 'markdown' | 'code'; content: string; language?: string }, idx: number) =>
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
          {answerSegments.map((segment: { type: 'markdown' | 'code'; content: string; language?: string }, idx: number) =>
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

QuizBlock.displayName = 'QuizBlock';
