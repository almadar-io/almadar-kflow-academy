/**
 * Lesson Segment Parsing Utilities
 *
 * Parses lesson content with learning science tags and code blocks
 * into structured segments for rendering.
 */

import { normalizeLatexDelimiters } from "./normalizeLatexDelimiters";

// Bloom's Taxonomy cognitive levels
export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

// Segment types for lesson content
export type Segment =
  | { type: "markdown"; content: string }
  | { type: "code"; language: string; content: string; runnable?: boolean }
  | { type: "quiz"; question: string; answer: string }
  | { type: "activate"; question: string }
  | { type: "connect"; content: string }
  | { type: "reflect"; prompt: string }
  | { type: "bloom"; level: BloomLevel; question: string; answer: string }
  | { type: "visualization"; visualizationType: "chart" | "simulation"; description: string };

/**
 * Parse markdown content to extract code blocks
 *
 * Splits markdown into segments of plain markdown and fenced code blocks
 */
export const parseMarkdownWithCodeBlocks = (
  content: string | undefined | null,
): Array<
  | { type: "markdown"; content: string }
  | { type: "code"; language: string; content: string; runnable?: boolean }
> => {
  // Guard against undefined/null content
  if (!content) {
    return [];
  }

  const segments: Array<
    | { type: "markdown"; content: string }
    | { type: "code"; language: string; content: string; runnable?: boolean }
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
      segments.push({ type: "markdown" as const, content: normalizeLatexDelimiters(before) });
    }

    // Add the code block (ensure language is always a string)
    const rawLanguage = match[1] || "text";
    const runModifier = !!match[2];
    const suffixRunnable = rawLanguage.endsWith("-runnable");
    const runnable = runModifier || suffixRunnable;
    const language = suffixRunnable
      ? rawLanguage.slice(0, -"-runnable".length) || "text"
      : rawLanguage;
    segments.push({
      type: "code" as const,
      language,
      content: match[3].trim(),
      runnable,
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  // Add remaining markdown, normalizing LaTeX delimiters so
  // remark-math/KaTeX can render \[...\] and \(...\) math.
  const remaining = content.slice(lastIndex);
  if (remaining.trim()) {
    segments.push({ type: "markdown" as const, content: normalizeLatexDelimiters(remaining) });
  }

  return segments;
};

/**
 * Parse lesson content to extract all segments including learning science tags
 *
 * Supported tags:
 * - <activate>question</activate> - Prior knowledge activation
 * - <connect>content</connect> - Connection to existing knowledge
 * - <reflect>prompt</reflect> - Reflection prompts
 * - <bloom level="level"><question>q</question><answer>a</answer></bloom> - Bloom's taxonomy questions
 * - <question>q</question><answer>a</answer> - Regular quiz questions
 * - <visualize type="chart|simulation" description="..." /> - Interactive visualizations
 *
 * Also handles fenced code blocks (```language...```)
 */
export const parseLessonSegments = (lesson: string | undefined): Segment[] => {
  if (!lesson) {
    return [];
  }

  // Remove <prq> tags from lesson content since we display prerequisites separately
  let content = lesson.replace(/<prq>[\s\S]*?<\/prq>/gi, "").trim();

  const segments: Segment[] = [];

  // 1. Extract <activate> tag (should be first)
  const activateMatch = content.match(/<activate>([\s\S]*?)<\/activate>/i);
  if (activateMatch) {
    segments.push({
      type: "activate",
      question: normalizeLatexDelimiters(activateMatch[1].trim()),
    });
    content = content.replace(activateMatch[0], "").trim();
  }

  // 2. Extract <connect> tag (should be after activate)
  const connectMatch = content.match(/<connect>([\s\S]*?)<\/connect>/i);
  if (connectMatch) {
    segments.push({
      type: "connect",
      content: normalizeLatexDelimiters(connectMatch[1].trim()),
    });
    content = content.replace(connectMatch[0], "").trim();
  }

  // 3. Parse the rest: markdown, code, reflect, bloom, quiz, and visualize tags
  const tagRegex = new RegExp(
    "(?<reflect><reflect>(?<reflectContent>[\\s\\S]*?)<\\/reflect>)|" +
      "(?<bloom><bloom\\s+level=\"(?<bloomLevel>remember|understand|apply|analyze|evaluate|create)\">(?<bloomBody>[\\s\\S]*?)<\\/bloom>)|" +
      "(?<quiz><question>(?<quizQuestion>[\\s\\S]*?)<\\/question>\\s*<answer>(?<quizAnswer>[\\s\\S]*?)<\\/answer>)|" +
      "(?<visualize><visualize\\s+type=\"(?<vizType>chart|simulation)\"\\s+description=\"(?<vizDesc>[^\"]*?)\"\\s*\\/?>)",
    "gi",
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

    if (match.groups?.reflect) {
      segments.push({
        type: "reflect",
        prompt: normalizeLatexDelimiters(match.groups.reflectContent.trim()),
      });
    } else if (match.groups?.bloom) {
      const level = match.groups.bloomLevel as BloomLevel;
      const bloomContent = match.groups.bloomBody;

      const questionMatch = bloomContent.match(
        /<question>([\s\S]*?)<\/question>/i,
      );
      const answerMatch = bloomContent.match(/<answer>([\s\S]*?)<\/answer>/i);

      if (questionMatch && answerMatch) {
        segments.push({
          type: "bloom",
          level,
          question: normalizeLatexDelimiters(questionMatch[1].trim()),
          answer: normalizeLatexDelimiters(answerMatch[1].trim()),
        });
      }
    } else if (match.groups?.quiz) {
      segments.push({
        type: "quiz",
        question: normalizeLatexDelimiters(match.groups.quizQuestion.trim()),
        answer: normalizeLatexDelimiters(match.groups.quizAnswer.trim()),
      });
    } else if (match.groups?.visualize) {
      segments.push({
        type: "visualization",
        visualizationType: match.groups.vizType as "chart" | "simulation",
        description: match.groups.vizDesc ?? "",
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
