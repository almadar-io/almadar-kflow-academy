import { Request, Response } from 'express';
import {
  deleteUserGraph,
  getUserGraphById,
  getUserGraphs,
  StoredConceptGraph,
  upsertUserGraph,
  UpsertConceptGraphPayload,
} from '../services/graphService';
import { upsertUser } from '../services/userService';

type GraphResponse = { graph: StoredConceptGraph };
type GraphListResponse = { graphs: StoredConceptGraph[] };
type ErrorResponse = { error: string };

export const listGraphs = async (
  req: Request,
  res: Response<GraphListResponse | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const email = req.firebaseUser?.email;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Save/update user data
    if (email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    const graphs = await getUserGraphs(uid);
    return res.json({ graphs });
  } catch (error) {
    console.error('Failed to list graphs:', error);
    return res.status(500).json({ error: 'Failed to list graphs' });
  }
};

export const getGraph = async (
  req: Request<{ graphId: string }>,
  res: Response<GraphResponse | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const email = req.firebaseUser?.email;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Save/update user data
    if (email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    const { graphId } = req.params;

    const graph = await getUserGraphById(uid, graphId);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    return res.json({ graph });
  } catch (error) {
    console.error('Failed to fetch graph:', error);
    return res.status(500).json({ error: 'Failed to fetch graph' });
  }
};

export const upsertGraph = async (
  req: Request<{ graphId: string }, GraphResponse | ErrorResponse, UpsertConceptGraphPayload>,
  res: Response<GraphResponse | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const email = req.firebaseUser?.email;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Save/update user data
    if (email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    const { graphId } = req.params;
    const payload: UpsertConceptGraphPayload = {
      ...req.body,
      id: req.body?.id ?? graphId,
    };

    if (!payload?.id) {
      return res.status(400).json({ error: 'Graph id is required' });
    }

    if (!payload.seedConceptId) {
      return res.status(400).json({ error: 'seedConceptId is required' });
    }

    if (!payload.concepts || typeof payload.concepts !== 'object') {
      return res.status(400).json({ error: 'concepts is required and must be an object' });
    }

    const graph = await upsertUserGraph(uid, payload);
    return res.json({ graph });
  } catch (error) {
    console.error('Failed to upsert graph:', error);
    return res.status(500).json({ error: 'Failed to upsert graph' });
  }
};

export const removeGraph = async (
  req: Request<{ graphId: string }>,
  res: Response<{ success: true } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const email = req.firebaseUser?.email;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Save/update user data
    if (email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    const { graphId } = req.params;

    await deleteUserGraph(uid, graphId);

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete graph:', error);
    return res.status(500).json({ error: 'Failed to delete graph' });
  }
};


