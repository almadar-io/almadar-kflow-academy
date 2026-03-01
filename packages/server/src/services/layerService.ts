import { getFirestore } from '../config/firebaseAdmin';

export interface PracticeItem {
  type: 'question' | 'project';
  question: string;
  answer: string;
}

export interface LayerDocument {
  layerNumber: number;
  prompt: string;
  response: string;
  goal?: string; // Goal extracted from LLM response
  conceptIds: string[]; // Array of concept IDs in this layer
  topLevelConceptId?: string; // ID of the top-level concept (concept with seed as sole parent) for this layer
  practiceExercises?: PracticeItem[]; // Practice exercises for this layer
  createdAt: number;
}

const isFirestoreNotFoundError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  
  const code = (error as { code?: number | string }).code;
  const message = (error as { message?: string }).message ?? '';

  return code === 5 || code === '5' || message.includes('NOT_FOUND');
};

const layersCollection = (uid: string, graphId: string) => {
  return getFirestore()
    .collection('users')
    .doc(uid)
    .collection('graphs')
    .doc(graphId)
    .collection('layers');
};

/**
 * Save a layer document for debugging purposes
 */
export const saveLayer = async (
  uid: string,
  graphId: string,
  layerData: Omit<LayerDocument, 'createdAt'>
): Promise<void> => {
  const now = Date.now();
  const payload: LayerDocument = {
    ...layerData,
    createdAt: now,
  };

  try {
    // Use layer number as document ID for easier querying
    await layersCollection(uid, graphId).doc(`layer-${layerData.layerNumber}`).set(payload);
  } catch (error) {
    if (isFirestoreNotFoundError(error)) {
      console.warn('Firestore database not found while saving layer.');
    }
    throw error;
  }
};

/**
 * Get all layers for a graph
 */
export const getGraphLayers = async (
  uid: string,
  graphId: string
): Promise<LayerDocument[]> => {
  try {
    const snapshot = await layersCollection(uid, graphId).get();

    return snapshot.docs.map(doc => {
      const data = doc.data() as LayerDocument;
      return normalizeTimestamps(data);
    });
  } catch (error) {
    if (isFirestoreNotFoundError(error)) {
      console.warn('Firestore database not found while fetching layers.');
      return [];
    }
    throw error;
  }
};

/**
 * Get a specific layer by layer number
 */
export const getLayerByNumber = async (
  uid: string,
  graphId: string,
  layerNumber: number
): Promise<LayerDocument | null> => {
  try {
    const doc = await layersCollection(uid, graphId).doc(`layer-${layerNumber}`).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as LayerDocument;
    return normalizeTimestamps(data);
  } catch (error) {
    if (isFirestoreNotFoundError(error)) {
      console.warn('Firestore database not found while fetching layer.');
      return null;
    }
    throw error;
  }
};

const normalizeTimestamps = (data: LayerDocument): LayerDocument => {
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
  };
};

