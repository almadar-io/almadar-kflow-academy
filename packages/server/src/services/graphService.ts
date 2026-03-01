/**
 * @deprecated This service is deprecated and will be removed in a future version.
 * 
 * Use KnowledgeGraphAccessLayer for all graph operations:
 * - getUserGraphById() → KnowledgeGraphAccessLayer.getGraph()
 * - upsertConceptGraph() → KnowledgeGraphAccessLayer.saveGraph() with mutations
 * 
 * This service uses the legacy StoredConceptGraph structure which has been
 * replaced by NodeBasedKnowledgeGraph.
 * 
 * Migration guide: See docs/KFLOW_V2_COURSE_PUBLISHING.md
 */

import type { Concept, GraphDifficulty } from '../types/concept';
import { getFirestore } from '../config/firebaseAdmin';
import { getGraphLayers } from './layerService';
import { LayerDocument } from './layerService';

// Deprecation warning (logs once)
let deprecationWarned = false;
function warnDeprecation(functionName: string) {
  if (!deprecationWarned) {
    console.warn(
      `[DEPRECATED] graphService.${functionName}() is deprecated. ` +
      'Use KnowledgeGraphAccessLayer instead. ' +
      'See docs/KFLOW_V2_COURSE_PUBLISHING.md for migration guide.'
    );
    deprecationWarned = true;
  }
}

/**
 * @deprecated Use NodeBasedKnowledgeGraph instead
 */
export interface StoredConceptGraph {
  id: string;
  seedConceptId: string;
  concepts: Record<string, Concept>;
  layers?: Record<number, Omit<LayerDocument, 'createdAt'>>; // Map of layer number to layer data
  createdAt: number;
  updatedAt: number;
  model?: string;
  goalFocused?: boolean; // Whether subsequent layers should be goal-focused (project-based) (default: false)
  difficulty?: GraphDifficulty; // Difficulty level
  focus?: string; // Learning focus for the graph
  name?: string; // Graph name (same as seed concept name)
}

export interface UpsertConceptGraphPayload {
  id: string;
  seedConceptId: string;
  concepts: Record<string, Concept>;
  createdAt?: number;
  updatedAt?: number;
  model?: string;
  goalFocused?: boolean; // Whether subsequent layers should be goal-focused (project-based) (default: false)
  difficulty?: GraphDifficulty; // Difficulty level
  focus?: string; // Learning focus for the graph
  name?: string; // Graph name (same as seed concept name)
}

const isFirestoreNotFoundError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  
  const code = (error as { code?: number | string }).code;
  const message = (error as { message?: string }).message ?? '';

  return code === 5 || code === '5' || message.includes('NOT_FOUND');
};

const graphsCollection = (uid: string) => {
  return getFirestore().collection('users').doc(uid).collection('graphs');
}
/**
 * @deprecated Use KnowledgeGraphAccessLayer.getGraph() instead
 */
export const getUserGraphs = async (uid: string): Promise<StoredConceptGraph[]> => {
  warnDeprecation('getUserGraphs');
  try {
    const snapshot = await graphsCollection(uid).get();

    const graphs = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as Omit<StoredConceptGraph, 'id'>;
        const graphId = doc.id;
        
        // Load layers for this graph
        let layers: Record<number, Omit<LayerDocument, 'createdAt'>> | undefined;
        try {
          const layerDocs = await getGraphLayers(uid, graphId);
          if (layerDocs.length > 0) {
            layers = {};
            layerDocs.forEach(layer => {
              const { createdAt, ...layerData } = layer;
              layers![layer.layerNumber] = layerData;
            });
          }
        } catch (error) {
          console.warn(`Failed to load layers for graph ${graphId}:`, error);
        }
        
        return {
          id: graphId,
          ...normalizeTimestamps(data),
          ...(layers && { layers }),
        };
      })
    );

    return graphs;
  } catch (error) {
    if (isFirestoreNotFoundError(error)) {
      console.warn('Firestore database not found. Ensure Firestore is enabled for this project.');
      return [];
    }
    throw error;
  }
};

/**
 * @deprecated Use KnowledgeGraphAccessLayer.getGraph() instead
 */
export const getUserGraphById = async (
  uid: string,
  graphId: string
): Promise<StoredConceptGraph | null> => {
  warnDeprecation('getUserGraphById');
  try {
    const doc = await graphsCollection(uid).doc(graphId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as Omit<StoredConceptGraph, 'id'>;

    // Load layers for this graph
    let layers: Record<number, Omit<LayerDocument, 'createdAt'>> | undefined;
    try {
      const layerDocs = await getGraphLayers(uid, graphId);
      if (layerDocs.length > 0) {
        layers = {};
        layerDocs.forEach(layer => {
          const { createdAt, ...layerData } = layer;
          layers![layer.layerNumber] = layerData;
        });
      }
    } catch (error) {
      console.warn(`Failed to load layers for graph ${graphId}:`, error);
    }

    return {
      id: doc.id,
      ...normalizeTimestamps(data),
      ...(layers && { layers }),
    };
  } catch (error) {
    if (isFirestoreNotFoundError(error)) {
      console.warn('Firestore database not found while fetching graph.');
      return null;
    }
    throw error;
  }
};

/**
 * @deprecated Use KnowledgeGraphAccessLayer.saveGraph() with mutations instead
 */
export const upsertUserGraph = async (
  uid: string,
  graph: UpsertConceptGraphPayload
): Promise<StoredConceptGraph> => {
  warnDeprecation('upsertUserGraph');
  const now = Date.now();
  
  // Get existing graph to preserve fields like goalFocused, difficulty, focus, etc.
  // Note: layers are stored in a separate collection, so they don't need to be preserved here
  const existingGraph = await getUserGraphById(uid, graph.id).catch(() => null);
  
  // Get seed concept name from the graph's concepts
  // Concepts may be keyed by ID or by name, so check both
  const seedConcept = 
    graph.concepts[graph.seedConceptId] || // Try direct lookup by ID (if keyed by ID)
    Object.values(graph.concepts).find(
      (c) => c.id === graph.seedConceptId || (c.isSeed === true)
    );
  const seedConceptName = seedConcept?.name || '';
  
  // Build complete payload - preserve existing fields that aren't provided
  const payload: Omit<StoredConceptGraph, 'id'> = {
    seedConceptId: graph.seedConceptId,
    concepts: graph.concepts, // Always use the new concepts (with deletions applied)
    model: graph.model ?? existingGraph?.model,
    createdAt: graph.createdAt ?? existingGraph?.createdAt ?? now,
    updatedAt: now,
    // Preserve goalFocused from existing graph if not provided, otherwise use provided value
    goalFocused: graph.goalFocused !== undefined ? graph.goalFocused : (existingGraph?.goalFocused ?? false),
    // Preserve difficulty and focus from existing graph if not provided
    difficulty: graph.difficulty ?? existingGraph?.difficulty,
    focus: graph.focus ?? existingGraph?.focus,
    // Set name from seed concept name (use provided values if available, otherwise use seed concept name)
    // If seed concept name is available, use it; otherwise preserve existing or use provided
    name: graph.name ?? (seedConceptName || existingGraph?.name),
    // Note: layers are stored in a separate collection, so we don't include them in the graph document
  };

  try {
    // Use set without merge to completely replace the document
    // This ensures deleted concepts are properly removed from Firestore
    // With merge: true, Firestore would merge nested objects (like concepts),
    // which means deleted concepts wouldn't be removed
    await graphsCollection(uid).doc(graph.id).set(payload);
  } catch (error) {
    if (isFirestoreNotFoundError(error)) {
      console.warn('Firestore database not found while saving graph.');
    }
    throw error;
  }

  // Return the saved graph
  const savedGraph: StoredConceptGraph = {
    id: graph.id,
    ...payload,
  };

  return savedGraph;
};

/**
 * @deprecated Use KnowledgeGraphAccessLayer.deleteGraph() instead
 */
export const deleteUserGraph = async (
  uid: string,
  graphId: string,
  options: {
    cascade?: boolean; // Whether to perform cascade deletion (default: true)
    deleteCourses?: boolean; // Whether to delete published courses (default: false)
    deleteEmbeddings?: boolean; // Whether to delete embeddings (default: true)
    deleteUserProgress?: boolean; // Whether to delete user progress (default: true)
  } = {}
): Promise<void> => {
  warnDeprecation('deleteUserGraph');
  const {
    cascade = true,
    deleteCourses = false,
    deleteEmbeddings = true,
    deleteUserProgress = true,
  } = options;

  try {
    // Perform cascade deletion before deleting the graph itself
    if (cascade) {
      const { cascadeDeleteGraph } = await import('./graphCascadeDeleteService');
      await cascadeDeleteGraph(uid, graphId, {
        deleteCourses,
        deleteEmbeddings,
        deleteUserProgress,
      });
    }

    // Delete from both collections (old format and new format)
    // 1. Delete from graphs collection (StoredConceptGraph format)
    try {
      await graphsCollection(uid).doc(graphId).delete();
    } catch (error) {
      // Don't fail if graph doesn't exist in this collection
      if (!isFirestoreNotFoundError(error)) {
        console.warn(`Failed to delete graph from graphs collection: ${error}`);
      }
    }

    // 2. Delete from knowledgeGraphs collection (NodeBasedKnowledgeGraph format)
    try {
      const db = getFirestore();
      const kgRef = db
        .collection('users')
        .doc(uid)
        .collection('knowledgeGraphs')
        .doc(graphId);
      
      // Check if graph exists before deleting
      const doc = await kgRef.get();
      if (doc.exists) {
        await kgRef.delete();
        // Clear cache
        const { cache } = await import('./cacheService');
        cache.delete(`graph:${uid}:${graphId}`);
        cache.delete(`graphology:${uid}:${graphId}`);
      }
    } catch (error) {
      // Don't fail if graph doesn't exist in this collection
      console.warn(`Failed to delete graph from knowledgeGraphs collection: ${error}`);
    }
  } catch (error) {
    if (isFirestoreNotFoundError(error)) {
      console.warn('Firestore database not found while deleting graph.');
      return;
    }
    throw error;
  }
};

const normalizeTimestamps = (
  data: Omit<StoredConceptGraph, 'id'>
): Omit<StoredConceptGraph, 'id'> => {
  const parseTimestamp = (value: unknown, fallback: number) => {
    if (typeof value === 'number') {
      return value;
    }

    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      return (value.toDate() as Date).getTime();
    }

    return fallback;
  };

  return {
    ...data,
    createdAt: parseTimestamp(data.createdAt, Date.now()),
    updatedAt: parseTimestamp(data.updatedAt, Date.now()),
  };
};


