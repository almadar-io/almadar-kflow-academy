/**
 * Utility functions for parsing markdown content
 */

import { normalizeLatexDelimiters } from '../../utils/normalizeLatexDelimiters';

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

  // Regex to match fenced code blocks with optional -runnable suffix or `run` modifier
  const codeBlockRegex = /```([\w-]+)?(?:\s+(run))?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add markdown before the code block, normalizing LaTeX delimiters so
    // remark-math/KaTeX can render \[...\] and \(...\) math.
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) {
      segments.push({ type: 'markdown' as const, content: normalizeLatexDelimiters(before) });
    }

    // Add the code block (ensure language is always a string)
    const rawLanguage = match[1] || 'text';
    const runModifier = !!match[2];
    const suffixRunnable = rawLanguage.endsWith('-runnable');
    const runnable = runModifier || suffixRunnable;
    const baseLanguage = suffixRunnable
      ? rawLanguage.slice(0, -'-runnable'.length) || 'text'
      : rawLanguage;
    segments.push({
      type: 'code' as const,
      language: baseLanguage,
      content: match[3].trim(),
      runnable,
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  // Add remaining markdown, normalizing LaTeX delimiters so
  // remark-math/KaTeX can render \[...\] and \(...\) math.
  const remaining = content.slice(lastIndex);
  if (remaining.trim()) {
    segments.push({ type: 'markdown' as const, content: normalizeLatexDelimiters(remaining) });
  }

  return segments;
};
