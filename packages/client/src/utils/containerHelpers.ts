/**
 * Generic Container Helper Utilities
 * 
 * These utilities can be shared across features for common transformation patterns.
 */

/**
 * Generic list transformation helper
 */
export const transformListToCardProps = <T, P>(
  items: T[],
  mapper: (item: T) => P
): P[] => {
  return items.map(mapper);
};

/**
 * Generic error state helper
 */
export interface ErrorState {
  message: string;
  variant: 'error' | 'warning' | 'info';
}

export const createErrorState = (
  error: string | null,
  variant: ErrorState['variant'] = 'error'
): ErrorState | null => {
  if (!error) return null;
  
  return {
    message: error,
    variant,
  };
};

/**
 * Generic loading state helper
 */
export const createLoadingState = (loading: boolean) => {
  return {
    isLoading: loading,
    showSpinner: loading,
  };
};

/**
 * Generic empty state helper
 */
export interface EmptyStateConfig {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const createEmptyState = (
  items: unknown[],
  config: EmptyStateConfig
): EmptyStateConfig | null => {
  if (items.length > 0) return null;
  
  return config;
};
