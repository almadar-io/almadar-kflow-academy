import { useState, useCallback } from 'react';
import { Concept } from '../types';
import { wouldCreateCircularDependency } from '../../concepts/utils/graphHelpers';

interface UseConceptDragHandlersProps {
  concept: Concept;
  conceptMap?: Map<string, Concept>;
  siblingConcepts?: Concept[];
  parentConcept?: Concept;
  onDragStart?: (concept: Concept) => void;
  onDragEnd?: () => void;
  onDragOver?: (concept: Concept) => void;
  onDragLeave?: () => void;
  onDrop?: (concept: Concept) => void;
  onReorder?: (draggedConcept: Concept, targetIndex: number, parentConcept?: Concept) => void;
  onAddAsChild?: (draggedConcept: Concept, parentConcept: Concept) => void;
  onExpand?: (concept: Concept) => void; // Callback to expand concept when dragging over
  draggedConcept?: Concept | null; // The concept currently being dragged (if any)
}

export const useConceptDragHandlers = ({
  concept,
  conceptMap,
  siblingConcepts = [],
  parentConcept,
  onDragStart,
  onDragEnd,
  onDragOver: handleDragOver,
  onDragLeave,
  onDrop: handleDrop,
  onReorder,
  onAddAsChild,
  onExpand,
  draggedConcept,
}: UseConceptDragHandlersProps) => {
  const [localIsDragOver, setLocalIsDragOver] = useState(false);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    setIsDraggingLocal(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', concept.id || concept.name);
    if (onDragStart) {
      onDragStart(concept);
    }
  }, [concept, onDragStart]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    // Clear all drag state immediately to hide all drop zones
    setLocalIsDragOver(false);
    setDropPosition(null);
    setIsDraggingLocal(false);
    // Also clear parent drag over state
    if (onDragLeave) {
      onDragLeave();
    }
    if (onDragEnd) {
      onDragEnd();
    }
  }, [onDragEnd, onDragLeave]);

  const handleDragOverCard = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Check if the drag is actually over this card or a nested child
    // If it's over a nested child, don't process it here (let the child handle it)
    const target = e.currentTarget as HTMLElement;
    const cardContent = target.querySelector('.card-content') as HTMLElement;
    if (!cardContent) return;
    
    // Check if the event target is inside a nested child card
    // Nested children are rendered inside this card, so we need to check if the target
    // is actually a nested child card element, not this card's content
    const eventTarget = e.target as HTMLElement;
    if (eventTarget) {
      // Walk up the DOM tree to see if we're inside a nested child card
      let currentElement: HTMLElement | null = eventTarget;
      const currentConceptId = target.getAttribute('data-concept-id');
      
      while (currentElement && currentElement !== target) {
        // Check if this element is a nested child card (has data-concept-id different from this card)
        const elementConceptId = currentElement.getAttribute('data-concept-id');
        if (elementConceptId && elementConceptId !== currentConceptId) {
          // This is a nested child card, let it handle the drag
          return;
        }
        // Also check if it has its own .card-content (another way to identify nested cards)
        if (currentElement !== cardContent && currentElement.querySelector('.card-content')) {
          const nestedCardContent = currentElement.querySelector('.card-content') as HTMLElement;
          if (nestedCardContent && nestedCardContent !== cardContent) {
            return; // This is a nested child card, let it handle the drag
          }
        }
        currentElement = currentElement.parentElement;
      }
    }
    
    // Check if the mouse is actually over this card's content area, not a nested child
    const rect = cardContent.getBoundingClientRect();
    const mouseY = e.clientY;
    const mouseX = e.clientX;
    
    // If mouse is outside the card content bounds, it might be over a nested child
    if (mouseY < rect.top || mouseY > rect.bottom || mouseX < rect.left || mouseX > rect.right) {
      return; // Let nested children handle it
    }
    
    setLocalIsDragOver(true);
    
    // Determine drop position based on mouse position
    const cardTop = rect.top;
    const cardBottom = rect.bottom;
    const cardHeight = rect.height;
    
    // Use smaller detection zones for before/after (top and bottom 25% of the card)
    // This makes the "inside" zone much larger (middle 50%), making it easier to drop as child
    const topZone = cardTop + (cardHeight * 0.25);
    const bottomZone = cardBottom - (cardHeight * 0.25);
    
    let position: 'before' | 'after' | 'inside' = 'inside';
    if (mouseY < topZone) {
      position = 'before';
    } else if (mouseY > bottomZone) {
      position = 'after';
    } else {
      position = 'inside';
      // Auto-expand when dragging inside a concept with children
      // But don't expand if this is the concept being dragged (don't expand its own children)
      if (onExpand && concept.children && concept.children.length > 0 && 
          (!draggedConcept || draggedConcept.name !== concept.name)) {
        onExpand(concept);
      }
    }
    
    setDropPosition(position);
    
    if (handleDragOver) {
      handleDragOver(concept);
    }
  }, [concept, handleDragOver, onExpand]);

  const handleDragLeaveCard = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    // Only clear if we're leaving the card itself, not a child
    if (e.currentTarget === e.target) {
      setLocalIsDragOver(false);
      setDropPosition(null);
      if (onDragLeave) {
        onDragLeave();
      }
    }
  }, [onDragLeave]);

  const handleDropCard = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalIsDragOver(false);
    setDropPosition(null);

    const draggedConceptId = e.dataTransfer.getData('text/plain');
    if (!draggedConceptId || !conceptMap) return;

    const draggedConcept = Array.from(conceptMap.values()).find(
      c => (c.id || c.name) === draggedConceptId
    );

    if (!draggedConcept || draggedConcept.name === concept.name) return;

    // Determine final drop position
    // Try to find the main card content area (not including children)
    const target = e.currentTarget as HTMLElement;
    const cardContent = target.querySelector('.card-content') as HTMLElement;
    
    // If no card content found, this might be a nested child - let it handle its own drop
    if (!cardContent) return;
    
    // Check if the event target is inside a nested child card
    // Nested children are rendered inside this card, so we need to check if the target
    // is actually a nested child card element, not this card's content
    const eventTarget = e.target as HTMLElement;
    if (eventTarget) {
      // Walk up the DOM tree to see if we're inside a nested child card
      let currentElement: HTMLElement | null = eventTarget;
      const currentConceptId = target.getAttribute('data-concept-id');
      
      while (currentElement && currentElement !== target) {
        // Check if this element is a nested child card (has data-concept-id different from this card)
        const elementConceptId = currentElement.getAttribute('data-concept-id');
        if (elementConceptId && elementConceptId !== currentConceptId) {
          // This is a nested child card, let it handle the drop
          return;
        }
        // Also check if it has its own .card-content (another way to identify nested cards)
        if (currentElement !== cardContent && currentElement.querySelector('.card-content')) {
          const nestedCardContent = currentElement.querySelector('.card-content') as HTMLElement;
          if (nestedCardContent && nestedCardContent !== cardContent) {
            return; // This is a nested child card, let it handle the drop
          }
        }
        currentElement = currentElement.parentElement;
      }
    }
    
    // Check if the drop is actually over this card's content area, not a nested child
    const rect = cardContent.getBoundingClientRect();
    const mouseY = e.clientY;
    const mouseX = e.clientX;
    
    // If mouse is outside the card content bounds, it might be over a nested child
    if (mouseY < rect.top || mouseY > rect.bottom || mouseX < rect.left || mouseX > rect.right) {
      return; // Let nested children handle it
    }
    
    const cardTop = rect.top;
    const cardBottom = rect.bottom;
    const cardHeight = rect.height;
    
    // Use smaller detection zones for before/after (top and bottom 25% of the card)
    // This makes the "inside" zone much larger (middle 50%), making it easier to drop as child
    const topZone = cardTop + (cardHeight * 0.25);
    const bottomZone = cardBottom - (cardHeight * 0.25);
    
    const finalPosition = mouseY < topZone ? 'before' : mouseY > bottomZone ? 'after' : 'inside';

    // Priority 1: If dropping "inside", always try to add as child (unless it's the same concept)
    if (finalPosition === 'inside' && draggedConcept.name !== concept.name) {
      // Add as child - check for circular dependency first
      if (conceptMap && wouldCreateCircularDependency(draggedConcept, concept, conceptMap)) {
        // Don't proceed with the drop - the check in handleAddAsChild will show the alert
        return;
      }
      if (onAddAsChild) {
        onAddAsChild(draggedConcept, concept);
        // Clear all drag state after drop
        setLocalIsDragOver(false);
        setDropPosition(null);
        if (handleDrop) {
          handleDrop(concept);
        }
        // Also trigger drag end to ensure parent state is cleared
        if (onDragEnd) {
          onDragEnd();
        }
        return; // Early return to prevent other logic from running
      }
    }

    // Priority 2: If dropping "before" or "after" and both are siblings, reorder
    if ((finalPosition === 'before' || finalPosition === 'after') &&
        siblingConcepts.length > 0 && 
        siblingConcepts.some(c => c.name === draggedConcept.name) &&
        siblingConcepts.some(c => c.name === concept.name)) {
      // Reorder within same layer or within parent's children
      let targetIndex = siblingConcepts.findIndex(c => c.name === concept.name);
      if (finalPosition === 'after') {
        targetIndex += 1;
      }
      if (onReorder && targetIndex !== -1) {
        onReorder(draggedConcept, targetIndex, parentConcept);
        // Clear all drag state after drop
        setLocalIsDragOver(false);
        setDropPosition(null);
        if (handleDrop) {
          handleDrop(concept);
        }
        // Also trigger drag end to ensure parent state is cleared
        if (onDragEnd) {
          onDragEnd();
        }
        return; // Early return to prevent other logic from running
      }
    }

    // Priority 3: Dropping before/after but not in same layer - treat as reorder if possible
    if ((finalPosition === 'before' || finalPosition === 'after') &&
        siblingConcepts.length > 0 && 
        siblingConcepts.some(c => c.name === draggedConcept.name)) {
      let targetIndex = siblingConcepts.findIndex(c => c.name === concept.name);
      if (finalPosition === 'after') {
        targetIndex += 1;
      }
      if (onReorder && targetIndex !== -1) {
        onReorder(draggedConcept, targetIndex, parentConcept);
      }
    }

    // Clear all drag state after drop
    setLocalIsDragOver(false);
    setDropPosition(null);
    
    if (handleDrop) {
      handleDrop(concept);
    }
    
    // Also trigger drag end to ensure parent state is cleared
    if (onDragEnd) {
      onDragEnd();
    }
  }, [concept, conceptMap, siblingConcepts, parentConcept, onReorder, onAddAsChild, handleDrop, onDragEnd]);

  // Helper function to handle drop on drop zones with a specific position
  const handleDropZone = useCallback((e: React.DragEvent, position: 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedConceptId = e.dataTransfer.getData('text/plain');
    if (!draggedConceptId || !conceptMap) return;

    const draggedConcept = Array.from(conceptMap.values()).find(
      c => (c.id || c.name) === draggedConceptId
    );

    if (!draggedConcept || draggedConcept.name === concept.name) return;

    // Check if both concepts are siblings
    const isDraggedSibling = siblingConcepts.some(c => c.name === draggedConcept.name);
    const isTargetSibling = siblingConcepts.some(c => c.name === concept.name);

    if (isDraggedSibling && isTargetSibling) {
      // Both are siblings - just reorder
      let targetIndex = siblingConcepts.findIndex(c => c.name === concept.name);
      if (position === 'after') {
        targetIndex += 1;
      }
      if (onReorder && targetIndex !== -1) {
        onReorder(draggedConcept, targetIndex, parentConcept);
        // Clear all drag state after drop
        if (handleDrop) {
          handleDrop(concept);
        }
        // Also trigger drag end to ensure parent state is cleared
        if (onDragEnd) {
          onDragEnd();
        }
      }
    } else if (!isDraggedSibling && isTargetSibling && parentConcept) {
      // Dragged concept is not a sibling, but target is - move dragged concept to be a sibling
      // Use the existing addAsChild handler which handles all the parent/child updates
      if (onAddAsChild) {
        onAddAsChild(draggedConcept, parentConcept);
        
        // Then reorder it to the correct position
        // We need to wait for the Redux update to complete
        setTimeout(() => {
          let targetIndex = siblingConcepts.findIndex(c => c.name === concept.name);
          if (position === 'after') {
            targetIndex += 1;
          }
          // Account for the newly added sibling
          if (onReorder && targetIndex !== -1) {
            onReorder(draggedConcept, targetIndex + 1, parentConcept);
          }
        }, 100);
      }
      
      // Clear all drag state after drop
      if (handleDrop) {
        handleDrop(concept);
      }
      if (onDragEnd) {
        onDragEnd();
      }
    }
    // If neither are siblings or other cases, do nothing (user should drop on card itself)
  }, [concept, conceptMap, siblingConcepts, parentConcept, onReorder, onAddAsChild, handleDrop, onDragEnd]);

  return {
    localIsDragOver,
    isDraggingLocal,
    dropPosition,
    handleDragStart,
    handleDragEnd,
    handleDragOverCard,
    handleDragLeaveCard,
    handleDropCard,
    handleDropZone,
  };
};

