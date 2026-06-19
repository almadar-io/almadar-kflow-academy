/**
 * Graph Query Service
 * 
 * Provides optimized query endpoints that return pre-formatted,
 * display-ready data for Mentor pages. All transformation logic
 * is performed server-side to keep the client thin.
 */

import { getFirestore } from '@almadar/server';
import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import { str, optStr, optNum, bool } from '@almadar-io/knowledge';
import { cache, CACHE_TTL, hybridCache } from './cacheService';
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
} from '../types/nodeBasedKnowledgeGraph';
import type {
  LearningPathSummary,
  GraphSummary,
  ConceptDisplay,
  ConceptsByLayerResponse,
  ConceptDetail,
  MindMapNode,
  MindMapResponse,
} from '../types/graphQueries';

const accessLayer = new KnowledgeGraphAccessLayer();

function cacheKeyLearningPaths(uid: string): string {
  return `graphQuery:learningPaths:${uid}`;
}

function cacheKeyGraphSummary(uid: string, graphId: string): string {
  return `graphQuery:summary:${uid}:${graphId}`;
}

function cacheKeyConcepts(uid: string, graphId: string, includeRelationships: boolean, groupByLayer: boolean): string {
  return `graphQuery:concepts:${uid}:${graphId}:${includeRelationships}:${groupByLayer}`;
}

function cacheKeyConceptDetail(uid: string, graphId: string, conceptId: string): string {
  return `graphQuery:conceptDetail:${uid}:${graphId}:${conceptId}`;
}

function cacheKeyMindMap(uid: string, graphId: string, expandAll: boolean): string {
  return `graphQuery:mindmap:${uid}:${graphId}:${expandAll}`;
}

/**
 * Get all graph IDs for a user
 */
async function getAllGraphIds(uid: string): Promise<string[]> {
  const db = getFirestore();
  const kgCollection = db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs');

  const snapshot = await kgCollection.select('id').get();
  return snapshot.docs.map(doc => doc.id);
}

/**
 * Graph Query Service
 */
export class GraphQueryService {
  /**
   * Invalidate cached query results for a user and optionally a specific graph.
   * Call this after any graph mutation.
   */
  async invalidateCache(uid: string, graphId?: string): Promise<void> {
    if (graphId) {
      await hybridCache.deletePattern(`graphQuery:*:${uid}:${graphId}`);
    }
    await hybridCache.delete(cacheKeyLearningPaths(uid));
    if (!graphId) {
      await hybridCache.deletePattern(`graphQuery:*:${uid}`);
    }
  }

  /**
   * Get learning paths summary for MentorPage
   */
  async getLearningPathsSummary(uid: string): Promise<LearningPathSummary[]> {
    const cacheKey = cacheKeyLearningPaths(uid);
    const cached = await hybridCache.get<LearningPathSummary[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const graphIds = await getAllGraphIds(uid);

    // Load every graph concurrently — each accessLayer.getGraph is independently
    // cached per-graph, so the cold path was N serial Firestore round-trips.
    const settled = await Promise.all(
      graphIds.map(async (graphId): Promise<LearningPathSummary | null> => {
        try {
          const graph = await accessLayer.getGraph(uid, graphId);
          const summary = this.extractLearningPathSummary(graph);

          const hasSeedConcept = summary.seedConcept !== null;
          const hasGoal = summary.title !== 'Untitled Learning Path' && summary.description !== '';
          const hasConcepts = summary.conceptCount > 0;

          if (!hasSeedConcept && graph.seedConceptId && graph.nodes) {
            const seedNodeExists = graph.nodes[graph.seedConceptId] !== undefined;
            console.warn(`Graph ${graphId}: seedConceptId="${graph.seedConceptId}" exists in nodes: ${seedNodeExists}. Node IDs: ${Object.keys(graph.nodes).slice(0, 5).join(', ')}...`);
          }

          if ((hasSeedConcept || hasGoal) && (hasConcepts || hasGoal)) {
            return summary;
          }
          console.warn(`Skipping incomplete graph ${graphId}: seedConcept=${hasSeedConcept} (seedConceptId="${graph.seedConceptId}"), goal=${hasGoal}, concepts=${summary.conceptCount}, title="${summary.title}"`);
          return null;
        } catch (error) {
          console.error(`Failed to load graph ${graphId}:`, error);
          return null;
        }
      })
    );

    const summaries = settled.filter((s): s is LearningPathSummary => s !== null);
    const result = summaries.sort((a, b) => b.updatedAt - a.updatedAt);
    await hybridCache.set(cacheKey, result, CACHE_TTL.LEARNING_PATHS);
    return result;
  }

  /**
   * Get graph summary with goal and stats
   */
  async getGraphSummary(uid: string, graphId: string): Promise<GraphSummary> {
    const cacheKey = cacheKeyGraphSummary(uid, graphId);
    const cached = await hybridCache.get<GraphSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    const graph = await accessLayer.getGraph(uid, graphId);
    const nodes = graph.nodes || {};

    const goalNodeIds = graph.nodeTypes?.LearningGoal || [];
    let goal = null;
    if (goalNodeIds.length > 0) {
      const goalNode = nodes[goalNodeIds[0]];
      if (goalNode && goalNode.type === 'LearningGoal') {
        const gp = goalNode.properties;
        goal = {
          id: goalNode.id,
          title: gp.name || '',
          description: gp.description || '',
          type: gp.type || '',
          target: gp.target || '',
        };
      }
    }

    const milestoneNodeIds = graph.nodeTypes?.Milestone || [];
    const milestones = milestoneNodeIds
      .map(id => nodes[id])
      .filter((node): node is Extract<GraphNode, { type: 'Milestone' }> => node?.type === 'Milestone')
      .map(node => {
        const mp = node.properties;
        return {
          id: node.id,
          title: mp.name || '',
          description: mp.description || '',
          targetDate: mp.targetDate,
          completed: mp.completed,
        };
      });

    let seedConcept = null;
    if (graph.seedConceptId) {
      const seedNode = nodes[graph.seedConceptId];
      if (seedNode && seedNode.type === 'Concept') {
        seedConcept = {
          id: seedNode.id,
          name: seedNode.properties.name || '',
        };
      }
    }

    const result = {
      id: graph.id,
      goal,
      milestones,
      conceptCount: graph.nodeTypes?.Concept?.length || 0,
      layerCount: graph.nodeTypes?.Layer?.length || 0,
      seedConcept,
      updatedAt: graph.updatedAt,
    };
    await hybridCache.set(cacheKey, result, CACHE_TTL.GRAPH_QUERY);
    return result;
  }

  /**
   * Get concepts organized by layer
   */
  async getConceptsByLayer(
    uid: string,
    graphId: string,
    options?: {
      includeRelationships?: boolean;
      groupByLayer?: boolean;
    }
  ): Promise<ConceptsByLayerResponse> {
    const { includeRelationships = true, groupByLayer = true } = options || {};
    const cacheKey = cacheKeyConcepts(uid, graphId, includeRelationships, groupByLayer);
    const cached = await hybridCache.get<ConceptsByLayerResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const graph = await accessLayer.getGraph(uid, graphId);

    if (!graph.nodes) {
      return {
        concepts: [],
        groupedByLayer: {},
        layerInfo: [],
      };
    }

    const conceptNodeIds = graph.nodeTypes?.Concept || [];
    const concepts: ConceptDisplay[] = [];

    for (const nodeId of conceptNodeIds) {
      const node = graph.nodes[nodeId];
      if (node?.type === 'Concept') {
        const concept = this.convertNodeToConceptDisplay(node, graph, includeRelationships);
        concepts.push(concept);
      }
    }

    concepts.sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      return (a.sequence || 0) - (b.sequence || 0);
    });

    let groupedByLayer: Record<number, ConceptDisplay[]> | undefined;
    if (groupByLayer) {
      groupedByLayer = {};
      for (const concept of concepts) {
        if (!groupedByLayer[concept.layer]) {
          groupedByLayer[concept.layer] = [];
        }
        groupedByLayer[concept.layer].push(concept);
      }
    }

    const layerInfo = this.extractLayerInfo(graph);

    const result = {
      concepts,
      groupedByLayer,
      layerInfo,
    };
    await hybridCache.set(cacheKey, result, CACHE_TTL.GRAPH_QUERY);
    return result;
  }

  /**
   * Get complete concept detail with all related data
   */
  async getConceptDetail(
    uid: string,
    graphId: string,
    conceptId: string
  ): Promise<ConceptDetail> {
    const cacheKey = cacheKeyConceptDetail(uid, graphId, conceptId);
    const cached = await hybridCache.get<ConceptDetail>(cacheKey);
    if (cached) {
      return cached;
    }

    const graph = await accessLayer.getGraph(uid, graphId);

    if (!graph.nodes) {
      throw new Error(`Graph ${graphId} has no nodes`);
    }

    const conceptNode = graph.nodes[conceptId];

    if (!conceptNode || conceptNode.type !== 'Concept') {
      throw new Error(`Concept ${conceptId} not found`);
    }

    const concept = this.convertNodeToConceptDisplay(conceptNode, graph, true);

    const lessonRel = graph.relationships.find(
      rel => rel.source === conceptId && rel.type === 'hasLesson'
    );
    let lesson = null;
    if (lessonRel) {
      const lessonNode = graph.nodes[lessonRel.target];
      if (lessonNode?.type === 'Lesson') {
        const lp = lessonNode.properties;
        const prereqs = Array.isArray(lp.prerequisites) ? lp.prerequisites.filter((p): p is string => typeof p === 'string') : [];
        lesson = {
          id: lessonNode.id,
          content: optStr(lp.content) || '',
          prerequisites: prereqs,
        };
      }
    }

    const flashCardRels = graph.relationships.filter(
      rel => rel.source === conceptId && rel.type === 'hasFlashCard'
    );
    const flashcards = flashCardRels
      .map(rel => graph.nodes[rel.target])
      .filter((node): node is Extract<GraphNode, { type: 'FlashCard' }> => node?.type === 'FlashCard')
      .map(node => ({
        id: node.id,
        front: node.properties.front || '',
        back: node.properties.back || '',
      }));

    const metadataRel = graph.relationships.find(
      rel => rel.source === conceptId && rel.type === 'hasMetadata'
    );
    let metadata = null;
    if (metadataRel) {
      const metadataNode = graph.nodes[metadataRel.target];
      if (metadataNode?.type === 'ConceptMetadata') {
        const metaPropsUnknown: unknown = metadataNode.properties;
        const qaPairs = (metaPropsUnknown as Record<string, unknown>).qaPairs;
        const qaPairsArr = Array.isArray(qaPairs) ? qaPairs : [];
        if (qaPairsArr.length > 0) {
          const qa = qaPairsArr.map((pair: { question: string; answer: string }) => ({
            question: pair.question,
            answer: pair.answer,
          }));
          metadata = { qa };
        }
      }
    }

    const relationships = {
      parents: this.extractRelatedConcepts(graph, conceptId, 'hasParent', 'source'),
      children: this.extractRelatedConcepts(graph, conceptId, 'hasChild', 'source'),
      prerequisites: this.extractRelatedConcepts(graph, conceptId, 'hasPrerequisite', 'source'),
    };

    const result = {
      concept,
      lesson,
      flashcards,
      metadata,
      relationships,
    };
    await hybridCache.set(cacheKey, result, CACHE_TTL.GRAPH_QUERY);
    return result;
  }

  /**
   * Extract learning path summary from graph
   */
  private extractLearningPathSummary(graph: NodeBasedKnowledgeGraph): LearningPathSummary {
    // Defensive check: nodes might be undefined for legacy/incomplete graphs
    if (!graph.nodes) {
      return {
        id: graph.id,
        title: 'Untitled Learning Path',
        description: '',
        conceptCount: 0,
        seedConcept: null,
        updatedAt: graph.updatedAt,
        createdAt: graph.createdAt,
      };
    }

    // Extract goal name and description
    // Defensive check: nodeTypes might be undefined for legacy/incomplete graphs
    const goalNodeIds = graph.nodeTypes?.LearningGoal || [];
    let title = 'Untitled Learning Path';
    let description = '';

    if (goalNodeIds.length > 0) {
      const goalNode = graph.nodes[goalNodeIds[0]];
      if (goalNode && goalNode.type === 'LearningGoal') {
        title = goalNode.properties.name || title;
        description = goalNode.properties.description || '';
      }
    }

    // Fallback to seed concept name if no goal
    if (title === 'Untitled Learning Path' && graph.seedConceptId) {
      const seedNode = graph.nodes[graph.seedConceptId];
      if (seedNode && seedNode.type === 'Concept') {
        title = seedNode.properties.name || title;
      }
    }

    // Extract seed concept
    let seedConcept = null;
    if (graph.seedConceptId) {
      let seedNode = graph.nodes[graph.seedConceptId];

      // Fallback: If seedConceptId doesn't match any node ID, try to find seed concept by:
      // 1. Looking for node with isSeed=true property
      // 2. Looking for node where id or name matches seedConceptId
      if (!seedNode) {
        const conceptNodeIds = graph.nodeTypes?.Concept || [];
        for (const nodeId of conceptNodeIds) {
          const node = graph.nodes[nodeId];
          if (node && node.type === 'Concept' && (
            node.properties.isSeed === true ||
            node.id === graph.seedConceptId ||
            node.properties.name === graph.seedConceptId
          )) {
            seedNode = node;
            break;
          }
        }
      }

      if (seedNode && seedNode.type === 'Concept') {
        seedConcept = {
          id: seedNode.id,
          name: seedNode.properties.name || '',
          description: seedNode.properties.description || '',
        };
      }
    }

    return {
      id: graph.id,
      title,
      description,
      conceptCount: graph.nodeTypes?.Concept?.length || 0,
      seedConcept,
      updatedAt: graph.updatedAt,
      createdAt: graph.createdAt,
    };
  }

  /**
   * Convert GraphNode to ConceptDisplay format
   */
  private convertNodeToConceptDisplay(
    node: GraphNode,
    graph: NodeBasedKnowledgeGraph,
    includeRelationships: boolean
  ): ConceptDisplay {
    // Extract layer from node.properties.layer
    const layer = this.extractLayer(node.id, graph);
    const isSeed = node.id === graph.seedConceptId;

    let parents: string[] = [];
    let children: string[] = [];
    let prerequisites: string[] = [];

    if (includeRelationships) {
      // hasParent: concept -> hasParent -> parent (concept is source, parent is target)
      // So to find parents, look for relationships where concept is source
      parents = this.extractRelationshipNames(graph, node.id, 'hasParent', 'source');
      // hasChild: concept -> hasChild -> child (concept is source, child is target)
      // So to find children, look for relationships where concept is source
      children = this.extractRelationshipNames(graph, node.id, 'hasChild', 'source');
      // hasPrerequisite: concept -> hasPrerequisite -> prerequisite (concept is source, prerequisite is target)
      // So to find prerequisites, look for relationships where concept is source
      prerequisites = this.extractRelationshipNames(graph, node.id, 'hasPrerequisite', 'source');
    }

    if (node.type !== 'Concept') {
      throw new Error(`Expected Concept node, got ${node.type}`);
    }
    const cp = node.properties;
    return {
      id: node.id,
      name: cp.name || '',
      description: cp.description || '',
      layer,
      isSeed,
      sequence: cp.sequence,
      parents,
      children,
      prerequisites,
      properties: node.properties,
    };
  }

  /**
   * Extract layer number for a concept node
   * 
   * Uses node.properties.layer directly since it's reliable and set during concept creation.
   */
  private extractLayer(nodeId: string, graph: NodeBasedKnowledgeGraph): number {
    const node = graph.nodes[nodeId];
    
    if (!node) {
      return 0;
    }
    
    // Use node.properties.layer directly
    if (node.type === 'Concept' && node.properties.layer !== undefined && node.properties.layer !== null) {
      const layerValue = Number(node.properties.layer);
      if (!isNaN(layerValue) && layerValue >= 0) {
        return layerValue;
      }
    }

    return 0;
  }

  /**
   * Extract relationship names (concept names) for a node
   * 
   * Supports backward compatibility by checking both relationship directions:
   * - For hasParent: checks if node is source of hasParent OR target of hasChild
   * - For hasChild: checks if node is source of hasChild OR target of hasParent
   * - For other types: uses original direction-based logic
   */
  private extractRelationshipNames(
    graph: NodeBasedKnowledgeGraph,
    nodeId: string,
    relationshipType: string,
    direction: 'source' | 'target'
  ): string[] {
    // Use Set to deduplicate results (important when bidirectional relationships exist)
    const names = new Set<string>();
    
    graph.relationships
      .filter(rel => {
        if (relationshipType === 'hasParent') {
          // For parents: check if node is source of hasParent OR target of hasChild (backward compat)
          return (rel.source === nodeId && rel.type === 'hasParent') ||
                 (rel.target === nodeId && rel.type === 'hasChild');
        } else if (relationshipType === 'hasChild') {
          // For children: check if node is source of hasChild OR target of hasParent (backward compat)
          return (rel.source === nodeId && rel.type === 'hasChild') ||
                 (rel.target === nodeId && rel.type === 'hasParent');
        } else {
          // For prerequisites and other types: use original logic
          if (direction === 'source') {
            return rel.source === nodeId && rel.type === relationshipType;
          } else {
            return rel.target === nodeId && rel.type === relationshipType;
          }
        }
      })
      .forEach(rel => {
        let relatedNodeId: string;
        if (relationshipType === 'hasParent') {
          // If found via hasParent, target is parent; if via hasChild, source is parent
          relatedNodeId = rel.type === 'hasParent' ? rel.target : rel.source;
        } else if (relationshipType === 'hasChild') {
          // If found via hasChild, target is child; if via hasParent, source is child
          relatedNodeId = rel.type === 'hasChild' ? rel.target : rel.source;
        } else {
          // For prerequisites and other types: use original logic
          relatedNodeId = direction === 'source' ? rel.target : rel.source;
        }
        const relatedNode = graph.nodes[relatedNodeId];
        const rawProps = relatedNode?.properties as Record<string, unknown> | undefined;
        const name = typeof rawProps?.name === 'string' ? rawProps.name : undefined;
        if (name) {
          names.add(name);
        }
      });

    return Array.from(names);
  }

  /**
   * Extract related concepts with IDs and names
   */
  private extractRelatedConcepts(
    graph: NodeBasedKnowledgeGraph,
    conceptId: string,
    relationshipType: string,
    direction: 'source' | 'target'
  ): Array<{ id: string; name: string }> {
    return graph.relationships
      .filter(rel => {
        if (direction === 'source') {
          return rel.source === conceptId && rel.type === relationshipType;
        } else {
          return rel.target === conceptId && rel.type === relationshipType;
        }
      })
      .map(rel => {
        const relatedNodeId = direction === 'source' ? rel.target : rel.source;
        const relatedNode = graph.nodes[relatedNodeId];
        if (relatedNode) {
          const rawProps = relatedNode.properties as Record<string, unknown>;
          return {
            id: relatedNode.id,
            name: typeof rawProps.name === 'string' ? rawProps.name : '',
          };
        }
        return null;
      })
      .filter((item): item is { id: string; name: string } => item !== null);
  }

  /**
   * Extract layer information
   */
  private extractLayerInfo(graph: NodeBasedKnowledgeGraph): Array<{
    layerNumber: number;
    conceptCount: number;
    goal?: string;
  }> {
    const layerNodeIds = graph.nodeTypes?.Layer || [];
    const layerInfo: Array<{
      layerNumber: number;
      conceptCount: number;
      goal?: string;
    }> = [];

    for (const layerId of layerNodeIds) {
      const layerNode = graph.nodes[layerId];
      if (layerNode?.type === 'Layer') {
        const lp = layerNode.properties;
        const layerNumber = lp.layerNumber || 0;

        // Count concepts in this layer using both relationship types
        // belongsToLayer: concept -> belongsToLayer -> layer (concept is source, layer is target)
        const conceptsViaBelongsToLayer = graph.relationships.filter(
          rel => rel.type === 'belongsToLayer' && rel.target === layerId
        ).length;

        // containsConcept: layer -> containsConcept -> concept (layer is source, concept is target)
        const conceptsViaContainsConcept = graph.relationships.filter(
          rel => rel.type === 'containsConcept' && rel.source === layerId
        ).length;

        // Also count concepts that have layer property matching this layer number
        const conceptsViaProperty = Object.values(graph.nodes).filter(
          node => node.type === 'Concept' &&
                  node.properties?.layer !== undefined &&
                  Number(node.properties.layer) === layerNumber
        ).length;

        // Use the maximum count (in case some concepts use different methods)
        const conceptCount = Math.max(conceptsViaBelongsToLayer, conceptsViaContainsConcept, conceptsViaProperty);

        layerInfo.push({
          layerNumber,
          conceptCount,
          goal: typeof lp.goal === 'string' ? lp.goal : undefined,
        });
      }
    }

    // Sort by layer number
    return layerInfo.sort((a, b) => a.layerNumber - b.layerNumber);
  }

  /**
   * Get mindmap structure from NodeBasedKnowledgeGraph
   * 
   * Converts the graph into a hierarchical mindmap structure with:
   * - Seed concept as root (level 0)
   * - Layer nodes as children of seed (level 1)
   * - Concepts in layers as children of their layer (level 2)
   * - Nested concepts as children of their parent (level 3+)
   */
  async getMindMapStructure(uid: string, graphId: string, options?: {
    expandAll?: boolean;
  }): Promise<MindMapResponse> {
    const expandAll = options?.expandAll ?? false;
    const cacheKey = cacheKeyMindMap(uid, graphId, expandAll);
    const cached = await hybridCache.get<MindMapResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const graph = await accessLayer.getGraph(uid, graphId);

    // Defensive check: nodes might be undefined for legacy/incomplete graphs
    if (!graph.nodes) {
      throw new Error(`Graph ${graphId} has no nodes`);
    }

    // Validate seed concept exists
    if (!graph.seedConceptId) {
      throw new Error('Seed concept not found in graph');
    }

    const seedNode = graph.nodes[graph.seedConceptId];
    if (!seedNode) {
      throw new Error(`Seed concept node ${graph.seedConceptId} not found`);
    }

    // Build mindmap structure
    const nodes: MindMapNode[] = [];
    const nodeMap = new Map<string, MindMapNode>();
    const visitedNodes = new Set<string>(); // Track visited nodes to prevent cycles

    // 1. Create seed concept node (root, level 0)
    const seedMindMapNode = this.convertNodeToMindMapNode(
      seedNode,
      0,
      undefined,
      options?.expandAll ?? false
    );
    nodes.push(seedMindMapNode);
    nodeMap.set(seedNode.id, seedMindMapNode);
    visitedNodes.add(seedNode.id);

    // 2. Find all Layer nodes and create mindmap nodes (level 1, parent = seed)
    const layerNodes = (graph.nodeTypes?.Layer || [])
      .map(id => graph.nodes[id])
      .filter(Boolean);

    // Sort layers by number
    const sortedLayers = layerNodes.sort((a, b) => {
      const aprop = a.properties as Record<string, unknown>;
      const bprop = b.properties as Record<string, unknown>;
      const aNum = Number(aprop.number ?? aprop.layerNumber ?? 0);
      const bNum = Number(bprop.number ?? bprop.layerNumber ?? 0);
      return aNum - bNum;
    });

    for (const layerNode of sortedLayers) {
      if (visitedNodes.has(layerNode.id)) continue;

      const layerMindMapNode = this.convertNodeToMindMapNode(
        layerNode,
        1,
        seedNode.id,
        options?.expandAll ?? true // Layers expanded by default
      );
      nodes.push(layerMindMapNode);
      nodeMap.set(layerNode.id, layerMindMapNode);
      visitedNodes.add(layerNode.id);

      // Update seed node's children array
      seedMindMapNode.children.push(layerNode.id);

      // 3. Find concepts in this layer (level 2, parent = layer)
      const conceptsInLayer = this.findConceptsInLayer(graph, layerNode.id);
      const sortedConcepts = this.sortConceptsBySequence(conceptsInLayer);

      for (const conceptNode of sortedConcepts) {
        if (visitedNodes.has(conceptNode.id)) continue;

        const conceptMindMapNode = this.convertNodeToMindMapNode(
          conceptNode,
          2,
          layerNode.id,
          options?.expandAll ?? false
        );
        nodes.push(conceptMindMapNode);
        nodeMap.set(conceptNode.id, conceptMindMapNode);
        visitedNodes.add(conceptNode.id);

        // Update layer node's children array
        layerMindMapNode.children.push(conceptNode.id);

        // 4. Recursively find children (level 3+, parent = concept)
        this.buildChildrenRecursively(
          graph,
          conceptNode.id,
          3,
          nodeMap,
          nodes,
          visitedNodes,
          options?.expandAll ?? false
        );
      }
    }

    // Handle concepts without layer assignment - attach to seed
    const allConceptIds = graph.nodeTypes?.Concept || [];
    for (const conceptId of allConceptIds) {
      if (visitedNodes.has(conceptId)) continue;

      const conceptNode = graph.nodes[conceptId];
      if (!conceptNode) continue;

      // Check if concept has belongsToLayer relationship
      const hasLayer = graph.relationships.some(
        rel => rel.source === conceptId && rel.type === 'belongsToLayer'
      );

      if (!hasLayer) {
        // Attach to seed concept
        const conceptMindMapNode = this.convertNodeToMindMapNode(
          conceptNode,
          1, // Same level as layers
          seedNode.id,
          options?.expandAll ?? false
        );
        nodes.push(conceptMindMapNode);
        nodeMap.set(conceptNode.id, conceptMindMapNode);
        visitedNodes.add(conceptNode.id);

        // Update seed node's children array
        seedMindMapNode.children.push(conceptNode.id);

        // Recursively find children
        this.buildChildrenRecursively(
          graph,
          conceptNode.id,
          2,
          nodeMap,
          nodes,
          visitedNodes,
          options?.expandAll ?? false
        );
      }
    }

    // Calculate statistics
    const layerCount = sortedLayers.length;
    const conceptCount = nodes.filter(n => n.nodeType === 'Concept').length;

    const result = {
      nodes,
      seedNodeId: seedNode.id,
      totalNodes: nodes.length,
      layerCount,
      conceptCount,
    };
    await hybridCache.set(cacheKey, result, CACHE_TTL.GRAPH_QUERY);
    return result;
  }

  /**
   * Find all concepts in a layer via belongsToLayer relationship
   */
  private findConceptsInLayer(
    graph: NodeBasedKnowledgeGraph,
    layerId: string
  ): GraphNode[] {
    return graph.relationships
      .filter(rel => 
        rel.target === layerId && 
        rel.type === 'belongsToLayer'
      )
      .map(rel => graph.nodes[rel.source])
      .filter(node => node?.type === 'Concept');
  }

  /**
   * Find all children of a concept via hasChild relationship
   */
  private findChildrenOfConcept(
    graph: NodeBasedKnowledgeGraph,
    conceptId: string
  ): GraphNode[] {
    return graph.relationships
      .filter(rel => 
        rel.source === conceptId && 
        rel.type === 'hasChild'
      )
      .map(rel => graph.nodes[rel.target])
      .filter(node => node?.type === 'Concept');
  }

  /**
   * Sort concepts by sequence or layer, fallback to creation order
   */
  private sortConceptsBySequence(concepts: GraphNode[]): GraphNode[] {
    return concepts.sort((a, b) => {
      const ap = a.properties as Record<string, unknown>;
      const bp = b.properties as Record<string, unknown>;
      // First try sequence
      const aSeq = ap.sequence != null ? Number(ap.sequence) : undefined;
      const bSeq = bp.sequence != null ? Number(bp.sequence) : undefined;
      if (aSeq !== undefined && bSeq !== undefined) {
        return aSeq - bSeq;
      }
      if (aSeq !== undefined) return -1;
      if (bSeq !== undefined) return 1;

      // Fallback to layer
      const aLayer = ap.layer != null ? Number(ap.layer) : 0;
      const bLayer = bp.layer != null ? Number(bp.layer) : 0;
      if (aLayer !== bLayer) {
        return aLayer - bLayer;
      }

      // Fallback to creation order
      const aCreated = a.createdAt ?? 0;
      const bCreated = b.createdAt ?? 0;
      return aCreated - bCreated;
    });
  }

  /**
   * Recursively build children hierarchy
   */
  private buildChildrenRecursively(
    graph: NodeBasedKnowledgeGraph,
    parentId: string,
    level: number,
    nodeMap: Map<string, MindMapNode>,
    nodes: MindMapNode[],
    visitedNodes: Set<string>,
    expandAll: boolean
  ): void {
    // Find all children via hasChild relationships
    const children = this.findChildrenOfConcept(graph, parentId);

    // Sort children by sequence or creation order
    const sortedChildren = this.sortConceptsBySequence(children);

    for (const childNode of sortedChildren) {
      // Skip if already added (avoid duplicates and cycles)
      if (visitedNodes.has(childNode.id)) {
        // If already visited, check if we should update parent
        // For multiple parents, use the first one encountered (strongest relationship)
        continue;
      }

      const childMindMapNode = this.convertNodeToMindMapNode(
        childNode,
        level,
        parentId,
        expandAll
      );
      nodes.push(childMindMapNode);
      nodeMap.set(childNode.id, childMindMapNode);
      visitedNodes.add(childNode.id);

      // Update parent's children array
      const parentNode = nodeMap.get(parentId);
      if (parentNode) {
        parentNode.children.push(childNode.id);
      }

      // Recursively find grandchildren
      this.buildChildrenRecursively(
        graph,
        childNode.id,
        level + 1,
        nodeMap,
        nodes,
        visitedNodes,
        expandAll
      );
    }
  }

  /**
   * Convert GraphNode to MindMapNode format
   */
  private convertNodeToMindMapNode(
    node: GraphNode,
    level: number,
    parentId: string | undefined,
    expandAll: boolean
  ): MindMapNode {
    const np = node.properties as Record<string, unknown>;
    // Extract title and content - use name property only
    const title = typeof np.name === 'string' ? np.name : node.id;
    const content = typeof np.description === 'string' ? np.description :
                    typeof np.content === 'string' ? np.content : '';

    // Extract tags (from parents or other relationships)
    const tags: string[] = [];

    // Build metadata
    const metadataRaw: Record<string, unknown> = {};
    if (np.layer !== undefined) metadataRaw.layer = Number(np.layer);
    if (np.isSeed) metadataRaw.isSeed = true;
    if (np.sequence !== undefined) metadataRaw.sequence = np.sequence as number;
    if (np.goal) metadataRaw.goal = np.goal as string;
    if (np.number !== undefined) metadataRaw.layerNumber = Number(np.number);
    if (np.layerNumber !== undefined) metadataRaw.layerNumber = Number(np.layerNumber);
    const metadata: MindMapNode['metadata'] = Object.keys(metadataRaw).length > 0
      ? metadataRaw as MindMapNode['metadata']
      : undefined;

    // Determine if expanded:
    // 1. Use stored isExpanded property if it exists
    // 2. Fallback to default behavior (seed and layers expanded by default, or if expandAll is true)
    const isExpanded = np.isExpanded !== undefined
      ? Boolean(np.isExpanded)
      : (expandAll || level < 2);

    return {
      id: node.id,
      title,
      content,
      createdAt: new Date(node.createdAt ?? Date.now()),
      updatedAt: new Date(node.updatedAt ?? Date.now()),
      tags,
      parentId,
      children: [], // Will be populated during hierarchy building
      level,
      isExpanded,
      nodeType: node.type,
      metadata,
    };
  }
}

