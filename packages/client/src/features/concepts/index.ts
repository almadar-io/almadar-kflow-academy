/**
 * @deprecated This module is deprecated. Use features/knowledge-graph instead.
 * This module contains the old concepts API and will be removed in a future version.
 * 
 * Migration guide:
 * - Use features/knowledge-graph/hooks instead of features/concepts/hooks
 * - Use features/knowledge-graph/types instead of features/concepts/types
 * - Use features/knowledge-graph/api instead of features/concepts/graphApi
 * - Use features/mentor/components instead of features/concepts/components
 */

// Export types
export * from './types';

// Export API
export * from './ConceptsAPI';

// Export components
export * from './components';

// Export slice
export { default as conceptReducer } from './conceptSlice';
export * from './conceptSlice';
export * from './conceptThunks';

