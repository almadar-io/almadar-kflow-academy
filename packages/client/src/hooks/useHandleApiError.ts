import { useCallback } from 'react';
import { useAlert } from '../contexts/AlertContext';

/**
 * Hook to handle API errors and show alerts
 * Use this hook in components to get a handleApiError function
 */
export const useHandleApiError = () => {
  const { showError } = useAlert();

  const handleApiError = useCallback((error: unknown, customMessage?: string) => {
    let errorMessage = customMessage;

    if (!errorMessage) {
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }
    }

    // Clean up technical error messages for user display
    errorMessage = errorMessage
      .replace(/^API Error: /, '')
      .replace(/^Error: /, '')
      .replace(/Failed to fetch/i, 'Network error. Please check your connection.');

    showError(errorMessage);
  }, [showError]);

  return handleApiError;
};

