/**
 * Regression test: verify that the two route groups kept for the student client
 * are still registered after any future server trim.
 */

import { jest, describe, beforeAll, it, expect } from '@jest/globals';

jest.unstable_mockModule('../../config/firebaseAdmin', () => ({
  getFirebaseAuth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
  getFirebaseAdmin: jest.fn(() => ({})),
  getFirestore: jest.fn(() => ({})),
}));

jest.unstable_mockModule('../../config/redis', () => ({
  getRedisClient: jest.fn(() => null),
  redisClient: null,
}));

jest.unstable_mockModule('../../config/llmConfig', () => ({
  getLLMConfig: jest.fn(() => ({})),
}));

jest.unstable_mockModule('@almadar/server', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({ doc: jest.fn(() => ({ collection: jest.fn() })) })),
  })),
  getFirebaseAuth: jest.fn(),
  getFirebaseAdmin: jest.fn(),
  authenticateFirebase: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  setupSSE: jest.fn(),
  sendSSEEvent: jest.fn(),
  sendSSEDone: jest.fn(),
  closeSSE: jest.fn(),
}));

jest.unstable_mockModule('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({ clearCache: jest.fn() })),
  GraphMutationService: jest.fn().mockImplementation(() => ({ applyMutationBatchSafe: jest.fn() })),
  createGetGraphHandler: jest.fn(() => jest.fn()),
  createSaveGraphHandler: jest.fn(() => jest.fn()),
  createGetNodesHandler: jest.fn(() => jest.fn()),
  createGetNodeHandler: jest.fn(() => jest.fn()),
  createCreateNodeHandler: jest.fn(() => jest.fn()),
  createUpdateNodeHandler: jest.fn(() => jest.fn()),
  createDeleteNodeHandler: jest.fn(() => jest.fn()),
  createGetRelationshipsHandler: jest.fn(() => jest.fn()),
  createGetNodeRelationshipsHandler: jest.fn(() => jest.fn()),
  createCreateRelationshipHandler: jest.fn(() => jest.fn()),
  createDeleteRelationshipHandler: jest.fn(() => jest.fn()),
  createFindPathHandler: jest.fn(() => jest.fn()),
  createTraverseHandler: jest.fn(() => jest.fn()),
  createExtractSubgraphHandler: jest.fn(() => jest.fn()),
  createFindNodesHandler: jest.fn(() => jest.fn()),
  createApplyMutationsHandler: jest.fn(() => jest.fn()),
  createValidateMutationsHandler: jest.fn(() => jest.fn()),
  createGetLearningPathsHandler: jest.fn(() => jest.fn()),
  createGetGraphSummaryHandler: jest.fn(() => jest.fn()),
  createGetConceptsHandler: jest.fn(() => jest.fn()),
  createGetConceptDetailHandler: jest.fn(() => jest.fn()),
  createGetMindMapHandler: jest.fn(() => jest.fn()),
  createExpansionHandler: jest.fn(() => jest.fn()),
  createExplainConceptHandler: jest.fn(() => jest.fn()),
  createAnswerQuestionHandler: jest.fn(() => jest.fn()),
  createGenerateGoalHandler: jest.fn(() => jest.fn()),
  createLayerPracticeHandler: jest.fn(() => jest.fn()),
  createCustomOperationHandler: jest.fn(() => jest.fn()),
}));

type RouteDescriptor = { method: string; path: string };

function extractRoutes(router: any): RouteDescriptor[] {
  const routes: RouteDescriptor[] = [];
  const stack: any[] = router.stack ?? [];
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      for (const method of methods) {
        routes.push({ method, path: layer.route.path as string });
      }
    }
  }
  return routes;
}

function extractRoutesWithPrefix(router: any, prefix = ''): RouteDescriptor[] {
  const routes: RouteDescriptor[] = [];
  const stack: any[] = router.stack ?? [];
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      const routePath: string = layer.route.path;
      for (const method of methods) {
        routes.push({ method, path: prefix + routePath });
      }
    } else if (layer.handle?.stack) {
      const mountPath: string = layer.regexp?.source
        ? extractMountPath(layer.regexp, layer.keys)
        : '';
      routes.push(...extractRoutesWithPrefix(layer.handle, prefix + mountPath));
    }
  }
  return routes;
}

function extractMountPath(regexp: RegExp, keys: any[]): string {
  const src = regexp.source;
  const match = src.match(/^\^\\\/([^\\]+)/);
  if (match) return '/' + match[1].replace(/\\\//g, '/');
  return '';
}

describe('Kept routes are still mounted', () => {
  let knowledgeGraphAccessRoutes: any;
  let graphOperationRoutes: any;
  let rootRouter: any;

  beforeAll(async () => {
    ({ default: knowledgeGraphAccessRoutes } = await import('../../routes/knowledgeGraphAccessRoutes.js'));
    ({ default: graphOperationRoutes } = await import('../../routes/graphOperationRoutes.js'));
    ({ default: rootRouter } = await import('../../routes/index.js'));
  });

  describe('knowledgeGraphAccessRoutes', () => {
    it('registers GET /:graphId (graph load used by concepts page)', () => {
      const routes = extractRoutes(knowledgeGraphAccessRoutes);
      const hit = routes.find((r) => r.method === 'GET' && r.path === '/:graphId');
      expect(hit).toBeDefined();
    });

    it('registers at least one route so the router is non-empty', () => {
      const routes = extractRoutes(knowledgeGraphAccessRoutes);
      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('graphOperationRoutes', () => {
    it('registers POST /:graphId/expand (concept expansion hook)', () => {
      const routes = extractRoutes(graphOperationRoutes);
      const hit = routes.find((r) => r.method === 'POST' && r.path === '/:graphId/expand');
      expect(hit).toBeDefined();
    });

    it('registers at least one route so the router is non-empty', () => {
      const routes = extractRoutes(graphOperationRoutes);
      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('root router mounts both sub-routers', () => {
    it('mounts /knowledge-graphs-access under /api', () => {
      const allRoutes = extractRoutesWithPrefix(rootRouter);
      const hasMountedAccess = allRoutes.some((r) =>
        r.path.includes('knowledge-graphs-access')
      );
      const stackIncludesAccessRouter = rootRouter.stack.some(
        (layer: any) =>
          layer.handle === knowledgeGraphAccessRoutes ||
          (layer.handle?.stack && layer.handle.stack === knowledgeGraphAccessRoutes.stack)
      );
      expect(hasMountedAccess || stackIncludesAccessRouter).toBe(true);
    });

    it('mounts /graph-operations under /api', () => {
      const allRoutes = extractRoutesWithPrefix(rootRouter);
      const hasMountedOps = allRoutes.some((r) =>
        r.path.includes('graph-operations')
      );
      const stackIncludesOpsRouter = rootRouter.stack.some(
        (layer: any) =>
          layer.handle === graphOperationRoutes ||
          (layer.handle?.stack && layer.handle.stack === graphOperationRoutes.stack)
      );
      expect(hasMountedOps || stackIncludesOpsRouter).toBe(true);
    });
  });
});
