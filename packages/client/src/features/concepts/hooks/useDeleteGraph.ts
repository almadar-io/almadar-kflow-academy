import { useCallback, useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { deleteGraph } from '../conceptSlice';
import { graphApi } from '../graphApi';
import { useAlert } from '../../../contexts/AlertContext';

interface UseDeleteGraphReturn {
  deleteGraph: (graphId: string) => Promise<void>;
  isDeleting: boolean;
}

export const useDeleteGraph = (): UseDeleteGraphReturn => {
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useAlert();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async (graphId: string) => {
    setIsDeleting(true);
    try {
      // Delete from server first
      await graphApi.deleteGraph(graphId);
      // Then update Redux state (middleware will also try to delete, but it's idempotent)
      dispatch(deleteGraph(graphId));
      showSuccess('Learning path deleted successfully');
    } catch (error) {
      console.error('Failed to delete graph:', error);
      showError('Failed to delete learning path. Please try again.');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [dispatch, showError, showSuccess]);

  return {
    deleteGraph: handleDelete,
    isDeleting,
  };
};

