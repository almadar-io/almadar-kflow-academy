import { useCallback } from 'react';
import { AppDispatch } from '../../../app/store';
import { Concept, UserProgress, BloomLevel } from '../types';
import { updateConcept } from '../conceptSlice';
import { userProgressApi } from '../userProgressApi';

interface UseUserProgressParams {
  dispatch: AppDispatch;
  concept?: Concept;
  graphId?: string;
}

/**
 * Hook for managing user progress on a concept
 * Handles activation responses, reflection notes, and Bloom's taxonomy practice
 */
export const useUserProgress = ({
  dispatch,
  concept,
  graphId,
}: UseUserProgressParams) => {
  // Helper to update concept with new user progress
  const updateProgress = useCallback(
    async (progressUpdates: Partial<UserProgress>) => {
      if (!concept) return;
      
      const currentProgress = concept.userProgress || {};
      const newProgress: UserProgress = {
        ...currentProgress,
        ...progressUpdates,
        lastStudied: new Date(),
      };

      const updatedConcept: Concept = {
        ...concept,
        userProgress: newProgress,
      };

      // Dispatch to Redux store
      dispatch(updateConcept(updatedConcept));

      // Persist to backend (fire and forget - don't block UI)
      const conceptId = concept.name || concept.id;
      userProgressApi.saveUserProgress(conceptId, {
        conceptName: concept.name,
        graphId,
        masteryLevel: newProgress.masteryLevel,
        activationResponse: newProgress.activationResponse,
        reflectionNotes: newProgress.reflectionNotes,
        bloomAnswered: newProgress.bloomAnswered,
        bloomLevelsCompleted: newProgress.bloomLevelsCompleted,
      }).catch((error) => {
        console.error('Failed to persist user progress:', error);
        // Don't throw - allow local state update even if backend fails
      });

      return newProgress;
    },
    [dispatch, concept, graphId]
  );

  /**
   * Save user's response to the pre-lesson activation question
   */
  const saveActivationResponse = useCallback(
    (response: string) => {
      return updateProgress({ activationResponse: response });
    },
    [updateProgress]
  );

  /**
   * Save a reflection note at a specific index
   */
  const saveReflectionNote = useCallback(
    (index: number, note: string) => {
      if (!concept) return;
      
      const currentNotes = concept.userProgress?.reflectionNotes || [];
      const updatedNotes = [...currentNotes];
      updatedNotes[index] = note;
      
      return updateProgress({ reflectionNotes: updatedNotes });
    },
    [updateProgress, concept]
  );

  /**
   * Mark a Bloom's taxonomy question as answered
   */
  const markBloomQuestionAnswered = useCallback(
    (questionIndex: number, level: BloomLevel) => {
      if (!concept) return;
      
      const currentAnswered = concept.userProgress?.bloomAnswered || {};
      const currentLevelsCompleted = concept.userProgress?.bloomLevelsCompleted || [];

      const updatedAnswered = { ...currentAnswered, [questionIndex]: true };
      const levelsSet = new Set([...currentLevelsCompleted, level]);
      const updatedLevels = Array.from(levelsSet);

      return updateProgress({
        bloomAnswered: updatedAnswered,
        bloomLevelsCompleted: updatedLevels,
      });
    },
    [updateProgress, concept]
  );


  /**
   * Update mastery level (0=not started, 1=learning, 2=practiced, 3=mastered)
   */
  const updateMasteryLevel = useCallback(
    (level: 0 | 1 | 2 | 3) => {
      return updateProgress({ masteryLevel: level });
    },
    [updateProgress]
  );

  /**
   * Calculate mastery level based on completion
   */
  const calculateMasteryLevel = useCallback((): 0 | 1 | 2 | 3 => {
    if (!concept) return 0;
    
    const progress = concept.userProgress;
    if (!progress) return 0;

    let score = 0;
    
    // Has activation response
    if (progress.activationResponse) score += 1;
    
    // Has reflection notes
    if (progress.reflectionNotes && progress.reflectionNotes.length > 0) score += 1;
    
    // Has answered Bloom questions
    const answeredCount = progress.bloomAnswered 
      ? Object.keys(progress.bloomAnswered).length 
      : 0;
    if (answeredCount > 0) score += 1;
    if (answeredCount >= 3) score += 1;

    // 0-1 = not started/learning, 2-3 = practiced, 4 = mastered
    if (score === 0) return 0;
    if (score === 1) return 1;
    if (score <= 3) return 2;
    return 3;
  }, [concept]);

  /**
   * Reset all progress for this concept
   */
  const resetProgress = useCallback(() => {
    if (!concept) return;
    
    const updatedConcept: Concept = {
      ...concept,
      userProgress: undefined,
    };

    dispatch(updateConcept(updatedConcept));

    // TODO: Persist to backend
    // await ConceptsAPI.deleteUserProgress({
    //   graphId,
    //   conceptId: concept.id,
    // });
  }, [dispatch, concept, graphId]);

  return {
    userProgress: concept?.userProgress,
    saveActivationResponse,
    saveReflectionNote,
    markBloomQuestionAnswered,
    updateMasteryLevel,
    calculateMasteryLevel,
    resetProgress,
  };
};
