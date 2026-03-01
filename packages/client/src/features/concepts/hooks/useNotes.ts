import { useCallback } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { Concept, NoteItem } from '../types';
import { updateConcept } from '../conceptSlice';

interface UseNotesParams {
  concept: Concept | null | undefined;
}

interface UseNotesReturn {
  notes: NoteItem[];
  addNote: (
    text: string,
    selectedText?: string,
    selectedTextChunks?: string[]
  ) => void;
  updateNote: (id: string, updates: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;
}

/**
 * Hook for managing notes on a concept
 * Handles adding, updating, deleting, and toggling notes
 */
export const useNotes = ({ concept }: UseNotesParams): UseNotesReturn => {
  const dispatch = useAppDispatch();

  // Ensure notes is always an array (handle legacy string data)
  const notes = (concept && Array.isArray(concept.notes)) ? concept.notes : [];

  const addNote = useCallback(
    (
      text: string,
      selectedText?: string,
      selectedTextChunks?: string[]
    ) => {
      if (!concept || !text.trim()) return;

      const newNote: NoteItem = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: text.trim(),
        selectedText,
        selectedTextChunks,
        timestamp: Date.now(),
      };

      const updatedNotes = [...notes, newNote];
      const updatedConcept: Concept = {
        ...concept,
        notes: updatedNotes,
      };

      dispatch(updateConcept(updatedConcept));
    },
    [concept, notes, dispatch]
  );

  const updateNote = useCallback(
    (id: string, updates: Partial<NoteItem>) => {
      if (!concept) return;

      const updatedNotes = notes.map((note) =>
        note.id === id ? { ...note, ...updates } : note
      );

      const updatedConcept: Concept = {
        ...concept,
        notes: updatedNotes,
      };

      dispatch(updateConcept(updatedConcept));
    },
    [concept, notes, dispatch]
  );

  const deleteNote = useCallback(
    (id: string) => {
      if (!concept) return;

      const updatedNotes = notes.filter((note) => note.id !== id);
      const updatedConcept: Concept = {
        ...concept,
        notes: updatedNotes,
      };

      dispatch(updateConcept(updatedConcept));
    },
    [concept, notes, dispatch]
  );

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
  };
};

