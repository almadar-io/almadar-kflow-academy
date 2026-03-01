/**
 * Parse lesson content to extract all segments including learning science tags
 * 
 * Handles both properly closed tags and unclosed tags (fallback behavior)
 */

import type { Segment, BloomLevel } from './types';
import { parseMarkdownWithCodeBlocks } from './utils';

/**
 * Try to extract tag content - handles both closed and unclosed tags
 * For unclosed tags, extracts content until the next tag or end of a logical section
 */
function extractTagContent(
  content: string, 
  tagName: string
): { content: string; fullMatch: string } | null {
  // First try properly closed tag
  const closedTagRegex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const closedMatch = content.match(closedTagRegex);
  if (closedMatch) {
    return { content: closedMatch[1].trim(), fullMatch: closedMatch[0] };
  }
  
  // Fallback: try unclosed tag - extract until next tag or double newline + heading
  const unclosedTagRegex = new RegExp(`<${tagName}>([\\s\\S]*?)(?=<(?:activate|connect|reflect|bloom|prq|question|answer)|\\n\\n#|$)`, 'i');
  const unclosedMatch = content.match(unclosedTagRegex);
  if (unclosedMatch) {
    return { content: unclosedMatch[1].trim(), fullMatch: unclosedMatch[0] };
  }
  
  return null;
}

export const parseLessonSegments = (
  lesson: string | undefined
): Segment[] => {
  if (!lesson) {
    return [];
  }

  // Remove <prq> tags from lesson content since we display prerequisites separately
  let content = lesson.replace(/<prq>[\s\S]*?<\/prq>/gi, '').trim();

  const segments: Segment[] = [];

  // 1. Extract <activate> tag (should be first) - handle both closed and unclosed
  const activateResult = extractTagContent(content, 'activate');
  if (activateResult) {
    segments.push({
      type: 'activate',
      question: activateResult.content
    });
    content = content.replace(activateResult.fullMatch, '').trim();
  }

  // 2. Extract <connect> tag (should be after activate) - handle both closed and unclosed
  const connectResult = extractTagContent(content, 'connect');
  if (connectResult) {
    segments.push({
      type: 'connect',
      content: connectResult.content
    });
    content = content.replace(connectResult.fullMatch, '').trim();
  }

  // 3. Parse the rest: markdown, code, reflect, bloom, and regular quiz tags
  // Build a comprehensive regex to match all special tags
  // Support both properly closed tags and unclosed tags
  const tagRegex = new RegExp(
    '(' +
    // Reflect tags (closed)
    '<reflect>([\\s\\S]*?)<\\/reflect>|' +
    // Reflect tags (unclosed - fallback)
    '<reflect>([\\s\\S]*?)(?=<(?:activate|connect|reflect|bloom|prq|question)|\\n\\n#|$)|' +
    // Bloom tags (closed with nested question/answer)
    '<bloom\\s+level="(remember|understand|apply|analyze|evaluate|create)">([\\s\\S]*?)<\\/bloom>|' +
    // Bloom tags (unclosed - fallback)
    '<bloom\\s+level="(remember|understand|apply|analyze|evaluate|create)">([\\s\\S]*?)(?=<(?:activate|connect|reflect|bloom|prq)|\\n\\n#|$)|' +
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
      // Reflect tag (closed or unclosed)
      const promptContent = match[2] || match[3]; // match[2] for closed, match[3] for unclosed
      if (promptContent) {
        segments.push({
          type: 'reflect',
          prompt: promptContent.trim()
        });
      }
    } else if (match[0].startsWith('<bloom')) {
      // Bloom tag - extract level and nested question/answer
      // match[4]/match[5] for closed bloom, match[6]/match[7] for unclosed bloom
      const level = (match[4] || match[6]) as BloomLevel;
      const bloomContent = match[5] || match[7];

      if (level && bloomContent) {
        const questionMatch = bloomContent.match(/<question>([\s\S]*?)<\/question>/i);
        const answerMatch = bloomContent.match(/<answer>([\s\S]*?)<\/answer>/i);

        if (questionMatch && answerMatch) {
          // Properly structured bloom tag with nested question/answer
          segments.push({
            type: 'bloom',
            level,
            question: questionMatch[1].trim(),
            answer: answerMatch[1].trim()
          });
        } else if (questionMatch) {
          // Has question but no answer - still render it
          segments.push({
            type: 'bloom',
            level,
            question: questionMatch[1].trim(),
            answer: '(Answer not provided)'
          });
        } else {
          // Malformed bloom tag - treat content as question text
          // Clean up any markdown formatting like **Question X:**
          const cleanedContent = bloomContent
            .replace(/^\*\*Question\s*\d*:?\*\*\s*/i, '')
            .replace(/^\*\*Q\d*:?\*\*\s*/i, '')
            .trim();
          
          if (cleanedContent) {
            segments.push({
              type: 'bloom',
              level,
              question: cleanedContent,
              answer: '(See answers section below)'
            });
          }
        }
      }
    } else if (match[8] && match[9]) {
      // Regular quiz tag (backward compatibility)
      segments.push({
        type: 'quiz',
        question: match[8].trim(),
        answer: match[9].trim()
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
