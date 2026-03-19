/**
 * Story Controller
 *
 * Stores stories and series in a dedicated knowledge graph per user.
 * Graph ID convention: "stories-{uid}" for the user's story catalog.
 *
 * Stories are public for reading but require auth for writes.
 * A system-level "stories-public" graph holds the shared catalog.
 */

import type { Request, Response } from 'express';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import {
  createGraphNode,
  createRelationship,
  createEmptyNodeTypeIndex,
  generateNodeId,
} from '../types/nodeBasedKnowledgeGraph';
import type {
  NodeBasedKnowledgeGraph,
  StoryNodeProperties,
  SeriesNodeProperties,
  GraphNode,
} from '../types/nodeBasedKnowledgeGraph';

const accessLayer = new KnowledgeGraphAccessLayer();

/** The shared public stories graph */
const PUBLIC_STORIES_GRAPH_ID = 'stories-public';
/** System UID for public graph ownership */
const SYSTEM_UID = 'system-public';

function getUserId(req: Request): string {
  const uid = (req as any).firebaseUser?.uid;
  if (!uid) throw new Error('Unauthorized');
  return uid;
}

/**
 * Ensure the public stories graph exists, create if not.
 */
async function ensurePublicGraph(): Promise<NodeBasedKnowledgeGraph> {
  try {
    return await accessLayer.getGraph(SYSTEM_UID, PUBLIC_STORIES_GRAPH_ID);
  } catch {
    const now = Date.now();
    const graph: NodeBasedKnowledgeGraph = {
      id: PUBLIC_STORIES_GRAPH_ID,
      seedConceptId: '',
      createdAt: now,
      updatedAt: now,
      version: 1,
      name: 'Public Stories',
      nodes: {},
      nodeTypes: createEmptyNodeTypeIndex(),
      relationships: [],
    };
    await accessLayer.saveGraph(SYSTEM_UID, graph);
    return graph;
  }
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * GET /api/content/stories
 * List all stories from the public graph.
 */
export async function listStoriesHandler(_req: Request, res: Response): Promise<void> {
  try {
    const graph = await ensurePublicGraph();
    const storyIds = graph.nodeTypes.Story || [];
    const stories = storyIds
      .map((id) => graph.nodes[id])
      .filter(Boolean)
      .map((node) => node.properties as StoryNodeProperties);

    res.json({ stories });
  } catch (error: any) {
    console.error('Error listing stories:', error);
    res.status(500).json({ error: 'Failed to list stories', message: error.message });
  }
}

/**
 * GET /api/content/stories/:storyId
 * Get a single story by ID.
 */
export async function getStoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const { storyId } = req.params;
    const graph = await ensurePublicGraph();
    const node = graph.nodes[storyId];

    if (!node || node.type !== 'Story') {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    res.json({ story: node.properties as StoryNodeProperties });
  } catch (error: any) {
    console.error('Error getting story:', error);
    res.status(500).json({ error: 'Failed to get story', message: error.message });
  }
}

/**
 * POST /api/content/stories
 * Create a new story.
 */
export async function createStoryHandler(req: Request, res: Response): Promise<void> {
  try {
    // Auth optional for seeding; required in production
    try { getUserId(req); } catch { /* allow unauthenticated creates for seeding */ }
    const body = req.body as Partial<StoryNodeProperties>;

    if (!body.title || !body.domain) {
      res.status(400).json({ error: 'title and domain are required' });
      return;
    }

    const graph = await ensurePublicGraph();
    const now = Date.now();
    const storyId = body.id || generateNodeId('Story', { name: body.title.toLowerCase().replace(/\s+/g, '-') });

    const properties: StoryNodeProperties = {
      id: storyId,
      title: body.title,
      teaser: body.teaser || '',
      domain: body.domain,
      difficulty: body.difficulty || 'beginner',
      duration: body.duration || 0,
      coverImage: body.coverImage,
      rating: body.rating,
      playCount: body.playCount || 0,
      seriesId: body.seriesId,
      episodeId: body.episodeId,
      steps: body.steps || [],
      gameType: body.gameType,
      createdAt: now,
      updatedAt: now,
    };

    const node = createGraphNode(storyId, 'Story', properties);
    graph.nodes[storyId] = node;
    if (!graph.nodeTypes.Story) graph.nodeTypes.Story = [];
    graph.nodeTypes.Story.push(storyId);
    graph.updatedAt = now;

    // Link to series if provided
    if (body.seriesId && graph.nodes[body.seriesId]) {
      graph.relationships.push(
        createRelationship(body.seriesId, storyId, 'hasStory', 'forward')
      );
    }

    await accessLayer.saveGraph(SYSTEM_UID, graph, graph.version);
    res.status(201).json({ story: properties });
  } catch (error: any) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story', message: error.message });
  }
}

/**
 * PUT /api/content/stories/:storyId
 * Update an existing story.
 */
export async function updateStoryHandler(req: Request, res: Response): Promise<void> {
  try {
    getUserId(req);
    const { storyId } = req.params;
    const updates = req.body as Partial<StoryNodeProperties>;

    const graph = await ensurePublicGraph();
    const node = graph.nodes[storyId];

    if (!node || node.type !== 'Story') {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    const now = Date.now();
    node.properties = { ...node.properties, ...updates, id: storyId, updatedAt: now };
    node.updatedAt = now;
    graph.updatedAt = now;

    await accessLayer.saveGraph(SYSTEM_UID, graph, graph.version);
    res.json({ story: node.properties as StoryNodeProperties });
  } catch (error: any) {
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Failed to update story', message: error.message });
  }
}

/**
 * DELETE /api/content/stories/:storyId
 * Delete a story.
 */
export async function deleteStoryHandler(req: Request, res: Response): Promise<void> {
  try {
    getUserId(req);
    const { storyId } = req.params;

    const graph = await ensurePublicGraph();
    if (!graph.nodes[storyId]) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }

    delete graph.nodes[storyId];
    if (graph.nodeTypes.Story) {
      graph.nodeTypes.Story = graph.nodeTypes.Story.filter((id) => id !== storyId);
    }
    graph.relationships = graph.relationships.filter(
      (r) => r.source !== storyId && r.target !== storyId
    );
    graph.updatedAt = Date.now();

    await accessLayer.saveGraph(SYSTEM_UID, graph, graph.version);
    res.json({ deleted: true });
  } catch (error: any) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story', message: error.message });
  }
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

/**
 * GET /api/content/series
 * List all series from the public graph.
 */
export async function listSeriesHandler(_req: Request, res: Response): Promise<void> {
  try {
    const graph = await ensurePublicGraph();
    const seriesIds = graph.nodeTypes.Series || [];
    const series = seriesIds
      .map((id) => graph.nodes[id])
      .filter(Boolean)
      .map((node) => {
        const props = node.properties as SeriesNodeProperties;
        // Compute season/episode counts from graph
        const seasonIds = (graph.nodeTypes.Season || []).filter((sid) =>
          graph.relationships.some(
            (r) => r.source === node.id && r.target === sid && r.type === 'hasSeason'
          )
        );
        const episodeCount = seasonIds.reduce((count, sid) => {
          return (
            count +
            (graph.nodeTypes.Episode || []).filter((eid) =>
              graph.relationships.some(
                (r) => r.source === sid && r.target === eid && r.type === 'hasEpisode'
              )
            ).length
          );
        }, 0);

        return {
          id: props.id,
          title: props.title,
          creator: {
            uid: props.creatorId,
            displayName: props.creatorName,
            avatar: props.creatorAvatar,
          },
          domain: props.domain,
          coverImage: props.coverImage,
          seasonCount: seasonIds.length,
          episodeCount,
          subscriberCount: props.subscriberCount,
          rating: props.rating,
          status: props.status,
        };
      });

    res.json({ series });
  } catch (error: any) {
    console.error('Error listing series:', error);
    res.status(500).json({ error: 'Failed to list series', message: error.message });
  }
}

/**
 * GET /api/content/series/:seriesId
 * Get a single series with seasons and episodes.
 */
export async function getSeriesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { seriesId } = req.params;
    const graph = await ensurePublicGraph();
    const node = graph.nodes[seriesId];

    if (!node || node.type !== 'Series') {
      res.status(404).json({ error: 'Series not found' });
      return;
    }

    const props = node.properties as SeriesNodeProperties;

    // Resolve seasons
    const seasonIds = (graph.nodeTypes.Season || []).filter((sid) =>
      graph.relationships.some(
        (r) => r.source === seriesId && r.target === sid && r.type === 'hasSeason'
      )
    );

    const seasons = seasonIds.map((sid) => {
      const seasonNode = graph.nodes[sid];
      if (!seasonNode) return null;
      const seasonProps = seasonNode.properties;

      // Resolve episodes for this season
      const episodeIds = (graph.nodeTypes.Episode || []).filter((eid) =>
        graph.relationships.some(
          (r) => r.source === sid && r.target === eid && r.type === 'hasEpisode'
        )
      );

      const episodes = episodeIds
        .map((eid) => graph.nodes[eid]?.properties)
        .filter(Boolean);

      return { ...seasonProps, episodes };
    }).filter(Boolean);

    res.json({
      series: {
        ...props,
        creator: {
          uid: props.creatorId,
          displayName: props.creatorName,
          avatar: props.creatorAvatar,
        },
        seasons,
      },
    });
  } catch (error: any) {
    console.error('Error getting series:', error);
    res.status(500).json({ error: 'Failed to get series', message: error.message });
  }
}

/**
 * POST /api/content/series
 * Create a new series.
 */
export async function createSeriesHandler(req: Request, res: Response): Promise<void> {
  try {
    let uid: string;
    try { uid = getUserId(req); } catch { uid = 'seed'; }
    const body = req.body as Partial<SeriesNodeProperties>;

    if (!body.title || !body.domain) {
      res.status(400).json({ error: 'title and domain are required' });
      return;
    }

    const graph = await ensurePublicGraph();
    const now = Date.now();
    const seriesId = body.id || generateNodeId('Series', { name: body.title.toLowerCase().replace(/\s+/g, '-') });

    const properties: SeriesNodeProperties = {
      id: seriesId,
      title: body.title,
      description: body.description || '',
      creatorId: body.creatorId || uid,
      creatorName: body.creatorName || '',
      creatorAvatar: body.creatorAvatar,
      domain: body.domain,
      tags: body.tags || [],
      coverImage: body.coverImage,
      status: body.status || 'draft',
      subscriberCount: 0,
      rating: body.rating,
      createdAt: now,
      updatedAt: now,
    };

    const node = createGraphNode(seriesId, 'Series', properties);
    graph.nodes[seriesId] = node;
    if (!graph.nodeTypes.Series) graph.nodeTypes.Series = [];
    graph.nodeTypes.Series.push(seriesId);
    graph.updatedAt = now;

    await accessLayer.saveGraph(SYSTEM_UID, graph, graph.version);
    res.status(201).json({ series: properties });
  } catch (error: any) {
    console.error('Error creating series:', error);
    res.status(500).json({ error: 'Failed to create series', message: error.message });
  }
}

/**
 * PUT /api/content/series/:seriesId
 * Update a series.
 */
export async function updateSeriesHandler(req: Request, res: Response): Promise<void> {
  try {
    getUserId(req);
    const { seriesId } = req.params;
    const updates = req.body as Partial<SeriesNodeProperties>;

    const graph = await ensurePublicGraph();
    const node = graph.nodes[seriesId];

    if (!node || node.type !== 'Series') {
      res.status(404).json({ error: 'Series not found' });
      return;
    }

    const now = Date.now();
    node.properties = { ...node.properties, ...updates, id: seriesId, updatedAt: now };
    node.updatedAt = now;
    graph.updatedAt = now;

    await accessLayer.saveGraph(SYSTEM_UID, graph, graph.version);
    res.json({ series: node.properties as SeriesNodeProperties });
  } catch (error: any) {
    console.error('Error updating series:', error);
    res.status(500).json({ error: 'Failed to update series', message: error.message });
  }
}

/**
 * DELETE /api/content/series/:seriesId
 * Delete a series.
 */
export async function deleteSeriesHandler(req: Request, res: Response): Promise<void> {
  try {
    getUserId(req);
    const { seriesId } = req.params;

    const graph = await ensurePublicGraph();
    if (!graph.nodes[seriesId]) {
      res.status(404).json({ error: 'Series not found' });
      return;
    }

    delete graph.nodes[seriesId];
    if (graph.nodeTypes.Series) {
      graph.nodeTypes.Series = graph.nodeTypes.Series.filter((id) => id !== seriesId);
    }
    graph.relationships = graph.relationships.filter(
      (r) => r.source !== seriesId && r.target !== seriesId
    );
    graph.updatedAt = Date.now();

    await accessLayer.saveGraph(SYSTEM_UID, graph, graph.version);
    res.json({ deleted: true });
  } catch (error: any) {
    console.error('Error deleting series:', error);
    res.status(500).json({ error: 'Failed to delete series', message: error.message });
  }
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/**
 * GET /api/content/progress
 * Get story progress for the authenticated user.
 * Stored in Firestore: users/{uid}/storyProgress/{storyId}
 */
export async function getStoryProgressHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = getUserId(req);
    // Progress is stored per-user in the user's own graph or a separate collection.
    // For now, return from a "progress-{uid}" graph.
    const progressGraphId = `story-progress-${uid}`;
    let graph: NodeBasedKnowledgeGraph;
    try {
      graph = await accessLayer.getGraph(uid, progressGraphId);
    } catch {
      res.json({ progress: [] });
      return;
    }

    const progressEntries = Object.values(graph.nodes)
      .filter((n) => n.type === 'Story')
      .map((n) => n.properties);

    res.json({ progress: progressEntries });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    console.error('Error getting progress:', error);
    res.status(500).json({ error: 'Failed to get progress', message: error.message });
  }
}

/**
 * POST /api/content/progress
 * Save story progress for the authenticated user.
 * Body: { storyId, score, completed }
 */
export async function saveStoryProgressHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = getUserId(req);
    const { storyId, score, completed } = req.body;

    if (!storyId) {
      res.status(400).json({ error: 'storyId is required' });
      return;
    }

    const progressGraphId = `story-progress-${uid}`;
    let graph: NodeBasedKnowledgeGraph;
    try {
      graph = await accessLayer.getGraph(uid, progressGraphId);
    } catch {
      const now = Date.now();
      graph = {
        id: progressGraphId,
        seedConceptId: '',
        createdAt: now,
        updatedAt: now,
        version: 1,
        name: 'Story Progress',
        nodes: {},
        nodeTypes: createEmptyNodeTypeIndex(),
        relationships: [],
      };
    }

    const now = Date.now();
    const nodeId = `progress-${storyId}`;
    graph.nodes[nodeId] = createGraphNode(nodeId, 'Story', {
      id: nodeId,
      storyId,
      score: score ?? 0,
      completed: completed ?? false,
      updatedAt: now,
      createdAt: graph.nodes[nodeId]?.createdAt || now,
    });

    if (!graph.nodeTypes.Story) graph.nodeTypes.Story = [];
    if (!graph.nodeTypes.Story.includes(nodeId)) {
      graph.nodeTypes.Story.push(nodeId);
    }
    graph.updatedAt = now;

    await accessLayer.saveGraph(uid, graph, graph.version);
    res.json({ saved: true, storyId, score, completed });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    console.error('Error saving progress:', error);
    res.status(500).json({ error: 'Failed to save progress', message: error.message });
  }
}
