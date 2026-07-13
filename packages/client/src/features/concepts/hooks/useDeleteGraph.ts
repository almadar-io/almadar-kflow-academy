import { createLogger } from '@almadar/logger';
import { useCallback, useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { deleteGraph } from '../conceptSlice';
import { graphApi } from '../graphApi';
import { useEventBus } from '@almadar/ui';
import type { UiNotifyPayload } from '../../../app/uiEvents';

const log = createLogger('kflow:client:concepts:useDeleteGraph');

interface UseDeleteGraphReturn {
  deleteGraph: (graphId: string) => Promise<void>;
  isDeleting: boolean;
}

export const useDeleteGraph = (): UseDeleteGraphReturn => {
  const dispatch = useAppDispatch();
  const { emit } = useEventBus();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async (graphId: string) => {
    setIsDeleting(true);
    try {
      await graphApi.deleteGraph(graphId);
      dispatch(deleteGraph(graphId));
      emit('UI:NOTIFY', { severity: 'success', message: 'Learning path deleted successfully' } satisfies UiNotifyPayload);
    } catch (error) {
      log.error('Failed to delete graph', { error: error instanceof Error ? error.message : String(error) });
      emit('UI:NOTIFY', { severity: 'error', message: 'Failed to delete learning path. Please try again.' } satisfies UiNotifyPayload);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [dispatch, emit]);

  return {
    deleteGraph: handleDelete,
    isDeleting,
  };
};

