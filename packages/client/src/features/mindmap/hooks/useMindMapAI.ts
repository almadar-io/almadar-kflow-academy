import { Note } from '../../concepts/utils/graphHelpers';

interface UseMindMapAIProps {
  onEditNote: (note: Note) => void;
}

interface UseMindMapAIReturn {
  isGeneratingChildren: boolean;
  handleAIGenerateChildren: (parentNote: Note) => Promise<void>;
}

export const useMindMapAI = (_props: UseMindMapAIProps): UseMindMapAIReturn => {
  return {
    isGeneratingChildren: false,
    handleAIGenerateChildren: async () => {},
  };
};
