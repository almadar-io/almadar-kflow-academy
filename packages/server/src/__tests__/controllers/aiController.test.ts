import { jest } from '@jest/globals';
import type { Request, Response } from 'express';
import * as aiController from '../../controllers/aiController';
import { generateInteractiveOrbital } from '../../operations';
import { hybridCache } from '../../services/cacheService';
import { getVisualizationCapabilities } from '@almadar-io/knowledge/server';

jest.mock('../../services/graphService', () => ({
  getUserGraphById: jest.fn(),
}));

jest.mock('../../services/userService', () => ({
  upsertUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/layerService', () => ({
  saveLayer: jest.fn(),
  getLayerByNumber: jest.fn(),
}));

jest.mock('../../services/goalService', () => ({
  getGoalsByGraphId: jest.fn().mockResolvedValue([]),
  markMilestoneCompleted: jest.fn(),
}));

jest.mock('../../operations', () => ({
  explain: jest.fn(),
  generateLayerPractice: jest.fn(),
  answerQuestion: jest.fn(),
  generateFlashCards: jest.fn(),
  runCodeSimulation: jest.fn(),
  generateInteractiveOrbital: jest.fn(),
  expand: jest.fn(),
  progressiveExpandMultiple: jest.fn(),
  advanceNextMultiple: jest.fn(),
  deriveParents: jest.fn(),
  deriveSummary: jest.fn(),
  customOperation: jest.fn(),
  synthesize: jest.fn(),
  explore: jest.fn(),
  tracePath: jest.fn(),
  progressiveExplore: jest.fn(),
}));

jest.mock('../../utils/prerequisites', () => ({
  processPrerequisitesFromLesson: jest.fn(),
}));

jest.mock('@almadar/server', () => ({
  setupSSE: jest.fn(),
  sendSSEEvent: jest.fn(),
  sendSSEDone: jest.fn(),
  closeSSE: jest.fn(),
}));

jest.mock('@almadar-io/knowledge/server', () => ({
  getVisualizationCapabilities: jest.fn(() => [
    { type: 'math', organism: 'learning-math', description: 'Math visualizations.' },
    { type: 'physics', organism: 'learning-physics', description: 'Physics visualizations.' },
  ]),
}));

jest.mock('../../services/cacheService', () => ({
  hybridCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  CACHE_TTL: { INTERACTIVE_ORBITAL: 24 * 60 * 60 * 1000 },
}));

describe('aiController exports', () => {
  it('exports expected handler functions', () => {
    expect(typeof aiController.health).toBe('function');
    expect(typeof aiController.generateLayerPracticeHandler).toBe('function');
    expect(typeof aiController.answerQuestionHandler).toBe('function');
    expect(typeof aiController.generateFlashCardsHandler).toBe('function');
    expect(typeof aiController.runCodeSimulationHandler).toBe('function');
    expect(typeof aiController.generateInteractiveOrbitalHandler).toBe('function');
    expect(typeof aiController.visualizationCapabilitiesHandler).toBe('function');
    expect(typeof aiController.expandConcept).toBe('function');
    expect(typeof aiController.generateNextLayer).toBe('function');
    expect(typeof aiController.generateNextConcept).toBe('function');
    expect(typeof aiController.deriveParentsHandler).toBe('function');
    expect(typeof aiController.deriveSummaryHandler).toBe('function');
    expect(typeof aiController.customOperationHandler).toBe('function');
    expect(typeof aiController.synthesizeHandler).toBe('function');
    expect(typeof aiController.exploreHandler).toBe('function');
    expect(typeof aiController.tracePathHandler).toBe('function');
    expect(typeof aiController.progressiveExploreHandler).toBe('function');
  });
});

function makeReq(body: unknown, query: Record<string, string> = {}): Request {
  return { body, query, headers: {}, firebaseUser: undefined } as unknown as Request;
}

function makeRes(): Response {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

describe('generateInteractiveOrbitalHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVisualizationCapabilities as jest.Mock).mockReturnValue([
      { type: 'math', organism: 'learning-math', description: 'Math visualizations.' },
      { type: 'physics', organism: 'learning-physics', description: 'Physics visualizations.' },
    ]);
  });

  it('rejects a type not present in the derived visualization capabilities', async () => {
    const req = makeReq({ type: 'not-a-real-type', concept: { name: 'X' }, markerDescription: 'd' });
    const res = makeRes();

    await aiController.generateInteractiveOrbitalHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const [[body]] = (res.json as jest.Mock).mock.calls as Array<[{ error: string }]>;
    expect(body.error).toContain('math');
    expect(body.error).toContain('physics');
    expect(generateInteractiveOrbital).not.toHaveBeenCalled();
  });

  it('returns the cached schema without invoking generateInteractiveOrbital', async () => {
    const cachedSchema = { name: 'Cached', version: '1.0.0', orbitals: [] };
    (hybridCache.get as jest.Mock).mockResolvedValueOnce({ schema: cachedSchema, appId: 'cached-app-id' });
    const req = makeReq({ type: 'math', concept: { id: 'c1', name: 'X' }, markerDescription: 'd' });
    const res = makeRes();

    await aiController.generateInteractiveOrbitalHandler(req, res);

    expect(generateInteractiveOrbital).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ schema: cachedSchema, appId: 'cached-app-id', cached: true });
  });

  it('derives a stable appId for the same concept+type across calls', async () => {
    (hybridCache.get as jest.Mock).mockResolvedValue(null);
    (generateInteractiveOrbital as jest.Mock).mockResolvedValue({
      schema: { name: 'S', version: '1.0.0', orbitals: [] },
    });

    const res1 = makeRes();
    await aiController.generateInteractiveOrbitalHandler(
      makeReq({ type: 'math', concept: { id: 'c1', name: 'X' }, markerDescription: 'd' }),
      res1,
    );
    const res2 = makeRes();
    await aiController.generateInteractiveOrbitalHandler(
      makeReq({ type: 'math', concept: { id: 'c1', name: 'X' }, markerDescription: 'd' }),
      res2,
    );

    const appId1 = (res1.json as jest.Mock).mock.calls[0][0].appId;
    const appId2 = (res2.json as jest.Mock).mock.calls[0][0].appId;
    expect(appId1).toBe(appId2);
    expect(appId1).toMatch(/^kflow-io-[0-9a-f]{12}-math$/);
  });
});

describe('visualizationCapabilitiesHandler', () => {
  it('returns the derived capabilities with an implicit 200', () => {
    const req = makeReq({});
    const res = makeRes();

    aiController.visualizationCapabilitiesHandler(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      capabilities: [
        { type: 'math', organism: 'learning-math', description: 'Math visualizations.' },
        { type: 'physics', organism: 'learning-physics', description: 'Physics visualizations.' },
      ],
    });
  });
});
