/**
 * Types for lesson segments
 */

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

// User progress tracking for learning science features
export interface UserProgress {
  activationResponse?: string; // User's response to pre-lesson activation question
  reflectionNotes?: string[]; // User's notes for inline reflection prompts
  bloomAnswered?: Record<number, boolean>; // Which Bloom questions have been answered (by index)
  bloomLevelsCompleted?: BloomLevel[]; // Which Bloom levels user has practiced
  lastStudied?: Date; // When user last engaged with this concept
  masteryLevel?: 0 | 1 | 2 | 3; // 0=not started, 1=learning, 2=practiced, 3=mastered
}
