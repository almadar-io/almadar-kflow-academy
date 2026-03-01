/**
 * Publishing Query Service
 * 
 * Handles publishing-related queries for course/module/lesson data extraction.
 */

import type { GraphLoader } from '../core/GraphLoader';

export interface ModuleForPublishing {
  id: string;
  name: string;
  description: string;
  layerNumber: number;
  goal?: string;
  conceptCount: number;
}

export interface LessonForPublishing {
  id: string;
  name: string;
  description: string;
  sequence?: number;
  hasLessonContent: boolean;
  hasFlashCards: boolean;
}

export interface SeedConceptPublishData {
  id: string;
  name: string;
  description: string;
  modules: ModuleForPublishing[];
}

export interface ModuleConceptPublishData {
  id: string;
  name: string;
  description: string;
  layerNumber: number;
  goal?: string;
  availableLessons: LessonForPublishing[];
}

export interface LessonContentPublishData {
  content?: string;
  flashCards?: Array<{ front: string; back: string }>;
  questions?: Array<{ question: string; answer: string }>;
}

export interface GraphMetadataPublishData {
  id: string;
  name: string;
  seedConceptId: string;
  seedConceptName: string;
  difficulty?: string;
  model?: string;
  createdAt: number;
  updatedAt: number;
  totalConcepts: number;
  totalLayers: number;
}

export interface ConceptsByLayer {
  id: string;
  name: string;
  description: string;
  sequence?: number;
  parentIds: string[];
  childIds: string[];
}

export class PublishingQueryService {
  constructor(private loader: GraphLoader) {}

  /**
   * Get seed concept with layers as modules for course publishing
   * Modules = Layers in the graph structure
   */
  async getSeedConceptForPublishing(
    uid: string,
    graphId: string
  ): Promise<SeedConceptPublishData | null> {
    const graph = await this.loader.getGraph(uid, graphId);
    if (!graph) return null;

    const seedNode = graph.nodes[graph.seedConceptId];
    if (!seedNode) return null;

    // Get all Layer nodes as modules
    const layerNodeIds = graph.nodeTypes?.Layer || [];
    const modules: ModuleForPublishing[] = [];

    for (const layerId of layerNodeIds) {
      const layerNode = graph.nodes[layerId];
      if (!layerNode || layerNode.type !== 'Layer') continue;

      const layerNumber =
        layerNode.properties?.layerNumber ?? layerNode.properties?.number ?? 0;

      // Count concepts in this layer
      const conceptIds = graph.nodeTypes?.Concept || [];
      const conceptCount = conceptIds.filter(conceptId => {
        const conceptNode = graph.nodes[conceptId];
        return conceptNode?.properties?.layer === layerNumber;
      }).length;

      modules.push({
        id: layerId,
        name:
          layerNode.properties?.name ||
          layerNode.properties?.title ||
          `Layer ${layerNumber}`,
        description:
          layerNode.properties?.description || layerNode.properties?.goal || '',
        layerNumber,
        goal: layerNode.properties?.goal,
        conceptCount,
      });
    }

    // Sort by layer number
    modules.sort((a, b) => a.layerNumber - b.layerNumber);

    return {
      id: graph.seedConceptId,
      name: seedNode.properties?.name || graph.seedConceptId,
      description: seedNode.properties?.description || '',
      modules,
    };
  }

  /**
   * Get layer with its concepts as lessons for publishing
   * Lessons = Concepts within the layer
   * @param moduleId - The layer node ID (module)
   */
  async getModuleConceptForPublishing(
    uid: string,
    graphId: string,
    moduleId: string
  ): Promise<ModuleConceptPublishData | null> {
    const graph = await this.loader.getGraph(uid, graphId);
    if (!graph) return null;

    const layerNode = graph.nodes[moduleId];
    if (!layerNode || layerNode.type !== 'Layer') return null;

    const layerNumber =
      layerNode.properties?.layerNumber ?? layerNode.properties?.number ?? 0;

    // Find all concepts in this layer
    const conceptIds = graph.nodeTypes?.Concept || [];
    const availableLessons: LessonForPublishing[] = [];

    for (const conceptId of conceptIds) {
      const conceptNode = graph.nodes[conceptId];
      if (!conceptNode || conceptNode.properties?.layer !== layerNumber) continue;

      // Check for lesson content
      const hasLessonContent = (graph.relationships || []).some(
        rel => rel.source === conceptId && rel.type === 'hasLesson'
      );

      // Check for flashcards
      const hasFlashCards = (graph.relationships || []).some(
        rel => rel.source === conceptId && rel.type === 'hasFlashCard'
      );

      availableLessons.push({
        id: conceptId,
        name: conceptNode.properties?.name || conceptId,
        description: conceptNode.properties?.description || '',
        sequence: conceptNode.properties?.sequence,
        hasLessonContent,
        hasFlashCards,
      });
    }

    // Sort by sequence
    availableLessons.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

    return {
      id: moduleId,
      name:
        layerNode.properties?.name ||
        layerNode.properties?.title ||
        `Layer ${layerNumber}`,
      description:
        layerNode.properties?.description || layerNode.properties?.goal || '',
      layerNumber,
      goal: layerNode.properties?.goal,
      availableLessons,
    };
  }

  /**
   * Get lesson content for publishing (lesson markdown and flashcards)
   */
  async getLessonContentForPublishing(
    uid: string,
    graphId: string,
    conceptId: string
  ): Promise<LessonContentPublishData | null> {
    const graph = await this.loader.getGraph(uid, graphId);
    if (!graph) return null;

    const conceptNode = graph.nodes[conceptId];
    if (!conceptNode) return null;

    // Find lesson content via hasLesson relationship
    const lessonRel = (graph.relationships || []).find(
      r => r.source === conceptId && r.type === 'hasLesson'
    );

    let content: string | undefined;
    if (lessonRel) {
      const lessonNode = graph.nodes[lessonRel.target];
      content = lessonNode?.properties?.content;
    }

    // Find flashcards via hasFlashCard relationships
    const flashCardRels = (graph.relationships || []).filter(
      r => r.source === conceptId && r.type === 'hasFlashCard'
    );

    const flashCards = flashCardRels
      .map(r => {
        const flashNode = graph.nodes[r.target];
        if (!flashNode) return null;
        return {
          front: flashNode.properties?.front || '',
          back: flashNode.properties?.back || '',
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      content,
      flashCards: flashCards.length > 0 ? flashCards : undefined,
    };
  }

  /**
   * Get all concepts organized by layer for bulk publishing
   */
  async getConceptsByLayerForPublishing(
    uid: string,
    graphId: string
  ): Promise<Map<number, ConceptsByLayer[]>> {
    const graph = await this.loader.getGraph(uid, graphId);
    if (!graph) return new Map();

    const layerMap = new Map<number, ConceptsByLayer[]>();
    const conceptIds = graph.nodeTypes?.Concept || [];

    for (const conceptId of conceptIds) {
      const node = graph.nodes[conceptId];
      if (!node) continue;

      // Find layer number from node properties
      const layerNumber = node.properties?.layer ?? 0;

      // Find parents and children
      const parentIds = (graph.relationships || [])
        .filter(r => r.source === conceptId && r.type === 'hasParent')
        .map(r => r.target);

      const childIds = (graph.relationships || [])
        .filter(r => r.source === conceptId && r.type === 'hasChild')
        .map(r => r.target);

      const conceptData: ConceptsByLayer = {
        id: conceptId,
        name: node.properties?.name || conceptId,
        description: node.properties?.description || '',
        sequence: node.properties?.sequence,
        parentIds,
        childIds,
      };

      if (!layerMap.has(layerNumber)) {
        layerMap.set(layerNumber, []);
      }
      layerMap.get(layerNumber)!.push(conceptData);
    }

    // Sort concepts within each layer by sequence
    for (const [, concepts] of layerMap) {
      concepts.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    }

    return layerMap;
  }

  /**
   * Get graph metadata for publishing (difficulty, model, etc.)
   */
  async getGraphMetadataForPublishing(
    uid: string,
    graphId: string
  ): Promise<GraphMetadataPublishData | null> {
    const graph = await this.loader.getGraph(uid, graphId);
    if (!graph) return null;

    const seedNode = graph.nodes[graph.seedConceptId];
    const conceptCount = graph.nodeTypes?.Concept?.length || 0;
    const layerCount = graph.nodeTypes?.Layer?.length || 0;

    // Get difficulty from GraphMetadata if exists
    const metadataIds = graph.nodeTypes?.GraphMetadata || [];
    let difficulty: string | undefined;
    let model: string | undefined;

    for (const metaId of metadataIds) {
      const metaNode = graph.nodes[metaId];
      if (metaNode?.properties) {
        difficulty = difficulty || metaNode.properties.difficulty;
        model = model || metaNode.properties.model;
      }
    }

    return {
      id: graph.id,
      name: seedNode?.properties?.name || graph.seedConceptId,
      seedConceptId: graph.seedConceptId,
      seedConceptName: seedNode?.properties?.name || graph.seedConceptId,
      difficulty,
      model,
      createdAt: graph.createdAt,
      updatedAt: graph.updatedAt,
      totalConcepts: conceptCount,
      totalLayers: layerCount,
    };
  }
}
