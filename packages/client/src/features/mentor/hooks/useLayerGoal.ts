import { useState, useCallback } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { updateLayerData } from '../../concepts/conceptSlice';
import { updateLayerGoal } from '../layerGoalApi';

interface UseLayerGoalOptions {
  graphId: string;
  layerNumber: number;
  initialGoal?: string;
  onGoalUpdated?: (newGoal: string) => void;
}

export const useLayerGoal = ({
  graphId,
  layerNumber,
  initialGoal,
  onGoalUpdated,
}: UseLayerGoalOptions) => {
  const [isSaving, setIsSaving] = useState(false);
  const dispatch = useAppDispatch();

  const saveGoal = useCallback(async (goal: string) => {
    if (!graphId) {
      throw new Error('Cannot save goal: graphId is missing');
    }

    setIsSaving(true);
    try {
      await updateLayerGoal(graphId, layerNumber, goal);
      
      // Update Redux state
      dispatch(updateLayerData({
        layerNumber,
        layerData: {
          goal,
        },
      }));

      onGoalUpdated?.(goal);
      return goal;
    } catch (error) {
      console.error('Failed to update layer goal:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [graphId, layerNumber, dispatch, onGoalUpdated]);

  return {
    saveGoal,
    isSaving,
  };
};

