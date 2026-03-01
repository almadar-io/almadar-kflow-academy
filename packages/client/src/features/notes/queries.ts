import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NotesAPI, GenerateNoteResponse, GenerateChildrenResponse } from './NotesAPI';
import { Note } from './types';
import { useAppDispatch } from '../../app/hooks';
import { createNote, editNote, deleteNote } from './noteSlice';

// Query keys for React Query
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters: string) => [...noteKeys.lists(), { filters }] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
  search: (query: string) => [...noteKeys.all, 'search', query] as const,
};

// Hook for generating note content using AI
export const useGenerateNote = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: NotesAPI.generateNote,
    onSuccess: (data: GenerateNoteResponse) => {
      // Invalidate and refetch notes to show the new content
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      
      // You can also dispatch to Redux if needed for immediate UI updates
      // dispatch(updateNoteContent(data));
    },
    onError: (error: Error) => {
      console.error('Failed to generate note:', error);
      // You could dispatch an error action to Redux here
    },
  });
};

// Hook for generating children notes using AI
export const useGenerateChildren = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ parentTitle, parentContent, parentTags }: {
      parentTitle: string;
      parentContent: string;
      parentTags: string[];
    }) => NotesAPI.generateChildren(parentTitle, parentContent, parentTags),
    onSuccess: (data: GenerateChildrenResponse) => {
      // Invalidate and refetch notes to show the new children
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      
      // You can also dispatch to Redux if needed for immediate UI updates
      // dispatch(addChildrenNotes(data.children));
    },
    onError: (error: Error) => {
      console.error('Failed to generate children:', error);
      // You could dispatch an error action to Redux here
    },
  });
};

// Hook for creating a new note
export const useCreateNote = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'isExpanded'>) => {
      // For now, we'll use Redux directly since that's the current implementation
      // In the future, this could call an API endpoint
      return Promise.resolve(noteData);
    },
    onMutate: async (newNote) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() });

      // Snapshot the previous value
      const previousNotes = queryClient.getQueryData(noteKeys.lists());

      // Optimistically update to the new value
      queryClient.setQueryData(noteKeys.lists(), (old: Note[] | undefined) => {
        if (!old) return old;
        return [...old, { ...newNote, id: 'temp-id', createdAt: new Date(), updatedAt: new Date(), isExpanded: false }];
      });

      // Return a context object with the snapshotted value
      return { previousNotes };
    },
    onSuccess: (newNote, variables) => {
      // Dispatch to Redux for immediate state update
      dispatch(createNote(variables));
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
    onError: (err, newNote, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousNotes) {
        queryClient.setQueryData(noteKeys.lists(), context.previousNotes);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
};

// Hook for editing a note
export const useEditNote = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note: Note) => {
      // For now, we'll use Redux directly since that's the current implementation
      // In the future, this could call an API endpoint
      return Promise.resolve(note);
    },
    onMutate: async (updatedNote) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.detail(updatedNote.id) });

      const previousNote = queryClient.getQueryData(noteKeys.detail(updatedNote.id));

      queryClient.setQueryData(noteKeys.detail(updatedNote.id), updatedNote);

      return { previousNote };
    },
    onSuccess: (updatedNote) => {
      dispatch(editNote(updatedNote));
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(updatedNote.id) });
    },
    onError: (err, updatedNote, context) => {
      if (context?.previousNote) {
        queryClient.setQueryData(noteKeys.detail(updatedNote.id), context.previousNote);
      }
    },
    onSettled: (updatedNote) => {
      if (updatedNote) {
        queryClient.invalidateQueries({ queryKey: noteKeys.detail(updatedNote.id) });
      }
    },
  });
};

// Hook for deleting a note
export const useDeleteNote = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => {
      // For now, we'll use Redux directly since that's the current implementation
      // In the future, this could call an API endpoint
      return Promise.resolve(noteId);
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() });

      const previousNotes = queryClient.getQueryData(noteKeys.lists());

      queryClient.setQueryData(noteKeys.lists(), (old: Note[] | undefined) => {
        if (!old) return old;
        return old.filter(note => note.id !== noteId);
      });

      return { previousNotes };
    },
    onSuccess: (noteId) => {
      dispatch(deleteNote(noteId));
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
    onError: (err, noteId, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(noteKeys.lists(), context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
};

// Hook for searching notes (if you want to move search to React Query)
export const useSearchNotes = (searchQuery: string) => {
  return useQuery({
    queryKey: noteKeys.search(searchQuery),
    queryFn: async () => {
      // For now, this is a placeholder since search is handled in Redux
      // In the future, this could call an API endpoint for server-side search
      return Promise.resolve([]);
    },
    enabled: searchQuery.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for getting all notes (if you want to move notes fetching to React Query)
export const useNotes = () => {
  return useQuery({
    queryKey: noteKeys.lists(),
    queryFn: async () => {
      // For now, this is a placeholder since notes are stored in Redux
      // In the future, this could call an API endpoint to fetch notes
      return Promise.resolve([]);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
