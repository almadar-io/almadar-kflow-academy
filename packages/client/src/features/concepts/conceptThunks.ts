import { ThunkAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import {
  replaceGraphs,
  setCurrentGraph,
  setError,
  setLoading,
  createConceptGraph,
} from './conceptSlice';
import { ConceptGraph } from './types';
import { graphApi } from './graphApi';
import { loadConceptsFromLocalStorage, saveConceptsToLocalStorage } from './utils/localStorage';
import { ensureSequenceForGraph, generateUUID } from './utils/graphHelpers';
import { auth } from '../../config/firebase';
import { Concept } from './types';

type ConceptThunk = ThunkAction<Promise<void>, RootState, unknown, any>;

const pickDefaultGraphId = (graphs: ConceptGraph[], preferredId?: string | null): string | null => {
  if (!graphs.length) {
    return null;
  }

  if (preferredId && graphs.some(graph => graph.id === preferredId)) {
    return preferredId;
  }

  return graphs[0].id;
};

export const loadConceptGraphs = (): ConceptThunk => async (dispatch, getState) => {
  dispatch(setLoading(true));

  const localState = loadConceptsFromLocalStorage();
  const existingGraphId = getState().concepts.currentGraphId ?? localState?.currentGraphId ?? null;

  const currentUser = auth.currentUser;

  if (!currentUser) {
    if (localState) {
      const fallbackGraphs = localState.graphs || [];
      const defaultId = pickDefaultGraphId(fallbackGraphs, localState.currentGraphId);

      dispatch(
        replaceGraphs({
          graphs: fallbackGraphs,
          currentGraphId: defaultId,
          selectedConcept: localState.selectedConcept ?? null,
        })
      );

      if (defaultId) {
        dispatch(setCurrentGraph(defaultId));
      }

      saveConceptsToLocalStorage(getState().concepts);
    }

    dispatch(setLoading(false));
    return;
  }

  try {
    const remoteGraphs = await graphApi.listGraphs();

    const graphsNeedingSequence: ConceptGraph[] = [];
    const sequencedGraphs = remoteGraphs.map(graph => {
      const hasSequence = graph.concepts && Array.from(graph.concepts.values()).some(concept => concept.sequence !== undefined);
      if (hasSequence) {
        return graph;
      }
      const sequenced = ensureSequenceForGraph(graph);
      graphsNeedingSequence.push(sequenced);
      return sequenced;
    });

    if (graphsNeedingSequence.length > 0) {
      await Promise.all(
        graphsNeedingSequence.map(async graph => {
          try {
            await graphApi.upsertGraph(graph);
          } catch (error) {
            console.error('Failed to persist sequenced graph to server', error);
          }
        })
      );
    }

    if (sequencedGraphs.length === 0 && localState?.graphs && localState.graphs.length > 0) {
      // Nothing on server yet; push local graphs
      const localGraphsWithSequence = localState.graphs.map(graph => ensureSequenceForGraph(graph));
      await Promise.all(
        localGraphsWithSequence.map(async graph => {
          try {
            await graphApi.upsertGraph(graph);
          } catch (error) {
            console.error('Failed to persist local graph to server', error);
          }
        })
      );

      const defaultId = pickDefaultGraphId(localGraphsWithSequence, localState.currentGraphId);
      dispatch(
        replaceGraphs({
          graphs: localGraphsWithSequence,
          currentGraphId: defaultId,
          selectedConcept: localState.selectedConcept ?? null,
        })
      );
      saveConceptsToLocalStorage(getState().concepts);
      dispatch(setLoading(false));
      return;
    }

    const defaultId = pickDefaultGraphId(sequencedGraphs, existingGraphId);

    dispatch(
      replaceGraphs({
        graphs: sequencedGraphs,
        currentGraphId: defaultId,
      })
    );

    if (defaultId) {
      dispatch(setCurrentGraph(defaultId));
    }

    saveConceptsToLocalStorage(getState().concepts);
  } catch (error) {
    console.error('Failed to load concept graphs from backend:', error);

    if (localState) {
      const fallbackGraphs = localState.graphs || [];
      const defaultId = pickDefaultGraphId(fallbackGraphs, localState.currentGraphId);

      dispatch(
        replaceGraphs({
          graphs: fallbackGraphs,
          currentGraphId: defaultId,
          selectedConcept: localState.selectedConcept ?? null,
        })
      );

      if (defaultId) {
        dispatch(setCurrentGraph(defaultId));
      }
    } else {
      dispatch(setError('Unable to load concept graphs. Working offline.'));
    }
  } finally {
    dispatch(setLoading(false));
  }
};

export const createConceptGraphAndPersist = (
  payload: Omit<Concept, 'id'>,
  goalFocused?: boolean
): ConceptThunk => async (dispatch, getState) => {
  dispatch(setLoading(true));
  try {
    // Create the graph structure first (without adding to Redux)
    const seedConcept: Concept = {
      ...payload,
      id: generateUUID(),
      isSeed: true,
      layer: 0,
    };

    const conceptsMap = new Map<string, Concept>();
    conceptsMap.set(seedConcept.name, seedConcept);

    const newGraph: ConceptGraph = {
      id: generateUUID(),
      seedConceptId: seedConcept.id,
      concepts: conceptsMap,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      goalFocused: goalFocused ?? false,
      difficulty: payload.difficulty,
      focus: payload.focus,
      name: seedConcept.name,
    };

    // Ensure sequence before upserting
    const graphWithSequence = ensureSequenceForGraph(newGraph);

    // Try to upsert the graph first
    try {
      await graphApi.upsertGraph(graphWithSequence);
    } catch (error) {
      console.error('Failed to persist newly created graph:', error);
      dispatch(setError('Failed to save new concept graph. Please try again.'));
      // Don't add to Redux if upsert fails - stay on home page
      return;
    }

    // Add the graph directly to Redux instead of using createConceptGraph action
    // This prevents the middleware from triggering another upsert and ensures
    // we use the same graph ID that was already persisted
    // Merge with existing graphs instead of replacing all
    const state = getState().concepts;
    const existingGraphs = state.graphs || [];
    const mergedGraphs = [...existingGraphs, graphWithSequence];
    
    dispatch(
      replaceGraphs({
        graphs: mergedGraphs,
        currentGraphId: graphWithSequence.id,
        selectedConcept: seedConcept,
      })
    );
  } finally {
    dispatch(setLoading(false));
  }
};


