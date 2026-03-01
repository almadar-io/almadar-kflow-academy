/**
 * Utility functions for parsing markdown content
 */

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
