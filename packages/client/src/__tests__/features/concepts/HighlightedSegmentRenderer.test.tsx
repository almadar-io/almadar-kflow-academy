import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { HighlightedSegmentRenderer } from '../../../features/concepts/components/HighlightedSegmentRenderer';
import { Segment } from '../../../features/concepts/components/MarkdownRenderer';
import { Concept, NoteItem, QuestionAnswer } from '../../../features/concepts/types';
import { renderWithProviders } from '../../testUtils.helper';

// Mock rehype-raw to avoid ES module issues
jest.mock('rehype-raw', () => ({
  __esModule: true,
  default: jest.fn(() => () => {}),
}));

// Mock SegmentRenderer
jest.mock('../../../features/concepts/components/MarkdownRenderer', () => {
  const actual = jest.requireActual('../../../features/concepts/components/MarkdownRenderer');
  const MockSegmentRenderer = jest.fn(({ segments }: { segments: Segment[] }) => {
    if (!segments || segments.length === 0) {
      return null; // SegmentRenderer returns null for empty segments
    }
    return (
      <div data-testid="segment-renderer">
        {segments.map((segment: Segment, index: number) => {
          if (segment.type === 'markdown') {
            return (
              <div key={`md-${index}`} data-testid={`markdown-segment-${index}`}>
                {segment.content}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  });
  return {
    ...actual,
    SegmentRenderer: MockSegmentRenderer,
  };
});

// Mock DOM highlighting utilities
const mockApplyHighlightingToDOM = jest.fn();
jest.mock('../../../features/concepts/utils/domHighlighter', () => ({
  applyHighlightingToDOM: (...args: any[]) => mockApplyHighlightingToDOM(...args),
}));

// Mock extractHighlightChunks
const mockExtractHighlightChunks = jest.fn();
jest.mock('../../../features/concepts/utils/textHighlighter', () => ({
  ...jest.requireActual('../../../features/concepts/utils/textHighlighter'),
  extractHighlightChunks: (...args: any[]) => mockExtractHighlightChunks(...args),
}));

describe('HighlightedSegmentRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockExtractHighlightChunks.mockReturnValue([]);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const createMockConcept = (overrides?: Partial<Concept>): Concept => ({
    id: 'test-concept-id',
    name: 'Test Concept',
    description: 'Test Description',
    lesson: 'Test lesson content',
    parents: [],
    children: [],
    prerequisites: [],
    isSeed: false,
    ...overrides,
  });

  const createMockSegments = (): Segment[] => [
    {
      type: 'markdown',
      content: 'This is a test lesson with some content that can be highlighted.',
    },
  ];

  describe('Rendering', () => {
    it('should render SegmentRenderer with provided segments', () => {
      const segments = createMockSegments();
      const { container } = renderWithProviders(<HighlightedSegmentRenderer segments={segments} />);

      // Verify component renders without crashing
      expect(container).toBeInTheDocument();
    });

    it('should render without concept', () => {
      const segments = createMockSegments();
      renderWithProviders(<HighlightedSegmentRenderer segments={segments} />);

      expect(mockExtractHighlightChunks).not.toHaveBeenCalled();
      expect(mockApplyHighlightingToDOM).not.toHaveBeenCalled();
    });

    it('should render with null concept', () => {
      const segments = createMockSegments();
      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={null} />);

      expect(mockExtractHighlightChunks).not.toHaveBeenCalled();
      expect(mockApplyHighlightingToDOM).not.toHaveBeenCalled();
    });
  });

  describe('Highlighting with Notes', () => {
    it('should apply highlighting when concept has notes with selectedText', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedText: 'test lesson',
            timestamp: Date.now(),
          } as NoteItem,
        ],
      });

      mockExtractHighlightChunks.mockReturnValue([
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      // Wait for the timeout to complete
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockExtractHighlightChunks).toHaveBeenCalledWith(concept);
        expect(mockApplyHighlightingToDOM).toHaveBeenCalled();
      });

      const callArgs = mockApplyHighlightingToDOM.mock.calls[0];
      expect(callArgs[1]).toEqual([
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ]);
    });

    it('should not apply highlighting when notes have no selectedText', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            timestamp: Date.now(),
          } as NoteItem,
        ],
      });

      mockExtractHighlightChunks.mockReturnValue([]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockExtractHighlightChunks).toHaveBeenCalledWith(concept);
      });

      expect(mockApplyHighlightingToDOM).not.toHaveBeenCalled();
    });
  });

  describe('Highlighting with Questions', () => {
    it('should apply highlighting when concept has questions with selectedText', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        questions: [
          {
            question: 'What is this?',
            answer: 'This is a test',
            selectedText: 'test lesson',
            timestamp: Date.now(),
          } as QuestionAnswer,
        ],
      });

      mockExtractHighlightChunks.mockReturnValue([
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: true,
          hasNote: true,
        },
      ]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockExtractHighlightChunks).toHaveBeenCalledWith(concept);
        expect(mockApplyHighlightingToDOM).toHaveBeenCalled();
      });
    });

    it('should not apply highlighting when questions have no selectedText', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        questions: [
          {
            question: 'What is this?',
            answer: 'This is a test',
            timestamp: Date.now(),
          } as QuestionAnswer,
        ],
      });

      mockExtractHighlightChunks.mockReturnValue([]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockExtractHighlightChunks).toHaveBeenCalledWith(concept);
      });

      expect(mockApplyHighlightingToDOM).not.toHaveBeenCalled();
    });
  });

  describe('Highlighting with Both Notes and Questions', () => {
    it('should apply highlighting when concept has both notes and questions with same selectedText', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedText: 'test lesson',
            timestamp: Date.now(),
          } as NoteItem,
        ],
        questions: [
          {
            question: 'What is this?',
            answer: 'This is a test',
            selectedText: 'test lesson',
            timestamp: Date.now(),
          } as QuestionAnswer,
        ],
      });

      mockExtractHighlightChunks.mockReturnValue([
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: true,
          hasNote: true,
        },
      ]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockExtractHighlightChunks).toHaveBeenCalledWith(concept);
        expect(mockApplyHighlightingToDOM).toHaveBeenCalled();
      });

      const callArgs = mockApplyHighlightingToDOM.mock.calls[0];
      expect(callArgs[1]).toEqual([
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: true,
          hasNote: true,
        },
      ]);
    });

    it('should apply multiple highlights for different selectedText values', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedText: 'test lesson',
            timestamp: Date.now(),
          } as NoteItem,
          {
            id: 'note-2',
            text: 'Another note',
            selectedText: 'some content',
            timestamp: Date.now(),
          } as NoteItem,
        ],
      });

      mockExtractHighlightChunks.mockReturnValue([
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
        {
          text: 'some content',
          highlightId: 'test-2',
          hasQuestion: false,
          hasNote: true,
        },
      ]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockApplyHighlightingToDOM).toHaveBeenCalled();
      });

      const callArgs = mockApplyHighlightingToDOM.mock.calls[0];
      expect(callArgs[1]).toHaveLength(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup highlighting when component unmounts', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedText: 'test lesson',
            timestamp: Date.now(),
          } as NoteItem,
        ],
      });

      mockExtractHighlightChunks.mockReturnValue([
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ]);

      const { unmount } = renderWithProviders(
        <HighlightedSegmentRenderer segments={segments} concept={concept} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockApplyHighlightingToDOM).toHaveBeenCalled();
      });

      // The cleanup will be called automatically on unmount
      // We just need to verify it doesn't throw errors
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should re-apply highlighting when concept changes', async () => {
      const segments = createMockSegments();
      const concept1 = createMockConcept({
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedText: 'test lesson',
            timestamp: Date.now(),
          } as NoteItem,
        ],
      });

      const concept2 = createMockConcept({
        notes: [
          {
            id: 'note-2',
            text: 'Another note',
            selectedText: 'some content',
            timestamp: Date.now(),
          } as NoteItem,
        ],
      });

      mockExtractHighlightChunks
        .mockReturnValueOnce([
          {
            text: 'test lesson',
            highlightId: 'test-1',
            hasQuestion: false,
            hasNote: true,
          },
        ])
        .mockReturnValueOnce([
          {
            text: 'some content',
            highlightId: 'test-2',
            hasQuestion: false,
            hasNote: true,
          },
        ]);

      const { rerender } = renderWithProviders(
        <HighlightedSegmentRenderer segments={segments} concept={concept1} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockApplyHighlightingToDOM).toHaveBeenCalledTimes(1);
      });

      mockApplyHighlightingToDOM.mockClear();

      // Change concept
      rerender(<HighlightedSegmentRenderer segments={segments} concept={concept2} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockApplyHighlightingToDOM).toHaveBeenCalledTimes(1);
      });
    });

    it('should re-apply highlighting when segments change', async () => {
      const segments1 = createMockSegments();
      const segments2: Segment[] = [
        {
          type: 'markdown',
          content: 'New content with different text.',
        },
      ];
      const concept = createMockConcept({
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedText: 'test lesson',
            timestamp: Date.now(),
          } as NoteItem,
        ],
      });

      mockExtractHighlightChunks.mockReturnValue([
        {
          text: 'test lesson',
          highlightId: 'test-1',
          hasQuestion: false,
          hasNote: true,
        },
      ]);

      const { rerender } = renderWithProviders(
        <HighlightedSegmentRenderer segments={segments1} concept={concept} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockApplyHighlightingToDOM).toHaveBeenCalledTimes(1);
      });

      mockApplyHighlightingToDOM.mockClear();

      // Change segments
      rerender(<HighlightedSegmentRenderer segments={segments2} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockApplyHighlightingToDOM).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty segments array', () => {
      const { container } = renderWithProviders(<HighlightedSegmentRenderer segments={[]} />);

      // SegmentRenderer returns null for empty segments, so we just verify it doesn't crash
      expect(container).toBeInTheDocument();
    });

    it('should handle concept with empty notes array', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        notes: [],
      });

      mockExtractHighlightChunks.mockReturnValue([]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockExtractHighlightChunks).toHaveBeenCalledWith(concept);
      });

      expect(mockApplyHighlightingToDOM).not.toHaveBeenCalled();
    });

    it('should handle concept with empty questions array', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        questions: [],
      });

      mockExtractHighlightChunks.mockReturnValue([]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockExtractHighlightChunks).toHaveBeenCalledWith(concept);
      });

      expect(mockApplyHighlightingToDOM).not.toHaveBeenCalled();
    });

    it('should handle notes with empty selectedText', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        notes: [
          {
            id: 'note-1',
            text: 'This is a note',
            selectedText: '',
            timestamp: Date.now(),
          } as NoteItem,
        ],
      });

      mockExtractHighlightChunks.mockReturnValue([]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockExtractHighlightChunks).toHaveBeenCalledWith(concept);
      });

      expect(mockApplyHighlightingToDOM).not.toHaveBeenCalled();
    });

    it('should handle legacy notes as string (not array)', async () => {
      const segments = createMockSegments();
      const concept = createMockConcept({
        notes: 'legacy string notes' as any,
      });

      mockExtractHighlightChunks.mockReturnValue([]);

      renderWithProviders(<HighlightedSegmentRenderer segments={segments} concept={concept} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not crash, extractHighlightRanges should handle legacy data
      await waitFor(() => {
        expect(mockExtractHighlightChunks).toHaveBeenCalledWith(concept);
      });
    });
  });

  describe('Props Forwarding', () => {
    it('should forward other props to SegmentRenderer', () => {
      const segments = createMockSegments();
      const userProgress = {
        activationResponse: 'test response',
        reflectionNotes: [],
        bloomAnswered: {},
      };

      const { container } = renderWithProviders(
        <HighlightedSegmentRenderer
          segments={segments}
          userProgress={userProgress}
          onSaveActivation={jest.fn()}
          onSaveReflection={jest.fn()}
          onAnswerBloom={jest.fn()}
        />
      );

      // Verify component renders without crashing with all props
      expect(container).toBeInTheDocument();
    });
  });
});

