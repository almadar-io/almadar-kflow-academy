#!/usr/bin/env npx tsx
/**
 * Seed Stories Script
 *
 * Parses .orb files from projects/kflow/stories/ (English only) and seeds
 * them directly into the knowledge graph (no HTTP, no auth required).
 *
 * Directory structure:
 *   stories/series-{N}-{name}/S{N}-{season}/E{N}-{episode}/{story}.orb
 *
 * Usage:
 *   npx tsx src/scripts/seed-stories.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env for Firebase config
config({ path: path.resolve(__dirname, '../../.env') });

const STORIES_DIR = path.resolve(__dirname, '../../../../../../projects/kflow/stories');

interface OrbFile {
  name: string;
  description: string;
  orbitals: Array<{
    entity?: {
      fields?: Array<{ name: string; type: string; values?: string[] }>;
    };
    traits?: Array<{
      name: string;
      stateMachine?: { transitions?: Array<{ effects?: unknown[][] }> };
    }>;
  }>;
}

interface StoryEntry {
  id: string;
  title: string;
  teaser: string;
  domain: string;
  difficulty: string;
  duration: number;
  seriesId?: string;
  gameType?: string;
}

interface SeriesEntry {
  id: string;
  title: string;
  description: string;
  domain: string;
  creatorName: string;
  tags: string[];
}

// Map series directory names to metadata
const seriesMeta: Record<string, { title: string; domain: string; tags: string[] }> = {
  'series-0-origins': {
    title: 'Origins: The Story of Knowledge',
    domain: 'natural',
    tags: ['history', 'science', 'origins'],
  },
  'series-1-code': {
    title: 'Code: The Language of Machines',
    domain: 'formal',
    tags: ['programming', 'languages', 'computer-science'],
  },
  'series-2-systems': {
    title: 'Systems: Building the Digital World',
    domain: 'formal',
    tags: ['systems', 'infrastructure', 'engineering'],
  },
  'series-3-web': {
    title: 'Web: The Connected World',
    domain: 'formal',
    tags: ['web', 'frameworks', 'internet'],
  },
  'series-4-pixels': {
    title: 'Pixels: The Art of Computation',
    domain: 'formal',
    tags: ['graphics', 'games', 'creative-coding'],
  },
  'series-5-craft': {
    title: 'Craft: The Practice of Software',
    domain: 'formal',
    tags: ['software-engineering', 'practices', 'career'],
  },
  'series-6-mosaic': {
    title: 'Mosaic: The Wider World',
    domain: 'social',
    tags: ['culture', 'society', 'interdisciplinary'],
  },
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractDomain(orbData: OrbFile): string {
  const entity = orbData.orbitals?.[0]?.entity;
  if (!entity?.fields) return 'formal';

  const domainField = entity.fields.find((f) => f.name === 'primaryDomain');
  if (domainField?.values?.length) return domainField.values[0];

  const domainEnum = entity.fields.find((f) => f.name === 'domain');
  if (domainEnum?.values?.length) return domainEnum.values[0];

  return 'formal';
}

function extractGameType(orbData: OrbFile): string | undefined {
  const entity = orbData.orbitals?.[0]?.entity;
  if (!entity?.fields) return undefined;

  const gameField = entity.fields.find((f) => f.name === 'gameType');
  if (gameField?.values?.length) return gameField.values[0];

  return undefined;
}

function findOrbFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findOrbFiles(fullPath));
    } else if (
      entry.name.endsWith('.orb') &&
      !entry.name.includes('.ar.') &&
      !entry.name.includes('.sl.')
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

function parseStoryPath(filePath: string): { seriesDir: string; seasonDir?: string; episodeDir?: string } {
  const relative = path.relative(STORIES_DIR, filePath);
  const parts = relative.split(path.sep);

  return {
    seriesDir: parts[0] || '',
    seasonDir: parts[1],
    episodeDir: parts[2],
  };
}

async function seedStories(): Promise<void> {
  // Import after env is loaded
  const { KnowledgeGraphAccessLayer } = await import('../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer.js');
  const { createGraphNode, createRelationship, createEmptyNodeTypeIndex } = await import('../types/nodeBasedKnowledgeGraph.js');
  const accessLayer = new KnowledgeGraphAccessLayer();

  const SYSTEM_UID = 'system-public';
  const GRAPH_ID = 'stories-public';

  const orbFiles = findOrbFiles(STORIES_DIR);
  console.log(`Found ${orbFiles.length} English .orb story files\n`);

  // Build fresh graph
  const now = Date.now();
  const graph = {
    id: GRAPH_ID,
    seedConceptId: '',
    createdAt: now,
    updatedAt: now,
    version: 1,
    name: 'Public Stories',
    nodes: {} as Record<string, ReturnType<typeof createGraphNode>>,
    nodeTypes: createEmptyNodeTypeIndex(),
    relationships: [] as ReturnType<typeof createRelationship>[],
  };

  // Collect series and stories
  const seriesAdded = new Set<string>();

  for (const filePath of orbFiles) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const orbData: OrbFile = JSON.parse(raw);
      const { seriesDir } = parseStoryPath(filePath);
      const meta = seriesMeta[seriesDir];

      // Add series node
      if (meta && !seriesAdded.has(seriesDir)) {
        const seriesId = `series-${slugify(seriesDir)}`;
        graph.nodes[seriesId] = createGraphNode(seriesId, 'Series', {
          id: seriesId,
          title: meta.title,
          description: `A knowledge story series about ${meta.tags.join(', ')}`,
          creatorId: 'seed',
          creatorName: 'KFlow Academy',
          domain: meta.domain,
          tags: meta.tags,
          status: 'published',
          subscriberCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        if (!graph.nodeTypes.Series) graph.nodeTypes.Series = [];
        graph.nodeTypes.Series.push(seriesId);
        seriesAdded.add(seriesDir);
        console.log(`  ✓ Series: ${meta.title}`);
      }

      // Add story node
      const storyId = `story-${slugify(orbData.name)}`;
      const domain = extractDomain(orbData);
      const seriesId = meta ? `series-${slugify(seriesDir)}` : undefined;

      graph.nodes[storyId] = createGraphNode(storyId, 'Story', {
        id: storyId,
        title: orbData.name,
        teaser: orbData.description || `A knowledge story about ${orbData.name}`,
        domain,
        difficulty: 'beginner',
        duration: 10,
        seriesId,
        gameType: extractGameType(orbData) || 'sequencer',
        playCount: 0,
        // Required content fields for the detail view
        hookQuestion: `What will you discover in "${orbData.name}"?`,
        hookNarrative: orbData.description || `Explore the world of ${orbData.name}.`,
        scenes: [],
        principle: `The core principle behind ${orbData.name}.`,
        explanation: `${orbData.description || orbData.name} explores fundamental concepts that shaped our understanding.`,
        pattern: `Key pattern: understanding how ${orbData.name.toLowerCase()} connects to the bigger picture.`,
        tryItQuestion: `What is the main idea of "${orbData.name}"?`,
        tryItOptions: ['Option A', 'Option B', 'Option C', 'Option D'],
        tryItCorrectIndex: 0,
        gameConfig: {},
        resolution: `You've completed "${orbData.name}"! Great job exploring this topic.`,
        learningPoints: [
          `Understood the key concepts of ${orbData.name}`,
          'Connected ideas across domains',
          'Applied knowledge through interactive challenges',
        ],
        currentStep: 0,
        isComplete: false,
        createdAt: now,
        updatedAt: now,
      });
      if (!graph.nodeTypes.Story) graph.nodeTypes.Story = [];
      graph.nodeTypes.Story.push(storyId);

      // Link to series
      if (seriesId) {
        graph.relationships.push(
          createRelationship(seriesId, storyId, 'hasStory', 'forward')
        );
      }

      console.log(`  ✓ ${orbData.name}`);
    } catch (err) {
      console.error(`  ✗ Failed to parse ${path.basename(filePath)}:`, err);
    }
  }

  // Save graph
  console.log(`\nSaving graph with ${Object.keys(graph.nodes).length} nodes...`);

  try {
    // Try to get existing graph to preserve version
    let expectedVersion: number | undefined;
    try {
      const existing = await accessLayer.getGraph(SYSTEM_UID, GRAPH_ID);
      expectedVersion = existing.version;
    } catch { /* new graph */ }

    await accessLayer.saveGraph(SYSTEM_UID, graph, expectedVersion);
    const storyCount = graph.nodeTypes.Story?.length || 0;
    const seriesCount = graph.nodeTypes.Series?.length || 0;
    console.log(`Done: ${storyCount} stories and ${seriesCount} series seeded.`);
  } catch (err) {
    console.error('Failed to save graph:', err);
    process.exit(1);
  }
}

seedStories().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
