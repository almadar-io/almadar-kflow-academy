// Enable Immer support for Map and Set - MUST be called before any Redux store creation
import { enableMapSet } from 'immer';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer, { type RootState } from './rootReducer';
import { createConceptsPersistenceMiddleware } from '../features/concepts/middleware/conceptsPersistenceMiddleware';
import { mutationMiddleware } from '../features/knowledge-graph/redux';

enableMapSet();

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
        // Allow Maps in state (concepts are stored as Map<string, Concept>)
        ignoredPaths: ['concepts.graphs'],
      },
    })
      .concat(createConceptsPersistenceMiddleware())
      .concat(mutationMiddleware),
});

export type AppDispatch = typeof store.dispatch;

// Re-export RootState for convenience
export type { RootState };
