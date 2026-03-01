import { Concept, QuestionAnswer, NoteItem } from '../types';
import { chunkText, chunkTextByNewline } from './textChunking';

export interface HighlightChunk {
  text: string; // The chunk text to match
  highlightId: string; // ID to group chunks together (note ID or question highlightId)
  hasQuestion: boolean;
  hasNote: boolean;
  noteText?: string; // Optional note text to show in tooltip
}

/**
 * Extract all highlighted text chunks from a concept's questions and notes
 * Groups chunks by highlightId to know which chunks belong together
 */
export const extractHighlightChunks = (concept: Concept | null | undefined): HighlightChunk[] => {
  if (!concept) return [];

  const chunks: HighlightChunk[] = [];
  // Map by text (lowercase) to combine chunks from different sources
  const chunkMap = new Map<string, { hasQuestion: boolean; hasNote: boolean; highlightIds: Set<string> }>();

  // Extract from questions
  const questions = Array.isArray(concept.questions) ? concept.questions : [];
  questions.forEach((qa: QuestionAnswer) => {
    // Get chunks - use selectedTextChunks if available, otherwise generate from selectedText
    let qaChunks: string[] = [];
    if (qa.selectedTextChunks && qa.selectedTextChunks.length > 0) {
      qaChunks = qa.selectedTextChunks;
    } else if (qa.selectedText && qa.selectedText.trim().length > 0) {
      // Fallback: generate chunks from selectedText if selectedTextChunks is missing
      // Using newline-based chunking strategy
      qaChunks = chunkTextByNewline(qa.selectedText);
    }

    // Use all chunks for highlighting
    const highlightId = qa.highlightId || `q_${qa.timestamp || Date.now()}`;
    qaChunks.forEach((chunk) => {
      if (chunk && chunk.trim()) {
        const trimmedChunk = chunk.trim();
        const chunkKey = trimmedChunk.toLowerCase();
        const existing = chunkMap.get(chunkKey);
        if (existing) {
          existing.hasQuestion = true;
          existing.highlightIds.add(highlightId);
          // Update existing chunks with this text to have hasQuestion = true
          chunks.forEach((c) => {
            if (c.text.toLowerCase() === chunkKey) {
              c.hasQuestion = true;
            }
          });
        } else {
          chunkMap.set(chunkKey, { 
            hasQuestion: true, 
            hasNote: false,
            highlightIds: new Set([highlightId])
          });
          chunks.push({
            text: trimmedChunk,
            highlightId,
            hasQuestion: true,
            hasNote: false,
          });
        }
      }
    });
  });

  // Extract from notes
  const notes = Array.isArray(concept.notes) ? concept.notes : [];
  notes.forEach((note: NoteItem) => {
    // Get chunks - use selectedTextChunks if available, otherwise generate from selectedText
    let noteChunks: string[] = [];
    if (note.selectedTextChunks && note.selectedTextChunks.length > 0) {
      noteChunks = note.selectedTextChunks;
    } else if (note.selectedText && note.selectedText.trim().length > 0) {
      // Fallback: generate chunks from selectedText if selectedTextChunks is missing
      // Using newline-based chunking strategy
      noteChunks = chunkTextByNewline(note.selectedText);
    }

    // Use all chunks for highlighting
    const highlightId = note.id; // Use note ID as highlightId
    noteChunks.forEach((chunk) => {
      if (chunk && chunk.trim()) {
        const trimmedChunk = chunk.trim();
        const chunkKey = trimmedChunk.toLowerCase();
        const existing = chunkMap.get(chunkKey);
        if (existing) {
          existing.hasNote = true;
          existing.highlightIds.add(highlightId);
          // Update existing chunks with this text to have hasNote = true
          chunks.forEach((c) => {
            if (c.text.toLowerCase() === chunkKey) {
              c.hasNote = true;
              // Update note text if not already set
              if (!c.noteText && note.text) {
                c.noteText = note.text;
              }
            }
          });
        } else {
          chunkMap.set(chunkKey, { 
            hasQuestion: false, 
            hasNote: true,
            highlightIds: new Set([highlightId])
          });
          chunks.push({
            text: trimmedChunk,
            highlightId,
            hasQuestion: false,
            hasNote: true,
            noteText: note.text, // Store note text for tooltip
          });
        }
      }
    });
  });

  // Update chunks that have both question and note
  chunks.forEach((chunk) => {
    const chunkKey = chunk.text.toLowerCase();
    const data = chunkMap.get(chunkKey);
    if (data) {
      chunk.hasQuestion = data.hasQuestion;
      chunk.hasNote = data.hasNote;
    }
  });

  return chunks;
};

/**
 * Normalize text for matching - removes extra whitespace, normalizes line breaks, etc.
 */
function normalizeTextForMatching(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace all whitespace with single space
    .trim()
    .toLowerCase();
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
