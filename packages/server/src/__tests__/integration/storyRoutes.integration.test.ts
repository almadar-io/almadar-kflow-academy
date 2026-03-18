/**
 * Integration Tests for Story Routes
 *
 * Tests the /api/content/* endpoints that store stories and series
 * in a public knowledge graph, and user progress in per-user graphs.
 *
 * Covers:
 * - GET  /api/content/stories        (list stories)
 * - GET  /api/content/stories/:id    (get story)
 * - POST /api/content/stories        (create story)
 * - PUT  /api/content/stories/:id    (update story)
 * - DELETE /api/content/stories/:id  (delete story)
 * - GET  /api/content/series         (list series)
 * - GET  /api/content/series/:id     (get series)
 * - POST /api/content/series         (create series)
 * - PUT  /api/content/series/:id     (update series)
 * - DELETE /api/content/series/:id   (delete series)
 * - GET  /api/content/progress       (get progress)
 * - POST /api/content/progress       (save progress)
 */

import { jest } from '@jest/globals';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph.js';

// In-memory graph store for tests
const graphStore: Record<string, Record<string, NodeBasedKnowledgeGraph>> = {};

// Mock Firestore
jest.unstable_mockModule('../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(() => ({})),
  getFirebaseAuth: jest.fn(() => ({})),
}));

// Mock KnowledgeGraphAccessLayer to use in-memory store
jest.unstable_mockModule('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(async (uid: string, graphId: string) => {
      const userGraphs = graphStore[uid];
      if (!userGraphs || !userGraphs[graphId]) {
        throw new Error(`Graph ${graphId} not found`);
      }
      return JSON.parse(JSON.stringify(userGraphs[graphId]));
    }),
    saveGraph: jest.fn(async (uid: string, graph: NodeBasedKnowledgeGraph, _expectedVersion?: number) => {
      if (!graphStore[uid]) graphStore[uid] = {};
      graph.version = (graph.version || 0) + 1;
      graphStore[uid][graph.id] = JSON.parse(JSON.stringify(graph));
    }),
  })),
}));

// Import controllers after mocks (dynamic import for ESM)
const {
  listStoriesHandler,
  getStoryHandler,
  createStoryHandler,
  updateStoryHandler,
  deleteStoryHandler,
  listSeriesHandler,
  getSeriesHandler,
  createSeriesHandler,
  updateSeriesHandler,
  deleteSeriesHandler,
  getStoryProgressHandler,
  saveStoryProgressHandler,
} = await import('../../controllers/storyController.js');

// Helper: create mock Request/Response
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    body: {},
    query: {},
    firebaseUser: { uid: 'test-user-1' },
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Story Routes Integration', () => {
  beforeEach(() => {
    // Clear in-memory store
    Object.keys(graphStore).forEach((k) => delete graphStore[k]);
  });

  // =========================================================================
  // Stories CRUD
  // =========================================================================

  describe('Stories', () => {
    it('should list stories (empty initially)', async () => {
      const req = mockReq();
      const res = mockRes();

      await listStoriesHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({ stories: [] });
    });

    it('should create a story', async () => {
      const req = mockReq({
        body: {
          title: 'The Story of Gravity',
          domain: 'natural',
          teaser: 'Learn about forces',
          difficulty: 'intermediate',
          duration: 15,
        },
      });
      const res = mockRes();

      await createStoryHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const story = res.json.mock.calls[0][0].story;
      expect(story.title).toBe('The Story of Gravity');
      expect(story.domain).toBe('natural');
      expect(story.difficulty).toBe('intermediate');
      expect(story.duration).toBe(15);
      expect(story.id).toBeDefined();
    });

    it('should list stories after creation', async () => {
      // Create a story first
      const createReq = mockReq({
        body: { title: 'Story A', domain: 'formal', teaser: 'Math stuff' },
      });
      const createRes = mockRes();
      await createStoryHandler(createReq, createRes);

      // List stories
      const listReq = mockReq();
      const listRes = mockRes();
      await listStoriesHandler(listReq, listRes);

      const { stories } = listRes.json.mock.calls[0][0];
      expect(stories).toHaveLength(1);
      expect(stories[0].title).toBe('Story A');
    });

    it('should get a story by ID', async () => {
      // Create
      const createReq = mockReq({
        body: { title: 'Quantum Basics', domain: 'natural', teaser: 'Intro to QM' },
      });
      const createRes = mockRes();
      await createStoryHandler(createReq, createRes);
      const storyId = createRes.json.mock.calls[0][0].story.id;

      // Get
      const getReq = mockReq({ params: { storyId } });
      const getRes = mockRes();
      await getStoryHandler(getReq, getRes);

      expect(getRes.json).toHaveBeenCalled();
      expect(getRes.json.mock.calls[0][0].story.title).toBe('Quantum Basics');
    });

    it('should return 404 for non-existent story', async () => {
      const req = mockReq({ params: { storyId: 'non-existent' } });
      const res = mockRes();
      await getStoryHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should update a story', async () => {
      // Create
      const createReq = mockReq({
        body: { title: 'Original Title', domain: 'social' },
      });
      const createRes = mockRes();
      await createStoryHandler(createReq, createRes);
      const storyId = createRes.json.mock.calls[0][0].story.id;

      // Update
      const updateReq = mockReq({
        params: { storyId },
        body: { title: 'Updated Title', rating: 4.5 },
      });
      const updateRes = mockRes();
      await updateStoryHandler(updateReq, updateRes);

      expect(updateRes.json).toHaveBeenCalled();
      const updated = updateRes.json.mock.calls[0][0].story;
      expect(updated.title).toBe('Updated Title');
      expect(updated.rating).toBe(4.5);
      expect(updated.domain).toBe('social'); // unchanged field preserved
    });

    it('should delete a story', async () => {
      // Create
      const createReq = mockReq({
        body: { title: 'To Delete', domain: 'formal' },
      });
      const createRes = mockRes();
      await createStoryHandler(createReq, createRes);
      const storyId = createRes.json.mock.calls[0][0].story.id;

      // Delete
      const deleteReq = mockReq({ params: { storyId } });
      const deleteRes = mockRes();
      await deleteStoryHandler(deleteReq, deleteRes);

      expect(deleteRes.json).toHaveBeenCalledWith({ deleted: true });

      // Verify gone
      const getReq = mockReq({ params: { storyId } });
      const getRes = mockRes();
      await getStoryHandler(getReq, getRes);
      expect(getRes.status).toHaveBeenCalledWith(404);
    });

    it('should require title and domain for creation', async () => {
      const req = mockReq({ body: { title: 'No Domain' } });
      const res = mockRes();
      await createStoryHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should require auth for writes', async () => {
      const req = mockReq({
        body: { title: 'Auth Test', domain: 'formal' },
        firebaseUser: undefined, // no auth
      });
      const res = mockRes();
      await createStoryHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500); // getUserId throws
    });
  });

  // =========================================================================
  // Series CRUD
  // =========================================================================

  describe('Series', () => {
    it('should list series (empty initially)', async () => {
      const req = mockReq();
      const res = mockRes();
      await listSeriesHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ series: [] });
    });

    it('should create a series', async () => {
      const req = mockReq({
        body: {
          title: 'Physics Fundamentals',
          domain: 'natural',
          description: 'A series on physics',
          creatorName: 'Dr. Test',
          tags: ['physics', 'science'],
        },
      });
      const res = mockRes();
      await createSeriesHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const series = res.json.mock.calls[0][0].series;
      expect(series.title).toBe('Physics Fundamentals');
      expect(series.creatorId).toBe('test-user-1');
      expect(series.tags).toEqual(['physics', 'science']);
    });

    it('should get a series by ID', async () => {
      const createReq = mockReq({
        body: { title: 'Math Series', domain: 'formal', description: 'All about math' },
      });
      const createRes = mockRes();
      await createSeriesHandler(createReq, createRes);
      const seriesId = createRes.json.mock.calls[0][0].series.id;

      const getReq = mockReq({ params: { seriesId } });
      const getRes = mockRes();
      await getSeriesHandler(getReq, getRes);

      expect(getRes.json).toHaveBeenCalled();
      const result = getRes.json.mock.calls[0][0].series;
      expect(result.title).toBe('Math Series');
      expect(result.creator.uid).toBe('test-user-1');
      expect(result.seasons).toEqual([]);
    });

    it('should update a series', async () => {
      const createReq = mockReq({
        body: { title: 'Original Series', domain: 'social' },
      });
      const createRes = mockRes();
      await createSeriesHandler(createReq, createRes);
      const seriesId = createRes.json.mock.calls[0][0].series.id;

      const updateReq = mockReq({
        params: { seriesId },
        body: { title: 'Updated Series', status: 'published' },
      });
      const updateRes = mockRes();
      await updateSeriesHandler(updateReq, updateRes);

      const updated = updateRes.json.mock.calls[0][0].series;
      expect(updated.title).toBe('Updated Series');
      expect(updated.status).toBe('published');
    });

    it('should delete a series', async () => {
      const createReq = mockReq({
        body: { title: 'To Delete', domain: 'formal' },
      });
      const createRes = mockRes();
      await createSeriesHandler(createReq, createRes);
      const seriesId = createRes.json.mock.calls[0][0].series.id;

      const deleteReq = mockReq({ params: { seriesId } });
      const deleteRes = mockRes();
      await deleteSeriesHandler(deleteReq, deleteRes);
      expect(deleteRes.json).toHaveBeenCalledWith({ deleted: true });
    });

    it('should link stories to series', async () => {
      // Create series
      const seriesReq = mockReq({
        body: { title: 'Linked Series', domain: 'natural' },
      });
      const seriesRes = mockRes();
      await createSeriesHandler(seriesReq, seriesRes);
      const seriesId = seriesRes.json.mock.calls[0][0].series.id;

      // Create story linked to series
      const storyReq = mockReq({
        body: { title: 'Linked Story', domain: 'natural', seriesId },
      });
      const storyRes = mockRes();
      await createStoryHandler(storyReq, storyRes);
      const story = storyRes.json.mock.calls[0][0].story;
      expect(story.seriesId).toBe(seriesId);
    });
  });

  // =========================================================================
  // Progress
  // =========================================================================

  describe('Progress', () => {
    it('should return empty progress for new user', async () => {
      const req = mockReq();
      const res = mockRes();
      await getStoryProgressHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ progress: [] });
    });

    it('should save and retrieve progress', async () => {
      // Save progress
      const saveReq = mockReq({
        body: { storyId: 'story-1', score: 85, completed: true },
      });
      const saveRes = mockRes();
      await saveStoryProgressHandler(saveReq, saveRes);
      expect(saveRes.json).toHaveBeenCalledWith({
        saved: true,
        storyId: 'story-1',
        score: 85,
        completed: true,
      });

      // Retrieve progress
      const getReq = mockReq();
      const getRes = mockRes();
      await getStoryProgressHandler(getReq, getRes);

      const { progress } = getRes.json.mock.calls[0][0];
      expect(progress).toHaveLength(1);
      expect(progress[0].storyId).toBe('story-1');
      expect(progress[0].score).toBe(85);
      expect(progress[0].completed).toBe(true);
    });

    it('should update progress for same story', async () => {
      // First save
      const save1 = mockReq({
        body: { storyId: 'story-2', score: 50, completed: false },
      });
      await saveStoryProgressHandler(save1, mockRes());

      // Second save (update)
      const save2 = mockReq({
        body: { storyId: 'story-2', score: 100, completed: true },
      });
      await saveStoryProgressHandler(save2, mockRes());

      // Check progress
      const getRes = mockRes();
      await getStoryProgressHandler(mockReq(), getRes);
      const { progress } = getRes.json.mock.calls[0][0];
      expect(progress).toHaveLength(1);
      expect(progress[0].score).toBe(100);
      expect(progress[0].completed).toBe(true);
    });

    it('should require storyId for saving progress', async () => {
      const req = mockReq({ body: { score: 50 } });
      const res = mockRes();
      await saveStoryProgressHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should require auth for progress', async () => {
      const req = mockReq({ firebaseUser: undefined });
      const res = mockRes();
      await getStoryProgressHandler(req, res);
      // getUserId throws which gets caught
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // =========================================================================
  // Multiple stories and series
  // =========================================================================

  describe('Multiple items', () => {
    it('should handle multiple stories across domains', async () => {
      const domains = ['formal', 'natural', 'social'];
      for (const domain of domains) {
        const req = mockReq({
          body: { title: `Story in ${domain}`, domain, teaser: `About ${domain}` },
        });
        await createStoryHandler(req, mockRes());
      }

      const listRes = mockRes();
      await listStoriesHandler(mockReq(), listRes);
      const { stories } = listRes.json.mock.calls[0][0];
      expect(stories).toHaveLength(3);
      expect(stories.map((s: any) => s.domain).sort()).toEqual(['formal', 'natural', 'social']);
    });

    it('should track progress across multiple stories', async () => {
      for (let i = 1; i <= 3; i++) {
        const req = mockReq({
          body: { storyId: `story-${i}`, score: i * 30, completed: i === 3 },
        });
        await saveStoryProgressHandler(req, mockRes());
      }

      const getRes = mockRes();
      await getStoryProgressHandler(mockReq(), getRes);
      const { progress } = getRes.json.mock.calls[0][0];
      expect(progress).toHaveLength(3);
    });
  });
});
