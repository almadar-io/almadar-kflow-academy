import { extractHighlightChunks, HighlightChunk } from '../../../../features/concepts/utils/textHighlighter';
import { Concept, NoteItem, QuestionAnswer } from '../../../../features/concepts/types';

describe('textHighlighter', () => {
  describe('extractHighlightChunks', () => {
    it('should return empty array for null concept', () => {
      expect(extractHighlightChunks(null)).toEqual([]);
    });

    it('should return empty array for undefined concept', () => {
      expect(extractHighlightChunks(undefined)).toEqual([]);
    });

    it('should return empty array when concept has no notes or questions', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
      };
      expect(extractHighlightChunks(concept)).toEqual([]);
    });

    it('should extract chunks from questions with selectedTextChunks', () => {
      const timestamp = Date.now();
      const highlightId = `q_${timestamp}`;
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        questions: [
          {
            question: 'What is this?',
            answer: 'This is a test',
            selectedText: 'test lesson content',
            selectedTextChunks: ['test lesson', 'lesson content'],
            highlightId,
            timestamp,
          } as QuestionAnswer,
        ],
      };

      const chunks = extractHighlightChunks(concept);
      // All chunks should be used for highlighting
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toEqual({
        text: 'test lesson',
        highlightId,
        hasQuestion: true,
        hasNote: false,
      });
      expect(chunks[1]).toEqual({
        text: 'lesson content',
        highlightId,
        hasQuestion: true,
        hasNote: false,
      });
    });

    it('should extract chunks from notes with selectedTextChunks', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedText: 'test lesson content',
            selectedTextChunks: ['test lesson', 'lesson content'],
            timestamp: Date.now(),
          } as NoteItem,
        ],
      };

      const chunks = extractHighlightChunks(concept);
      // All chunks should be used for highlighting
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toEqual({
        text: 'test lesson',
        highlightId: 'note-1',
        hasQuestion: false,
        hasNote: true,
        noteText: 'This is a note',
      });
      expect(chunks[1]).toEqual({
        text: 'lesson content',
        highlightId: 'note-1',
        hasQuestion: false,
        hasNote: true,
        noteText: 'This is a note',
      });
    });

    it('should combine notes and questions with overlapping chunks', () => {
      const timestamp = Date.now();
      const highlightId = `q_${timestamp}`;
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedText: 'test lesson content',
            selectedTextChunks: ['test lesson'],
            timestamp: Date.now(),
          } as NoteItem,
        ],
        questions: [
          {
            question: 'What is this?',
            answer: 'This is a test',
            selectedText: 'test lesson content',
            selectedTextChunks: ['test lesson'],
            highlightId,
            timestamp,
          } as QuestionAnswer,
        ],
      };

      const chunks = extractHighlightChunks(concept);
      // Should have one chunk that has both question and note
      const testLessonChunk = chunks.find(c => c.text === 'test lesson');
      expect(testLessonChunk).toBeDefined();
      expect(testLessonChunk?.hasQuestion).toBe(true);
      expect(testLessonChunk?.hasNote).toBe(true);
    });

    it('should handle multiple different chunks', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        notes: [
          {
            id: 'note-1',
            text: 'Note 1',
            selectedText: 'first text content',
            selectedTextChunks: ['first text', 'text content'],
            timestamp: Date.now(),
          } as NoteItem,
          {
            id: 'note-2',
            text: 'Note 2',
            selectedText: 'second text content',
            selectedTextChunks: ['second text', 'text content'],
            timestamp: Date.now(),
          } as NoteItem,
        ],
      };

      const chunks = extractHighlightChunks(concept);
      // All chunks from each note should be used
      // 'text content' appears in both notes, so it should be deduplicated but have both note IDs
      expect(chunks.length).toBeGreaterThanOrEqual(3);
      expect(chunks.some(c => c.text === 'first text')).toBe(true);
      expect(chunks.some(c => c.text === 'second text')).toBe(true);
      expect(chunks.some(c => c.text === 'text content')).toBe(true);
    });

    it('should ignore questions without selectedTextChunks', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        questions: [
          {
            question: 'What is this?',
            answer: 'This is a test',
            timestamp: Date.now(),
          } as QuestionAnswer,
        ],
      };

      expect(extractHighlightChunks(concept)).toEqual([]);
    });

    it('should ignore notes without selectedTextChunks', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            timestamp: Date.now(),
          } as NoteItem,
        ],
      };

      expect(extractHighlightChunks(concept)).toEqual([]);
    });

    it('should ignore empty or whitespace-only chunks', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedTextChunks: ['', '   ', 'valid chunk'],
            timestamp: Date.now(),
          } as NoteItem,
        ],
      };

      const chunks = extractHighlightChunks(concept);
      // All chunks are processed, but empty/whitespace chunks are filtered out
      // Only 'valid chunk' should remain
      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe('valid chunk');
    });

    it('should trim chunks', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedTextChunks: ['  test lesson  '],
            timestamp: Date.now(),
          } as NoteItem,
        ],
      };

      const chunks = extractHighlightChunks(concept);
      expect(chunks[0].text).toBe('test lesson');
    });

    it('should handle legacy notes as string (not array)', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        notes: 'legacy string' as any,
      };

      // Should not crash
      expect(() => extractHighlightChunks(concept)).not.toThrow();
      expect(extractHighlightChunks(concept)).toEqual([]);
    });

    it('should handle empty notes array', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        notes: [],
      };

      expect(extractHighlightChunks(concept)).toEqual([]);
    });

    it('should handle empty questions array', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        questions: [],
      };

      expect(extractHighlightChunks(concept)).toEqual([]);
    });

    it('should use note ID as highlightId for notes', () => {
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        notes: [
          {
            id: 'my-note-id',
            text: 'This is a note',
            selectedTextChunks: ['test chunk'],
            timestamp: Date.now(),
          } as NoteItem,
        ],
      };

      const chunks = extractHighlightChunks(concept);
      expect(chunks[0].highlightId).toBe('my-note-id');
    });

    it('should use highlightId from question or generate one', () => {
      const timestamp = Date.now();
      const concept: Concept = {
        id: 'test',
        name: 'Test Concept',
        description: 'Test',
        lesson: 'Test lesson',
        parents: [],
        children: [],
        prerequisites: [],
        isSeed: false,
        questions: [
          {
            question: 'What is this?',
            answer: 'This is a test',
            selectedTextChunks: ['test chunk'],
            highlightId: 'custom-id',
            timestamp,
          } as QuestionAnswer,
        ],
      };

      const chunks = extractHighlightChunks(concept);
      expect(chunks[0].highlightId).toBe('custom-id');
    });
  });
});
