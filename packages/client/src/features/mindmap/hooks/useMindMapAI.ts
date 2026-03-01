import { useCallback } from 'react';
import { Note } from '../../notes/types';
import { useAppDispatch } from '../../../app/hooks';
import { aiGenerateChildren } from '../../notes/noteSlice';
import { useGenerateChildren } from '../../notes/queries';

interface UseMindMapAIProps {
  onEditNote: (note: Note) => void;
}

interface UseMindMapAIReturn {
  isGeneratingChildren: boolean;
  handleAIGenerateChildren: (parentNote: Note) => Promise<void>;
}

export const useMindMapAI = ({ onEditNote }: UseMindMapAIProps): UseMindMapAIReturn => {
  const dispatch = useAppDispatch();
  const { mutateAsync: generateChildren, isPending: isGeneratingChildren } = useGenerateChildren();

  const handleAIGenerateChildren = useCallback(async (parentNote: Note) => {
    try {
      // Use the React Query hook to generate children
      const data = await generateChildren({
        parentTitle: parentNote.title,
        parentContent: parentNote.content || '',
        parentTags: parentNote.tags || []
      });
      
      // Dispatch the aiGenerateChildren action with the generated children
      dispatch(aiGenerateChildren({
        parentId: parentNote.id,
        children: data.children
      }));

    } catch (error) {
      console.error('Error generating children:', error);
      
      // Show error message (you could add a toast notification here)
      alert('Failed to generate children. Please try again.');
    }
  }, [dispatch, generateChildren]);

  return {
    isGeneratingChildren,
    handleAIGenerateChildren
  };
};
