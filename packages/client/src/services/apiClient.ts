// Centralized API client configuration
import { auth } from '../config/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Global error handler
let globalErrorHandler: ((error: string) => void) | null = null;

/**
 * Set the global error handler for API errors
 */
export const setGlobalErrorHandler = (handler: (error: string) => void) => {
  globalErrorHandler = handler;
};

// Helper to extract error message from response
const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const errorData = await response.json();
    // Try to get a user-friendly error message
    if (errorData.error) {
      return errorData.error;
    }
    if (errorData.details) {
      return errorData.details;
    }
    if (errorData.message) {
      return errorData.message;
    }
  } catch {
    // If JSON parsing fails, fall back to status text
  }
  return response.statusText || `Error ${response.status}`;
};

// Helper to format error message for display
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    let message = error.message;
    // Clean up technical error messages
    message = message
      .replace(/^API Error: /, '')
      .replace(/^Error: /, '')
      .replace(/Failed to fetch/i, 'Network error. Please check your connection.');
    return message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Handle an error and show an alert if the global error handler is set
 * This can be used for streaming endpoints that don't go through apiClient.fetch()
 */
export const handleApiError = (error: unknown): void => {
  if (globalErrorHandler) {
    const errorMessage = formatErrorMessage(error);
    globalErrorHandler(errorMessage);
  }
};

/**
 * Extract error message from a Response object
 * Can be used for streaming endpoints
 */
export const extractErrorMessageFromResponse = async (response: Response): Promise<string> => {
  return extractErrorMessage(response);
};

/**
 * Get Firebase auth token for the current user
 */
const getAuthToken = async (): Promise<string | null> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.warn('[apiClient] No current user');
    return null;
  }
  
  try {
    // Force refresh to ensure token is valid
    const token = await currentUser.getIdToken(true);
    console.log('[apiClient] Got token, length:', token.length);
    return token;
  } catch (error) {
    console.error('[apiClient] Failed to get auth token:', error);
    return null;
  }
};

export const apiClient = {
  baseURL: API_BASE_URL,
  
  // Generic fetch wrapper with error handling and auth
  fetch: async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Check if Authorization header is already provided
    const hasAuthHeader = options.headers && 
      (options.headers as Record<string, string>)['Authorization'];
    
    // Only get token if no auth header provided
    let token: string | null = null;
    if (!hasAuthHeader) {
      token = await getAuthToken();
    }
    
    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add auth header if we got a token and none was provided
    if (token && !hasAuthHeader) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('[apiClient] Request:', endpoint, 'Has auth:', !!(hasAuthHeader || token));
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        console.error('[apiClient] Response error:', endpoint, response.status, errorMessage);
        const error = new Error(errorMessage);
        
        // Show alert if global error handler is set
        if (globalErrorHandler) {
          globalErrorHandler(formatErrorMessage(error));
        }
        
        throw error;
      }
      
      return response.json();
    } catch (error) {
      // Show alert for network errors and other fetch failures
      if (globalErrorHandler && error instanceof Error) {
        const errorMessage = formatErrorMessage(error);
        // Show alerts for network errors and API errors
        if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
          globalErrorHandler(errorMessage);
        }
        // For other errors, only show if they're from API responses (already handled above)
        // This prevents double-showing for the same error
      }
      
      // Re-throw the error so callers can handle it if needed
      throw error;
    }
  },

  // Health check
  health: () => apiClient.fetch('/api/health'),
};
