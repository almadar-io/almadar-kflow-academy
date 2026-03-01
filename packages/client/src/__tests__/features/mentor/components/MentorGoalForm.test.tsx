/**
 * Tests for MentorGoalForm Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MentorGoalForm } from '../../../../features/mentor/components/MentorGoalForm';
import { useGenerateGoals } from '../../../../features/knowledge-graph/hooks/useGenerateGoals';
import { useSaveGraph } from '../../../../features/knowledge-graph/hooks/useKnowledgeGraphRest';
import { useProgressiveExpand } from '../../../../features/knowledge-graph/hooks/useProgressiveExpand';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import graphOperationSlice from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import { mutationMiddleware } from '../../../../features/knowledge-graph/redux/mutationMiddleware';
import type { NodeBasedKnowledgeGraph } from '../../../../features/knowledge-graph/types';

// Mock the hooks
jest.mock('../../../../features/knowledge-graph/hooks/useGenerateGoals');
jest.mock('../../../../features/knowledge-graph/hooks/useKnowledgeGraphRest');
jest.mock('../../../../features/knowledge-graph/hooks/useProgressiveExpand');
jest.mock('../../../../features/mentor/components/MentorFirstLayerLoader', () => ({
  __esModule: true,
  default: ({ onComplete, isLoading }: { onComplete?: () => void; isLoading: boolean }) => (
    <div data-testid="mentor-first-layer-loader">
      {isLoading ? 'Loading first layer...' : 'First layer complete'}
      {!isLoading && onComplete && (
        <button onClick={onComplete}>Complete</button>
      )}
    </div>
  ),
}));
jest.mock('../../../../features/learning/goalApi', () => ({
  generateGoalQuestions: jest.fn().mockResolvedValue({
    questions: [
      {
        id: 'q1',
        question: 'Test question?',
        type: 'multiple_choice' as const,
        options: ['Option 1', 'Option 2'],
        allowOther: false,
        allowSkip: true,
      },
    ],
  }),
}));

const mockUseGenerateGoals = useGenerateGoals as jest.MockedFunction<typeof useGenerateGoals>;
const mockUseSaveGraph = useSaveGraph as jest.MockedFunction<typeof useSaveGraph>;
const mockUseProgressiveExpand = useProgressiveExpand as jest.MockedFunction<typeof useProgressiveExpand>;

const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      knowledgeGraphs: knowledgeGraphSlice,
      graphOperations: graphOperationSlice,
    },
    // Omit mutationMiddleware in tests - it expects full app state structure
    middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
    preloadedState,
  });
};

const renderWithProviders = (ui: React.ReactElement, store = createTestStore()) => {
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('MentorGoalForm', () => {
  // Increase timeout for async operations
  jest.setTimeout(10000);

  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();
  const mockGenerate = jest.fn();
  const mockSaveGraph = jest.fn();
  const mockExpand = jest.fn();

  const createMockGraph = (id: string): NodeBasedKnowledgeGraph => ({
    id,
    seedConceptId: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: {},
    relationships: [],
    nodeTypes: {
      Graph: [],
      Concept: [],
      Layer: [],
      LearningGoal: [],
      Milestone: [],
      PracticeExercise: [],
      Lesson: [],
      ConceptMetadata: [],
      GraphMetadata: [],
      FlashCard: [],
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSaveGraph.mockReturnValue({
      saveGraph: mockSaveGraph,
      loading: false,
      error: null,
    });

    mockUseGenerateGoals.mockReturnValue({
      generate: mockGenerate,
      isLoading: false,
      error: null,
      streaming: {
        isStreaming: false,
        operation: null,
        graphId: null,
        accumulatedMutations: [],
        content: '',
      },
    });

    mockUseProgressiveExpand.mockReturnValue({
      expand: mockExpand,
      isLoading: false,
      error: null,
      streaming: {
        isStreaming: false,
        operation: null,
        graphId: null,
        accumulatedMutations: [],
        content: '',
      },
    });

    mockSaveGraph.mockImplementation(async (graphId: string, graph: NodeBasedKnowledgeGraph) => {
      return { ...graph, id: graphId };
    });

    // Mock generate to call onDone callback when streaming
    mockGenerate.mockImplementation(async (request, options) => {
      const graphId = options?.graphId || 'graph-1';
      const seedConceptId = 'seed-1';
      const mockGraphWithGoal = {
        ...createMockGraph(graphId),
        id: graphId,
        seedConceptId, // Add seed concept ID
        nodes: {
          [seedConceptId]: {
            id: seedConceptId,
            type: 'Concept',
            properties: {
              name: 'Seed Concept',
              description: 'Seed concept description',
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          'goal-1': {
            id: 'goal-1',
            type: 'LearningGoal',
            properties: {
              title: 'Test Goal',
              description: 'Test Description',
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        nodeTypes: {
          ...createMockGraph(graphId).nodeTypes,
          Concept: [seedConceptId],
          LearningGoal: ['goal-1'],
        },
      };

      const mockResult = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'generateGoals',
            timestamp: Date.now(),
          },
        },
        content: {
          goal: {
            id: 'goal-1',
            title: 'Test Goal',
            description: 'Test Description',
          },
        },
        graph: mockGraphWithGoal,
        errors: [],
      };

      if (options?.stream && options?.onDone) {
        // Simulate streaming chunks
        if (options.onChunk) {
          options.onChunk('Generating ');
          options.onChunk('goal...');
        }
        // Call onDone asynchronously to match real behavior
        Promise.resolve().then(() => {
          options.onDone?.(mockResult);
        });
        return mockResult;
      }
      // Non-streaming mode
      return mockResult;
    });
  });

  it('should render anchor step initially', () => {
    renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    expect(screen.getByText(/What would you like to learn/i)).toBeInTheDocument();
  });

  it('should navigate to choice step after anchor submission', () => {
    renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    const input = screen.getByLabelText('Your learning goal');
    fireEvent.change(input, { target: { value: 'Learn React' } });

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/How would you like to create your learning goal/i)).toBeInTheDocument();
  });

  it('should navigate to questions step when form option is selected', async () => {
    renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Fill anchor and submit
    const input = screen.getByLabelText('Your learning goal');
    fireEvent.change(input, { target: { value: 'Learn React' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Select form option
    const formButton = screen.getByText(/Guided Form/i).closest('button');
    fireEvent.click(formButton!);

    // Verify that we've navigated away from the choice step
    // The questions step should be loading or showing questions
    await waitFor(() => {
      // Check that we're no longer on the choice step
      expect(screen.queryByText(/How would you like to create your learning goal/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should create graph and generate goal when manual option is selected', async () => {
    const testGraphId = 'test-graph-id-123';
    
    mockSaveGraph.mockImplementation(async (graphId: string, graph: NodeBasedKnowledgeGraph) => {
      return { ...graph, id: graphId };
    });

    renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Fill anchor and submit
    const input = screen.getByLabelText('Your learning goal');
    fireEvent.change(input, { target: { value: 'Learn React' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Select manual option
    const manualButton = screen.getByText(/Manual Entry/i).closest('button');
    fireEvent.click(manualButton!);

    await waitFor(() => {
      expect(mockSaveGraph).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalled();
    });

    // Verify generate was called with the correct request
    const generateCall = mockGenerate.mock.calls[0];
    expect(generateCall[0]).toEqual({
      anchorAnswer: 'Learn React',
      questionAnswers: [],
    });
  });

  it('should pass the newly created graphId to generate function when using manual entry', async () => {
    const testGraphId = 'newly-created-graph-id';
    
    // Mock saveGraph to return a specific graphId
    mockSaveGraph.mockImplementation(async (graphId: string, graph: NodeBasedKnowledgeGraph) => {
      // The graphId passed to saveGraph is the UUID generated in createEmptyGraph
      // We'll capture it and use it for verification
      return { ...graph, id: graphId };
    });

    renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Fill anchor and submit
    const input = screen.getByLabelText('Your learning goal');
    fireEvent.change(input, { target: { value: 'Learn TypeScript' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Select manual option
    const manualButton = screen.getByText(/Manual Entry/i).closest('button');
    fireEvent.click(manualButton!);

    await waitFor(() => {
      expect(mockSaveGraph).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalled();
    });

    // Verify that generate was called with graphId in options
    const generateCall = mockGenerate.mock.calls[0];
    const options = generateCall[1];
    
    // The graphId should be passed in options.graphId
    expect(options).toHaveProperty('graphId');
    expect(options.graphId).toBeTruthy();
    expect(options.graphId).not.toBe('');
    
    // Verify the graphId matches the one from saveGraph
    const saveGraphCall = mockSaveGraph.mock.calls[0];
    const savedGraphId = saveGraphCall[0]; // First argument is graphId
    expect(options.graphId).toBe(savedGraphId);
  });

  it('should call onCancel when cancel is clicked', () => {
    renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockSaveGraph.mockRejectedValueOnce(new Error('Failed to create graph'));

    renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Fill anchor and submit
    const input = screen.getByLabelText('Your learning goal');
    fireEvent.change(input, { target: { value: 'Learn React' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Select manual option
    const manualButton = screen.getByText(/Manual Entry/i).closest('button');
    fireEvent.click(manualButton!);

    await waitFor(() => {
      expect(screen.getByText(/Failed to create graph/i)).toBeInTheDocument();
    });
  });

  it('should not call generate with empty graphId when graph creation succeeds', async () => {
    renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Fill anchor and submit
    const input = screen.getByLabelText('Your learning goal');
    fireEvent.change(input, { target: { value: 'Learn Angular' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Select manual option
    const manualButton = screen.getByText(/Manual Entry/i).closest('button');
    fireEvent.click(manualButton!);

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalled();
    });

    // Verify generate was NOT called with empty graphId
    const generateCall = mockGenerate.mock.calls[0];
    const options = generateCall[1];
    
    expect(options.graphId).toBeTruthy();
    expect(options.graphId).not.toBe('');
    expect(options.graphId).not.toBeNull();
  });

  describe('First Layer Generation', () => {
    const createMockGraphWithSeed = (id: string, seedConceptId: string = 'seed-1'): NodeBasedKnowledgeGraph => ({
      ...createMockGraph(id),
      seedConceptId,
      nodes: {
        [seedConceptId]: {
          id: seedConceptId,
          type: 'Concept',
          properties: { name: 'Seed Concept' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        'goal-1': {
          id: 'goal-1',
          type: 'LearningGoal',
          properties: {
            title: 'Test Goal',
            description: 'Test Description',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
      nodeTypes: {
        ...createMockGraph(id).nodeTypes,
        Concept: [seedConceptId],
        LearningGoal: ['goal-1'],
      },
    });

    beforeEach(() => {
      // Mock expand to simulate streaming
      mockExpand.mockImplementation(async (request, options) => {
        if (options?.stream && options?.onDone) {
          const mockResult = {
            mutations: {
              mutations: [],
              metadata: {
                operation: 'progressiveExpand',
                timestamp: Date.now(),
              },
            },
            content: {
              narrative: 'First layer generated',
              concepts: [
                { name: 'Concept 1', description: 'Description 1', parents: [] },
                { name: 'Concept 2', description: 'Description 2', parents: [] },
              ],
            },
            graph: createMockGraphWithSeed('graph-1'),
            errors: [],
          };
          // Simulate streaming chunks
          if (options.onChunk) {
            options.onChunk('<concept>Concept 1</concept>');
            options.onChunk('<concept>Concept 2</concept>');
          }
          // Call onDone asynchronously to match real behavior
          setTimeout(() => {
            options.onDone?.(mockResult);
          }, 10);
          return mockResult;
        }
        return {
          mutations: { mutations: [], metadata: {} },
          content: { narrative: '', concepts: [] },
          graph: createMockGraphWithSeed('graph-1'),
          errors: [],
        };
      });
    });

    it('should trigger first layer generation when review is completed', async () => {
      const store = createTestStore({
        knowledgeGraphs: {
          graphs: {
            'graph-1': createMockGraphWithSeed('graph-1'),
          },
          currentGraphId: 'graph-1',
          isLoading: false,
        },
      });

      renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />, store);

      // Fill anchor and submit
      const input = screen.getByLabelText('Your learning goal');
      fireEvent.change(input, { target: { value: 'Learn React' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Select manual option
      const manualButton = screen.getByText(/Manual Entry/i).closest('button');
      fireEvent.click(manualButton!);

      // Wait for goal generation to complete - check that graph is in Redux
      await waitFor(() => {
        const state = store.getState();
        const graphs = state.knowledgeGraphs.graphs;
        const graphIds = Object.keys(graphs);
        expect(graphIds.length).toBeGreaterThan(0);
        // Check that the graph has a goal node
        const graph = graphs[graphIds[0]];
        expect(graph?.nodeTypes?.LearningGoal?.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Wait for review step to appear
      await waitFor(() => {
        expect(screen.getByText(/Your Learning Goal is Ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Click complete on review step
      const completeButton = screen.getByRole('button', { name: /complete|confirm/i });
      fireEvent.click(completeButton);

      // Should trigger first layer generation
      await waitFor(() => {
        expect(mockExpand).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify expand was called with correct parameters
      const expandCall = mockExpand.mock.calls[0];
      expect(expandCall[0]).toEqual({ numConcepts: 10 });
      expect(expandCall[1]).toMatchObject({
        stream: true,
        onChunk: expect.any(Function),
        onDone: expect.any(Function),
      });
    });

    it('should show MentorFirstLayerLoader during first layer generation', async () => {
      const store = createTestStore();

      renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />, store);

      // Fill anchor and submit
      const input = screen.getByLabelText('Your learning goal');
      fireEvent.change(input, { target: { value: 'Learn React' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Select manual option
      const manualButton = screen.getByText(/Manual Entry/i).closest('button');
      fireEvent.click(manualButton!);

      // Wait for goal generation to complete - check that graph is in Redux
      await waitFor(() => {
        const state = store.getState();
        const graphs = state.knowledgeGraphs.graphs;
        const graphIds = Object.keys(graphs);
        expect(graphIds.length).toBeGreaterThan(0);
        // Check that the graph has a goal node
        const graph = graphs[graphIds[0]];
        expect(graph?.nodeTypes?.LearningGoal?.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Wait for review step to appear
      await waitFor(() => {
        expect(screen.getByText(/Your Learning Goal is Ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Get the graphId that was created and update store
      const state = store.getState();
      const graphIds = Object.keys(state.knowledgeGraphs.graphs);
      const createdGraphId = graphIds[0];
      store.dispatch({
        type: 'knowledgeGraphs/setGraph',
        payload: createMockGraphWithSeed(createdGraphId),
      });

      // Click complete
      const completeButton = screen.getByRole('button', { name: /complete|confirm/i });
      fireEvent.click(completeButton);

      // Should show MentorFirstLayerLoader
      await waitFor(() => {
        expect(screen.getByTestId('mentor-first-layer-loader')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should call onComplete after first layer generation completes', async () => {
      const store = createTestStore();

      renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />, store);

      // Fill anchor and submit
      const input = screen.getByLabelText('Your learning goal');
      fireEvent.change(input, { target: { value: 'Learn React' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Select manual option
      const manualButton = screen.getByText(/Manual Entry/i).closest('button');
      fireEvent.click(manualButton!);

      // Wait for goal generation to complete - check that graph is in Redux
      await waitFor(() => {
        const state = store.getState();
        const graphs = state.knowledgeGraphs.graphs;
        const graphIds = Object.keys(graphs);
        expect(graphIds.length).toBeGreaterThan(0);
        // Check that the graph has a goal node
        const graph = graphs[graphIds[0]];
        expect(graph?.nodeTypes?.LearningGoal?.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Wait for review step to appear
      await waitFor(() => {
        expect(screen.getByText(/Your Learning Goal is Ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Get the graphId that was created and update store
      const state = store.getState();
      const graphIds = Object.keys(state.knowledgeGraphs.graphs);
      const createdGraphId = graphIds[0];
      store.dispatch({
        type: 'knowledgeGraphs/setGraph',
        payload: createMockGraphWithSeed(createdGraphId),
      });

      // Click complete
      const completeButton = screen.getByRole('button', { name: /complete|confirm/i });
      fireEvent.click(completeButton);

      // Wait for first layer loader
      await waitFor(() => {
        expect(screen.getByTestId('mentor-first-layer-loader')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Wait for first layer to complete (expand mock calls onDone)
      await waitFor(() => {
        expect(screen.getByText('First layer complete')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Click complete button in MentorFirstLayerLoader
      const layerCompleteButton = screen.getByRole('button', { name: /complete/i });
      fireEvent.click(layerCompleteButton);

      // Should call onComplete with goal and graph info
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      }, { timeout: 5000 });
    });

    it('should handle errors during first layer generation', async () => {
      const store = createTestStore();

      mockExpand.mockRejectedValueOnce(new Error('Failed to expand'));

      renderWithProviders(<MentorGoalForm onComplete={mockOnComplete} onCancel={mockOnCancel} />, store);

      // Fill anchor and submit
      const input = screen.getByLabelText('Your learning goal');
      fireEvent.change(input, { target: { value: 'Learn React' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Select manual option
      const manualButton = screen.getByText(/Manual Entry/i).closest('button');
      fireEvent.click(manualButton!);

      // Wait for goal generation to complete - check that graph is in Redux
      await waitFor(() => {
        const state = store.getState();
        const graphs = state.knowledgeGraphs.graphs;
        const graphIds = Object.keys(graphs);
        expect(graphIds.length).toBeGreaterThan(0);
        // Check that the graph has a goal node
        const graph = graphs[graphIds[0]];
        expect(graph?.nodeTypes?.LearningGoal?.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Wait for review step to appear
      await waitFor(() => {
        expect(screen.getByText(/Your Learning Goal is Ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Get the graphId that was created and update store
      const state = store.getState();
      const graphIds = Object.keys(state.knowledgeGraphs.graphs);
      const createdGraphId = graphIds[0];
      store.dispatch({
        type: 'knowledgeGraphs/setGraph',
        payload: createMockGraphWithSeed(createdGraphId),
      });

      // Click complete
      const completeButton = screen.getByRole('button', { name: /complete|confirm/i });
      fireEvent.click(completeButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to expand/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});

