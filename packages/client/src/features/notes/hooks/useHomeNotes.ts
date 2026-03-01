import { useMemo } from 'react';
import { Note } from '../types';
import { useAppSelector } from '../../../app/hooks';

export const useHomeNotes = (searchQuery: string = '') => {
  const notes = useAppSelector(state => state.notes.notes);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return notes.filter(note => !note.parentId);
    }
    const query = searchQuery.toLowerCase();
    const filteredNotes = notes.filter(note => {
      return !note.parentId && (   // Only show root notes
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    );
    return filteredNotes;
  }, [notes, searchQuery]);

  return filteredNotes;
};
