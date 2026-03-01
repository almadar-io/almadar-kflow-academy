/**
 * Graph Enrichment Service
 * 
 * Orchestrates LLM-based enrichment strategies to enhance knowledge graphs.
 * Part of Phase 2.7: LLM-Based Graph Enrichment
 */

import { getUserGraphById } from './graphService';
import { 
  getNodeBasedKnowledgeGraph, 
  convertStoredConceptGraphToNodeBased,
  saveNodeBasedKnowledgeGraph 
} from './knowledgeGraphService';
import { getGoalsByGraphId } from './goalService';
import {
  discoverMissingConceptsForMilestone,
  analyzePrerequisiteChain,
  discoverGoalAwareRelationships,
  discoverCrossLayerConcepts,
  findMissingConceptsForLayer,
  identifyLayerRelationships,
} from '../operations';
import type {
  EnrichmentOptions,
  EnrichmentResult,
  LayerCompletenessAnalysis,
  MilestoneConceptDiscovery,
  PrerequisiteAnalysis,
  GoalAwareRelationships,
  CrossLayerDiscovery,
} from '../types/enrichment';
import type { NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';
import type { LearningGoal, Milestone } from '../types/goal';
import { extractGraphForOperations, extractLayersFromNodeBasedGraph } from '../utils/nodeBasedGraphExtractor';

/**
 * Enrich a knowledge graph using LLM analysis (streaming version).
 * Yields enrichment results as they're generated.
 * 
 * @param uid - User ID
 * @param graphId - Graph ID to enrich
 * @param enrichmentOptions - Options for which strategies to run
 * @yields Enrichment results as they're generated
 */
export async function* enrichKnowledgeGraphStream(
  uid: string,
  graphId: string,
  enrichmentOptions: EnrichmentOptions = {}
): AsyncGenerator<{
  type: 'enrichment' | 'complete';
  enrichment?: LayerCompletenessAnalysis | MilestoneConceptDiscovery | PrerequisiteAnalysis | GoalAwareRelationships | CrossLayerDiscovery;
  result?: EnrichmentResult;
}> {
  const {
    discoverMissingConcepts = false,
    analyzePrerequisites = false,
    discoverRelationships = false,
    analyzeLayers = false,
    discoverCrossLayer = false,
    autoApply = false,
  } = enrichmentOptions;

  // 1. Load graph and learning goal
  let kg: NodeBasedKnowledgeGraph | null = await getNodeBasedKnowledgeGraph(uid, graphId);
  
  // Get learning goal first (needed for conversion)
  const goals = await getGoalsByGraphId(uid, graphId);
  const learningGoal = goals.length > 0 ? goals[0] : null;

  // If NodeBasedKnowledgeGraph doesn't exist, convert from ConceptGraph
  if (!kg) {
    const conceptGraph = await getUserGraphById(uid, graphId);
    if (!conceptGraph) {
      throw new Error(`Graph ${graphId} not found`);
    }
    const conversion = convertStoredConceptGraphToNodeBased(conceptGraph, {
      learningGoal: learningGoal || undefined,
    });
    kg = conversion.nodeBasedGraph;
  }

  if (!learningGoal) {
    throw new Error(`No learning goal found for graph ${graphId}`);
  }

  // Extract graph format for operations
  const graphForOps = extractGraphForOperations(kg);

  const enrichmentResults: Array<
    | LayerCompletenessAnalysis
    | MilestoneConceptDiscovery
    | PrerequisiteAnalysis
    | GoalAwareRelationships
    | CrossLayerDiscovery
  > = [];

  // Strategy 1: Layer Completeness Analysis
  // Split into two operations: find missing concepts, then identify relationships
  if (analyzeLayers && learningGoal.milestones) {
    const layers = extractLayersFromNodeBasedGraph(kg);
    for (const layer of layers) {
      const milestone = getMilestoneForLayer(layer.layerNumber, learningGoal);
      if (milestone) {
        const options = {
          layerConcepts: layer.concepts,
          milestone,
          learningGoal,
          layerNumber: layer.layerNumber, // Pass layer number so suggestions are assigned to correct layer
          uid,
        };

        // First operation: Find missing concepts
        const missingConceptsResult = await findMissingConceptsForLayer(options);
        
        // Second operation: Identify relationships
        const relationshipsResult = await identifyLayerRelationships(options);

        // Combine results into LayerCompletenessAnalysis format
        const completeness: LayerCompletenessAnalysis = {
          missingConcepts: missingConceptsResult.missingConcepts,
          missingRelationships: relationshipsResult.missingRelationships,
          metadata: {
            isComplete: false, // Can be calculated if needed
            completenessScore: 0, // Can be calculated if needed
            suggestedAdditions: [],
            prompts: [
              { strategy: 'Find Missing Concepts', prompt: missingConceptsResult.prompt || '' },
              { strategy: 'Identify Relationships', prompt: relationshipsResult.prompt || '' },
            ],
          },
        };

        enrichmentResults.push(completeness);
        yield { type: 'enrichment', enrichment: completeness };
      }
    }
  }

  // Strategy 2: Milestone-Driven Concept Discovery
  if (discoverMissingConcepts && learningGoal.milestones) {
    for (let i = 0; i < learningGoal.milestones.length; i++) {
      const milestone = learningGoal.milestones[i];
      const layerNumber = i + 1; // Milestone index + 1 = layer number (1-based)
      const discovery = await discoverMissingConceptsForMilestone({
        milestone,
        currentGraph: graphForOps,
        learningGoal,
        layerNumber, // Pass layer number so suggestions are assigned to correct layer
        uid,
      });
      enrichmentResults.push(discovery);
      yield { type: 'enrichment', enrichment: discovery };
    }
  }

  // Strategy 3: Prerequisite Chain Analysis
  if (analyzePrerequisites) {
    for (const concept of Object.values(graphForOps.concepts)) {
      const prereqAnalysis = await analyzePrerequisiteChain({
        concept,
        graph: graphForOps,
        learningGoal,
        uid,
      });
      enrichmentResults.push(prereqAnalysis);
      yield { type: 'enrichment', enrichment: prereqAnalysis };
    }
  }

  // Strategy 4: Goal-Aware Relationship Discovery
  if (discoverRelationships) {
    const relationships = await discoverGoalAwareRelationships({
      graph: graphForOps,
      learningGoal,
      uid,
    });
    enrichmentResults.push(relationships);
    yield { type: 'enrichment', enrichment: relationships };
  }

  // Strategy 5: Cross-Layer Concept Discovery
  if (discoverCrossLayer && learningGoal.milestones) {
    const layers = extractLayersFromNodeBasedGraph(kg);
    for (let i = 0; i < layers.length - 1; i++) {
      const layer1 = layers[i];
      const layer2 = layers[i + 1];
      const milestone = getMilestoneForLayer(layer2.layerNumber, learningGoal);
      
      const discovery = await discoverCrossLayerConcepts({
        layer1Concepts: layer1.concepts,
        layer2Concepts: layer2.concepts,
        learningGoal,
        targetMilestone: milestone,
        uid,
      });
      enrichmentResults.push(discovery);
      yield { type: 'enrichment', enrichment: discovery };
    }
  }

  // 3. Apply enrichments if auto-apply is enabled
  let stats = { conceptsAdded: 0, relationshipsAdded: 0 };
  if (autoApply) {
    const { applyEnrichmentsToNodeBasedGraph } = await import('./enrichmentApplicationService');
    const result = await applyEnrichmentsToNodeBasedGraph(uid, graphId, enrichmentResults);
    stats = result.stats;
    // Save enriched graph
    await saveNodeBasedKnowledgeGraph(uid, result.graph);
  }

  const finalResult: EnrichmentResult = {
    graphId,
    enrichments: enrichmentResults,
    applied: autoApply,
    stats,
  };

  yield { type: 'complete', result: finalResult };
}

/**
 * Enrich a knowledge graph using LLM analysis.
 * 
 * @param uid - User ID
 * @param graphId - Graph ID to enrich
 * @param enrichmentOptions - Options for which strategies to run
 * @returns Enrichment results
 */
export async function enrichKnowledgeGraph(
  uid: string,
  graphId: string,
  enrichmentOptions: EnrichmentOptions = {}
): Promise<EnrichmentResult> {
  const {
    discoverMissingConcepts = false,
    analyzePrerequisites = false,
    discoverRelationships = false,
    analyzeLayers = false,
    discoverCrossLayer = false,
    autoApply = false,
    stream = false,
  } = enrichmentOptions;

  // If streaming is requested, use the streaming version
  if (stream) {
    let finalResult: EnrichmentResult | null = null;
    for await (const chunk of enrichKnowledgeGraphStream(uid, graphId, enrichmentOptions)) {
      if (chunk.type === 'complete' && chunk.result) {
        finalResult = chunk.result;
      }
    }
    if (!finalResult) {
      throw new Error('Streaming enrichment did not return a result');
    }
    return finalResult;
  }

  // 1. Load graph and learning goal
  let kg: NodeBasedKnowledgeGraph | null = await getNodeBasedKnowledgeGraph(uid, graphId);
  
  // Get learning goal first (needed for conversion)
  const goals = await getGoalsByGraphId(uid, graphId);
  const learningGoal = goals.length > 0 ? goals[0] : null;

  // If NodeBasedKnowledgeGraph doesn't exist, convert from ConceptGraph
  if (!kg) {
    const conceptGraph = await getUserGraphById(uid, graphId);
    if (!conceptGraph) {
      throw new Error(`Graph ${graphId} not found`);
    }
    const conversion = convertStoredConceptGraphToNodeBased(conceptGraph, {
      learningGoal: learningGoal || undefined,
    });
    kg = conversion.nodeBasedGraph;
  }

  if (!learningGoal) {
    throw new Error(`No learning goal found for graph ${graphId}`);
  }

  // Extract graph format for operations
  const graphForOps = extractGraphForOperations(kg);

  // 2. Run enrichment strategies
  const enrichmentResults: Array<
    | LayerCompletenessAnalysis
    | MilestoneConceptDiscovery
    | PrerequisiteAnalysis
    | GoalAwareRelationships
    | CrossLayerDiscovery
  > = [];

  // Strategy 1: Layer Completeness Analysis
  // Split into two operations: find missing concepts, then identify relationships
  if (analyzeLayers && learningGoal.milestones) {
    const layers = extractLayersFromNodeBasedGraph(kg);
    for (const layer of layers) {
      const milestone = getMilestoneForLayer(layer.layerNumber, learningGoal);
      if (milestone) {
        const options = {
          layerConcepts: layer.concepts,
          milestone,
          learningGoal,
          layerNumber: layer.layerNumber, // Pass layer number so suggestions are assigned to correct layer
          uid,
        };

        // First operation: Find missing concepts
        const missingConceptsResult = await findMissingConceptsForLayer(options);
        
        // Second operation: Identify relationships
        const relationshipsResult = await identifyLayerRelationships(options);

        // Combine results into LayerCompletenessAnalysis format
        const completeness: LayerCompletenessAnalysis = {
          missingConcepts: missingConceptsResult.missingConcepts,
          missingRelationships: relationshipsResult.missingRelationships,
          metadata: {
            isComplete: false, // Can be calculated if needed
            completenessScore: 0, // Can be calculated if needed
            suggestedAdditions: [],
          },
        };

        enrichmentResults.push(completeness);
      }
    }
  }

  // Strategy 2: Milestone-Driven Concept Discovery
  if (discoverMissingConcepts && learningGoal.milestones) {
    for (let i = 0; i < learningGoal.milestones.length; i++) {
      const milestone = learningGoal.milestones[i];
      const layerNumber = i + 1; // Milestone index + 1 = layer number (1-based)
      const discovery = await discoverMissingConceptsForMilestone({
        milestone,
        currentGraph: graphForOps,
        learningGoal,
        layerNumber, // Pass layer number so suggestions are assigned to correct layer
        uid,
      });
      enrichmentResults.push(discovery);
    }
  }

  // Strategy 3: Prerequisite Chain Analysis
  if (analyzePrerequisites) {
    for (const concept of Object.values(graphForOps.concepts)) {
      const prereqAnalysis = await analyzePrerequisiteChain({
        concept,
        graph: graphForOps,
        learningGoal,
        uid,
      });
      enrichmentResults.push(prereqAnalysis);
    }
  }

  // Strategy 4: Goal-Aware Relationship Discovery
  if (discoverRelationships) {
    const relationships = await discoverGoalAwareRelationships({
      graph: graphForOps,
      learningGoal,
      uid,
    });
    enrichmentResults.push(relationships);
  }

  // Strategy 5: Cross-Layer Concept Discovery
  if (discoverCrossLayer && learningGoal.milestones) {
    const layers = extractLayersFromNodeBasedGraph(kg);
    for (let i = 0; i < layers.length - 1; i++) {
      const layer1 = layers[i];
      const layer2 = layers[i + 1];
      const milestone = getMilestoneForLayer(layer2.layerNumber, learningGoal);
      
      const discovery = await discoverCrossLayerConcepts({
        layer1Concepts: layer1.concepts,
        layer2Concepts: layer2.concepts,
        learningGoal,
        targetMilestone: milestone,
        uid,
      });
      enrichmentResults.push(discovery);
    }
  }

  // 3. Apply enrichments if auto-apply is enabled
  let stats = { conceptsAdded: 0, relationshipsAdded: 0 };
  if (autoApply) {
    const { applyEnrichmentsToNodeBasedGraph } = await import('./enrichmentApplicationService');
    const result = await applyEnrichmentsToNodeBasedGraph(uid, graphId, enrichmentResults);
    stats = result.stats;
    // Save enriched graph
    await saveNodeBasedKnowledgeGraph(uid, result.graph);
  }

  return {
    graphId,
    enrichments: enrichmentResults,
    applied: autoApply,
    stats,
  };
}


/**
 * Get milestone for a layer (maps layer number to milestone)
 */
function getMilestoneForLayer(
  layerNumber: number,
  learningGoal: LearningGoal
): Milestone | undefined {
  if (!learningGoal.milestones || learningGoal.milestones.length === 0) {
    return undefined;
  }

  // Simple mapping: layer 1 -> milestone 1, layer 2 -> milestone 2, etc.
  // This can be enhanced with more sophisticated mapping logic
  const milestoneIndex = layerNumber - 1;
  if (milestoneIndex >= 0 && milestoneIndex < learningGoal.milestones.length) {
    return learningGoal.milestones[milestoneIndex];
  }

  // Fallback: return the last milestone
  return learningGoal.milestones[learningGoal.milestones.length - 1];
}

// applyEnrichments has been moved to enrichmentApplicationService.ts
// countNewRelationships is no longer needed as stats are returned from applyEnrichmentsToGraph

/**
 * Enrich a specific layer of a knowledge graph using LLM analysis (streaming version).
 * Yields enrichment results as they're generated.
 * 
 * @param uid - User ID
 * @param graphId - Graph ID to enrich
 * @param layerNumber - Specific layer number to enrich
 * @param enrichmentOptions - Options for which strategies to run
 * @yields Enrichment results as they're generated
 */
export async function* enrichLayerStream(
  uid: string,
  graphId: string,
  layerNumber: number,
  enrichmentOptions: EnrichmentOptions = {}
): AsyncGenerator<{
  type: 'enrichment' | 'complete';
  enrichment?: LayerCompletenessAnalysis | MilestoneConceptDiscovery | PrerequisiteAnalysis | GoalAwareRelationships | CrossLayerDiscovery;
  result?: EnrichmentResult;
}> {
  const {
    discoverMissingConcepts = false,
    analyzePrerequisites = false,
    discoverRelationships = false,
    analyzeLayers = false,
    discoverCrossLayer = false,
    autoApply = false,
  } = enrichmentOptions;

  // 1. Load graph and learning goal
  let kg: NodeBasedKnowledgeGraph | null = await getNodeBasedKnowledgeGraph(uid, graphId);
  
  // Get learning goal first (needed for conversion)
  const goals = await getGoalsByGraphId(uid, graphId);
  const learningGoal = goals.length > 0 ? goals[0] : null;

  // If NodeBasedKnowledgeGraph doesn't exist, convert from ConceptGraph
  if (!kg) {
    const conceptGraph = await getUserGraphById(uid, graphId);
    if (!conceptGraph) {
      throw new Error(`Graph ${graphId} not found`);
    }
    const conversion = convertStoredConceptGraphToNodeBased(conceptGraph, {
      learningGoal: learningGoal || undefined,
    });
    kg = conversion.nodeBasedGraph;
  }

  if (!learningGoal) {
    throw new Error(`No learning goal found for graph ${graphId}`);
  }

  // Extract graph format for operations
  const graphForOps = extractGraphForOperations(kg);

  // Get the specific layer
  const layers = extractLayersFromNodeBasedGraph(kg);
  const targetLayer = layers.find(l => l.layerNumber === layerNumber);
  
  if (!targetLayer) {
    throw new Error(`Layer ${layerNumber} not found in graph ${graphId}`);
  }

  const enrichmentResults: Array<
    | LayerCompletenessAnalysis
    | MilestoneConceptDiscovery
    | PrerequisiteAnalysis
    | GoalAwareRelationships
    | CrossLayerDiscovery
  > = [];

  // Strategy 1: Layer Completeness Analysis (only for the target layer)
  if (analyzeLayers && learningGoal.milestones) {
    const milestone = getMilestoneForLayer(layerNumber, learningGoal);
    if (milestone) {
      const options = {
        layerConcepts: targetLayer.concepts,
        milestone,
        learningGoal,
        layerNumber: targetLayer.layerNumber,
        uid,
      };

      // First operation: Find missing concepts
      const missingConceptsResult = await findMissingConceptsForLayer(options);
      
      // Second operation: Identify relationships
      const relationshipsResult = await identifyLayerRelationships(options);

      // Combine results into LayerCompletenessAnalysis format
      const completeness: LayerCompletenessAnalysis = {
        missingConcepts: missingConceptsResult.missingConcepts,
        missingRelationships: relationshipsResult.missingRelationships,
        metadata: {
          isComplete: false,
          completenessScore: 0,
          suggestedAdditions: [],
        },
      };

      enrichmentResults.push(completeness);
      yield { type: 'enrichment', enrichment: completeness };
    }
  }

  // Strategy 2: Milestone-Driven Concept Discovery (only for the target layer)
  if (discoverMissingConcepts && learningGoal.milestones) {
    const milestone = getMilestoneForLayer(layerNumber, learningGoal);
    if (milestone) {
      const discovery = await discoverMissingConceptsForMilestone({
        milestone,
        currentGraph: graphForOps,
        learningGoal,
        layerNumber,
        uid,
      });
      enrichmentResults.push(discovery);
      yield { type: 'enrichment', enrichment: discovery };
    }
  }

  // Strategy 3: Prerequisite Chain Analysis (only for concepts in the target layer)
  if (analyzePrerequisites) {
    for (const concept of targetLayer.concepts) {
      const prereqAnalysis = await analyzePrerequisiteChain({
        concept,
        graph: graphForOps,
        learningGoal,
        uid,
      });
      enrichmentResults.push(prereqAnalysis);
      yield { type: 'enrichment', enrichment: prereqAnalysis };
    }
  }

  // Strategy 4: Goal-Aware Relationship Discovery (only for relationships involving target layer concepts)
  if (discoverRelationships) {
    // Filter to only relationships involving concepts in the target layer
    const layerConceptIds = new Set(targetLayer.concepts.map(c => c.id || c.name));
    const filteredRelationships: Record<string, any[]> = {};
    
    for (const [conceptName, rels] of Object.entries(graphForOps.relationships || {})) {
      if (layerConceptIds.has(conceptName)) {
        filteredRelationships[conceptName] = rels.filter(rel => 
          layerConceptIds.has(rel.target)
        );
      }
    }

    const relationships = await discoverGoalAwareRelationships({
      graph: {
        concepts: graphForOps.concepts,
        relationships: filteredRelationships,
      },
      learningGoal,
      uid,
    });
    enrichmentResults.push(relationships);
    yield { type: 'enrichment', enrichment: relationships };
  }

  // Strategy 5: Cross-Layer Concept Discovery (only if target layer is not the first layer)
  if (discoverCrossLayer && learningGoal.milestones && layerNumber > 1) {
    const previousLayer = layers.find(l => l.layerNumber === layerNumber - 1);
    if (previousLayer) {
      const milestone = getMilestoneForLayer(layerNumber, learningGoal);
      
      const discovery = await discoverCrossLayerConcepts({
        layer1Concepts: previousLayer.concepts,
        layer2Concepts: targetLayer.concepts,
        learningGoal,
        targetMilestone: milestone,
        uid,
      });
      enrichmentResults.push(discovery);
      yield { type: 'enrichment', enrichment: discovery };
    }
  }

  // Apply enrichments if auto-apply is enabled
  let stats = { conceptsAdded: 0, relationshipsAdded: 0 };
  if (autoApply) {
    const { applyEnrichmentsToNodeBasedGraph } = await import('./enrichmentApplicationService');
    const result = await applyEnrichmentsToNodeBasedGraph(uid, graphId, enrichmentResults);
    stats = result.stats;
    // Save enriched graph
    await saveNodeBasedKnowledgeGraph(uid, result.graph);
  }

  const finalResult: EnrichmentResult = {
    graphId,
    enrichments: enrichmentResults,
    applied: autoApply,
    stats,
  };

  yield { type: 'complete', result: finalResult };
}


