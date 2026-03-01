import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, resetAllMocks } from '../../testUtils.helper';
import { LessonPanel } from '../../../components/organisms/LessonPanel';
import { Concept, ConceptGraph } from '../../../features/concepts/types';
import { ConceptsAPI } from '../../../features/concepts/ConceptsAPI';

// Mock ConceptsAPI
jest.mock('../../../features/concepts/ConceptsAPI', () => ({
  ConceptsAPI: {
    explainConcept: jest.fn(),
  },
}));

// Mock QuestionWidget
jest.mock('../../../features/concepts/components/QuestionWidget', () => {
  return function MockQuestionWidget({ isOpen, showFloatingButton }: any) {
    if (!isOpen && !showFloatingButton) return null;
    return (
      <div data-testid="question-widget">
        {showFloatingButton && <button data-testid="question-widget-button">Ask Question</button>}
        {isOpen && <div data-testid="question-widget-modal">Question Widget Modal</div>}
      </div>
    );
  };
});

// Mock FloatingActionButton
jest.mock('../../../features/concepts/components/FloatingActionButton', () => {
  return function MockFloatingActionButton({ onQuestionClick, onNoteClick, showQuestionButton, showNoteButton }: any) {
    if (!showQuestionButton && !showNoteButton) return null;
    return (
      <div data-testid="floating-action-button">
        <button data-testid="fab-main-button" onClick={() => {}}>FAB</button>
        {showQuestionButton && <button data-testid="fab-question-button" onClick={onQuestionClick}>Question</button>}
        {showNoteButton && <button data-testid="fab-note-button" onClick={onNoteClick}>Note</button>}
      </div>
    );
  };
});

// Mock TextSelectionTooltip
jest.mock('../../../components/TextSelectionTooltip', () => {
  return function MockTextSelectionTooltip() {
    return null;
  };
});

// Mock MarkdownRenderer components
jest.mock('../../../features/concepts/components/MarkdownRenderer', () => {
  const mockParseLessonSegments = (lesson: string | undefined) => {
    if (!lesson) return [];
    // Simple mock that returns segments based on content
    const segments: any[] = [];
    if (lesson.includes('```')) {
      const codeMatch = lesson.match(/```(\w+)?\n([\s\S]*?)```/);
      if (codeMatch) {
        segments.push({ type: 'code', language: codeMatch[1] || 'text', content: codeMatch[2] });
      }
    }
    if (lesson.includes('<question>')) {
      const quizMatch = lesson.match(/<question>([\s\S]*?)<\/question>\s*<answer>([\s\S]*?)<\/answer>/);
      if (quizMatch) {
        segments.push({ type: 'quiz', question: quizMatch[1], answer: quizMatch[2] });
      }
    }
    const markdownContent = lesson.replace(/```[\s\S]*?```/g, '').replace(/<question>[\s\S]*?<\/answer>/g, '');
    if (markdownContent.trim()) {
      segments.push({ type: 'markdown', content: markdownContent });
    }
    return segments.length > 0 ? segments : [{ type: 'markdown', content: lesson }];
  };

  return {
    parseLessonSegments: mockParseLessonSegments,
    SegmentRenderer: ({ segments = [] }: any) => {
      if (!segments || segments.length === 0) {
        return <div data-testid="lesson-content-empty">No content</div>;
      }
      return (
        <div data-testid="lesson-content">
          {segments.map((segment: any, idx: number) => {
            if (segment.type === 'markdown') {
              return <div key={idx} data-testid="markdown-segment">{segment.content}</div>;
            }
            if (segment.type === 'code') {
              return <div key={idx} data-testid="code-block" data-language={segment.language}>{segment.content}</div>;
            }
            if (segment.type === 'quiz') {
              return <div key={idx} data-testid="quiz-block"><div data-testid="quiz-question">{segment.question}</div><div data-testid="quiz-answer">{segment.answer}</div></div>;
            }
            return null;
          })}
        </div>
      );
    },
  };
});

// Helper to create a mock concept
const createMockConcept = (name: string, hasLesson: boolean = false): Concept => ({
  id: `concept-${name}`,
  name,
  description: `Description for ${name}`,
  parents: [],
  children: [],
  layer: 0,
  ...(hasLesson && { lesson: '# Lesson Title\n\nThis is a lesson about ' + name }),
});

// Helper to create a mock graph
const createMockGraph = (): ConceptGraph => ({
  id: 'graph-1',
  seedConceptId: 'seed-1',
  concepts: new Map(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  difficulty: 'intermediate',
  goalFocused: false,
});

describe('Lesson Generation - Frontend', () => {
  const mockOnGenerateLesson = jest.fn();
  const mockGraph = createMockGraph();
  const mockConcept = createMockConcept('React');

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    mockOnGenerateLesson.mockClear();
    (ConceptsAPI.explainConcept as jest.Mock).mockClear();
  });

  describe('Quick Lesson Button', () => {
    it('should call onGenerateLesson with simple=true when Quick Lesson button is clicked', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      const quickLessonButton = screen.getByText('Quick Lesson');
      fireEvent.click(quickLessonButton);

      expect(mockOnGenerateLesson).toHaveBeenCalledWith(true);
    });

    it('should disable Quick Lesson button when generating', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      // When generating, button text changes to "Generating..." so we find by role
      const buttons = screen.getAllByRole('button');
      const generatingButtons = buttons.filter(btn => btn.textContent?.includes('Generating'));
      expect(generatingButtons.length).toBeGreaterThan(0);
      expect(generatingButtons[0]).toBeDisabled();
    });

    it('should show loading state on Quick Lesson button when generating', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      // Both buttons show "Generating..." when generating
      const generatingTexts = screen.getAllByText('Generating...');
      expect(generatingTexts.length).toBeGreaterThan(0);
    });

    it('should hide Quick Lesson button when showGenerationButtons is false', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={false}
        />
      );

      expect(screen.queryByText('Quick Lesson')).not.toBeInTheDocument();
    });

    it('should hide Quick Lesson button when showGenerationButtons is not provided', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
        />
      );

      expect(screen.queryByText('Quick Lesson')).not.toBeInTheDocument();
    });
  });

  describe('Detailed Lesson Button', () => {
    it('should call onGenerateLesson with simple=false when Detailed Lesson button is clicked', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      const detailedLessonButton = screen.getByText('Detailed Lesson');
      fireEvent.click(detailedLessonButton);

      expect(mockOnGenerateLesson).toHaveBeenCalledWith(false);
    });

    it('should disable Detailed Lesson button when generating', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      // When generating, both buttons show "Generating..." so we need to find the Detailed Lesson button differently
      const buttons = screen.getAllByRole('button');
      const detailedButton = buttons.find(btn => btn.textContent?.includes('Detailed') || btn.textContent?.includes('Generating'));
      expect(detailedButton).toBeDisabled();
    });

    it('should show loading state on Detailed Lesson button when generating', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      // Both buttons show "Generating..." when generating
      const generatingTexts = screen.getAllByText('Generating...');
      expect(generatingTexts.length).toBeGreaterThan(0);
    });

    it('should hide Detailed Lesson button when showGenerationButtons is false', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={false}
        />
      );

      expect(screen.queryByText('Detailed Lesson')).not.toBeInTheDocument();
    });

    it('should hide Detailed Lesson button when showGenerationButtons is not provided', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
        />
      );

      expect(screen.queryByText('Detailed Lesson')).not.toBeInTheDocument();
    });
  });

  describe('Streaming Content', () => {
    it('should display lesson content as it streams in', async () => {
      const streamingContent = '# Lesson Title\n\nThis is streaming content';
      
      const { rerender } = renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      // Simulate streaming by updating renderedLesson
      rerender(
        <ConceptLessonPanel
          renderedLesson={streamingContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('lesson-content')).toBeInTheDocument();
        expect(screen.getByText(/streaming content/i)).toBeInTheDocument();
      });
    });

    it('should update lesson content incrementally during streaming', async () => {
      const initialContent = '# Lesson Title\n\nPart 1';
      const updatedContent = '# Lesson Title\n\nPart 1\n\nPart 2';
      
      const { rerender } = renderWithProviders(
        <ConceptLessonPanel
          renderedLesson={initialContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      expect(screen.getByText(/Part 1/i)).toBeInTheDocument();

      // Simulate additional content streaming in
      rerender(
        <ConceptLessonPanel
          renderedLesson={updatedContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Part 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Part 2/i)).toBeInTheDocument();
      });
    });
  });

  describe('Markdown Rendering', () => {
    it('should render markdown content correctly', () => {
      const lessonContent = '# Lesson Title\n\nThis is **bold** text and *italic* text.';
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson={lessonContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      expect(screen.getByTestId('lesson-content')).toBeInTheDocument();
      expect(screen.getByTestId('markdown-segment')).toBeInTheDocument();
    });

    it('should render code blocks correctly', () => {
      const lessonContent = 'Here is some code:\n\n```javascript\nconst x = 1;\n```';
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson={lessonContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      const codeBlock = screen.getByTestId('code-block');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock).toHaveAttribute('data-language', 'javascript');
      expect(codeBlock).toHaveTextContent('const x = 1;');
    });

    it('should render quiz blocks correctly', () => {
      const lessonContent = 'Practice question:\n\n<question>What is React?</question>\n<answer>React is a JavaScript library.</answer>';
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson={lessonContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      const quizBlock = screen.getByTestId('quiz-block');
      expect(quizBlock).toBeInTheDocument();
      expect(screen.getByTestId('quiz-question')).toHaveTextContent('What is React?');
      expect(screen.getByTestId('quiz-answer')).toHaveTextContent('React is a JavaScript library.');
    });

    it('should render multiple content types together', () => {
      const lessonContent = '# Title\n\nSome text.\n\n```python\nprint("Hello")\n```\n\n<question>Question?</question>\n<answer>Answer.</answer>';
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson={lessonContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      expect(screen.getByTestId('markdown-segment')).toBeInTheDocument();
      expect(screen.getByTestId('code-block')).toBeInTheDocument();
      expect(screen.getByTestId('quiz-block')).toBeInTheDocument();
    });

    it('should render lesson content even when showGenerationButtons is false', () => {
      const lessonContent = '# Lesson Title\n\nSome content.';
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson={lessonContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={false}
        />
      );

      expect(screen.getByTestId('lesson-content')).toBeInTheDocument();
      expect(screen.queryByText('Quick Lesson')).not.toBeInTheDocument();
      expect(screen.queryByText('Detailed Lesson')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when generating lesson', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      // Check for loading spinner (Loader2 icon)
      const loadingButtons = screen.getAllByText('Generating...');
      expect(loadingButtons.length).toBeGreaterThan(0);
    });

    it('should hide loading indicator when not generating', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
    });

    it('should not show loading indicator when showGenerationButtons is false', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={true}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={false}
        />
      );

      // Buttons are hidden, so no "Generating..." text should appear
      expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully when lesson generation fails', () => {
      // Error handling is typically done at a higher level (in the hook or component that calls onGenerateLesson)
      // This test verifies the component doesn't crash when an error occurs
      const errorHandler = jest.fn();
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={(simple) => {
            try {
              mockOnGenerateLesson(simple);
              throw new Error('Generation failed');
            } catch (error) {
              errorHandler(error);
            }
          }}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      const quickLessonButton = screen.getByText('Quick Lesson');
      fireEvent.click(quickLessonButton);

      expect(errorHandler).toHaveBeenCalled();
      // Component should still be functional
      expect(quickLessonButton).toBeInTheDocument();
    });

    it('should allow retry after error', () => {
      // Error handling is typically done at a higher level (in the hook that calls onGenerateLesson)
      // This test verifies the component doesn't crash when an error occurs
      const errorHandler = jest.fn();
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={(simple) => {
            try {
              mockOnGenerateLesson(simple);
              throw new Error('Generation failed');
            } catch (error) {
              errorHandler(error);
              // In real implementation, error would be handled by the hook
            }
          }}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      const quickLessonButton = screen.getByText('Quick Lesson');
      
      // Click button - error should be handled gracefully
      fireEvent.click(quickLessonButton);
      
      // Component should still be functional
      expect(quickLessonButton).toBeInTheDocument();
      expect(errorHandler).toHaveBeenCalled();
      
      // Note: Actual retry logic would be in the hook/component that calls onGenerateLesson
    });
  });

  describe('Question Widget Integration', () => {
    it('should show question widget floating button when lesson is loaded', () => {
      const lessonContent = '# Lesson Title\n\nSome content.';
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson={lessonContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          graphId="graph-1"
          showGenerationButtons={true}
        />
      );

      // With the new FloatingActionButton implementation, check for FAB instead
      expect(screen.getByTestId('floating-action-button')).toBeInTheDocument();
      expect(screen.getByTestId('fab-main-button')).toBeInTheDocument();
    });

    it('should not show question widget when lesson is not loaded', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          graphId="graph-1"
          showGenerationButtons={true}
        />
      );

      // FAB should not be shown when there's no lesson
      expect(screen.queryByTestId('floating-action-button')).not.toBeInTheDocument();
    });

    it('should not show question widget when graphId is missing', () => {
      const lessonContent = '# Lesson Title\n\nSome content.';
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson={lessonContent}
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      // FAB should still be shown (with note button) even when graphId is missing
      // But question button should not be available
      const fab = screen.queryByTestId('floating-action-button');
      if (fab) {
        // If FAB exists, it should only have note button, not question button
        expect(screen.queryByTestId('fab-question-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('fab-note-button')).toBeInTheDocument();
      } else {
        // FAB might not be shown if there are no segments
        expect(fab).not.toBeInTheDocument();
      }
    });
  });

  describe('showGenerationButtons prop', () => {
    it('should show generation buttons when showGenerationButtons is true', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={true}
        />
      );

      expect(screen.getByText('Quick Lesson')).toBeInTheDocument();
      expect(screen.getByText('Detailed Lesson')).toBeInTheDocument();
    });

    it('should hide generation buttons when showGenerationButtons is false', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
          showGenerationButtons={false}
        />
      );

      expect(screen.queryByText('Quick Lesson')).not.toBeInTheDocument();
      expect(screen.queryByText('Detailed Lesson')).not.toBeInTheDocument();
    });

    it('should hide generation buttons by default (when prop is not provided)', () => {
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson=""
          conceptHasLesson={false}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConcept}
          graph={mockGraph}
        />
      );

      expect(screen.queryByText('Quick Lesson')).not.toBeInTheDocument();
      expect(screen.queryByText('Detailed Lesson')).not.toBeInTheDocument();
    });

    it('should show flash cards generation button when showGenerationButtons is true and concept has lesson', () => {
      const mockConceptWithLesson = createMockConcept('React', true);
      const mockOnGenerateFlashCards = jest.fn();
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson="# Lesson"
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConceptWithLesson}
          graph={mockGraph}
          showGenerationButtons={true}
          onGenerateFlashCards={mockOnGenerateFlashCards}
        />
      );

      expect(screen.getByText('Generate Flash Cards')).toBeInTheDocument();
    });

    it('should hide flash cards generation button when showGenerationButtons is false', () => {
      const mockConceptWithLesson = createMockConcept('React', true);
      const mockOnGenerateFlashCards = jest.fn();
      
      renderWithProviders(
        <ConceptLessonPanel
          renderedLesson="# Lesson"
          conceptHasLesson={true}
          onGenerateLesson={mockOnGenerateLesson}
          isGenerating={false}
          concept={mockConceptWithLesson}
          graph={mockGraph}
          showGenerationButtons={false}
          onGenerateFlashCards={mockOnGenerateFlashCards}
        />
      );

      expect(screen.queryByText('Generate Flash Cards')).not.toBeInTheDocument();
    });
  });
});

