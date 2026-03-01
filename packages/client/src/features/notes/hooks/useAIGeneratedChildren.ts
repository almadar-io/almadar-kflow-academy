import { useCallback } from 'react';
import { useGenerateChildren, useCreateNote } from '../queries';
import { Note } from '../types';

export const useAIGeneratedChildren = () => {
  const generateChildren = useGenerateChildren();
  const createNote = useCreateNote();

  const generateAndCreateChildren = useCallback(async (
    parentNote: Note
  ) => {
    try {
      // Generate children using AI
      const generatedData = await generateChildren.mutateAsync({
        parentTitle: parentNote.title,
        parentContent: parentNote.content || '',
        parentTags: parentNote.tags || []
      });
      
      // Create each generated child note
      const createdChildren = [];
      for (const childData of generatedData.children) {
        const newChildNote: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'isExpanded'> = {
          title: childData.title,
          content: childData.content,
          tags: childData.tags,
          parentId: parentNote.id,
          children: [],
          level: parentNote.level + 1
        };
        
        await createNote.mutateAsync(newChildNote);
        createdChildren.push(childData);
      }
      
      return { success: true, data: generatedData, createdChildren };
    } catch (error) {
      console.error('Failed to generate and create children:', error);
      return { success: false, error };
    }
  }, [generateChildren, createNote]);

  return {
    generateAndCreateChildren,
    isGenerating: generateChildren.isPending,
    isCreating: createNote.isPending,
    error: generateChildren.error || createNote.error,
    reset: () => {
      generateChildren.reset();
      createNote.reset();
    }
  };
};
