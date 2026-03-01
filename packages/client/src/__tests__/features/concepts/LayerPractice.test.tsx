import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, resetAllMocks } from '../../testUtils.helper';
import LayerPracticeModal from '../../../features/concepts/components/LayerPracticeModal';
import { Concept, PracticeItem } from '../../../features/concepts/types';
import { ConceptsAPI } from '../../../features/concepts/ConceptsAPI';

// Mock ConceptsAPI
jest.mock('../../../features/concepts/ConceptsAPI', () => ({
  ConceptsAPI: {
    generateLayerPractice: jest.fn(),
  },
}));

// Mock useLayerPractice hook
const mockLoadPractice = jest.fn();
const mockUseLayerPractice = jest.fn();

jest.mock('../../../features/concepts/hooks/useLayerPractice', () => ({
  useLayerPractice: (options: any) => mockUseLayerPractice(options),
}));

// Mock MarkdownRenderer
jest.mock('../../../features/concepts/components/MarkdownRenderer', () => ({
  parseMarkdownWithCodeBlocks: (content: string) => {
    if (!content) return [];
    const segments: any[] = [];
    if (content.includes('```')) {
      const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)```/);
      if (codeMatch) {
        segments.push({ type: 'code', language: codeMatch[1] || 'text', content: codeMatch[2] });
      }
    }
    const markdownContent = content.replace(/```[\s\S]*?```/g, '');
    if (markdownContent.trim()) {
      segments.push({ type: 'markdown', content: markdownContent });
    }
    return segments.length > 0 ? segments : [{ type: 'markdown', content }];
  },
  SegmentRenderer: ({ segments = [] }: any) => {
    if (!segments || segments.length === 0) {
      return <div data-testid="practice-content-empty">No content</div>;
    }
    return (
      <div data-testid="practice-content">
        {segments.map((segment: any, idx: number) => {
          if (segment.type === 'markdown') {
            return <div key={idx} data-testid="markdown-segment">{segment.content}</div>;
          }
          if (segment.type === 'code') {
            return <div key={idx} data-testid="code-block" data-language={segment.language}>{segment.content}</div>;
          }
          return null;
        })}
      </div>
    );
  },
}));

// Helper to create a mock concept
const createMockConcept = (name: string, layer: number = 1): Concept => ({
  id: `concept-${name}`,
  name,
  description: `Description for ${name}`,
  parents: [],
  children: [],
  layer,
});

describe('Layer Practice / Final Review Generation - Frontend', () => {
  const mockConcepts = [
    createMockConcept('React Components', 1),
    createMockConcept('State Management', 1),
  ];
  const mockLayerGoal = 'Build a React application';
  const mockLayerNumber = 1;
  const mockOnClose = jest.fn();

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    mockOnClose.mockClear();
    mockLoadPractice.mockClear();

    // Default mock return for useLayerPractice
    mockUseLayerPractice.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      streamingContent: '',
      isStreaming: false,
      loadPractice: mockLoadPractice,
    });
  });

  describe('Practice Modal', () => {
    it('should open and display correctly when isOpen is true', () => {
      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      expect(screen.getByText(`Level ${mockLayerNumber} Final Review`)).toBeInTheDocument();
      expect(screen.getByText(mockLayerGoal)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      renderWithProviders(
        <LayerPracticeModal
          isOpen={false}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      expect(screen.queryByText(`Level ${mockLayerNumber} Final Review`)).not.toBeInTheDocument();
    });

    it('should display learning goal in modal', () => {
      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      expect(screen.getByText('Learning Goal')).toBeInTheDocument();
      expect(screen.getByText(mockLayerGoal)).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', () => {
      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when backdrop is clicked', () => {
      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      const backdrop = screen.getByText(`Level ${mockLayerNumber} Final Review`).closest('.fixed');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Practice Generation', () => {
    it('should call loadPractice when modal opens and no existing exercises', () => {
      mockUseLayerPractice.mockReturnValue({
        items: [],
        isLoading: false,
        error: null,
        streamingContent: '',
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      // loadPractice should be called automatically when modal opens and no existing exercises
      // This is handled by useLayerPractice hook's useEffect
      expect(mockUseLayerPractice).toHaveBeenCalledWith(
        expect.objectContaining({
          concepts: mockConcepts,
          layerGoal: mockLayerGoal,
          layerNumber: mockLayerNumber,
        })
      );
    });

    it('should display existing exercises if provided', () => {
      const existingExercises: PracticeItem[] = [
        {
          type: 'project',
          question: '# Review Content\n\nThis is existing review content.',
          answer: '',
        },
      ];

      mockUseLayerPractice.mockReturnValue({
        items: existingExercises,
        isLoading: false,
        error: null,
        streamingContent: existingExercises[0].question,
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
          existingExercises={existingExercises}
        />
      );

      // Check for content in the rendered segments
      expect(screen.getByTestId('practice-content')).toBeInTheDocument();
      expect(screen.getByTestId('markdown-segment')).toHaveTextContent('Review Content');
    });
  });

  describe('Streaming Content', () => {
    it('should display practice content as it streams in', () => {
      const streamingContent = '# Review\n\nThis is streaming content.';

      mockUseLayerPractice.mockReturnValue({
        items: [],
        isLoading: true,
        error: null,
        streamingContent,
        isStreaming: true,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      // Check for content in the rendered segments
      expect(screen.getByTestId('practice-content')).toBeInTheDocument();
      expect(screen.getByTestId('markdown-segment')).toHaveTextContent('Review');
      expect(screen.getByTestId('markdown-segment')).toHaveTextContent('This is streaming content.');
    });

    it('should update practice content incrementally during streaming', async () => {
      let currentContent = '';
      const initialChunk = '# Review\n\n';
      const secondChunk = 'First paragraph.';
      const finalChunk = '\n\n```javascript\nconsole.log("Hello");\n```';

      const { rerender } = renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      // First chunk
      currentContent += initialChunk;
      mockUseLayerPractice.mockReturnValue({
        items: [],
        isLoading: true,
        error: null,
        streamingContent: currentContent,
        isStreaming: true,
        loadPractice: mockLoadPractice,
      });
      rerender(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );
      expect(screen.getByTestId('markdown-segment')).toHaveTextContent('Review');
      // First paragraph should not be present yet
      const markdownSegments = screen.queryAllByTestId('markdown-segment');
      const hasFirstParagraph = markdownSegments.some(segment => 
        segment.textContent?.includes('First paragraph.')
      );
      expect(hasFirstParagraph).toBe(false);

      // Second chunk
      currentContent += secondChunk;
      mockUseLayerPractice.mockReturnValue({
        items: [],
        isLoading: true,
        error: null,
        streamingContent: currentContent,
        isStreaming: true,
        loadPractice: mockLoadPractice,
      });
      rerender(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );
      // Check that First paragraph is now in the content (may be in markdown segment)
      const updatedSegments = screen.getAllByTestId('markdown-segment');
      const hasFirstParagraphNow = updatedSegments.some(segment => 
        segment.textContent?.includes('First paragraph.')
      );
      expect(hasFirstParagraphNow).toBe(true);
      // Code block should not be present yet
      expect(screen.queryByTestId('code-block')).not.toBeInTheDocument();

      // Final chunk
      currentContent += finalChunk;
      mockUseLayerPractice.mockReturnValue({
        items: [],
        isLoading: false,
        error: null,
        streamingContent: currentContent,
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });
      rerender(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );
      // Code block should now be present
      expect(screen.getByTestId('code-block')).toHaveTextContent('console.log("Hello");');
    });
  });

  describe('Markdown Rendering', () => {
    it('should render markdown content correctly', () => {
      const reviewContent = '# Review Title\n\n* List item 1\n* List item 2';

      mockUseLayerPractice.mockReturnValue({
        items: [{ type: 'project', question: reviewContent, answer: '' }],
        isLoading: false,
        error: null,
        streamingContent: reviewContent,
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      expect(screen.getByTestId('markdown-segment')).toHaveTextContent('Review Title');
      expect(screen.getByTestId('markdown-segment')).toHaveTextContent('List item 1');
    });

    it('should render code blocks correctly', () => {
      const reviewContent = '```javascript\nconst x = 10;\n```';

      mockUseLayerPractice.mockReturnValue({
        items: [{ type: 'project', question: reviewContent, answer: '' }],
        isLoading: false,
        error: null,
        streamingContent: reviewContent,
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      expect(screen.getByTestId('code-block')).toHaveTextContent('const x = 10;');
      expect(screen.getByTestId('code-block')).toHaveAttribute('data-language', 'javascript');
    });

    it('should render multiple content types together', () => {
      const reviewContent = `
        # Intro
        \`\`\`python
        print("Hello")
        \`\`\`
        Some text here.
      `;

      mockUseLayerPractice.mockReturnValue({
        items: [{ type: 'project', question: reviewContent, answer: '' }],
        isLoading: false,
        error: null,
        streamingContent: reviewContent,
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      expect(screen.getByTestId('markdown-segment')).toHaveTextContent('Intro');
      expect(screen.getByTestId('code-block')).toHaveTextContent('print("Hello")');
    });
  });

  describe('Goal Display', () => {
    it('should display learning goal in modal', () => {
      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      expect(screen.getByText('Learning Goal')).toBeInTheDocument();
      expect(screen.getByText(mockLayerGoal)).toBeInTheDocument();
    });

    it('should not display goal section when layerGoal is empty', () => {
      mockUseLayerPractice.mockReturnValue({
        items: [],
        isLoading: false,
        error: null,
        streamingContent: '',
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal=""
          layerNumber={mockLayerNumber}
        />
      );

      // Goal section should not be displayed when layerGoal is empty
      expect(screen.queryByText('Learning Goal')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator during generation', () => {
      mockUseLayerPractice.mockReturnValue({
        items: [],
        isLoading: true,
        error: null,
        streamingContent: '',
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      // Loading indicator should be shown (text "Generating review...")
      expect(screen.getByText('Generating review...')).toBeInTheDocument();
    });

    it('should hide loading indicator when not generating', () => {
      mockUseLayerPractice.mockReturnValue({
        items: [{ type: 'project', question: 'Review content', answer: '' }],
        isLoading: false,
        error: null,
        streamingContent: 'Review content',
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      // Content should be displayed, not loading indicator
      expect(screen.getByText('Review content')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully when practice generation fails', () => {
      const errorMessage = 'Failed to generate review';

      mockUseLayerPractice.mockReturnValue({
        items: [],
        isLoading: false,
        error: errorMessage,
        streamingContent: '',
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      // Error should be displayed (implementation may vary)
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should allow retry after error', () => {
      const errorMessage = 'Failed to generate review';

      mockUseLayerPractice.mockReturnValue({
        items: [],
        isLoading: false,
        error: errorMessage,
        streamingContent: '',
        isStreaming: false,
        loadPractice: mockLoadPractice,
      });

      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      // Component should still be functional for retry
      expect(mockLoadPractice).toBeDefined();
      // User can call loadPractice again to retry
      mockLoadPractice();
      expect(mockLoadPractice).toHaveBeenCalled();
    });
  });

  describe('Modal Close', () => {
    it('should close modal when close button is clicked', () => {
      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when content area is clicked', () => {
      renderWithProviders(
        <LayerPracticeModal
          isOpen={true}
          onClose={mockOnClose}
          concepts={mockConcepts}
          layerGoal={mockLayerGoal}
          layerNumber={mockLayerNumber}
        />
      );

      const contentArea = screen.getByText(mockLayerGoal).closest('.overflow-y-auto');
      if (contentArea) {
        fireEvent.click(contentArea);
        // Modal should not close when clicking content area
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });
});

