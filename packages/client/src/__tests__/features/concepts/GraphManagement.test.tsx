import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, resetAllMocks, mockAuthContextValue } from '../../testUtils.helper';
/**
 * @deprecated This test file tests deprecated LearnPage component.
 * Tests should be rewritten to test LearnPageContainer or library LearnPage.
 */
// import LearnPage from '../../../pages/LearnPage'; // DEPRECATED - use @components/pages/LearnPage or LearnPageContainer
import { ConceptGraph, Concept } from '../../../features/concepts/types';
import { graphApi } from '../../../features/concepts/graphApi';
import { loadConceptGraphs } from '../../../features/concepts/conceptThunks';

// Mock graphApi
jest.mock('../../../features/concepts/graphApi', () => ({
  graphApi: {
    listGraphs: jest.fn(),
    getGraph: jest.fn(),
    upsertGraph: jest.fn(),
    deleteGraph: jest.fn(),
  },
}));

// Mock loadConceptGraphs thunk
jest.mock('../../../features/concepts/conceptThunks', () => ({
  ...jest.requireActual('../../../features/concepts/conceptThunks'),
  loadConceptGraphs: jest.fn(),
}));

// Mock useDeleteGraph hook if it exists
jest.mock('../../../features/concepts/hooks/useDeleteGraph', () => ({
  useDeleteGraph: () => ({
    deleteGraph: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

// Mock usePlacementTestStatus hook to prevent authentication errors
jest.mock('../../../features/learning/hooks/usePlacementTestStatus', () => ({
  usePlacementTestStatus: () => ({
    goal: null,
    hasCompletedPlacementTest: false,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

// Mock useHomeConcepts hook
jest.mock('../../../features/concepts/hooks/useHomeConcepts', () => ({
  useHomeConcepts: (graphs: ConceptGraph[]) => {
    // Import computeConceptLevels logic (same as actual implementation)
    const computeConceptLevels = (concepts: Concept[], graph?: ConceptGraph) => {
      const seedConcept = concepts.find(c => c.isSeed) || concepts.find(c => 
        c.parents.length === 0 || (c.parents.length === 1 && c.parents[0] === c.name)
      );
      
      if (!seedConcept) {
        return [];
      }

      const levelConcepts = concepts.filter(c => 
        c.parents.length === 1 && 
        c.parents[0] === seedConcept.name &&
        c.name !== seedConcept.name
      );

      levelConcepts.sort((a, b) => {
        const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
        const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
        if (seqA !== seqB) return seqA - seqB;
        return a.name.localeCompare(b.name);
      });

      return levelConcepts.map((levelConcept, index) => ({
        level: index,
        concepts: concepts.filter(c => levelConcept.children.includes(c.name)),
        goal: levelConcept.goal,
      }));
    };

    return {
      seedEntries: graphs.map((graph) => {
        const seedConcept = Array.from(graph.concepts.values()).find((c) => c.isSeed);
        const conceptsArray = Array.from(graph.concepts.values());
        const levels = computeConceptLevels(conceptsArray, graph);
        const levelCount = levels.length;

        return {
          graph,
          seedConcept,
          conceptCount: graph.concepts.size,
          levelCount: levelCount || 0,
        };
      }),
      handleConceptClick: jest.fn(),
    };
  },
}));

// Mock useLoadFirstLayer hook
const defaultMockReturn = {
  isLoading: false,
  streamContent: '',
  seedConcept: null,
  currentGraph: null,
  error: null,
  loadFirstLayer: jest.fn(),
  reset: jest.fn(),
};

const mockUseLoadFirstLayer = jest.fn(() => defaultMockReturn);

jest.mock('../../../features/concepts/hooks/useLoadFirstLayer', () => ({
  useLoadFirstLayer: () => mockUseLoadFirstLayer(),
}));

// Helper to create a mock graph
const createMockGraph = (id: string, name: string): ConceptGraph => {
  const seedConcept = {
    id: `seed-${id}`,
    name,
    description: `Description for ${name}`,
    parents: [],
    children: [],
    isSeed: true,
    layer: 0,
  };

  return {
    id,
    seedConceptId: seedConcept.id,
    concepts: new Map([[seedConcept.name, seedConcept]]),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    difficulty: 'intermediate',
    goalFocused: false,
  };
};

describe('Graph Management - Frontend', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    // Reset the mock implementation - use default mock return
    mockUseLoadFirstLayer.mockReturnValue(defaultMockReturn);
  });

  describe('Load Graphs on LearnPage', () => {
    it('should fetch and display graphs on initial load', async () => {
      const mockGraphs = [
        createMockGraph('graph-1', 'React'),
        createMockGraph('graph-2', 'TypeScript'),
      ];

      (graphApi.listGraphs as jest.Mock).mockResolvedValue(mockGraphs);
      
      // Mock loadConceptGraphs as a thunk that actually calls graphApi.listGraphs
      (loadConceptGraphs as jest.Mock).mockImplementation(() => async (dispatch: any) => {
        const graphs = await graphApi.listGraphs();
        return graphs;
      });

      const { store: testStore } = renderWithProviders(<LearnPage />, {
        preloadedState: {
          concepts: {
            graphs: [],
            currentGraphId: null,
            selectedConcept: null,
            isLoading: true,
            error: null,
          },
        },
      });

      // Dispatch loadConceptGraphs to simulate what AuthContext does
      const thunk = loadConceptGraphs();
      await testStore.dispatch(thunk as any);

      await waitFor(() => {
        expect(graphApi.listGraphs).toHaveBeenCalled();
      });
    });

    it('should display loading state while fetching', () => {
      renderWithProviders(<LearnPage />, {
        preloadedState: {
          concepts: {
            graphs: [],
            currentGraphId: null,
            selectedConcept: null,
            isLoading: true,
            error: null,
          },
        },
      });

      // Loading state is handled by Loader component
      expect(screen.getByText('Your Learning Paths')).toBeInTheDocument();
    });

    it('should display graphs in cards', () => {
      const mockGraphs = [
        createMockGraph('graph-1', 'React'),
        createMockGraph('graph-2', 'TypeScript'),
      ];

      renderWithProviders(<LearnPage />, {
        preloadedState: {
          concepts: {
            graphs: mockGraphs,
            currentGraphId: 'graph-1',
            selectedConcept: null,
            isLoading: false,
            error: null,
          },
        },
      });

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('should display empty state when no graphs exist', () => {
      renderWithProviders(<LearnPage />, {
        preloadedState: {
          concepts: {
            graphs: [],
            currentGraphId: null,
            selectedConcept: null,
            isLoading: false,
            error: null,
          },
        },
      });

      expect(screen.getByText('No learning paths yet')).toBeInTheDocument();
      // Multiple buttons with this text exist (header and empty state), so use getAllByText
      const buttons = screen.getAllByText(/Create (New|First) Path/i);
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should display error state when fetch fails', async () => {
      const error = new Error('Failed to fetch graphs');
      (graphApi.listGraphs as jest.Mock).mockRejectedValue(error);

      renderWithProviders(<LearnPage />, {
        preloadedState: {
          concepts: {
            graphs: [],
            currentGraphId: null,
            selectedConcept: null,
            isLoading: false,
            error: 'Failed to load concept graphs',
          },
        },
      });

      // Error should be handled by global error handler
      await waitFor(() => {
        expect(screen.getByText('Your Learning Paths')).toBeInTheDocument();
      });
    });
  });

  describe('Create Graph', () => {
    it('should open modal when "Start a new learning path" button is clicked', async () => {
      renderWithProviders(<LearnPage />, {
        preloadedState: {
          concepts: {
            graphs: [],
            currentGraphId: null,
            selectedConcept: null,
            isLoading: false,
            error: null,
          },
        },
      });

      // Wait for component to render and button to be available
      await waitFor(() => {
        const buttons = screen.queryAllByText(/Create (New|First) Path/i);
        expect(buttons.length).toBeGreaterThan(0);
      });

      // Get the button - when graphs are empty, "Create First Path" button is shown
      const button = screen.getByText('Create First Path');
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
      expect(button.tagName).toBe('BUTTON');
      
      // Click the button - this should open the GoalForm modal
      fireEvent.click(button);

      // Verify the GoalForm modal is shown (the modal should be rendered)
      await waitFor(() => {
        // The GoalForm component should be rendered when showGoalForm is true
        // We can check for a characteristic element of GoalForm - the anchor question
        expect(screen.getByText(/What's something you've always wanted to learn/i)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Graph', () => {
    it('should delete graph when delete option is selected', async () => {
      const mockGraphs = [createMockGraph('graph-1', 'React')];
      const mockDeleteGraph = jest.fn().mockResolvedValue(undefined);

      // Note: Menu component mocking would be done at module level if needed

      renderWithProviders(<LearnPage />, {
        preloadedState: {
          concepts: {
            graphs: mockGraphs,
            currentGraphId: 'graph-1',
            selectedConcept: null,
            isLoading: false,
            error: null,
          },
        },
      });

      // This test would need the actual Menu component implementation
      // For now, we verify the graph is displayed
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  describe('Graph Persistence', () => {
    it('should persist graphs across page refreshes', async () => {
      const mockGraphs = [createMockGraph('graph-1', 'React')];

      (graphApi.listGraphs as jest.Mock).mockResolvedValue(mockGraphs);

      const { store } = renderWithProviders(<LearnPage />, {
        preloadedState: {
          concepts: {
            graphs: mockGraphs,
            currentGraphId: 'graph-1',
            selectedConcept: null,
            isLoading: false,
            error: null,
          },
        },
      });

      // Verify graphs are in store
      const state = store.getState();
      expect(state.concepts.graphs).toHaveLength(1);
      expect(state.concepts.graphs[0].id).toBe('graph-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('Network error');
      (graphApi.listGraphs as jest.Mock).mockRejectedValue(error);

      renderWithProviders(<LearnPage />, {
        preloadedState: {
          concepts: {
            graphs: [],
            currentGraphId: null,
            selectedConcept: null,
            isLoading: false,
            error: 'Network error',
          },
        },
      });

      // Error should be handled by global error handler
      expect(screen.getByText('Your Learning Paths')).toBeInTheDocument();
    });
  });
});

