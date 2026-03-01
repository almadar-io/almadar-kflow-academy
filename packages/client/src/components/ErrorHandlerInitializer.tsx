import { useEffect } from 'react';
import { useAlert } from '../contexts/AlertContext';
import { setGlobalErrorHandler } from '../services/apiClient';

/**
 * Component that initializes the global API error handler for apiClient
 * This should be mounted once at the app root
 * For components, use the useHandleApiError hook instead
 */
const ErrorHandlerInitializer: React.FC = () => {
  const { showError } = useAlert();

  useEffect(() => {
    // Initialize error handler for apiClient (handles errors from apiClient.fetch)
    setGlobalErrorHandler(showError);
  }, [showError]);

  return null;
};

export default ErrorHandlerInitializer;

