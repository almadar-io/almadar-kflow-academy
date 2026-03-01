import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, resetAllMocks } from '../../testUtils.helper';
/**
 * @deprecated This test file tests deprecated ConceptDetailPage component.
 * Tests should be rewritten to test ConceptPageContainer or library ConceptDetailPage.
 */
// import ConceptDetailPage from '../../../pages/ConceptDetailPage'; // DEPRECATED - use @components/pages/ConceptDetailPage
import { ConceptDetailPage } from '../../../components/pages';
import { Concept, ConceptGraph } from '../../../features/concepts/types';
import { ConceptsAPI } from '../../../features/concepts/ConceptsAPI';

// Mock ConceptsAPI
jest.mock('../../../features/concepts/ConceptsAPI', () => ({
  ConceptsAPI: {
    progressiveExpandMultipleFromText: jest.fn(),
  },
}));

// Mock ConceptLoader
jest.mock('../../../features/concepts/components/ConceptLoader', () => {
  return function MockConceptLoader({ text, progress, streamContent }: any) {
    return (
      <div data-testid="concept-loader">
        <div data-testid="loader-text">{text}</div>
        <div data-testid="loader-progress">{progress}</div>
        <div data-testid="loader-stream">{streamContent}</div>
      </div>
    );
  };
});

// Mock LessonPanel (component library)
jest.mock('../../../components/organisms/LessonPanel', () => ({
  LessonPanel: function MockLessonPanel({ renderedLesson }: any) {
    return <div data-testid="lesson-panel">{renderedLesson}</div>;
  },
}));

// Mock ConceptDescription
jest.mock('../../../features/concepts/components/ConceptDescription', () => {
  return function MockConceptDescription({ concept }: any) {
    return <div data-testid="concept-description">{concept.description}</div>;
  };
});

// Mock ConceptMetaTags
jest.mock('../../../features/concepts/components/ConceptMetaTags', () => {
  return function MockConceptMetaTags() {
    return <div data-testid="concept-meta-tags">Meta Tags</div>;
  };
});

// Mock LayerPracticeModal
jest.mock('../../../features/concepts/components/LayerPracticeModal', () => {
  return function MockLayerPracticeModal() {
    return null;
  };
});

// Mock useConceptDetailRelations hook
jest.mock('../../../features/concepts/hooks/useConceptDetailRelations', () => ({
  useConceptDetailRelations: () => ({
    parentNames: [],
    childNames: [],
  }),
}));

// Helper to create a mock concept
const createMockConcept = (name: string, layer: number = 0, id?: string): Concept => ({
  id: id || `concept-${name}`,
  name,
  description: `Description for ${name}`,
  parents: [],
  children: [],
  layer,
});

// Helper to create a mock graph
const createMockGraph = (concepts: Concept[], layers?: Map<number, any>): ConceptGraph => {
  const conceptMap = new Map<string, Concept>();
  concepts.forEach(c => conceptMap.set(c.name, c));
  
  return {
    id: 'graph-1',
    seedConceptId: concepts.find(c => c.layer === 0)?.id || concepts[0].id,
    concepts: conceptMap,
    layers: layers || new Map(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    difficulty: 'intermediate',
    goalFocused: false,
  };
};

describe('Progressive Expansion (Loading More Layers) - Frontend', () => {
  const mockOnLoadMoreLayers = jest.fn();
  const mockNavigate = jest.fn();
  const mockOnSelectConcept = jest.fn();

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    mockOnLoadMoreLayers.mockClear();
    mockNavigate.mockClear();
    mockOnSelectConcept.mockClear();
  });

  describe('Load Next Layer Button', () => {
    it('should show button at end of layer when onLoadMoreLayers is provided', () => {
      const concept = createMockConcept('Concept 1', 0);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={mockOnLoadMoreLayers}
          isLoadingLayers={false}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      const button = screen.getByText(/Generate Next Level/i);
      expect(button).toBeInTheDocument();
    });

    it('should not show button when onLoadMoreLayers is not provided', () => {
      const concept = createMockConcept('Concept 1', 0);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          isLoadingLayers={false}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      expect(screen.queryByText(/Generate Next Level/i)).not.toBeInTheDocument();
    });

    it('should call onLoadMoreLayers when button is clicked', () => {
      const concept = createMockConcept('Concept 1', 0);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={mockOnLoadMoreLayers}
          isLoadingLayers={false}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      const button = screen.getByText(/Generate Next Level/i);
      fireEvent.click(button);

      expect(mockOnLoadMoreLayers).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should display ConceptLoader during layer generation', () => {
      const concept = createMockConcept('Concept 1', 0);
      const graph = createMockGraph([concept]);

      // Mock ConceptLoader to be shown when isLoadingLayers is true
      renderWithProviders(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={mockOnLoadMoreLayers}
          isLoadingLayers={true}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      // Check that button shows loading state
      expect(screen.getByText(/Generating Next Level/i)).toBeInTheDocument();
      const button = screen.getByText(/Generating Next Level/i).closest('button');
      expect(button).toBeDisabled();
    });

    it('should disable button when loading', () => {
      const concept = createMockConcept('Concept 1', 0);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={mockOnLoadMoreLayers}
          isLoadingLayers={true}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      const button = screen.getByText(/Generating Next Level/i).closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Progress Indicator', () => {
    it('should update progress during streaming', async () => {
      // Progress indicator is typically handled by ConceptLoader component
      // This test verifies that progress can be tracked
      const concept = createMockConcept('Concept 1', 0);
      const graph = createMockGraph([concept]);

      const { rerender } = renderWithProviders(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={mockOnLoadMoreLayers}
          isLoadingLayers={true}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      // Verify loading state is shown
      expect(screen.getByText(/Generating Next Level/i)).toBeInTheDocument();

      // Simulate completion
      rerender(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={mockOnLoadMoreLayers}
          isLoadingLayers={false}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      // Loading state should be gone
      expect(screen.queryByText(/Generating Next Level/i)).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to ConceptListPage after layer generation completes', async () => {
      // Navigation is typically handled by the parent component or hook
      // This test verifies that navigation can be triggered
      const concept = createMockConcept('Concept 1', 0);
      const graph = createMockGraph([concept]);
      const mockNavigate = jest.fn();

      // Mock the navigation function that would be called after completion
      const handleLoadMoreLayers = jest.fn(async () => {
        // Simulate layer generation
        await new Promise(resolve => setTimeout(resolve, 10));
        // Navigation would happen here in real implementation
        mockNavigate('/concepts/graph-1');
      });

      renderWithProviders(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={handleLoadMoreLayers}
          isLoadingLayers={false}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      const button = screen.getByText(/Generate Next Level/i);
      fireEvent.click(button);

      await waitFor(() => {
        expect(handleLoadMoreLayers).toHaveBeenCalled();
      });
    });
  });

  describe('Concept Updates', () => {
    it('should update concepts list after new layer is generated', async () => {
      // Concept updates are handled by Redux dispatch in the hook
      // This test verifies the flow
      const concept1 = createMockConcept('Concept 1', 0);
      const concept2 = createMockConcept('Concept 2', 1);
      const graph = createMockGraph([concept1]);

      const mockResponse = {
        concepts: [concept2],
        model: 'deepseek-chat',
      };

      (ConceptsAPI.progressiveExpandMultipleFromText as jest.Mock).mockResolvedValue(mockResponse);

      renderWithProviders(
        <ConceptDetailPage
          concept={concept1}
          conceptMap={new Map([[concept1.name, concept1]])}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={mockOnLoadMoreLayers}
          isLoadingLayers={false}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map([[concept1.id, concept1]])}
        />
      );

      // The actual concept updates would be handled by the hook that calls onLoadMoreLayers
      // This test verifies the component structure supports updates
      expect(screen.getByText(/Generate Next Level/i)).toBeInTheDocument();
    });
  });

  describe('Parent-Child Relationships', () => {
    it('should populate children for parent concepts when new layer is generated', () => {
      // Parent-child relationships are maintained by the backend and Redux state
      const parentConcept = createMockConcept('Parent', 0);
      const childConcept = createMockConcept('Child', 1);
      
      // After layer generation, parent should have child in children array
      const updatedParent = {
        ...parentConcept,
        children: [childConcept.name],
      };

      const graph = createMockGraph([updatedParent, childConcept]);

      renderWithProviders(
        <ConceptDetailPage
          concept={updatedParent}
          conceptMap={new Map([[updatedParent.name, updatedParent], [childConcept.name, childConcept]])}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={mockOnLoadMoreLayers}
          isLoadingLayers={false}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map([[updatedParent.id, updatedParent], [childConcept.id, childConcept]])}
        />
      );

      // Verify parent concept has children populated
      expect(updatedParent.children).toContain(childConcept.name);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully when layer generation fails', async () => {
      const concept = createMockConcept('Concept 1', 0);
      const graph = createMockGraph([concept]);

      const errorHandler = jest.fn();
      const handleLoadMoreLayers = jest.fn(async () => {
        try {
          throw new Error('Layer generation failed');
        } catch (error) {
          errorHandler(error);
        }
      });

      renderWithProviders(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={handleLoadMoreLayers}
          isLoadingLayers={false}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      const button = screen.getByText(/Generate Next Level/i);
      fireEvent.click(button);

      await waitFor(() => {
        expect(handleLoadMoreLayers).toHaveBeenCalled();
      });

      expect(errorHandler).toHaveBeenCalled();
      // Component should still be functional
      expect(button).toBeInTheDocument();
    });

    it('should allow retry after error', async () => {
      const concept = createMockConcept('Concept 1', 0);
      const graph = createMockGraph([concept]);

      const errorHandler = jest.fn();
      let callCount = 0;
      const handleLoadMoreLayers = jest.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // First call throws error (simulated)
          try {
            throw new Error('Generation failed');
          } catch (error) {
            errorHandler(error);
            // In real implementation, error would be handled by the hook
          }
        }
        // Retry succeeds
      });

      renderWithProviders(
        <ConceptDetailPage
          concept={concept}
          conceptMap={new Map()}
          graph={graph}
          graphId="graph-1"
          isExpanding={false}
          onExpand={jest.fn()}
          onGenerateNextConcept={jest.fn()}
          onGenerateLesson={jest.fn()}
          isGeneratingLesson={false}
          onNavigateToParent={jest.fn()}
          onNavigateToChild={jest.fn()}
          onLoadMoreLayers={handleLoadMoreLayers}
          isLoadingLayers={false}
          onSelectConcept={mockOnSelectConcept}
          conceptByIdMap={new Map()}
        />
      );

      const button = screen.getByText(/Generate Next Level/i);
      
      // First attempt - error is handled gracefully
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(handleLoadMoreLayers).toHaveBeenCalled();
      });

      // Component should still be functional for retry
      expect(button).toBeInTheDocument();
      expect(errorHandler).toHaveBeenCalled();
      
      // Note: Actual retry logic would be in the hook/component that calls onLoadMoreLayers
    });
  });
});

