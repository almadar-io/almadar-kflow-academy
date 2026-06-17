import { enableMapSet } from 'immer';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer, { type RootState } from './rootReducer';
import { createConceptsPersistenceMiddleware } from '../features/concepts/middleware/conceptsPersistenceMiddleware';

enableMapSet();

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
        ignoredPaths: ['concepts.graphs'],
      },
    })
      .concat(createConceptsPersistenceMiddleware()),
});

export type AppDispatch = typeof store.dispatch;

// Re-export RootState for convenience
export type { RootState };
