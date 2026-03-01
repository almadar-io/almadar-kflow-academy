/**
 * SelectLearningPathsDialog - Presentational Component
 * 
 * Dialog for selecting learning paths to publish as courses.
 */

import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/molecules/Modal';
import { Button } from '../../../components/atoms/Button';
import { ContentSelector, ContentSelectorItem } from '../../../components/organisms/ContentSelector';
import { Compass } from 'lucide-react';
import { useMentorPublishedCourses } from '../../knowledge-graph/hooks';
import type { Concept } from '../../concepts/types';

/**
 * Learning path entry for publishing selection
 * Simplified from ConceptGraph - only needs the ID for publishing
 */
export interface LearningPathEntry {
  graph: { id: string };
  seedConcept: Concept;
  conceptCount: number;
  levelCount: number;
}

interface SelectLearningPathsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  learningPaths: LearningPathEntry[];
  onSelected: (graphIds: string[]) => void;
}

const SelectLearningPathsDialog: React.FC<SelectLearningPathsDialogProps> = ({
  isOpen,
  onClose,
  learningPaths,
  onSelected,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Use the new graph-based hook to get published courses
  const { data: publishedCourses = [], isLoading: isLoadingCourses } = useMentorPublishedCourses();
  
  // Create a map of graphId -> course info for quick lookup
  const publishedCourseMap = useMemo(() => {
    const map = new Map<string, { title: string }>();
    publishedCourses.forEach(course => {
      map.set(course.graphId, { title: course.title });
    });
    return map;
  }, [publishedCourses]);

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const handleNext = () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one learning path');
      return;
    }
    onSelected(Array.from(selectedIds));
    onClose();
    setSelectedIds(new Set()); // Reset selection
  };

  // Convert learning paths to ContentSelectorItem format
  const selectorItems: ContentSelectorItem[] = learningPaths.map(({ graph, seedConcept, conceptCount, levelCount }) => {
    const publishedCourse = publishedCourseMap.get(graph.id);
    const badges: ContentSelectorItem['badges'] = [];
    
    if (publishedCourse) {
      badges.push({ label: 'Course Published', variant: 'success' });
    }

    let sublabel = `${conceptCount} concepts • ${levelCount} levels`;
    if (publishedCourse) {
      sublabel += ` • Course: ${publishedCourse.title}`;
    }
    if (seedConcept.description) {
      sublabel = `${seedConcept.description.slice(0, 80)}${seedConcept.description.length > 80 ? '...' : ''}\n${sublabel}`;
    }

    return {
      id: graph.id,
      label: seedConcept.name,
      sublabel,
      checked: selectedIds.has(graph.id),
      badges: badges.length > 0 ? badges : undefined,
    };
  });

  const footer = (
    <div className="flex justify-end gap-3">
      <Button
        variant="secondary"
        onClick={onClose}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleNext}
        disabled={selectedIds.size === 0}
      >
        Next ({selectedIds.size} selected)
      </Button>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Select Learning Paths to Publish" 
      size="lg"
      footer={footer}
    >
      <ContentSelector
        items={selectorItems}
        onSelectionChange={handleSelectionChange}
        loading={isLoadingCourses}
        selectAllLabel="Select All Learning Paths"
        emptyState={{
          icon: Compass,
          title: 'No learning paths available',
          description: 'Create a learning path first to publish it as a course.',
        }}
        maxHeight="384px"
      />
    </Modal>
  );
};

export default SelectLearningPathsDialog;
