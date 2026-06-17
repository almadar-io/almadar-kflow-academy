/**
 * Regression test: verify that the two route groups kept for the student client
 * are still registered after any future server trim.
 *
 * - GET  /api/knowledge-graphs-access/:graphId  (graph load via useGetGraph)
 * - POST /api/graph-operations/:graphId/expand  (concept-operation hooks)
 *
 * The test inspects the Express router stack instead of making live HTTP calls,
 * so it runs without Firebase credentials and without supertest.
 */

import { jest } from '@jest/globals';

// Mock every module that touches Firebase / external services at import time
jest.unstable_mockModule('../../config/firebaseAdmin', () => ({
  getFirebaseAuth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
  getFirebaseAdmin: jest.fn(() => ({})),
  getFirestore: jest.fn(() => ({})),
}));

jest.unstable_mockModule('../../config/redis', () => ({
  getRedisClient: jest.fn(() => null),
  redisClient: null,
}));

jest.unstable_mockModule('../../config/gemini', () => ({
  getGemini: jest.fn(() => null),
  geminiClient: null,
}));

jest.unstable_mockModule('../../config/openai', () => ({
  getOpenAI: jest.fn(() => null),
  openaiClient: null,
}));

jest.unstable_mockModule('../../config/llmConfig', () => ({
  getLLMConfig: jest.fn(() => ({})),
}));

jest.unstable_mockModule('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({})),
}));

// Load the routers after mocks are in place
const { default: knowledgeGraphAccessRoutes } = await import('../../routes/knowledgeGraphAccessRoutes.js');
const { default: graphOperationRoutes } = await import('../../routes/graphOperationRoutes.js');
const { default: rootRouter } = await import('../../routes/index.js');

// Helpers to extract registered route descriptors from an Express router stack
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

// Collect all routes mounted under a sub-router (handles router.use('/prefix', subRouter))
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
      // Nested router mounted via router.use()
      const mountPath: string = layer.regexp?.source
        ? extractMountPath(layer.regexp, layer.keys)
        : '';
      routes.push(...extractRoutesWithPrefix(layer.handle, prefix + mountPath));
    }
  }
  return routes;
}

// Attempt to recover the string mount path from the regexp Express compiles for router.use()
function extractMountPath(regexp: RegExp, keys: any[]): string {
  // Express encodes /path as ^\/path\/?(?=\/|$) — extract the literal segment
  const src = regexp.source;
  const match = src.match(/^\^\\\/([^\\]+)/);
  if (match) return '/' + match[1].replace(/\\\//g, '/');
  return '';
}

describe('Kept routes are still mounted', () => {
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
      // Fall back to stack inspection if path extraction is imprecise
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
