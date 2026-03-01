/**
 * Unified Enrichment Response Format
 * 
 * All enrichment operations return this unified format to ensure consistent
 * application of suggestions to the knowledge graph.
 */

import type { MissingConcept, MissingRelationship } from '../types/enrichment';

/**
 * Unified enrichment response that all operations should return.
 * This ensures we always know what concepts and relationships to add.
 */
export interface UnifiedEnrichmentResponse {
  /**
   * Concepts that should be added to the graph
   */
  missingConcepts: MissingConcept[];
  
  /**
   * Relationships that should be added to the graph
   */
  missingRelationships: MissingRelationship[];
  
  /**
   * Optional metadata specific to the enrichment strategy
   */
  metadata?: {
    /**
     * Strategy-specific analysis results (e.g., completeness score, prerequisite chains)
     */
    [key: string]: any;
  };
}

/**
 * Standard prompt template for unified enrichment responses.
 * All operations should use this format in their LLM prompts.
 */
export const UNIFIED_ENRICHMENT_RESPONSE_PROMPT = `You must return a JSON object with this EXACT structure:
{
  "missingConcepts": [
    {
      "name": "Concept Name",
      "description": "Optional description of the concept",
      "reason": "Why this concept is needed",
      "suggestedLayer": 1,
      "prerequisites": ["Prerequisite Concept 1", "Prerequisite Concept 2"],
      "relationshipType": "prerequisite",
      "priority": "high",
      "suggestedPlacement": "same_layer"
    }
  ],
  "missingRelationships": [
    {
      "source": "Source Concept Name",
      "target": "Target Concept Name",
      "type": "prerequisite",
      "reason": "Why this relationship exists",
      "strength": 0.8
    }
  ],
  "metadata": {
    "strategySpecificField": "value"
  }
}

Key requirements:
- ALWAYS include "missingConcepts" array (even if empty)
- ALWAYS include "missingRelationships" array (even if empty)
- For missingConcepts:
  - "name" is REQUIRED
  - "reason" is REQUIRED (explains why concept is needed)
  - "suggestedLayer" is optional (which layer number, if known)
  - "prerequisites" is array of concept names that must be learned first
  - "relationshipType" is one of: "prerequisite", "complementary", "sequential", "hierarchical"
  - "priority" is one of: "high", "medium", "low"
  - "suggestedPlacement" is one of: "same_layer", "next_layer", "previous_layer"
- For missingRelationships:
  - "source" and "target" are REQUIRED (concept names)
  - "type" is REQUIRED (one of: "prerequisite", "complementary", "sequential", "hierarchical")
  - "reason" is REQUIRED (explains why relationship exists)
  - "strength" is optional (0-1, default 0.5)
- metadata is optional and can contain strategy-specific fields

Return ONLY the JSON object, no additional text or markdown.`;

/**
 * Helper to normalize any enrichment response to unified format
 */
export function normalizeToUnifiedResponse(
  response: any,
  strategyName: string
): UnifiedEnrichmentResponse {
  const unified: UnifiedEnrichmentResponse = {
    missingConcepts: [],
    missingRelationships: [],
    metadata: {},
  };

  // Extract missingConcepts from various formats
  if (response.missingConcepts) {
    unified.missingConcepts = response.missingConcepts;
  } else if (response.bridgingConcepts) {
    // Convert bridgingConcepts to missingConcepts
    unified.missingConcepts = response.bridgingConcepts.map((bc: any) => ({
      name: bc.name || '',
      description: bc.description,
      reason: bc.reason || '',
      suggestedLayer: bc.suggestedLayer,
      prerequisites: bc.prerequisites || [],
      relationshipType: 'prerequisite' as const,
      priority: 'medium' as const,
      suggestedPlacement: 'same_layer' as const,
    }));
  } else if (response.missingFoundations) {
    // Convert missingFoundations to missingConcepts
    unified.missingConcepts = response.missingFoundations.map((mf: any) => ({
      name: mf.name || '',
      description: mf.description,
      reason: mf.reason || '',
      suggestedLayer: undefined,
      prerequisites: [],
      relationshipType: 'prerequisite' as const,
      priority: (mf.priority || 'medium') as 'high' | 'medium' | 'low',
      suggestedPlacement: 'same_layer' as const,
    }));
  } else if (response.directPrerequisites || response.indirectPrerequisites) {
    // Convert prerequisites to missingConcepts (only those that don't exist)
    const allPrereqs = [
      ...(response.directPrerequisites || []),
      ...(response.indirectPrerequisites || []),
    ].filter((p: any) => !p.existsInGraph);
    
    unified.missingConcepts = allPrereqs.map((pr: any) => ({
      name: pr.name || '',
      description: pr.description,
      reason: pr.reason || '',
      suggestedLayer: undefined,
      prerequisites: [],
      relationshipType: 'prerequisite' as const,
      priority: 'high' as const,
      suggestedPlacement: 'same_layer' as const,
    }));
  } else if (response.suggestedAdditions) {
    // Convert suggestedAdditions to missingConcepts
    unified.missingConcepts = response.suggestedAdditions.map((sa: any) => ({
      name: sa.concept || sa.name || '',
      description: sa.description,
      reason: sa.reason || '',
      suggestedLayer: undefined,
      prerequisites: [],
      relationshipType: 'complementary' as const,
      priority: (sa.priority || 'medium') as 'high' | 'medium' | 'low',
      suggestedPlacement: 'same_layer' as const,
    }));
  }

  // Extract missingRelationships from various formats
  if (response.missingRelationships) {
    unified.missingRelationships = response.missingRelationships;
  } else if (response.complementaryRelationships) {
    unified.missingRelationships.push(
      ...response.complementaryRelationships.map((rel: any) => ({
        source: rel.source || '',
        target: rel.target || '',
        type: 'complementary' as const,
        reason: rel.reason || '',
        strength: rel.strength || 0.5,
      }))
    );
  }
  if (response.sequentialRelationships) {
    unified.missingRelationships.push(
      ...response.sequentialRelationships.map((rel: any) => ({
        source: rel.source || '',
        target: rel.target || '',
        type: 'sequential' as const,
        reason: rel.reason || '',
        strength: rel.strength || 0.5,
      }))
    );
  }
  if (response.hierarchicalRelationships) {
    unified.missingRelationships.push(
      ...response.hierarchicalRelationships.map((rel: any) => ({
        source: rel.source || '',
        target: rel.target || '',
        type: 'hierarchical' as const,
        reason: rel.reason || '',
        strength: rel.strength || 0.5,
      }))
    );
  }
  if (response.suggestedPrerequisites) {
    unified.missingRelationships.push(
      ...response.suggestedPrerequisites.map((sp: any) => ({
        source: sp.addPrerequisite || '',
        target: sp.concept || '',
        type: 'prerequisite' as const,
        reason: sp.reason || '',
        strength: 0.8,
      }))
    );
  }

  // Store original response in metadata for strategy-specific data
  if (response.isComplete !== undefined) {
    unified.metadata = {
      ...unified.metadata,
      isComplete: response.isComplete,
      completenessScore: response.completenessScore,
    };
  }

  unified.metadata = {
    ...unified.metadata,
    strategy: strategyName,
    originalResponse: response,
  };

  return unified;
}

