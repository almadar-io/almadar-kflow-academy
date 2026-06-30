import { jest } from '@jest/globals';
import * as aiController from '../../controllers/aiController';

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

describe('aiController exports', () => {
  it('exports expected handler functions', () => {
    expect(typeof aiController.health).toBe('function');
    expect(typeof aiController.explainConcept).toBe('function');
    expect(typeof aiController.generateLayerPracticeHandler).toBe('function');
    expect(typeof aiController.answerQuestionHandler).toBe('function');
    expect(typeof aiController.generateFlashCardsHandler).toBe('function');
    expect(typeof aiController.runCodeSimulationHandler).toBe('function');
    expect(typeof aiController.generateInteractiveOrbitalHandler).toBe('function');
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
