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
  const unclosedTagRegex = new RegExp(
    `<${tagName}>([\\s\\S]*?)(?=<(?:activate|connect|reflect|bloom|prq|question|answer|visualize)|\\n\\n#|$)`,
    'i'
  );
  const unclosedMatch = content.match(unclosedTagRegex);
  if (unclosedMatch) {
    return { content: unclosedMatch[1].trim(), fullMatch: unclosedMatch[0] };
  }

  return null;
}

export const parseLessonSegments = (lesson: string | undefined): Segment[] => {
  if (!lesson) {
    return [];
  }

  // Remove <prq> tags from lesson content since we display prerequisites separately
  let content = lesson.replace(/<prq>[\s\S]*?<\/prq>/gi, '').trim();

  const segments: Segment[] = [];

  // Extract <activate> tag (should be first) - handle both closed and unclosed
  const activateResult = extractTagContent(content, 'activate');
  if (activateResult) {
    segments.push({
      type: 'activate',
      question: activateResult.content,
    });
    content = content.replace(activateResult.fullMatch, '').trim();
  }

  // Extract <connect> tag (should be after activate) - handle both closed and unclosed
  const connectResult = extractTagContent(content, 'connect');
  if (connectResult) {
    segments.push({
      type: 'connect',
      content: connectResult.content,
    });
    content = content.replace(connectResult.fullMatch, '').trim();
  }

  // Match reflect, bloom, quiz, and visualize tags using named capture groups so
  // order does not depend on positional indices.
  const tagRegex = new RegExp(
    '(?<reflect><reflect>(?<reflectClosed>[\\s\\S]*?)<\\/reflect>)|' +
      '(?<reflectUnclosed><reflect>(?<reflectOpen>[\\s\\S]*?)(?=<(?:activate|connect|reflect|bloom|prq|question|answer|visualize)|\\n\\n#|$))|' +
      '(?<bloom><bloom\\s+level="(?<bloomLevel>remember|understand|apply|analyze|evaluate|create)">(?<bloomClosed>[\\s\\S]*?)<\\/bloom>)|' +
      '(?<bloomUnclosed><bloom\\s+level="(?<bloomLevelUn>remember|understand|apply|analyze|evaluate|create)">(?<bloomOpen>[\\s\\S]*?)(?=<(?:activate|connect|reflect|bloom|prq|question|answer|visualize)|\\n\\n#|$))|' +
      '(?<quiz><question>(?<quizQuestion>[\\s\\S]*?)<\\/question>\\s*<answer>(?<quizAnswer>[\\s\\S]*?)<\\/answer>)|' +
      '(?<visualize><visualize\\s+type="(?<vizType>chart|simulation)"\\s+description="(?<vizDesc>[^"]*?)"\\s*\\/?>)',
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

    if (match.groups?.reflect || match.groups?.reflectUnclosed) {
      const prompt = (match.groups.reflectClosed ?? match.groups.reflectOpen ?? '').trim();
      if (prompt) {
        segments.push({ type: 'reflect', prompt });
      }
    } else if (match.groups?.bloom || match.groups?.bloomUnclosed) {
      const level = (match.groups.bloomLevel ?? match.groups.bloomLevelUn) as BloomLevel;
      const bloomContent = match.groups.bloomClosed ?? match.groups.bloomOpen ?? '';

      if (level && bloomContent) {
        const questionMatch = bloomContent.match(/<question>([\s\S]*?)<\/question>/i);
        const answerMatch = bloomContent.match(/<answer>([\s\S]*?)<\/answer>/i);

        if (questionMatch && answerMatch) {
          segments.push({
            type: 'bloom',
            level,
            question: questionMatch[1].trim(),
            answer: answerMatch[1].trim(),
          });
        } else if (questionMatch) {
          segments.push({
            type: 'bloom',
            level,
            question: questionMatch[1].trim(),
            answer: '(Answer not provided)',
          });
        } else {
          const cleanedContent = bloomContent
            .replace(/^\*\*Question\s*\d*:?\*\*\s*/i, '')
            .replace(/^\*\*Q\d*:?\*\*\s*/i, '')
            .trim();

          if (cleanedContent) {
            segments.push({
              type: 'bloom',
              level,
              question: cleanedContent,
              answer: '(See answers section below)',
            });
          }
        }
      }
    } else if (match.groups?.quiz) {
      segments.push({
        type: 'quiz',
        question: match.groups.quizQuestion.trim(),
        answer: match.groups.quizAnswer.trim(),
      });
    } else if (match.groups?.visualize) {
      segments.push({
        type: 'visualization',
        visualizationType: match.groups.vizType as 'chart' | 'simulation',
        description: match.groups.vizDesc ?? '',
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
