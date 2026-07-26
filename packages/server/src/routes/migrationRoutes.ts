import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateFirebase, asyncHandler, setupSSE, sendSSEEvent } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import type { JsonValue } from '@almadar/core';
import { markdownAdapter, pasteAdapter, eraseAdapter } from '@almadar-io/migration';
import {
  createPreviewHandler,
  createImportHandler,
  createAgentImportHandler,
} from '@almadar-io/migration/server';
import type { MigrationApprovalRequest, MigrationApprovalResponse } from '@kflow-academy/shared';
import {
  KFLOW_MIGRATION_TARGET,
  KFLOW_DETERMINISTIC_MAPPING,
  KflowImportSink,
  createImportGraph,
  createExistingRowsQuerier,
  MIGRATION_LLM_PROVIDER,
  MIGRATION_LLM_MODEL,
  registerPendingApproval,
  cancelPendingApproval,
  resolvePendingApproval,
} from '../services/migrationService';
import { accessLayer } from '../services/studentDataAccess';

const log = createLogger('kflow:server:routes:migrationRoutes');
const router = Router();

router.use(authenticateFirebase);

const adapters = [eraseAdapter(markdownAdapter), eraseAdapter(pasteAdapter)];

const previewHandler = createPreviewHandler({
  adapters,
  target: KFLOW_MIGRATION_TARGET,
  mapping: KFLOW_DETERMINISTIC_MAPPING,
});

function bodyField(body: JsonValue | undefined, key: string): string | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;
  const value = body[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

// Import target graph: an explicit graphId (verified against the user's graphs) or a
// freshly scaffolded graph named after the source.
interface ResolvedGraph {
  graphId: string;
  /** True when this request scaffolded a fresh graph (rolled back on failure). */
  created: boolean;
}

async function resolveImportGraph(uid: string, body: JsonValue | undefined, res: Response): Promise<ResolvedGraph | null> {
  const requested = bodyField(body, 'graphId');
  if (requested !== undefined) {
    try {
      await accessLayer.getGraph(uid, requested);
      return { graphId: requested, created: false };
    } catch {
      res.status(404).json({ error: `graph '${requested}' not found` });
      return null;
    }
  }
  const name = bodyField(body, 'sourceRef') ?? 'Import';
  return { graphId: await createImportGraph(uid, name), created: true };
}

async function rollbackGraph(uid: string, resolved: ResolvedGraph): Promise<void> {
  if (!resolved.created) return;
  await accessLayer.deleteGraph(uid, resolved.graphId).catch((e) =>
    log.warn('import graph rollback failed', { graphId: resolved.graphId, error: e instanceof Error ? e.message : String(e) }),
  );
}

function withGraphId(body: JsonValue, graphId: string): JsonValue {
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) return { ...body, graphId };
  return { result: body, graphId };
}

// POST /api/migration/preview — deterministic preview, nothing written.
router.post('/preview', asyncHandler(async (req: Request, res: Response) => {
  log.info('migration /preview', { uid: req.firebaseUser?.uid });
  const result = await previewHandler({ body: req.body as JsonValue | undefined });
  res.status(result.status).json(result.body);
}));

// POST /api/migration/import — deterministic import committed through the sink.
router.post('/import', asyncHandler(async (req: Request, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const body = req.body as JsonValue | undefined;
  const resolved = await resolveImportGraph(uid, body, res);
  if (resolved === null) return;
  const { graphId } = resolved;
  log.info('migration /import', { uid, graphId });
  const handler = createImportHandler({
    adapters,
    target: KFLOW_MIGRATION_TARGET,
    mapping: KFLOW_DETERMINISTIC_MAPPING,
    sink: new KflowImportSink(uid, graphId),
  });
  const result = await handler({ body });
  if (result.status === 200) {
    res.status(200).json(withGraphId(result.body, graphId));
    return;
  }
  await rollbackGraph(uid, resolved);
  res.status(result.status).json(result.body);
}));

// POST /api/migration/agent — agentic import; step events stream as SSE.
router.post('/agent', asyncHandler(async (req: Request, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const body = req.body as JsonValue | undefined;
  const resolved = await resolveImportGraph(uid, body, res);
  if (resolved === null) return;
  const { graphId } = resolved;
  log.info('migration /agent', { uid, graphId });

  setupSSE(res);
  const handler = createAgentImportHandler({
    target: KFLOW_MIGRATION_TARGET,
    sink: new KflowImportSink(uid, graphId),
    provider: MIGRATION_LLM_PROVIDER,
    model: MIGRATION_LLM_MODEL,
    existing: createExistingRowsQuerier(uid, graphId),
    resolveApproval: (approvalId) =>
      new Promise<boolean>((resolve) => {
        registerPendingApproval(approvalId, uid, resolve);
        res.on('close', () => cancelPendingApproval(approvalId));
      }),
  });
  try {
    const result = await handler({ body }, (event) => {
      sendSSEEvent(res, { type: 'step', data: event, timestamp: Date.now() });
    });
    if (result.status === 200) {
      sendSSEEvent(res, { type: 'complete', data: withGraphId(result.body, graphId), timestamp: Date.now() });
    } else {
      await rollbackGraph(uid, resolved);
      const errorBody = result.body;
      const message =
        typeof errorBody === 'object' && errorBody !== null && !Array.isArray(errorBody) && typeof errorBody['error'] === 'string'
          ? errorBody['error']
          : 'agent import failed';
      sendSSEEvent(res, { type: 'error', data: { error: message }, timestamp: Date.now() });
    }
  } catch (e) {
    log.error('migration /agent failed', { error: e instanceof Error ? e.message : String(e) });
    await rollbackGraph(uid, resolved);
    sendSSEEvent(res, { type: 'error', data: { error: e instanceof Error ? e.message : String(e) }, timestamp: Date.now() });
  } finally {
    res.end();
  }
}));

// POST /api/migration/agent/approval — user decision for a parked agent approval gate.
router.post('/agent/approval', asyncHandler(async (req: Request, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const body = req.body as MigrationApprovalRequest;
  if (typeof body?.approvalId !== 'string' || typeof body?.approved !== 'boolean') {
    res.status(400).json({ error: 'approvalId (string) and approved (boolean) are required' });
    return;
  }
  if (!resolvePendingApproval(body.approvalId, uid, body.approved)) {
    res.status(404).json({ error: 'no pending approval with that id' });
    return;
  }
  const response: MigrationApprovalResponse = { resolved: true };
  res.json(response);
}));

export default router;
