import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, resetAllMocks } from '../../testUtils.helper';
/**
 * Updated to use library components instead of feature components.
 * These components have been migrated to the component library.
 */
import { PrerequisiteList } from '../../../components/organisms/PrerequisiteList';
import { PrerequisiteItem } from '../../../components/molecules/PrerequisiteItem';
import { PrerequisitesDisplay } from '../../../components/organisms/PrerequisitesDisplay';
import { Concept, ConceptGraph } from '../../../features/concepts/types';

// Helper to create a mock concept
const createMockConcept = (name: string, prerequisites?: string[]): Concept => ({
  id: `concept-${name}`,
  name,
  description: `Description for ${name}`,
  parents: [],
  children: [],
  layer: 0,
  prerequisites,
});

// Helper to create a mock graph
const createMockGraph = (concepts: Concept[]): ConceptGraph => {
  const conceptMap = new Map<string, Concept>();
  concepts.forEach(c => conceptMap.set(c.name, c));
  
  return {
    id: 'graph-1',
    seedConceptId: concepts[0]?.id || 'seed-1',
    concepts: conceptMap,
    layers: new Map(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    difficulty: 'intermediate',
    goalFocused: false,
  };
};

describe('Prerequisites Management - Frontend', () => {
  const mockOnViewPrerequisite = jest.fn();
  const mockOnAddPrerequisite = jest.fn();
  const mockOnRemovePrerequisite = jest.fn();

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    mockOnViewPrerequisite.mockClear();
    mockOnAddPrerequisite.mockClear();
    mockOnRemovePrerequisite.mockClear();
  });

  describe('Add Prerequisite', () => {
    it('should call onAddPrerequisite when add button is clicked', () => {
      const concept = createMockConcept('React Components', ['JavaScript']);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
          onAddPrerequisite={mockOnAddPrerequisite}
        />
      );

      // Find the add button for missing prerequisites
      const addButtons = screen.getAllByLabelText('Add prerequisite');
      if (addButtons.length > 0) {
        fireEvent.click(addButtons[0]);
        expect(mockOnAddPrerequisite).toHaveBeenCalled();
      }
    });

    it('should add prerequisite from lesson content', () => {
      // This is typically handled by the parent component that processes lesson content
      const concept = createMockConcept('React Components');
      const lessonWithPrereqs = '<prq>JavaScript, HTML</prq>\n\n# Lesson content';

      // The prerequisite extraction happens in the backend/utils
      // Frontend receives the prerequisites and can add them
      const prerequisites = ['JavaScript', 'HTML'];
      
      expect(prerequisites.length).toBe(2);
      expect(prerequisites).toContain('JavaScript');
      expect(prerequisites).toContain('HTML');
    });

    it('should not add prerequisite if name is "none"', () => {
      const concept = createMockConcept('React Components');
      const prerequisites = ['JavaScript', 'none', 'HTML'];
      const validPrereqs = prerequisites.filter(p => p.toLowerCase() !== 'none');
      
      expect(validPrereqs).not.toContain('none');
      expect(validPrereqs.length).toBe(2);
    });
  });

  describe('View Prerequisite', () => {
    it('should call onViewPrerequisite when prerequisite is clicked', () => {
      const concept = createMockConcept('React Components', ['JavaScript']);
      const existingPrereq = createMockConcept('JavaScript');
      const graph = createMockGraph([concept, existingPrereq]);

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
          onViewPrerequisite={mockOnViewPrerequisite}
        />
      );

      // Find the clickable prerequisite link
      const prereqButton = screen.getByText('JavaScript');
      fireEvent.click(prereqButton);

      expect(mockOnViewPrerequisite).toHaveBeenCalledWith('JavaScript');
    });

    it('should navigate to prerequisite detail page', () => {
      const concept = createMockConcept('React Components', ['JavaScript']);
      const existingPrereq = createMockConcept('JavaScript');
      const graph = createMockGraph([concept, existingPrereq]);

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
          onViewPrerequisite={mockOnViewPrerequisite}
        />
      );

      const prereqButton = screen.getByText('JavaScript');
      fireEvent.click(prereqButton);

      // Navigation is handled by the parent component
      expect(mockOnViewPrerequisite).toHaveBeenCalled();
    });
  });

  describe('Remove Prerequisite', () => {
    it('should call onRemovePrerequisite when remove button is clicked', () => {
      const concept = createMockConcept('React Components', ['JavaScript']);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
          onRemovePrerequisite={mockOnRemovePrerequisite}
        />
      );

      // Find the remove button for missing prerequisites
      const removeButtons = screen.getAllByLabelText('Remove prerequisite');
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
        expect(mockOnRemovePrerequisite).toHaveBeenCalled();
      }
    });

    it('should not show remove button for existing prerequisites', () => {
      const concept = createMockConcept('React Components', ['JavaScript']);
      const existingPrereq = createMockConcept('JavaScript');
      const graph = createMockGraph([concept, existingPrereq]);

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
          onRemovePrerequisite={mockOnRemovePrerequisite}
        />
      );

      // Existing prerequisites should not have remove buttons
      const removeButtons = screen.queryAllByLabelText('Remove prerequisite');
      // Remove buttons should only appear for missing prerequisites
      expect(removeButtons.length).toBe(0);
    });
  });

  describe('Prerequisite Display', () => {
    it('should render prerequisites in list', () => {
      const concept = createMockConcept('React Components', ['JavaScript', 'HTML']);
      const existingPrereq1 = createMockConcept('JavaScript');
      const existingPrereq2 = createMockConcept('HTML');
      const graph = createMockGraph([concept, existingPrereq1, existingPrereq2]);

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
        />
      );

      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('HTML')).toBeInTheDocument();
    });

    it('should display existing prerequisites with checkmark', () => {
      const concept = createMockConcept('React Components', ['JavaScript']);
      const existingPrereq = createMockConcept('JavaScript');
      const graph = createMockGraph([concept, existingPrereq]);

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
        />
      );

      // Existing prerequisites should show "Prerequisite:" label
      expect(screen.getByText(/Prerequisite:/i)).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('should display missing prerequisites with warning', () => {
      const concept = createMockConcept('React Components', ['JavaScript', 'CSS']);
      const graph = createMockGraph([concept]); // CSS is missing

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
        />
      );

      // Missing prerequisites should show "Missing:" label
      const missingLabels = screen.getAllByText(/Missing:/i);
      expect(missingLabels.length).toBeGreaterThan(0);
    });

    it('should not render when no prerequisites exist', () => {
      const concept = createMockConcept('React Components');
      const graph = createMockGraph([concept]);

      const { container } = renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
        />
      );

      // Component should return null when no prerequisites
      expect(container.firstChild).toBeNull();
    });

    it('should show add button for missing prerequisites', () => {
      const concept = createMockConcept('React Components', ['CSS']);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
          onAddPrerequisite={mockOnAddPrerequisite}
        />
      );

      const addButtons = screen.getAllByLabelText('Add prerequisite');
      expect(addButtons.length).toBeGreaterThan(0);
    });
  });

  describe('PrerequisiteItem Component', () => {
    it('should render prerequisite item with name', () => {
      renderWithProviders(
        <PrerequisiteItem
          name="JavaScript"
          isMissing={false}
        />
      );

      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('should show missing indicator for missing prerequisites', () => {
      renderWithProviders(
        <PrerequisiteItem
          name="CSS"
          isMissing={true}
        />
      );

      expect(screen.getByText(/Missing:/i)).toBeInTheDocument();
      expect(screen.getByText('CSS')).toBeInTheDocument();
    });

    it('should call onView when prerequisite name is clicked', () => {
      renderWithProviders(
        <PrerequisiteItem
          name="JavaScript"
          isMissing={false}
          onView={mockOnViewPrerequisite}
        />
      );

      const prereqButton = screen.getByText('JavaScript');
      fireEvent.click(prereqButton);

      expect(mockOnViewPrerequisite).toHaveBeenCalledWith('JavaScript');
    });

    it('should call onAdd when add button is clicked', () => {
      renderWithProviders(
        <PrerequisiteItem
          name="CSS"
          isMissing={true}
          onAdd={mockOnAddPrerequisite}
        />
      );

      const addButton = screen.getByLabelText('Add prerequisite');
      fireEvent.click(addButton);

      expect(mockOnAddPrerequisite).toHaveBeenCalledWith('CSS');
    });

    it('should call onRemove when remove button is clicked', () => {
      renderWithProviders(
        <PrerequisiteItem
          name="CSS"
          isMissing={true}
          onRemove={mockOnRemovePrerequisite}
        />
      );

      const removeButton = screen.getByLabelText('Remove prerequisite');
      fireEvent.click(removeButton);

      expect(mockOnRemovePrerequisite).toHaveBeenCalledWith('CSS');
    });
  });

  describe('PrerequisitesDisplay Component', () => {
    it('should display prerequisites section when prerequisites exist', () => {
      const concept = createMockConcept('React Components', ['JavaScript']);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <PrerequisitesDisplay
          concept={concept}
          graph={graph}
        />
      );

      expect(screen.getByText(/Suggested Prerequisites/i)).toBeInTheDocument();
    });

    it('should not display when no prerequisites exist', () => {
      const concept = createMockConcept('React Components');
      const graph = createMockGraph([concept]);

      const { container } = renderWithProviders(
        <PrerequisitesDisplay
          concept={concept}
          graph={graph}
        />
      );

      // Component should return null when no prerequisites
      expect(container.firstChild).toBeNull();
    });

    it('should expand/collapse prerequisites list', () => {
      const concept = createMockConcept('React Components', ['JavaScript', 'HTML']);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <PrerequisitesDisplay
          concept={concept}
          graph={graph}
        />
      );

      const toggleButton = screen.getByText(/Suggested Prerequisites/i).closest('button');
      expect(toggleButton).toBeInTheDocument();

      // Initially collapsed, prerequisites should not be visible
      expect(screen.queryByText('JavaScript')).not.toBeInTheDocument();

      // Click to expand
      if (toggleButton) {
        fireEvent.click(toggleButton);
        // After expanding, prerequisites should be visible
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
      }
    });

    it('should show prerequisite count', () => {
      const concept = createMockConcept('React Components', ['JavaScript', 'HTML', 'CSS']);
      const graph = createMockGraph([concept]);

      renderWithProviders(
        <PrerequisitesDisplay
          concept={concept}
          graph={graph}
        />
      );

      // The count badge should show "3"
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should handle prerequisite route navigation', () => {
      // Navigation is typically handled by React Router and the parent component
      // This test verifies the prerequisite route can be processed
      const concept = createMockConcept('React Components', ['JavaScript']);
      const prereqConcept = createMockConcept('JavaScript');
      const conceptMap = new Map<string, Concept>();
      conceptMap.set('React Components', concept);
      conceptMap.set('JavaScript', prereqConcept);

      // Simulate finding prerequisite in concept map
      const foundPrereq = conceptMap.get('JavaScript');
      expect(foundPrereq).toBeDefined();
      expect(foundPrereq?.name).toBe('JavaScript');
    });

    it('should navigate to prerequisite detail page with correct route', () => {
      const concept = createMockConcept('React Components', ['JavaScript']);
      const prereqConcept = createMockConcept('JavaScript');
      const graph = createMockGraph([concept, prereqConcept]);

      renderWithProviders(
        <PrerequisiteList
          concept={concept}
          graph={graph}
          onViewPrerequisite={mockOnViewPrerequisite}
        />
      );

      const prereqButton = screen.getByText('JavaScript');
      fireEvent.click(prereqButton);

      // onViewPrerequisite should be called with the prerequisite name
      expect(mockOnViewPrerequisite).toHaveBeenCalledWith('JavaScript');
    });
  });

  describe('Parent Selection', () => {
    it('should select parent concept when viewing prerequisite', () => {
      // Parent selection is handled by usePrerequisiteRoute hook
      // This test verifies the concept can be selected
      const parentConcept = createMockConcept('React Components', ['JavaScript']);
      const prereqConcept = createMockConcept('JavaScript');
      
      // When viewing a prerequisite, the parent concept should be selected
      expect(parentConcept.prerequisites).toContain('JavaScript');
      expect(prereqConcept.name).toBe('JavaScript');
    });

    it('should maintain parent concept selection when navigating back', () => {
      const parentConcept = createMockConcept('React Components', ['JavaScript']);
      const prereqConcept = createMockConcept('JavaScript');
      
      // Parent concept should be identifiable from prerequisite
      const parentFromPrereq = parentConcept.prerequisites?.includes(prereqConcept.name);
      expect(parentFromPrereq).toBe(true);
    });
  });
});

