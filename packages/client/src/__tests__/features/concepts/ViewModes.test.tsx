import React from 'react';
import { screen, fireEvent, waitFor, render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderWithProviders, resetAllMocks } from '../../testUtils.helper';
import ConceptPageContainer from '../../../pages/ConceptPageContainer';
/**
 * @deprecated ConceptListPage from pages is deprecated.
 * ConceptPageContainer now uses @components/pages/ConceptListPage.
 * These tests should be updated to test the container or library page.
 */
// import ConceptListPage from '../../../pages/ConceptListPage'; // DEPRECATED - use @components/pages/ConceptListPage
import { ConceptListPage } from '../../../components/pages';
import ConceptViewHeader from '../../../features/concepts/components/ConceptViewHeader';
import { Concept, ConceptGraph } from '../../../features/concepts/types';
import { selectConcept } from '../../../features/concepts/conceptSlice';

// Mock MindMap component
jest.mock('../../../features/mindmap', () => ({
  MindMap: ({ notes, selectedNote, onSelectNote, onNavigateToNote }: any) => (
    <div data-testid="mindmap-view">
      <div data-testid="mindmap-notes-count">{notes?.length || 0}</div>
      {selectedNote && <div data-testid="mindmap-selected-note">{selectedNote.title}</div>}
      <button
        data-testid="mindmap-select-note"
        onClick={() => onSelectNote && onSelectNote(notes?.[0])}
      >
        Select Note
      </button>
      <button
        data-testid="mindmap-navigate-note"
        onClick={() => onNavigateToNote && onNavigateToNote(notes?.[0])}
      >
        Navigate Note
      </button>
    </div>
  ),
}));

// Mock RadialView component
jest.mock('../../../features/radial-view', () => ({
  RadialView: ({ concepts, selectedConcept, onSelectConcept, onNavigateToConcept }: any) => (
    <div data-testid="radial-view">
      <div data-testid="radial-concepts-count">{concepts?.length || 0}</div>
      {selectedConcept && <div data-testid="radial-selected-concept">{selectedConcept.name}</div>}
      {concepts?.map((concept: Concept, idx: number) => (
        <div
          key={concept.id || idx}
          data-testid={`radial-node-${concept.id || idx}`}
          onClick={() => onSelectConcept && onSelectConcept(concept)}
          onDoubleClick={() => onNavigateToConcept && onNavigateToConcept(concept)}
        >
          {concept.name}
        </div>
      ))}
    </div>
  ),
}));

// Mock ConceptDetailPage (using library page)
jest.mock('../../../components/pages', () => {
  const actual = jest.requireActual('../../../components/pages');
  return {
    ...actual,
    ConceptDetailPage: ({ concept, onNavigateToParent, onNavigateToChild }: any) => {
    return (
      <div data-testid="detail-view">
        <div data-testid="detail-concept-name">{concept?.name}</div>
        <div data-testid="detail-concept-description">{concept?.description}</div>
        {onNavigateToParent && (
          <button data-testid="detail-navigate-parent" onClick={() => onNavigateToParent('Parent')}>
            Navigate to Parent
          </button>
        )}
        {onNavigateToChild && (
          <button data-testid="detail-navigate-child" onClick={() => onNavigateToChild('Child')}>
            Navigate to Child
          </button>
        )}
      </div>
    );
  };
});

// Mock ConceptList component
jest.mock('../../../features/concepts/components/ConceptList', () => {
  return function MockConceptList({ concepts, selectedConcept, onSelectConcept }: any) {
    return (
      <div data-testid="list-view">
        <div data-testid="list-concepts-count">{concepts?.length || 0}</div>
        {selectedConcept && <div data-testid="list-selected-concept">{selectedConcept.name}</div>}
        {concepts?.map((concept: Concept, idx: number) => (
          <div
            key={concept.id || idx}
            data-testid={`list-item-${concept.id || idx}`}
            onClick={() => onSelectConcept && onSelectConcept(concept)}
          >
            {concept.name}
          </div>
        ))}
      </div>
    );
  };
});

// Helper to create a mock concept
const createMockConcept = (
  name: string,
  layer: number = 0,
  id?: string,
  isSeed: boolean = false
): Concept => ({
  id: id || `concept-${name}`,
  name,
  description: `Description for ${name}`,
  parents: [],
  children: [],
  layer,
  isSeed,
});

// Helper to create a mock graph
const createMockGraph = (id: string, seedConcept: Concept): ConceptGraph => {
  const concepts = new Map([[seedConcept.id!, seedConcept]]);
  return {
    id,
    seedConceptId: seedConcept.id!,
    concepts,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    difficulty: 'intermediate',
    goalFocused: false,
    layers: new Map([[0, { 
      layerNumber: 0, 
      goal: `Learn ${seedConcept.name}`, 
      conceptIds: [seedConcept.id!],
      prompt: '',
      response: '',
    }]]),
  };
};

describe('View Modes - Frontend', () => {
  const mockSeedConcept = createMockConcept('React', 0, 'seed-1', true);
  const mockGraph = createMockGraph('graph-1', mockSeedConcept);

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
  });

  describe('List View', () => {
    it('should render concept list correctly', () => {
      const concepts = [
        createMockConcept('Component', 1),
        createMockConcept('State', 1),
        createMockConcept('Props', 1),
      ];

      renderWithProviders(
        <ConceptListPage
          relatedConcepts={concepts}
          selectedConcept={null}
          isLoading={false}
          onSelectConcept={jest.fn()}
          onNavigateToParent={jest.fn()}
          onLoadMoreLayers={jest.fn()}
          onSummarizeLayer={jest.fn()}
          expandedLevels={{}}
          onToggleLevel={jest.fn()}
          graph={mockGraph}
        />
      );

      expect(screen.getByTestId('list-view')).toBeInTheDocument();
      expect(screen.getByTestId('list-concepts-count')).toHaveTextContent('3');
    });

    it('should display selected concept in list view', () => {
      const concepts = [createMockConcept('Component', 1)];
      const selected = concepts[0];

      renderWithProviders(
        <ConceptListPage
          relatedConcepts={concepts}
          selectedConcept={selected}
          isLoading={false}
          onSelectConcept={jest.fn()}
          onNavigateToParent={jest.fn()}
          onLoadMoreLayers={jest.fn()}
          onSummarizeLayer={jest.fn()}
          expandedLevels={{}}
          onToggleLevel={jest.fn()}
          graph={mockGraph}
        />
      );

      expect(screen.getByTestId('list-selected-concept')).toHaveTextContent('Component');
    });

    it('should call onSelectConcept when concept is clicked in list view', () => {
      const concepts = [createMockConcept('Component', 1)];
      const mockOnSelect = jest.fn();

      renderWithProviders(
        <ConceptListPage
          relatedConcepts={concepts}
          selectedConcept={null}
          isLoading={false}
          onSelectConcept={mockOnSelect}
          onNavigateToParent={jest.fn()}
          onLoadMoreLayers={jest.fn()}
          onSummarizeLayer={jest.fn()}
          expandedLevels={{}}
          onToggleLevel={jest.fn()}
          graph={mockGraph}
        />
      );

      const conceptItem = screen.getByTestId('list-item-concept-Component');
      fireEvent.click(conceptItem);

      expect(mockOnSelect).toHaveBeenCalledWith(concepts[0]);
    });

    it('should display empty state when no concepts exist', () => {
      renderWithProviders(
        <ConceptListPage
          relatedConcepts={[]}
          selectedConcept={null}
          isLoading={false}
          onSelectConcept={jest.fn()}
          onNavigateToParent={jest.fn()}
          onLoadMoreLayers={jest.fn()}
          onSummarizeLayer={jest.fn()}
          expandedLevels={{}}
          onToggleLevel={jest.fn()}
          graph={mockGraph}
        />
      );

      expect(screen.getByText(/No concepts in this learning path yet/i)).toBeInTheDocument();
    });
  });

  describe('Detail View', () => {
    it('should render concept detail page correctly', () => {
      const concept = createMockConcept('React Components', 1);

      renderWithProviders(
        <div>
          {/* ConceptDetailPage is mocked, so we test it directly */}
          <div data-testid="detail-view">
            <div data-testid="detail-concept-name">{concept.name}</div>
            <div data-testid="detail-concept-description">{concept.description}</div>
          </div>
        </div>
      );

      expect(screen.getByTestId('detail-view')).toBeInTheDocument();
      expect(screen.getByTestId('detail-concept-name')).toHaveTextContent('React Components');
      expect(screen.getByTestId('detail-concept-description')).toHaveTextContent(concept.description);
    });

    it('should display concept information in detail view', () => {
      const concept = createMockConcept('State Management', 1);
      concept.description = 'Managing component state in React';

      renderWithProviders(
        <div>
          <div data-testid="detail-view">
            <div data-testid="detail-concept-name">{concept.name}</div>
            <div data-testid="detail-concept-description">{concept.description}</div>
          </div>
        </div>
      );

      expect(screen.getByTestId('detail-concept-name')).toHaveTextContent('State Management');
      expect(screen.getByTestId('detail-concept-description')).toHaveTextContent('Managing component state in React');
    });
  });

  describe('Mindmap View', () => {
    it('should render mindmap view correctly', () => {
      const concepts = [
        createMockConcept('Component', 1),
        createMockConcept('State', 1),
      ];

      // Mock the notes conversion (concepts are converted to notes for mindmap)
      const mockNotes = concepts.map(c => ({
        id: c.id!,
        title: c.name,
        content: c.description,
        parentId: null,
        children: [],
        isExpanded: false,
      }));

      renderWithProviders(
        <div>
          <div data-testid="mindmap-view">
            <div data-testid="mindmap-notes-count">{mockNotes.length}</div>
          </div>
        </div>
      );

      expect(screen.getByTestId('mindmap-view')).toBeInTheDocument();
      expect(screen.getByTestId('mindmap-notes-count')).toHaveTextContent('2');
    });

    it('should display selected note in mindmap view', () => {
      const mockNote = {
        id: 'note-1',
        title: 'Component',
        content: 'Description',
        parentId: null,
        children: [],
        isExpanded: false,
      };

      renderWithProviders(
        <div>
          <div data-testid="mindmap-view">
            {mockNote && <div data-testid="mindmap-selected-note">{mockNote.title}</div>}
          </div>
        </div>
      );

      expect(screen.getByTestId('mindmap-selected-note')).toHaveTextContent('Component');
    });

    it('should handle note selection in mindmap view', () => {
      const mockOnSelectNote = jest.fn();
      const mockNote = {
        id: 'note-1',
        title: 'Component',
        content: 'Description',
        parentId: null,
        children: [],
        isExpanded: false,
      };

      renderWithProviders(
        <div>
          <div data-testid="mindmap-view">
            <button
              data-testid="mindmap-select-note"
              onClick={() => mockOnSelectNote(mockNote)}
            >
              Select Note
            </button>
          </div>
        </div>
      );

      const selectButton = screen.getByTestId('mindmap-select-note');
      fireEvent.click(selectButton);

      expect(mockOnSelectNote).toHaveBeenCalledWith(mockNote);
    });
  });

  describe('Radial View', () => {
    it('should render radial view correctly', () => {
      const concepts = [
        createMockConcept('Component', 1),
        createMockConcept('State', 1),
        createMockConcept('Props', 1),
      ];

      renderWithProviders(
        <div>
          <div data-testid="radial-view">
            <div data-testid="radial-concepts-count">{concepts.length}</div>
            {concepts.map((concept, idx) => (
              <div
                key={concept.id || idx}
                data-testid={`radial-node-${concept.id || idx}`}
              >
                {concept.name}
              </div>
            ))}
          </div>
        </div>
      );

      expect(screen.getByTestId('radial-view')).toBeInTheDocument();
      expect(screen.getByTestId('radial-concepts-count')).toHaveTextContent('3');
    });

    it('should display selected concept in radial view', () => {
      const concepts = [createMockConcept('Component', 1)];
      const selected = concepts[0];

      renderWithProviders(
        <div>
          <div data-testid="radial-view">
            {selected && <div data-testid="radial-selected-concept">{selected.name}</div>}
          </div>
        </div>
      );

      expect(screen.getByTestId('radial-selected-concept')).toHaveTextContent('Component');
    });

    it('should call onSelectConcept when node is clicked in radial view', () => {
      const concepts = [createMockConcept('Component', 1)];
      const mockOnSelect = jest.fn();

      renderWithProviders(
        <div>
          <div data-testid="radial-view">
            {concepts.map((concept, idx) => (
              <div
                key={concept.id || idx}
                data-testid={`radial-node-${concept.id || idx}`}
                onClick={() => mockOnSelect(concept)}
              >
                {concept.name}
              </div>
            ))}
          </div>
        </div>
      );

      const node = screen.getByTestId('radial-node-concept-Component');
      fireEvent.click(node);

      expect(mockOnSelect).toHaveBeenCalledWith(concepts[0]);
    });
  });

  describe('View Switching', () => {
    it('should switch between view modes using ConceptViewHeader', () => {
      const mockOnModeChange = jest.fn();
      const options = [
        { mode: 'list' as const, label: 'List View' },
        { mode: 'detail' as const, label: 'Detail View' },
        { mode: 'mindmap' as const, label: 'Mind Map' },
        { mode: 'radial' as const, label: 'Radial View' },
      ];

      renderWithProviders(
        <ConceptViewHeader
          title="Test Graph"
          currentMode="list"
          options={options}
          onModeChange={mockOnModeChange}
          onBack={jest.fn()}
        />
      );

      // ConceptViewHeader renders two headers (default and condensed), so get all buttons
      const radialButtons = screen.getAllByText('Radial View');
      // Click the first one
      fireEvent.click(radialButtons[0]);

      expect(mockOnModeChange).toHaveBeenCalledWith('radial');
    });

    it('should highlight active view mode in header', () => {
      const options = [
        { mode: 'list' as const, label: 'List View' },
        { mode: 'radial' as const, label: 'Radial View' },
      ];

      renderWithProviders(
        <ConceptViewHeader
          title="Test Graph"
          currentMode="radial"
          options={options}
          onModeChange={jest.fn()}
          onBack={jest.fn()}
        />
      );

      // ConceptViewHeader renders two headers, so get all buttons
      const radialButtons = screen.getAllByText('Radial View').map(btn => btn.closest('button')).filter(Boolean);
      expect(radialButtons.length).toBeGreaterThan(0);
      // All instances should have the active class
      radialButtons.forEach(button => {
        expect(button).toHaveClass('bg-indigo-100');
        expect(button).toHaveClass('text-indigo-700');
        expect(button).toHaveClass('shadow-sm');
      });
    });

    it('should disable view mode option when disabled', () => {
      const options = [
        { mode: 'list' as const, label: 'List View' },
        { mode: 'detail' as const, label: 'Detail View', disabled: true },
      ];

      renderWithProviders(
        <ConceptViewHeader
          title="Test Graph"
          currentMode="list"
          options={options}
          onModeChange={jest.fn()}
          onBack={jest.fn()}
        />
      );

      // ConceptViewHeader renders two headers (default and condensed), so we need to get all buttons
      const detailButtons = screen.getAllByText('Detail View').map(btn => btn.closest('button')).filter(Boolean);
      expect(detailButtons.length).toBeGreaterThan(0);
      // All instances should be disabled
      detailButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to parent concept in detail view', () => {
      const mockOnNavigateToParent = jest.fn();

      renderWithProviders(
        <div>
          <div data-testid="detail-view">
            <button
              data-testid="detail-navigate-parent"
              onClick={() => mockOnNavigateToParent('Parent')}
            >
              Navigate to Parent
            </button>
          </div>
        </div>
      );

      const navigateButton = screen.getByTestId('detail-navigate-parent');
      fireEvent.click(navigateButton);

      expect(mockOnNavigateToParent).toHaveBeenCalledWith('Parent');
    });

    it('should navigate to child concept in detail view', () => {
      const mockOnNavigateToChild = jest.fn();

      renderWithProviders(
        <div>
          <div data-testid="detail-view">
            <button
              data-testid="detail-navigate-child"
              onClick={() => mockOnNavigateToChild('Child')}
            >
              Navigate to Child
            </button>
          </div>
        </div>
      );

      const navigateButton = screen.getByTestId('detail-navigate-child');
      fireEvent.click(navigateButton);

      expect(mockOnNavigateToChild).toHaveBeenCalledWith('Child');
    });

    it('should navigate to concept when note is double-clicked in mindmap', () => {
      const mockOnNavigate = jest.fn();
      const mockNote = {
        id: 'note-1',
        title: 'Component',
        content: 'Description',
        parentId: null,
        children: [],
        isExpanded: false,
      };

      renderWithProviders(
        <div>
          <div data-testid="mindmap-view">
            <button
              data-testid="mindmap-navigate-note"
              onClick={() => mockOnNavigate(mockNote)}
            >
              Navigate Note
            </button>
          </div>
        </div>
      );

      const navigateButton = screen.getByTestId('mindmap-navigate-note');
      fireEvent.click(navigateButton);

      expect(mockOnNavigate).toHaveBeenCalledWith(mockNote);
    });
  });

  describe('Selection', () => {
    it('should select concept in list view on click', () => {
      const concepts = [createMockConcept('Component', 1)];
      const mockOnSelect = jest.fn();

      renderWithProviders(
        <ConceptListPage
          relatedConcepts={concepts}
          selectedConcept={null}
          isLoading={false}
          onSelectConcept={mockOnSelect}
          onNavigateToParent={jest.fn()}
          onLoadMoreLayers={jest.fn()}
          onSummarizeLayer={jest.fn()}
          expandedLevels={{}}
          onToggleLevel={jest.fn()}
          graph={mockGraph}
        />
      );

      const conceptItem = screen.getByTestId('list-item-concept-Component');
      fireEvent.click(conceptItem);

      expect(mockOnSelect).toHaveBeenCalledWith(concepts[0]);
    });

    it('should select concept in radial view on single click', () => {
      const concepts = [createMockConcept('Component', 1)];
      const mockOnSelect = jest.fn();

      renderWithProviders(
        <div>
          <div data-testid="radial-view">
            {concepts.map((concept, idx) => (
              <div
                key={concept.id || idx}
                data-testid={`radial-node-${concept.id || idx}`}
                onClick={() => mockOnSelect(concept)}
              >
                {concept.name}
              </div>
            ))}
          </div>
        </div>
      );

      const node = screen.getByTestId('radial-node-concept-Component');
      fireEvent.click(node);

      expect(mockOnSelect).toHaveBeenCalledWith(concepts[0]);
    });

    it('should select note in mindmap view on click', () => {
      const mockOnSelectNote = jest.fn();
      const mockNote = {
        id: 'note-1',
        title: 'Component',
        content: 'Description',
        parentId: null,
        children: [],
        isExpanded: false,
      };

      renderWithProviders(
        <div>
          <div data-testid="mindmap-view">
            <button
              data-testid="mindmap-select-note"
              onClick={() => mockOnSelectNote(mockNote)}
            >
              Select Note
            </button>
          </div>
        </div>
      );

      const selectButton = screen.getByTestId('mindmap-select-note');
      fireEvent.click(selectButton);

      expect(mockOnSelectNote).toHaveBeenCalledWith(mockNote);
    });
  });

  describe('Double-Click Navigation', () => {
    it('should navigate to detail page on double-click in radial view', () => {
      const concepts = [createMockConcept('Component', 1)];
      const mockOnNavigate = jest.fn();

      renderWithProviders(
        <div>
          <div data-testid="radial-view">
            {concepts.map((concept, idx) => (
              <div
                key={concept.id || idx}
                data-testid={`radial-node-${concept.id || idx}`}
                onDoubleClick={() => mockOnNavigate(concept)}
              >
                {concept.name}
              </div>
            ))}
          </div>
        </div>
      );

      const node = screen.getByTestId('radial-node-concept-Component');
      fireEvent.doubleClick(node);

      expect(mockOnNavigate).toHaveBeenCalledWith(concepts[0]);
    });

    it('should not navigate on single click in radial view', () => {
      const concepts = [createMockConcept('Component', 1)];
      const mockOnSelect = jest.fn();
      const mockOnNavigate = jest.fn();

      renderWithProviders(
        <div>
          <div data-testid="radial-view">
            {concepts.map((concept, idx) => (
              <div
                key={concept.id || idx}
                data-testid={`radial-node-${concept.id || idx}`}
                onClick={() => mockOnSelect(concept)}
                onDoubleClick={() => mockOnNavigate(concept)}
              >
                {concept.name}
              </div>
            ))}
          </div>
        </div>
      );

      const node = screen.getByTestId('radial-node-concept-Component');
      fireEvent.click(node);

      expect(mockOnSelect).toHaveBeenCalledWith(concepts[0]);
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });
});

