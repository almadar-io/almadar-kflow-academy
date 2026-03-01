import { useCallback, useEffect } from 'react';
import { Note } from '../../notes/types';
import { TreeNode, EditingState } from '../types/mindMapTypes';

interface UseMindMapKeyboardProps {
  isTreeContainerFocused: boolean;
  editingState: EditingState | null;
  selectedNote: Note | null;
  layoutType: 'horizontal' | 'vertical';
  onSelectNote: (note: Note) => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  openContentEditor: (note: Note) => void;
  handleAddChildNote: (note: Note) => void;
  findParentNote: (note: Note) => Note | null;
  findFirstChildNote: (note: Note) => Note | null;
  findMiddleChildNote: (note: Note) => Note | null;
  findPreviousSiblingNote: (note: Note) => Note | null;
  findNextSiblingNote: (note: Note) => Note | null;
  laidOutNodes: TreeNode[];
  containerWidth: number;
  containerHeight: number;
  setPan: (pan: { x: number; y: number }) => void;
}

interface UseMindMapKeyboardReturn {
  handleKeyDown: (e: KeyboardEvent) => void;
  handleArrowNavigation: (e: KeyboardEvent) => void;
}

export const useMindMapKeyboard = ({
  isTreeContainerFocused,
  editingState,
  selectedNote,
  layoutType,
  onSelectNote,
  onEditNote,
  onDeleteNote,
  openContentEditor,
  handleAddChildNote,
  findParentNote,
  findFirstChildNote,
  findMiddleChildNote,
  findPreviousSiblingNote,
  findNextSiblingNote,
  laidOutNodes,
  containerWidth,
  containerHeight,
  setPan
}: UseMindMapKeyboardProps): UseMindMapKeyboardReturn => {
  // Enhanced keyboard navigation with arrow keys
  const handleArrowNavigation = useCallback((e: KeyboardEvent) => {
    // Only handle arrow keys when tree container is focused
    if (!isTreeContainerFocused || editingState) return;
    
    // Arrow key navigation
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (!selectedNote) return;
      
      let nextNote: Note | null = null;
      
      if (layoutType === 'vertical') {
        // Vertical layout: left/right for parent/child, up/down for siblings
        switch (e.key) {
          case 'ArrowLeft':
            // Navigate to parent
            nextNote = findParentNote(selectedNote);
            break;
          case 'ArrowRight':
            // Navigate to middle child for more intuitive navigation
            nextNote = findMiddleChildNote(selectedNote);
            break;
          case 'ArrowUp':
            // Navigate to previous sibling
            nextNote = findPreviousSiblingNote(selectedNote);
            break;
          case 'ArrowDown':
            // Navigate to next sibling
            nextNote = findNextSiblingNote(selectedNote);
            break;
        }
      } else {
        // Horizontal layout: up/down for parent/child, left/right for siblings
        switch (e.key) {
          case 'ArrowUp':
            // Navigate to parent
            nextNote = findParentNote(selectedNote);
            break;
          case 'ArrowDown':
            // Navigate to first child
            nextNote = findFirstChildNote(selectedNote);
            break;
          case 'ArrowLeft':
            // Navigate to previous sibling
            nextNote = findPreviousSiblingNote(selectedNote);
            break;
          case 'ArrowRight':
            // Navigate to next sibling
            nextNote = findNextSiblingNote(selectedNote);
            break;
        }
      }
      
      if (nextNote) {
        onSelectNote(nextNote);
        // Center the view on the selected note
        const targetNode = laidOutNodes.find(node => node.id === nextNote!.id);
        if (targetNode) {
          const targetCenterX = targetNode.x;
          const targetCenterY = targetNode.y;
          const viewportCenterX = containerWidth / 2;
          const viewportCenterY = containerHeight / 2;
          const panOffsetX = viewportCenterX - targetCenterX;
          const panOffsetY = viewportCenterY - targetCenterY;
          setPan({ x: panOffsetX, y: panOffsetY });
          
          // Add visual feedback for keyboard navigation
          const nodeElement = document.querySelector(`[data-node-id="${nextNote.id}"]`);
          if (nodeElement) {
            nodeElement.classList.add('keyboard-navigated');
            setTimeout(() => {
              nodeElement.classList.remove('keyboard-navigated');
            }, 300);
          }
        }
      }
    }
  }, [
    isTreeContainerFocused, 
    selectedNote, 
    layoutType,
    findParentNote, 
    findFirstChildNote, 
    findMiddleChildNote,
    findPreviousSiblingNote, 
    findNextSiblingNote, 
    onSelectNote, 
    laidOutNodes, 
    containerWidth, 
    containerHeight, 
    editingState, 
    setPan
  ]);

  // General keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle keyboard shortcuts when tree container is focused
    if (!isTreeContainerFocused || editingState) return;
    
    if (e.ctrlKey && e.key === 'e' && selectedNote) {
      e.preventDefault();
      openContentEditor(selectedNote);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (selectedNote) {
        handleAddChildNote(selectedNote);
      }
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (selectedNote && selectedNote.parentId !== undefined) {
        onDeleteNote(selectedNote.id);
      }
    }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      if (selectedNote) {
        // Toggle expansion state
        const updatedNote = {
          ...selectedNote,
          isExpanded: !selectedNote.isExpanded
        };
        onEditNote(updatedNote);
      }
    }
  }, [
    isTreeContainerFocused, 
    editingState, 
    selectedNote, 
    openContentEditor, 
    handleAddChildNote, 
    onDeleteNote, 
    onEditNote
  ]);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    document.addEventListener('keydown', handleArrowNavigation);
    return () => document.removeEventListener('keydown', handleArrowNavigation);
  }, [handleArrowNavigation]);

  return {
    handleKeyDown,
    handleArrowNavigation
  };
};
