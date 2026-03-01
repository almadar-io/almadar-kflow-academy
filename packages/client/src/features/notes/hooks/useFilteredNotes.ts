import { useMemo } from 'react';
import { Note } from '../types';
import { useAppSelector } from '../../../app/hooks';

export const useFilteredNotes = (searchQuery: string = '') => {
  const notes = useAppSelector(state => state.notes.notes);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return notes;
    }

    const query = searchQuery.toLowerCase();
    return notes.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [notes, searchQuery]);

  return filteredNotes;
};
