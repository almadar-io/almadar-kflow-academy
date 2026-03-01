import { useCallback } from 'react';
import { Note } from '../../notes/types';
import { TreeNode } from '../types/mindMapTypes';
import { 
  findParentNote, 
  findFirstChildNote, 
  findMiddleChildNote,
  findPreviousSiblingNote, 
  findNextSiblingNote 
} from '../utils/mindMapUtils';

interface UseMindMapNavigationProps {
  notes: Note[];
  selectedNote: Note | null;
  laidOutNodes: TreeNode[];
  onSelectNote: (note: Note) => void;
}

interface UseMindMapNavigationReturn {
  findParentNote: (note: Note) => Note | null;
  findFirstChildNote: (note: Note) => Note | null;
  findMiddleChildNote: (note: Note) => Note | null;
  findPreviousSiblingNote: (note: Note) => Note | null;
  findNextSiblingNote: (note: Note) => Note | null;
  navigateToNote: (note: Note) => void;
}

export const useMindMapNavigation = ({ 
  notes, 
  selectedNote, 
  laidOutNodes, 
  onSelectNote 
}: UseMindMapNavigationProps): UseMindMapNavigationReturn => {
  const navigateToNote = useCallback((note: Note) => {
    onSelectNote(note);
  }, [onSelectNote]);

  return {
    findParentNote: useCallback((note: Note) => findParentNote(note, notes), [notes]),
    findFirstChildNote: useCallback((note: Note) => findFirstChildNote(note, notes, laidOutNodes), [notes, laidOutNodes]),
    findMiddleChildNote: useCallback((note: Note) => findMiddleChildNote(note, notes, laidOutNodes), [notes, laidOutNodes]),
    findPreviousSiblingNote: useCallback((note: Note) => findPreviousSiblingNote(note, notes, laidOutNodes), [notes, laidOutNodes]),
    findNextSiblingNote: useCallback((note: Note) => findNextSiblingNote(note, notes, laidOutNodes), [notes, laidOutNodes]),
    navigateToNote
  };
};
