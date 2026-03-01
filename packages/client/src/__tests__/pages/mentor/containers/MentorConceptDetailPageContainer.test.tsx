/**
 * Tests for MentorConceptDetailPageContainer
 * Phase 3: Tests for container component that handles data fetching and operations
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '../../../../contexts/ThemeContext';
import { AlertProvider } from '../../../../contexts/AlertContext';
import { MentorConceptDetailPageContainer } from '../../../../features/mentor/containers';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import graphOperationSlice from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import type { ConceptDetail } from '../../../../features/knowledge-graph/api/types';
import type { Concept } from '../../../../features/concepts/types';

// Mock the hooks
jest.mock('../../../../features/knowledge-graph/hooks/useConceptDetail');
jest.mock('../../../../features/knowledge-graph/hooks', () => ({
  ...jest.requireActual('../../../../features/knowledge-graph/hooks'),
  useGetGraph: jest.fn(),
}));
jest.mock('../../../../features/knowledge-graph/hooks/useExplainConcept');
jest.mock('../../../../features/knowledge-graph/hooks/useAnswerQuestion');
jest.mock('../../../../features/knowledge-graph/hooks/useCustomOperation');
jest.mock('../../../../pages/mentor/MentorConceptDetailPage', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('div', { 'data-testid': 'mentor-concept-detail-page' },
      React.createElement('div', { 'data-testid': 'graph-id' }, props.graphId),
      React.createElement('div', { 'data-testid': 'concept-name' }, props.concept?.name || 'No Concept'),
      React.createElement('div', { 'data-testid': 'loading' }, props.loading ? 'Loading' : 'Not Loading'),
      React.createElement('div', { 'data-testid': 'error' }, props.error || 'No Error')
    ),
  };
});

import { useConceptDetail } from '../../../../features/knowledge-graph/hooks/useConceptDetail';
import { useGetGraph } from '../../../../features/knowledge-graph/hooks';
import { useExplainConcept } from '../../../../features/knowledge-graph/hooks/useExplainConcept';
import { useAnswerQuestion } from '../../../../features/knowledge-graph/hooks/useAnswerQuestion';
import { useCustomOperation } from '../../../../features/knowledge-graph/hooks/useCustomOperation';

const mockUseConceptDetail = useConceptDetail as jest.MockedFunction<typeof useConceptDetail>;
const mockUseGetGraph = useGetGraph as jest.MockedFunction<typeof useGetGraph>;
const mockUseExplainConcept = useExplainConcept as jest.MockedFunction<typeof useExplainConcept>;
const mockUseAnswerQuestion = useAnswerQuestion as jest.MockedFunction<typeof useAnswerQuestion>;
const mockUseCustomOperation = useCustomOperation as jest.MockedFunction<typeof useCustomOperation>;

const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      knowledgeGraphs: knowledgeGraphSlice,
      graphOperations: graphOperationSlice,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
    preloadedState,
  });
};

const renderWithProviders = (ui: React.ReactElement, store = createTestStore()) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <AlertProvider>{children}</AlertProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper }) };
};

// Mock useParams to return test graphId and conceptId
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => ({ graphId: 'test-graph-1', conceptId: 'test-concept-1' }),
  useNavigate: () => jest.fn(),
}));

describe('MentorConceptDetailPageContainer - Phase 3', () => {
  const mockConceptDetail: ConceptDetail = {
    concept: {
      id: 'test-concept-1',
      name: 'Test Concept',
      description: 'Test Description',
      layer: 1,
      isSeed: false,
      sequence: 0,
      parents: [],
      children: [],
      prerequisites: [],
      properties: {},
    },
    lesson: {
      id: 'lesson-1',
      content: 'Test lesson content',
      prerequisites: [],
    },
    flashcards: [
      { id: 'fc-1', front: 'Front', back: 'Back' },
    ],
    metadata: {
      qa: [
        { question: 'Test Question?', answer: 'Test Answer' },
      ],
    },
    relationships: {
      parents: [],
      children: [],
      prerequisites: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseConceptDetail.mockReturnValue({
      conceptDetail: mockConceptDetail,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseGetGraph.mockReturnValue({
      getGraph: jest.fn().mockResolvedValue(null),
      loading: false,
    });

    mockUseExplainConcept.mockReturnValue({
      explain: jest.fn(),
      isLoading: false,
      error: null,
      streaming: null,
    });

    mockUseAnswerQuestion.mockReturnValue({
      answer: jest.fn(),
      isLoading: false,
      error: null,
      streaming: null,
    });

    mockUseCustomOperation.mockReturnValue({
      execute: jest.fn(),
      isLoading: false,
      error: null,
      streaming: null,
    });
  });

  it('should render and fetch data using hooks', async () => {
    renderWithProviders(<MentorConceptDetailPageContainer />);

    await waitFor(() => {
      expect(mockUseConceptDetail).toHaveBeenCalledWith('test-graph-1', 'test-concept-1');
    });
  });

  it('should pass concept to presentation component', async () => {
    renderWithProviders(<MentorConceptDetailPageContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('concept-name')).toHaveTextContent('Test Concept');
    });
  });

  it('should pass loading state to presentation component', async () => {
    mockUseConceptDetail.mockReturnValue({
      conceptDetail: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    renderWithProviders(<MentorConceptDetailPageContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    });
  });

  it('should pass error state to presentation component', async () => {
    mockUseConceptDetail.mockReturnValue({
      conceptDetail: null,
      loading: false,
      error: 'Failed to load',
      refetch: jest.fn(),
    });

    renderWithProviders(<MentorConceptDetailPageContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to load');
    });
  });

  it('should dispatch setCurrentGraphId on mount', async () => {
    const store = createTestStore();
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    renderWithProviders(<MentorConceptDetailPageContainer />, store);

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled();
    });
  });
});

