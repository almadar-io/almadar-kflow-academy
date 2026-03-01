import { useState, useCallback } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { createConceptGraphAndPersist } from '../conceptThunks';
import { store } from '../../../app/store';

export type ConceptDifficulty = 'beginner' | 'intermediate' | 'advanced';

interface UseCreateConceptReturn {
  showModal: boolean;
  setShowModal: (value: boolean) => void;
  newConceptName: string;
  setConceptName: (value: string) => void;
  newConceptDescription: string;
  setConceptDescription: (value: string) => void;
  difficulty: ConceptDifficulty;
  setDifficulty: (value: ConceptDifficulty) => void;
  isPendingNavigate: boolean;
  setPendingNavigate: (value: boolean) => void;
  handleCreateConcept: (goalFocused?: boolean) => Promise<string | null>; // Returns graphId
}

export const useCreateConcept = (): UseCreateConceptReturn => {
  const dispatch = useAppDispatch();

  const [showModal, setShowModal] = useState(false);
  const [newConceptName, setConceptName] = useState('');
  const [newConceptDescription, setConceptDescription] = useState('');
  const [difficulty, setDifficulty] = useState<ConceptDifficulty>('beginner');
  const [isPendingNavigate, setPendingNavigate] = useState(false);

  const handleCreateConcept = useCallback(async (goalFocused: boolean = false): Promise<string | null> => {
    if (!newConceptName.trim()) return null;

    const difficultyPrefix =
      difficulty === 'beginner'
        ? 'For beginner learners. '
        : difficulty === 'intermediate'
          ? 'For intermediate learners. '
          : 'For advanced learners. ';

    try {
      // Store the current graphId before creation to detect if a new graph was actually created
      const stateBefore = store.getState();
      const previousGraphId = stateBefore.concepts?.currentGraphId || null;
      
      await dispatch(createConceptGraphAndPersist({
        name: newConceptName.trim(),
        description: `${difficultyPrefix}${newConceptDescription.trim()}`,
        parents: [],
        children: [],
        layer: 0,
        focus: newConceptDescription.trim() || undefined,
        difficulty: difficulty,
      }, goalFocused));
      
      // Get the graphId from Redux store after dispatch
      // Use a small delay to ensure state is updated
      const graphId = await new Promise<string | null>((resolve) => {
        setTimeout(() => {
          const state = store.getState();
          const newGraphId = state.concepts?.currentGraphId || null;
          
          // Only return the graphId if it's different from before (meaning a new graph was created)
          // If it's the same or null, it means creation failed
          if (newGraphId && newGraphId !== previousGraphId) {
            resolve(newGraphId);
          } else {
            resolve(null);
          }
        }, 100);
      });

      // Only close modal and reset form if graph was successfully created
      if (graphId) {
        setShowModal(false);
        setConceptName('');
        setConceptDescription('');
        setDifficulty('beginner');
      }

      return graphId;
    } catch (error) {
      console.error('Failed to create concept graph:', error);
      return null;
    }
  }, [dispatch, newConceptName, newConceptDescription, difficulty]);

  return {
    showModal,
    setShowModal,
    newConceptName,
    setConceptName,
    newConceptDescription,
    setConceptDescription,
    difficulty,
    setDifficulty,
    isPendingNavigate,
    setPendingNavigate,
    handleCreateConcept,
  };
};


