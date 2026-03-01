import { useCallback } from 'react';
import { useGenerateNote, useCreateNote } from '../queries';
import { Note } from '../types';

export const useAIGeneratedNote = () => {
  const generateNote = useGenerateNote();
  const createNote = useCreateNote();

  const generateAndCreateNote = useCallback(async (
    prompt: string,
    parentId?: string,
    level: number = 0
  ) => {
    try {
      // First, generate the note content using AI
      const generatedData = await generateNote.mutateAsync(prompt);
      
      // Then create the note with the generated content
      const newNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'isExpanded'> = {
        title: generatedData.title,
        content: generatedData.content,
        tags: generatedData.tags,
        parentId,
        children: [],
        level
      };
      
      // Create the note
      await createNote.mutateAsync(newNote);
      
      return { success: true, data: generatedData };
    } catch (error) {
      console.error('Failed to generate and create note:', error);
      return { success: false, error };
    }
  }, [generateNote, createNote]);

  return {
    generateAndCreateNote,
    isGenerating: generateNote.isPending,
    isCreating: createNote.isPending,
    error: generateNote.error || createNote.error,
    reset: () => {
      generateNote.reset();
      createNote.reset();
    }
  };
};
