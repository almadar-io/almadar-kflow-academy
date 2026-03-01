import { useState, useCallback, useMemo } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { updateConcept } from '../../concepts/conceptSlice';
import { Concept } from '../types';
import { wouldCreateCircularDependency } from '../../concepts/utils/graphHelpers';

interface UseConceptReorderProps {
  concepts: Concept[];
  conceptMap?: Map<string, Concept>;
}

export const useConceptReorder = ({ concepts, conceptMap }: UseConceptReorderProps) => {
  const dispatch = useAppDispatch();
  const [draggedConcept, setDraggedConcept] = useState<Concept | null>(null);
  const [dragOverConcept, setDragOverConcept] = useState<Concept | null>(null);

  // Sort concepts by sequence for proper ordering
  const sortedConcepts = useMemo(() => {
    return [...concepts].sort((a, b) => {
      if (a.sequence === undefined && b.sequence === undefined) return 0;
      if (a.sequence === undefined) return 1;
      if (b.sequence === undefined) return -1;
      return a.sequence - b.sequence;
    });
  }, [concepts]);

  // Handle reordering within the same layer or within a parent's children
  const handleReorder = useCallback((draggedConcept: Concept, targetIndex: number, parentConcept?: Concept) => {
    if (!conceptMap) return;

    // If we're reordering within a parent's children, update the parent's children array
    if (parentConcept) {
      const parentChildren = parentConcept.children
        .map(childName => conceptMap.get(childName))
        .filter((c): c is Concept => c !== undefined);
      
      const draggedIndex = parentChildren.findIndex(c => c.name === draggedConcept.name);
      if (draggedIndex === -1 || targetIndex === draggedIndex) return;

      // Create new array with reordered children
      const newOrder = [...parentChildren];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, removed);

      // Update parent's children array to reflect new order
      const updatedParent: Concept = {
        ...parentConcept,
        children: newOrder.map(c => c.name),
      };

      // Calculate new sequences based on new order
      const baseSequence = Date.now();
      const updatedChildren: Concept[] = newOrder.map((concept, index) => ({
        ...concept,
        sequence: baseSequence + index,
      }));

      // Update parent and all affected children in Redux
      dispatch(updateConcept(updatedParent));
      updatedChildren.forEach(concept => {
        dispatch(updateConcept(concept));
      });
    } else {
      // Reordering at layer level (no parent)
      const draggedIndex = sortedConcepts.findIndex(c => c.name === draggedConcept.name);
      if (draggedIndex === -1 || targetIndex === draggedIndex) return;

      // Create new array with reordered concepts
      const newOrder = [...sortedConcepts];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, removed);

      // Calculate new sequences based on new order
      const baseSequence = Date.now();
      const updatedConcepts: Concept[] = newOrder.map((concept, index) => ({
        ...concept,
        sequence: baseSequence + index,
      }));

      // Update all affected concepts in Redux
      updatedConcepts.forEach(concept => {
        dispatch(updateConcept(concept));
      });
    }
  }, [conceptMap, sortedConcepts, dispatch]);

  // Handle adding a concept as a child of another
  const handleAddAsChild = useCallback((draggedConcept: Concept, parentConcept: Concept) => {
    if (!conceptMap) return;

    // Check if already a child
    if (parentConcept.children.includes(draggedConcept.name)) {
      return; // Already a child
    }

    // Check for circular dependency - central validation
    if (wouldCreateCircularDependency(draggedConcept, parentConcept, conceptMap)) {
      alert(
        `Cannot add "${draggedConcept.name}" as a child of "${parentConcept.name}".\n\n` +
        `This would create a circular dependency because "${parentConcept.name}" (or one of its descendants) ` +
        `is already an ancestor of "${draggedConcept.name}".`
      );
      return;
    }

    // Update parent concept to include dragged concept as child
    const updatedParent: Concept = {
      ...parentConcept,
      children: [...parentConcept.children, draggedConcept.name],
    };

    // Update dragged concept to include parent (add to existing parents if not already there)
    const updatedDragged: Concept = {
      ...draggedConcept,
      parents: draggedConcept.parents.includes(parentConcept.name)
        ? draggedConcept.parents
        : [...draggedConcept.parents, parentConcept.name],
    };

    // Remove from old parents' children lists
    const oldParents = draggedConcept.parents;
    const updatedOldParents: Concept[] = oldParents.map(parentName => {
      const oldParent = conceptMap.get(parentName);
      if (!oldParent) return null;
      return {
        ...oldParent,
        children: oldParent.children.filter(c => c !== draggedConcept.name),
      };
    }).filter((c): c is Concept => c !== null);

    // Update all affected concepts
    dispatch(updateConcept(updatedParent));
    dispatch(updateConcept(updatedDragged));
    updatedOldParents.forEach(parent => {
      dispatch(updateConcept(parent));
    });
  }, [conceptMap, dispatch]);

  // Drag state handlers
  const handleDragStart = useCallback((concept: Concept) => {
    setDraggedConcept(concept);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedConcept(null);
    setDragOverConcept(null);
    // Clear all drag state to ensure no drop zones remain visible
  }, []);

  const handleDragOver = useCallback((concept: Concept) => {
    setDragOverConcept(concept);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverConcept(null);
  }, []);

  const handleDrop = useCallback(() => {
    setDragOverConcept(null);
  }, []);

  return {
    sortedConcepts,
    draggedConcept,
    dragOverConcept,
    handleReorder,
    handleAddAsChild,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};

