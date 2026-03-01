/**
 * CodeBlock Component
 * 
 * Isolated code block component with scroll preservation and copy functionality.
 * Used for rendering code blocks in lesson content.
 */

import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

export interface CodeBlockProps {
  language: string;
  codeContent: string;
}

export const CodeBlock = React.memo<CodeBlockProps>(
  ({ language, codeContent }) => {
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

CodeBlock.displayName = 'CodeBlock';
