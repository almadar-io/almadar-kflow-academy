/**
 * Mutation Middleware
 * 
 * Middleware to automatically apply mutations from graph operations to the Redux store.
 * When operations complete successfully, mutations are automatically applied to update the graph state.
 */

import type { Middleware, AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import type { RootState } from '../../../app/rootReducer';
import { applyMutationsToGraph } from './mutationUtils';
import { updateGraph } from '../knowledgeGraphSlice';

type AppDispatch = ThunkDispatch<RootState, unknown, AnyAction>;

/**
 * Middleware to automatically apply mutations from operations to Redux store
 */
export const mutationMiddleware: Middleware<
  {},
  RootState,
  AppDispatch
> = (store) => (next) => (action: unknown) => {
  // Check if action is a success action that contains mutations
  const successActions = [
    'graphOperations/progressiveExpandSuccess',
    'graphOperations/explainConceptSuccess',
    'graphOperations/answerQuestionSuccess',
    'graphOperations/generateGoalsSuccess',
    'graphOperations/generateLayerPracticeSuccess',
    'graphOperations/customOperationSuccess',
    'graphOperations/streamingDone',
  ] as const;

  // Type guard for action
  if (typeof action === 'object' && action !== null && 'type' in action) {
    const actionType = (action as { type: string }).type;
    if (successActions.includes(actionType as typeof successActions[number])) {
      const payload = (action as { payload?: any }).payload;
      const graphId = payload?.graphId;
      const response = payload?.response || payload;

      // Extract mutations from response
      const mutations = response?.mutations;
      
      if (graphId && mutations?.mutations && mutations.mutations.length > 0) {
        // Get current graph from store
        const state = store.getState();
        const graph = state.knowledgeGraphs.graphs[graphId];

        if (graph) {
          // Apply mutations to graph
          const updatedGraph = applyMutationsToGraph(graph, mutations.mutations);

          // Dispatch update to Redux
          store.dispatch(
            updateGraph({
              graphId,
              updates: updatedGraph,
            })
          );
        }
      }
    }
  }

  return next(action);
};

