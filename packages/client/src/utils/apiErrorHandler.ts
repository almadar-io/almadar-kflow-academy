/**
 * Utility functions for error message formatting
 * For handling errors, use the useHandleApiError hook in components
 */

/**
 * Format an error message for user display
 */
export const formatErrorMessage = (error: unknown, customMessage?: string): string => {
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

  return errorMessage;
};

