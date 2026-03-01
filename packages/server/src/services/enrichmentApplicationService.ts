/**
 * Enrichment Application Service
 * 
 * Applies enrichment suggestions to a KnowledgeGraph by adding missing concepts
 * and relationships based on the unified enrichment response format.
 */

import { generateConceptId } from '../utils/uuid';
import type {
  KnowledgeGraph,
  EnhancedConcept,
  Relationship,
  ConceptMetadata,
  GraphMetadata,
} from '../types/knowledgeGraph';
import type {
  LayerCompletenessAnalysis,
  MilestoneConceptDiscovery,
  PrerequisiteAnalysis,
  GoalAwareRelationships,
  CrossLayerDiscovery,
  MissingConcept,
  MissingRelationship,
} from '../types/enrichment';
import { 
  getNodeBasedKnowledgeGraph,
  convertStoredConceptGraphToNodeBased,
} from './knowledgeGraphService';
import { getUserGraphById } from './graphService';
import { getGoalsByGraphId } from './goalService';
import type { NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';
import { extractGraphForOperations } from '../utils/nodeBasedGraphExtractor';

/**
 * Apply enrichments to a knowledge graph
 * 
 * @param uid - User ID
 * @param graphId - Graph ID
 * @param enrichments - Array of enrichment results to apply
 * @returns Updated knowledge graph with applied enrichments
 */
export async function applyEnrichmentsToGraph(
  uid: string,
  graphId: string,
  enrichments: Array<
    | LayerCompletenessAnalysis
    | MilestoneConceptDiscovery
    | PrerequisiteAnalysis
    | GoalAwareRelationships
    | CrossLayerDiscovery
  >
): Promise<{
  graph: KnowledgeGraph;
  stats: {
    conceptsAdded: number;
    relationshipsAdded: number;
  };
}> {
  // Load the node-based knowledge graph
  let nodeBasedKg = await getNodeBasedKnowledgeGraph(uid, graphId);
  
  // If it doesn't exist, convert from ConceptGraph
  if (!nodeBasedKg) {
    const conceptGraph = await getUserGraphById(uid, graphId);
    if (!conceptGraph) {
      throw new Error(`Graph ${graphId} not found`);
    }
    const goals = await getGoalsByGraphId(uid, graphId);
    const learningGoal = goals.length > 0 ? goals[0] : null;
    const conversion = convertStoredConceptGraphToNodeBased(conceptGraph, {
      learningGoal: learningGoal ? {
        title: learningGoal.title,
        description: learningGoal.description,
      } : undefined,
    });
    nodeBasedKg = conversion.nodeBasedGraph;
  }

  // Extract to old format for compatibility with existing logic
  const graphForOps = extractGraphForOperations(nodeBasedKg);
  
  // Create a temporary KnowledgeGraph-like structure for the existing logic
  const kg: KnowledgeGraph = {
    id: nodeBasedKg.id,
    seedConceptId: nodeBasedKg.seedConceptId,
    concepts: graphForOps.concepts,
    relationships: graphForOps.relationships,
    layers: undefined, // Will be reconstructed if needed
    createdAt: nodeBasedKg.createdAt,
    updatedAt: nodeBasedKg.updatedAt,
    model: nodeBasedKg.model,
    goalFocused: nodeBasedKg.goalFocused,
    difficulty: nodeBasedKg.difficulty,
    focus: nodeBasedKg.focus,
    metadata: undefined,
  };

  // Deep clone to avoid mutating the original
  const enrichedKg: KnowledgeGraph = JSON.parse(JSON.stringify(kg));

  // Collect all unique missing concepts and relationships
  const allMissingConcepts = new Map<string, MissingConcept>();
  const allMissingRelationships: MissingRelationship[] = [];

  // Extract from all enrichment results
  for (const enrichment of enrichments) {
    // Add missing concepts (deduplicate by name)
    for (const concept of enrichment.missingConcepts || []) {
      if (!allMissingConcepts.has(concept.name)) {
        allMissingConcepts.set(concept.name, concept);
      }
    }

    // Add missing relationships
    for (const relationship of enrichment.missingRelationships || []) {
      allMissingRelationships.push(relationship);
    }
  }

  // Track what we're adding
  const conceptsToAdd: EnhancedConcept[] = [];
  const relationshipsToAdd: Array<{ source: string; relationship: Relationship }> = [];

  // Step 1: Create concepts from missing concepts
  for (const [conceptName, missingConcept] of allMissingConcepts) {
    // Skip if concept already exists
    if (enrichedKg.concepts[conceptName]) {
      continue;
    }

    // Determine parent(s)
    const parents = determineParents(missingConcept, enrichedKg);

    // Determine layer
    const layer = determineLayer(missingConcept, enrichedKg);

    // Generate concept ID
    const conceptId = generateConceptId();

    // Create enhanced concept
    const newConcept: EnhancedConcept = {
      id: conceptId,
      name: conceptName,
      description: missingConcept.description || inferDescription(missingConcept),
      parents,
      children: [],
      isSeed: false,
      layer,
      prerequisites: missingConcept.prerequisites || [],
      metadata: inferMetadata(missingConcept, enrichedKg),
    };

    conceptsToAdd.push(newConcept);
  }

  // Step 2: Add concepts to graph
  for (const concept of conceptsToAdd) {
    enrichedKg.concepts[concept.name] = concept;

    // Update parent concepts' children arrays
    // Note: The first parent is always the top-level concept (layer concept)
    // This ensures each enrichment is properly connected to its layer
    for (const parentName of concept.parents) {
      const parent = enrichedKg.concepts[parentName];
      if (parent && !parent.children.includes(concept.name)) {
        parent.children.push(concept.name);
      }
    }

    // Ensure the top-level concept (first parent) has this concept in its children
    // This is critical since each layer maps to a top-level concept
    if (concept.parents.length > 0) {
      const topLevelConceptName = concept.parents[0];
      const topLevelConcept = enrichedKg.concepts[topLevelConceptName];
      if (topLevelConcept && !topLevelConcept.children.includes(concept.name)) {
        topLevelConcept.children.push(concept.name);
      }
    }

    // Update layer's conceptIds if layer exists
    // Use concept name as ID (consistent with topLevelConceptId using names)
    if (concept.layer !== undefined && enrichedKg.layers?.[concept.layer]) {
      const layer = enrichedKg.layers[concept.layer];
      if (layer.conceptIds && !layer.conceptIds.includes(concept.name)) {
        layer.conceptIds.push(concept.name);
      }
    }
  }

  // Step 3: Create relationships
  for (const missingRel of allMissingRelationships) {
    // Verify both concepts exist (create placeholders if needed)
    if (!enrichedKg.concepts[missingRel.source]) {
      // Create placeholder concept
      const placeholder: EnhancedConcept = {
        id: generateConceptId(),
        name: missingRel.source,
        description: `Placeholder concept for relationship`,
        parents: [],
        children: [],
        isSeed: false,
        metadata: {
          difficulty: 3,
          timeEstimate: 1,
          domain: extractDomain(enrichedKg),
          tags: [],
        },
      };
      enrichedKg.concepts[missingRel.source] = placeholder;
      conceptsToAdd.push(placeholder);
    }

    if (!enrichedKg.concepts[missingRel.target]) {
      // Create placeholder concept
      const placeholder: EnhancedConcept = {
        id: generateConceptId(),
        name: missingRel.target,
        description: `Placeholder concept for relationship`,
        parents: [],
        children: [],
        isSeed: false,
        metadata: {
          difficulty: 3,
          timeEstimate: 1,
          domain: extractDomain(enrichedKg),
          tags: [],
        },
      };
      enrichedKg.concepts[missingRel.target] = placeholder;
      conceptsToAdd.push(placeholder);
    }

    // Check for duplicate relationships
    const existingRels = enrichedKg.relationships?.[missingRel.source] || [];
    const isDuplicate = existingRels.some(
      (rel) => rel.target === missingRel.target && rel.type === missingRel.type
    );

    if (!isDuplicate) {
      const relationship: Relationship = {
        target: missingRel.target,
        type: missingRel.type,
        strength: missingRel.strength || 0.5,
        direction: inferDirection(missingRel.type),
        metadata: {
          extractedFrom: 'enrichment',
          confidence: missingRel.strength || 0.5,
        },
      };

      if (!enrichedKg.relationships) {
        enrichedKg.relationships = {};
      }
      if (!enrichedKg.relationships[missingRel.source]) {
        enrichedKg.relationships[missingRel.source] = [];
      }
      enrichedKg.relationships[missingRel.source].push(relationship);
      relationshipsToAdd.push({ source: missingRel.source, relationship });

      // If bidirectional, add reverse relationship
      if (relationship.direction === 'bidirectional') {
        if (!enrichedKg.relationships[missingRel.target]) {
          enrichedKg.relationships[missingRel.target] = [];
        }
        const reverseRel: Relationship = {
          target: missingRel.source,
          type: missingRel.type,
          strength: missingRel.strength || 0.5,
          direction: 'bidirectional',
          metadata: {
            extractedFrom: 'enrichment',
            confidence: missingRel.strength || 0.5,
          },
        };
        enrichedKg.relationships[missingRel.target].push(reverseRel);
        relationshipsToAdd.push({ source: missingRel.target, relationship: reverseRel });
      }
    }
  }

  // Step 4: Update graph metadata
  enrichedKg.metadata = updateGraphMetadata(enrichedKg);

  // Step 5: Update timestamp
  enrichedKg.updatedAt = Date.now();

  // Calculate stats
  const stats = {
    conceptsAdded: conceptsToAdd.length,
    relationshipsAdded: relationshipsToAdd.length,
  };

  return {
    graph: enrichedKg,
    stats,
  };
}

/**
 * Get the top-level concept (layer concept) for a given layer number
 * Top-level concepts are direct children of the seed and represent layers
 */
function getTopLevelConceptForLayer(
  layerNumber: number | undefined,
  kg: KnowledgeGraph
): EnhancedConcept | null {
  if (layerNumber === undefined) {
    return null;
  }

  const layer = kg.layers?.[layerNumber];
  if (!layer) {
    return null;
  }

  // Use the topLevelConceptId field if available (more reliable)
  // Note: topLevelConceptId stores the concept name, not the ID
  const topLevelConceptId = (layer as any).topLevelConceptId;
  if (topLevelConceptId) {
    const topLevelConcept = kg.concepts[topLevelConceptId] || Object.values(kg.concepts).find((c) => c.name === topLevelConceptId);
    if (topLevelConcept) {
      return topLevelConcept;
    }
  }

  // Fallback: try to find the top-level concept by checking which concept has seed as sole parent
  // This is a fallback for older graphs that don't have topLevelConceptId
  // Note: conceptIds may contain either IDs or names depending on when the graph was created
  if (layer.conceptIds && layer.conceptIds.length > 0) {
    const seedConcept = Object.values(kg.concepts).find((c) => c.isSeed);
    if (seedConcept) {
      for (const conceptIdOrName of layer.conceptIds) {
        // Try to find by name first (newer format), then by ID (older format)
        const concept = kg.concepts[conceptIdOrName] || Object.values(kg.concepts).find((c) => c.id === conceptIdOrName || c.name === conceptIdOrName);
        if (concept && concept.parents.length === 1 && concept.parents.includes(seedConcept.name)) {
          return concept;
        }
      }
    }
  }

  return null;
}

/**
 * Determine parent concepts for a missing concept
 * Always includes the top-level concept (layer concept) as the first parent
 */
function determineParents(
  missingConcept: MissingConcept,
  kg: KnowledgeGraph
): string[] {
  const parents: string[] = [];

  // First, find and add the top-level concept (layer concept) as the first parent
  const layer = missingConcept.suggestedLayer !== undefined 
    ? missingConcept.suggestedLayer 
    : determineLayer(missingConcept, kg);
  
  if (layer !== undefined) {
    const topLevelConcept = getTopLevelConceptForLayer(layer, kg);
    if (topLevelConcept && !parents.includes(topLevelConcept.name)) {
      parents.push(topLevelConcept.name);
    }
  }

  // If prerequisites are provided, add them as additional parents
  if (missingConcept.prerequisites && missingConcept.prerequisites.length > 0) {
    for (const prereqName of missingConcept.prerequisites) {
      if (kg.concepts[prereqName] && !parents.includes(prereqName)) {
        parents.push(prereqName);
      }
    }
  }

  // If no top-level concept found but suggestedPlacement is provided, try to infer
  if (parents.length === 0 && missingConcept.suggestedPlacement) {
    if (missingConcept.suggestedPlacement === 'same_layer') {
      // Find layer concept for the suggested layer
      if (missingConcept.suggestedLayer !== undefined) {
        const topLevelConcept = getTopLevelConceptForLayer(missingConcept.suggestedLayer, kg);
        if (topLevelConcept) {
          parents.push(topLevelConcept.name);
        } else {
          // Fallback: find any concept in the layer and use its parent
          const layer = kg.layers?.[missingConcept.suggestedLayer];
          if (layer?.conceptIds && layer.conceptIds.length > 0) {
            const firstConceptId = layer.conceptIds[0];
            const firstConcept = Object.values(kg.concepts).find((c) => c.id === firstConceptId);
            if (firstConcept && firstConcept.parents.length > 0) {
              // Use the first parent (should be the top-level concept)
              parents.push(firstConcept.parents[0]);
            }
          }
        }
      }
    } else if (missingConcept.suggestedPlacement === 'next_layer') {
      // Find the next layer's top-level concept
      if (missingConcept.suggestedLayer !== undefined) {
        const nextLayerNum = missingConcept.suggestedLayer + 1;
        const topLevelConcept = getTopLevelConceptForLayer(nextLayerNum, kg);
        if (topLevelConcept) {
          parents.push(topLevelConcept.name);
        }
      }
    } else if (missingConcept.suggestedPlacement === 'previous_layer') {
      // Find the previous layer's top-level concept
      if (missingConcept.suggestedLayer !== undefined) {
        const prevLayerNum = missingConcept.suggestedLayer - 1;
        const topLevelConcept = getTopLevelConceptForLayer(prevLayerNum, kg);
        if (topLevelConcept) {
          parents.push(topLevelConcept.name);
        }
      }
    }
  }

  // If still no parents found and suggestedLayer is provided, try to find top-level concept
  if (parents.length === 0 && missingConcept.suggestedLayer !== undefined) {
    const topLevelConcept = getTopLevelConceptForLayer(missingConcept.suggestedLayer, kg);
    if (topLevelConcept) {
      parents.push(topLevelConcept.name);
    }
  }

  // Default: use seed concept as parent (only if no other parents found)
  if (parents.length === 0) {
    const seedConcept = Object.values(kg.concepts).find((c) => c.isSeed);
    if (seedConcept) {
      parents.push(seedConcept.name);
    }
  }

  return parents;
}

/**
 * Determine layer number for a missing concept
 */
function determineLayer(missingConcept: MissingConcept, kg: KnowledgeGraph): number | undefined {
  if (missingConcept.suggestedLayer !== undefined) {
    return missingConcept.suggestedLayer;
  }

  // If suggestedPlacement is same_layer, try to infer from context
  if (missingConcept.suggestedPlacement === 'same_layer') {
    // Try to find a similar concept in the graph
    const similarConcept = Object.values(kg.concepts).find(
      (c) => c.name.toLowerCase().includes(missingConcept.name.toLowerCase().split(' ')[0])
    );
    if (similarConcept && similarConcept.layer !== undefined) {
      return similarConcept.layer;
    }
  }

  return undefined;
}

/**
 * Infer concept metadata from context
 */
function inferMetadata(
  missingConcept: MissingConcept,
  kg: KnowledgeGraph
): ConceptMetadata {
  const domain = extractDomain(kg);
  const difficulty = inferDifficulty(missingConcept, kg);
  const timeEstimate = estimateLearningTime(missingConcept, difficulty);
  const tags = generateTags(missingConcept, domain);

  return {
    difficulty,
    timeEstimate,
    domain,
    tags,
  };
}

/**
 * Infer difficulty level (1-5)
 */
function inferDifficulty(missingConcept: MissingConcept, kg: KnowledgeGraph): number {
  // Use priority as a hint
  if (missingConcept.priority === 'high') {
    return 4;
  } else if (missingConcept.priority === 'low') {
    return 2;
  }

  // Try to infer from layer
  if (missingConcept.suggestedLayer !== undefined) {
    // Higher layers = higher difficulty
    return Math.min(5, Math.max(1, missingConcept.suggestedLayer + 1));
  }

  // Default to medium
  return 3;
}

/**
 * Estimate learning time in hours
 */
function estimateLearningTime(missingConcept: MissingConcept, difficulty: number): number {
  // Base time on difficulty
  const baseTime = difficulty * 2; // 2-10 hours

  // Adjust based on priority
  if (missingConcept.priority === 'high') {
    return baseTime * 1.5;
  } else if (missingConcept.priority === 'low') {
    return baseTime * 0.75;
  }

  return baseTime;
}

/**
 * Generate tags for a concept
 */
function generateTags(missingConcept: MissingConcept, domain: string): string[] {
  const tags: string[] = [domain];

  // Add tags based on relationship type
  if (missingConcept.relationshipType) {
    tags.push(missingConcept.relationshipType);
  }

  // Add priority tag
  if (missingConcept.priority) {
    tags.push(missingConcept.priority);
  }

  return tags;
}

/**
 * Extract domain from graph
 */
function extractDomain(kg: KnowledgeGraph): string {
  // Try to get from graph focus
  if (kg.focus) {
    return kg.focus.toLowerCase();
  }

  // Try to infer from seed concept
  const seedConcept = Object.values(kg.concepts).find((c) => c.isSeed);
  if (seedConcept?.metadata?.domain) {
    return seedConcept.metadata.domain;
  }

  // Try to get from any concept's metadata
  const firstConcept = Object.values(kg.concepts)[0];
  if (firstConcept?.metadata?.domain) {
    return firstConcept.metadata.domain;
  }

  return 'general';
}

/**
 * Infer description from missing concept
 */
function inferDescription(missingConcept: MissingConcept): string {
  // Use reason as description if available
  if (missingConcept.reason) {
    return missingConcept.reason;
  }

  // Generate basic description
  return `Concept: ${missingConcept.name}`;
}

/**
 * Infer relationship direction from type
 */
function inferDirection(
  type: 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical'
): 'forward' | 'backward' | 'bidirectional' {
  switch (type) {
    case 'prerequisite':
    case 'sequential':
    case 'hierarchical':
      return 'forward';
    case 'complementary':
      return 'bidirectional';
    default:
      return 'forward';
  }
}

/**
 * Update graph metadata
 */
function updateGraphMetadata(kg: KnowledgeGraph): GraphMetadata {
  const concepts = Object.values(kg.concepts);
  const relationships = kg.relationships
    ? Object.values(kg.relationships).flat()
    : [];

  const difficulties = concepts
    .map((c) => c.metadata?.difficulty)
    .filter((d): d is number => d !== undefined);

  const timeEstimates = concepts
    .map((c) => c.metadata?.timeEstimate)
    .filter((t): t is number => t !== undefined);

  const domains = concepts
    .map((c) => c.metadata?.domain)
    .filter((d): d is string => d !== undefined && d !== '');

  return {
    totalConcepts: concepts.length,
    totalRelationships: relationships.length,
    averageDifficulty:
      difficulties.length > 0
        ? difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length
        : undefined,
    estimatedTotalTime:
      timeEstimates.length > 0
        ? timeEstimates.reduce((sum, t) => sum + t, 0)
        : undefined,
    domains: Array.from(new Set(domains)),
  };
}

/**
 * Apply enrichments to a NodeBasedKnowledgeGraph
 * 
 * @param uid - User ID
 * @param graphId - Graph ID
 * @param enrichments - Array of enrichment results to apply
 * @returns Updated node-based knowledge graph with applied enrichments
 */
export async function applyEnrichmentsToNodeBasedGraph(
  uid: string,
  graphId: string,
  enrichments: Array<
    | LayerCompletenessAnalysis
    | MilestoneConceptDiscovery
    | PrerequisiteAnalysis
    | GoalAwareRelationships
    | CrossLayerDiscovery
  >
): Promise<{
  graph: NodeBasedKnowledgeGraph;
  stats: {
    conceptsAdded: number;
    relationshipsAdded: number;
  };
}> {
  // Load the node-based knowledge graph
  let kg = await getNodeBasedKnowledgeGraph(uid, graphId);
  
  // If it doesn't exist, convert from ConceptGraph
  if (!kg) {
    const conceptGraph = await getUserGraphById(uid, graphId);
    if (!conceptGraph) {
      throw new Error(`Graph ${graphId} not found`);
    }
    const goals = await getGoalsByGraphId(uid, graphId);
    const learningGoal = goals.length > 0 ? goals[0] : null;
    const conversion = convertStoredConceptGraphToNodeBased(conceptGraph, {
      learningGoal: learningGoal ? {
        title: learningGoal.title,
        description: learningGoal.description,
      } : undefined,
    });
    kg = conversion.nodeBasedGraph;
  }

  // For now, convert to old format, apply enrichments, then convert back
  // TODO: Implement proper NodeBasedKnowledgeGraph enrichment application
  // Apply enrichments using the old function
  const result = await applyEnrichmentsToGraph(uid, graphId, enrichments);
  
  // Convert the enriched graph back to NodeBasedKnowledgeGraph
  // For now, just return the original kg as a placeholder
  // TODO: Properly convert the enriched graph back to node-based format
  return {
    graph: kg, // Placeholder - needs proper conversion
    stats: result.stats,
  };
}

