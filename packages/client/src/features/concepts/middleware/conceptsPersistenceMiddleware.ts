import { AnyAction, Middleware } from '@reduxjs/toolkit';
import { RootState } from '../../../app/store';
import {
  addConcepts,
  createConceptGraph,
  deleteGraph,
  replaceGraphs,
  setCurrentGraph,
  setError,
  updateConcept,
  removeConcept,
} from '../conceptSlice';
import { graphApi } from '../graphApi';
import { saveConceptsToLocalStorage } from '../utils/localStorage';
import { ensureSequenceForGraph } from '../utils/graphHelpers';
import { auth } from '../../../config/firebase';

const SYNC_DELAY = 500;

type SyncTimerMap = Map<string, number>;

const scheduleLocalSave = (state: RootState) => {
  if (state.concepts) {
    saveConceptsToLocalStorage(state.concepts);
  }
};

const shouldTriggerSync = (actionType: string) =>
  // Exclude createConceptGraph - it's handled by createConceptGraphAndPersist thunk
  // which already persists the graph before dispatching
  actionType === addConcepts.type ||
  actionType === updateConcept.type ||
  actionType === removeConcept.type;

export const createConceptsPersistenceMiddleware = (): Middleware<{}, RootState> => {
  const timers: SyncTimerMap = new Map();

  const triggerUpsert = async (state: RootState, graphId: string, dispatch: any) => {
    const graph = state.concepts.graphs.find(g => g.id === graphId);
    if (!graph) {
      return;
    }

    const graphToSync = !graph.concepts || !Array.from(graph.concepts.values()).some(concept => concept.sequence !== undefined)
      ? ensureSequenceForGraph(graph)
      : graph;

    const user = auth.currentUser;
    if (!user) {
      scheduleLocalSave(state);
      return;
    }

    try {
      console.log('Upserting graph to Firestore:', graphToSync);
      await graphApi.upsertGraph(graphToSync);
      scheduleLocalSave(state);
    } catch (error) {
      console.error('Failed to sync graph to Firestore:', error);
      dispatch(setError('Failed to sync graph changes. Working offline.'));
      scheduleLocalSave(state);
    }
  };

  const triggerDelete = async (graphId: string, dispatch: any, state: RootState) => {
    const user = auth.currentUser;
    if (!user) {
      scheduleLocalSave(state);
      return;
    }

    try {
      await graphApi.deleteGraph(graphId);
      scheduleLocalSave(state);
    } catch (error) {
      console.error('Failed to delete graph from Firestore:', error);
      dispatch(setError('Failed to delete graph from server.'));
      scheduleLocalSave(state);
    }
  };

  return store => next => action => {
    const typedAction = action as AnyAction;
    const result = next(typedAction);

    const state = store.getState();

    if (!state.concepts) {
      return result;
    }

    if (typedAction.type === replaceGraphs.type || typedAction.type === setCurrentGraph.type) {
      scheduleLocalSave(state);
      return result;
    }

    if (typedAction.type === deleteGraph.type) {
      const graphId = typedAction.payload as string;
      triggerDelete(graphId, store.dispatch, state);
      return result;
    }

    if (shouldTriggerSync(typedAction.type)) {
      const graphId = state.concepts.currentGraphId;
      if (!graphId) {
        scheduleLocalSave(state);
        return result;
      }

      const existingTimer = timers.get(graphId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timeoutId = window.setTimeout(() => {
        const latestState = store.getState();
        triggerUpsert(latestState, graphId, store.dispatch);
        timers.delete(graphId);
      }, SYNC_DELAY);

      timers.set(graphId, timeoutId);
    }

    return result;
  };
};


