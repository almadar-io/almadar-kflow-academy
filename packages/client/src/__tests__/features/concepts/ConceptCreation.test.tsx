import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders, resetAllMocks } from '../../testUtils.helper';
/**
 * @deprecated This test file tests deprecated LearnPage component.
 * Tests should be rewritten to test LearnPageContainer or library LearnPage.
 * LearnPage now uses GoalForm instead of old concept creation form.
 */
// import LearnPage from '../../../pages/LearnPage'; // DEPRECATED - use @components/pages/LearnPage or LearnPageContainer
import { ConceptGraph } from '../../../features/concepts/types';
import { graphApi } from '../../../features/concepts/graphApi';
import { ConceptsAPI } from '../../../features/concepts/ConceptsAPI';

// Mock graphApi
jest.mock('../../../features/concepts/graphApi', () => ({
  graphApi: {
    listGraphs: jest.fn(),
    getGraph: jest.fn(),
    upsertGraph: jest.fn(),
    deleteGraph: jest.fn(),
  },
}));

// Mock ConceptsAPI
jest.mock('../../../features/concepts/ConceptsAPI', () => ({
  ConceptsAPI: {
    progressiveExpandMultipleFromText: jest.fn(),
  },
}));

// Mock useHomeConcepts hook
jest.mock('../../../features/concepts/hooks/useHomeConcepts', () => ({
  useHomeConcepts: (graphs: ConceptGraph[]) => {
    const calculateLevelCount = (graph: ConceptGraph) => {
      const layerValues = Array.from(graph.concepts.values())
        .map(concept => concept.layer)
        .filter((layer): layer is number => layer !== undefined);
      const maxLayer = layerValues.length > 0 ? Math.max(...layerValues) : null;
      return maxLayer !== null ? maxLayer + 1 : 1;
    };
    
    return {
      seedEntries: graphs.map((graph) => {
        const seedConcept = Array.from(graph.concepts.values()).find((c) => c.isSeed || c.id === graph.seedConceptId);
        return {
          graph,
          seedConcept: seedConcept || Array.from(graph.concepts.values())[0],
          conceptCount: graph.concepts.size,
          levelCount: calculateLevelCount(graph),
        };
      }),
      handleConceptClick: jest.fn(),
    };
  },
}));

// Mock useDeleteGraph hook
jest.mock('../../../features/concepts/hooks/useDeleteGraph', () => ({
  useDeleteGraph: () => ({
    deleteGraph: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

// Mock useHandleApiError hook
const mockHandleApiError = jest.fn();
jest.mock('../../../hooks/useHandleApiError', () => ({
  useHandleApiError: () => mockHandleApiError,
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

const mockUseLoadFirstLayer = jest.fn(() => defaultMockReturn) as jest.Mock<
  typeof defaultMockReturn,
  []
>;

jest.mock('../../../features/concepts/hooks/useLoadFirstLayer', () => ({
  useLoadFirstLayer: () => mockUseLoadFirstLayer(),
}));

// Mock createConceptGraphAndPersist thunk
jest.mock('../../../features/concepts/conceptThunks', () => ({
  ...jest.requireActual('../../../features/concepts/conceptThunks'),
  createConceptGraphAndPersist: jest.fn(() => ({
    type: 'concepts/createConceptGraphAndPersist',
  })),
}));

// These tests are skipped because LearnPage now uses GoalForm instead of the old concept creation form
// TODO: Rewrite these tests to test GoalForm functionality
describe.skip('Concept Creation & First Layer Generation - Frontend', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    mockHandleApiError.mockClear();
    mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
      ...defaultMockReturn,
      setShowModal: mockSetShowModal,
      setConceptName: mockSetConceptName,
      setConceptDescription: mockSetConceptDescription,
      setDifficulty: mockSetDifficulty,
      setProjectBased: mockSetProjectBased,
      handleCreateAndLoad: mockHandleCreateAndLoad,
    });
  });

  describe('Create Concept Form', () => {
    it('should render form with all fields when modal is open', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
      });

      renderWithProviders(<LearnPage />);

      expect(screen.getByLabelText(/What would you like to learn next/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/What would you like to focus on/i)).toBeInTheDocument();
      // Slider doesn't have proper label association, so check for text instead
      expect(screen.getByText(/What is your level of expertise/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Goal focused learning path/i)).toBeInTheDocument();
    });

    it('should require concept name (button disabled when empty)', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
        newConceptName: '', // Empty name
      });

      renderWithProviders(<LearnPage />);

      const createButton = screen.getByText('Create Learning Path');
      expect(createButton).toBeDisabled();
    });

    it('should enable create button when name is provided', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
        newConceptName: 'React',
      });

      renderWithProviders(<LearnPage />);

      const createButton = screen.getByText('Create Learning Path');
      expect(createButton).not.toBeDisabled();
    });

    it('should allow optional description', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
        newConceptName: 'React',
        newConceptDescription: '', // Empty description is allowed
      });

      renderWithProviders(<LearnPage />);

      const createButton = screen.getByText('Create Learning Path');
      expect(createButton).not.toBeDisabled();
    });
  });

  describe('Difficulty Selection', () => {
    it('should display difficulty slider with all options', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
      });

      renderWithProviders(<LearnPage />);

      // Use getAllByText since "Intermediate" appears twice (label and option)
      expect(screen.getByText('Beginner')).toBeInTheDocument();
      const intermediateElements = screen.getAllByText('Intermediate');
      expect(intermediateElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('should update difficulty when slider changes', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        showModal: true,
        setShowModal: mockSetShowModal,
        newConceptName: '',
        setConceptName: mockSetConceptName,
        newConceptDescription: '',
        setConceptDescription: mockSetConceptDescription,
        difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
        setDifficulty: mockSetDifficulty,
        projectBased: false,
        setProjectBased: mockSetProjectBased,
        isLoadingFirstLayer: false,
        streamContent: '',
        loaderProgress: 0,
        loaderText: '',
        handleCreateAndLoad: mockHandleCreateAndLoad,
      } as typeof defaultMockReturn);

      renderWithProviders(<LearnPage />);

      // Find slider by role since label association isn't working
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();

      if (slider) {
        fireEvent.change(slider, { target: { value: '2' } }); // Advanced
        // The onChange should be called via the hook
        expect(mockSetDifficulty).toHaveBeenCalled();
      }
    });
  });

  describe('Goal-Based Toggle', () => {
    it('should display goal-based checkbox with tooltip', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
      });

      renderWithProviders(<LearnPage />);

      const checkbox = screen.getByLabelText(/Goal focused learning path/i);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('should toggle goal-based when checkbox is clicked', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
        projectBased: false,
      });

      renderWithProviders(<LearnPage />);

      const checkbox = screen.getByLabelText(/Goal focused learning path/i);
      fireEvent.click(checkbox);

      expect(mockSetProjectBased).toHaveBeenCalled();
    });

    it('should display tooltip icon', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
      });

      renderWithProviders(<LearnPage />);

      // Tooltip icon should be present (HelpCircle)
      const tooltipIcon = screen.getByLabelText(/Goal focused learning path/i).parentElement?.querySelector('svg');
      expect(tooltipIcon).toBeInTheDocument();
    });
  });

  describe('First Layer Generation', () => {
    it('should show ConceptLoader when generating first layer', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        isLoadingFirstLayer: true,
        streamContent: 'Generating concepts...',
        loaderProgress: 50,
        loaderText: 'Generating your first learning level',
      });

      renderWithProviders(<LearnPage />);

      expect(screen.getByText('Generating your first learning level')).toBeInTheDocument();
    });

    it('should display streaming content during generation', () => {
      // ConceptLoader parses streamContent to extract concepts, so we need to provide
      // content in the format that the operation generates (with <concept>, <description>, and <parents> tags)
      // Format: <concept>Concept Name</concept><description>Description text</description><parents>Parent1, Parent2</parents>
      const streamContentWithConcepts = `
        <concept>Components</concept><description>Creating React components...</description><parents>React</parents>
      `;

      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        isLoadingFirstLayer: true,
        streamContent: streamContentWithConcepts,
        loaderProgress: 30,
        loaderText: 'Generating your first learning level',
      });

      renderWithProviders(<LearnPage />);

      // ConceptLoader should parse and display the concept
      expect(screen.getByText('Components')).toBeInTheDocument();
      expect(screen.getByText('Creating React components...')).toBeInTheDocument();
    });

    it('should show progress indicator', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        isLoadingFirstLayer: true,
        loaderProgress: 75,
        loaderText: 'Generating your first learning level',
      });

      renderWithProviders(<LearnPage />);

      // ConceptLoader should be visible with progress
      expect(screen.getByText('Generating your first learning level')).toBeInTheDocument();
      // Progress should be displayed
      expect(screen.getByText('Progress')).toBeInTheDocument();
    });
  });

  describe('Success Flow', () => {
    it('should call handleCreateAndLoad when form is submitted', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
        newConceptName: 'React',
        newConceptDescription: 'Learn React hooks',
        difficulty: 'intermediate',
        projectBased: true,
      });

      renderWithProviders(<LearnPage />);

      const createButton = screen.getByText('Create Learning Path');
      fireEvent.click(createButton);

      expect(mockHandleCreateAndLoad).toHaveBeenCalled();
    });

    it('should disable create button during loading', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
        newConceptName: 'React',
        isLoadingFirstLayer: true,
      });

      renderWithProviders(<LearnPage />);

      const createButton = screen.getByText('Create Learning Path');
      expect(createButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during creation and show error message', async () => {
      // Create a new mock function that simulates an error but handles it gracefully
      // Note: Since the hook is mocked, the actual error handling in useCreateConceptAndLoadFirstLayer
      // won't execute. This test verifies the component doesn't crash when handleCreateAndLoad encounters an error.
      // The mock catches the error internally to prevent unhandled promise rejection in the test
      const mockHandleCreateAndLoadWithError = jest.fn().mockImplementation(async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Failed to create concept');
        } catch (error) {
          // In the real hook, this error would be caught and handleApiError would be called
          // Since we're mocking, we just catch it to prevent test failure
          // The actual error handling is tested in integration tests or hook tests
          return;
        }
      });

      // Suppress console.error for this test since we're testing error handling
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
        newConceptName: 'React',
        handleCreateAndLoad: mockHandleCreateAndLoadWithError,
      });

      renderWithProviders(<LearnPage />);

      const createButton = screen.getByText('Create Learning Path');
      
      // Click button - the error should be handled gracefully by the component
      // The error handling in the actual hook would call handleApiError, but since
      // the hook is mocked, we just verify the component doesn't crash
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockHandleCreateAndLoadWithError).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Wait a bit for any error handling to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Verify the component is still functional (doesn't crash)
      // Note: The actual error handling (handleApiError) is tested in integration tests
      // or would be tested in a direct hook test
      expect(createButton).toBeInTheDocument();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle case when handleCreateConcept returns null (upsert failure)', async () => {
      // When upsert fails, handleCreateConcept returns null
      // This should trigger error handling and keep modal open (not navigate)
      const mockHandleCreateAndLoadWithNull = jest.fn().mockImplementation(async () => {
        // Simulate handleCreateConcept returning null (upsert failed)
        // In the real hook, this would call handleApiError from useHandleApiError hook
        // and not set justCreatedGraphId, which means no navigation happens
        mockHandleApiError(new Error('Failed to create concept'), 'Failed to create your learning path. Please try again.');
      });

      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
        newConceptName: 'React',
        handleCreateAndLoad: mockHandleCreateAndLoadWithNull,
      });

      renderWithProviders(<LearnPage />);

      const createButton = screen.getByText('Create Learning Path');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockHandleCreateAndLoadWithNull).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Component should still be functional after handleCreateAndLoad completes
      // Modal should remain open when creation fails
      expect(createButton).toBeInTheDocument();
      // Verify error was shown (via handleApiError)
      expect(mockHandleApiError).toHaveBeenCalled();
    });

    it('should allow retry after error', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
        newConceptName: 'React',
        isLoadingFirstLayer: false, // Not loading, can retry
      });

      renderWithProviders(<LearnPage />);

      const createButton = screen.getByText('Create Learning Path');
      expect(createButton).not.toBeDisabled();
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal when cancel is clicked', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: true,
      });

      renderWithProviders(<LearnPage />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockSetShowModal).toHaveBeenCalledWith(false);
    });

    it('should not show modal when showModal is false', () => {
      mockUseCreateConceptAndLoadFirstLayer.mockReturnValue({
        ...defaultMockReturn,
        showModal: false,
      });

      renderWithProviders(<LearnPage />);

      // Check for modal-specific elements that only appear when modal is open
      expect(screen.queryByText('What would you like to learn next?')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByText('Create Learning Path')).not.toBeInTheDocument();
    });
  });
});

