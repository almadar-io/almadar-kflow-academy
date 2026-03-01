/**
 * MarkdownContent Component
 * 
 * Simplified markdown renderer that only handles inline code.
 * Fenced code blocks are handled separately by CodeBlock component.
 */

import React from 'react';
import MarkdownRenderer from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

export interface MarkdownContentProps {
  content: string;
}

export const MarkdownContent = React.memo<MarkdownContentProps>(({ content }) => {
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

MarkdownContent.displayName = 'MarkdownContent';
