/**
 * Tests for MentorFirstLayerLoader Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MentorFirstLayerLoader from '../../../../features/mentor/components/MentorFirstLayerLoader';
import { useExplainConcept } from '../../../../features/knowledge-graph/hooks/useExplainConcept';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import graphOperationSlice from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import type { NodeBasedKnowledgeGraph, GraphNode } from '../../../../features/knowledge-graph/types';

// Mock the explainConcept hook
jest.mock('../../../../features/knowledge-graph/hooks/useExplainConcept');

const mockUseExplainConcept = useExplainConcept as jest.MockedFunction<typeof useExplainConcept>;
const mockExplain = jest.fn();

describe('MentorFirstLayerLoader', () => {
  const mockGraphId = 'graph-1';
  const mockSeedConcept: GraphNode = {
    id: 'seed-1',
    type: 'Concept',
    properties: {
      name: 'React Basics',
      description: 'Introduction to React',
      layer: 1,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockGraph: NodeBasedKnowledgeGraph = {
    id: mockGraphId,
    seedConceptId: 'seed-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: {
      'seed-1': mockSeedConcept,
    },
    relationships: [],
    nodeTypes: {
      Graph: [mockGraphId],
      Concept: ['seed-1'],
      Layer: [],
      LearningGoal: [],
      Milestone: [],
      PracticeExercise: [],
      Lesson: [],
      ConceptMetadata: [],
      GraphMetadata: [],
      FlashCard: [],
    },
  };

  const createStore = () => {
    return configureStore({
      reducer: {
        knowledgeGraphs: knowledgeGraphSlice,
        graphOperations: graphOperationSlice,
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExplainConcept.mockReturnValue({
      explain: mockExplain,
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
    mockExplain.mockResolvedValue({
      mutations: { mutations: [], metadata: {} },
      content: { lesson: 'Test lesson content' },
      graph: mockGraph,
    });
  });

  it('renders loading UI with seed concept', () => {
    render(
      <Provider store={createStore()}>
        <MentorFirstLayerLoader
          graphId={mockGraphId}
          graph={mockGraph}
          streamContent=""
          isLoading={true}
        />
      </Provider>
    );

    expect(screen.getByText('Creating Your Learning Path')).toBeInTheDocument();
  });

  it('displays streaming concepts when streamContent is provided', async () => {
    const streamContent = `
      <concept>Variables</concept>
      <description>Understanding variables in programming</description>
      <parents>Basics</parents>
      <concept>Functions</concept>
      <description>Understanding functions</description>
      <parents>Variables</parents>
    `;

    render(
      <Provider store={createStore()}>
        <MentorFirstLayerLoader
          graphId={mockGraphId}
          graph={mockGraph}
          streamContent={streamContent}
          isLoading={false}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Concepts Being Generated')).toBeInTheDocument();
    });

    // Check for concept names in headings (more specific)
    expect(screen.getByRole('heading', { name: /Variables/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Functions/i })).toBeInTheDocument();
  });

  it('extracts and displays learning goal from stream content', async () => {
    const streamContent = `
      <goal>Master React fundamentals and build interactive UIs</goal>
      <concept>React</concept>
    `;

    render(
      <Provider store={createStore()}>
        <MentorFirstLayerLoader
          graphId={mockGraphId}
          graph={mockGraph}
          streamContent={streamContent}
          isLoading={false}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Learning Goal')).toBeInTheDocument();
    });

    expect(screen.getByText(/Master React fundamentals/)).toBeInTheDocument();
  });

  it('generates lesson for seed concept on mount', async () => {
    render(
      <Provider store={createStore()}>
        <MentorFirstLayerLoader
          graphId={mockGraphId}
          graph={mockGraph}
          streamContent=""
          isLoading={false}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(mockExplain).toHaveBeenCalledWith(
        { targetNodeId: 'seed-1' },
        expect.objectContaining({
          stream: true,
          onChunk: expect.any(Function),
          onDone: expect.any(Function),
        })
      );
    });
  });

  it('shows close button when both concepts and lesson are complete', async () => {
    const streamContent = `
      <concept>Variables</concept>
      <description>Understanding variables</description>
      <parents></parents>
    `;

    // Mock lesson generation to complete
    let onChunkCallback: ((chunk: string) => void) | undefined;
    let onDoneCallback: (() => void) | undefined;

    mockExplain.mockImplementation((request, options) => {
      onChunkCallback = options?.onChunk;
      onDoneCallback = options?.onDone;
      // Simulate lesson streaming
      setTimeout(() => {
        onChunkCallback?.('Lesson content');
        onDoneCallback?.();
      }, 0);
      return Promise.resolve({
        mutations: { mutations: [], metadata: {} },
        content: { lesson: 'Lesson content' },
        graph: mockGraph,
      });
    });

    render(
      <Provider store={createStore()}>
        <MentorFirstLayerLoader
          graphId={mockGraphId}
          graph={mockGraph}
          streamContent={streamContent}
          isLoading={false}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('View Your Learning Path')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('calls onComplete when both lesson and concepts are done', async () => {
    const onComplete = jest.fn();
    const streamContent = `
      <concept>Variables</concept>
      <description>Understanding variables</description>
      <parents></parents>
    `;

    // Mock lesson generation to complete immediately
    mockExplain.mockImplementation((request, options) => {
      setTimeout(() => {
        options?.onChunk?.('Lesson content');
        options?.onDone?.();
      }, 0);
      return Promise.resolve({
        mutations: { mutations: [], metadata: {} },
        content: { lesson: 'Lesson content' },
        graph: mockGraph,
      });
    });

    render(
      <Provider store={createStore()}>
        <MentorFirstLayerLoader
          graphId={mockGraphId}
          graph={mockGraph}
          streamContent={streamContent}
          isLoading={false}
          onComplete={onComplete}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('handles graph without seedConceptId by using first concept', () => {
    const graphWithoutSeed: NodeBasedKnowledgeGraph = {
      ...mockGraph,
      seedConceptId: '',
    };

    render(
      <Provider store={createStore()}>
        <MentorFirstLayerLoader
          graphId={mockGraphId}
          graph={graphWithoutSeed}
          streamContent=""
          isLoading={false}
        />
      </Provider>
    );

    // Should still generate lesson for first concept
    expect(mockExplain).toHaveBeenCalledWith(
      { targetNodeId: 'seed-1' },
      expect.any(Object)
    );
  });

  it('displays prerequisites for concepts', async () => {
    const streamContent = `
      <concept>Advanced React</concept>
      <description>Advanced React patterns</description>
      <parents>React Basics, Hooks</parents>
    `;

    render(
      <Provider store={createStore()}>
        <MentorFirstLayerLoader
          graphId={mockGraphId}
          graph={mockGraph}
          streamContent={streamContent}
          isLoading={false}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prerequisites:')).toBeInTheDocument();
    });

    // Check for prerequisites in the badges (use getAllByText since they might appear multiple times)
    const reactBasics = screen.getAllByText('React Basics');
    const hooks = screen.getAllByText('Hooks');
    expect(reactBasics.length).toBeGreaterThan(0);
    expect(hooks.length).toBeGreaterThan(0);
  });
});

