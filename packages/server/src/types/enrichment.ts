/**
 * Types for graph enrichment operations
 * Part of Phase 2.7: LLM-Based Graph Enrichment
 */

import type { EnhancedConcept, Relationship } from './knowledgeGraph';
import type { Milestone, LearningGoal } from './goal';

/**
 * Missing concept identified by enrichment
 */
export interface MissingConcept {
  name: string;
  description?: string;
  reason: string;
  suggestedLayer?: number;
  prerequisites?: string[];
  relationshipType?: 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical';
  priority?: 'high' | 'medium' | 'low';
  suggestedPlacement?: 'same_layer' | 'next_layer' | 'previous_layer';
}

/**
 * Missing relationship identified by enrichment
 */
export interface MissingRelationship {
  source: string;
  target: string;
  type: 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical';
  reason: string;
  strength?: number;
}

/**
 * Result of layer completeness analysis
 * Now uses unified format with missingConcepts and missingRelationships
 */
export interface LayerCompletenessAnalysis {
  // Unified fields (always present)
  missingConcepts: MissingConcept[];
  missingRelationships: MissingRelationship[];
  // Strategy-specific metadata
  metadata?: {
    isComplete?: boolean;
    completenessScore?: number; // 0-1
    suggestedAdditions?: Array<{
      concept: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    prompts?: Array<{
      strategy: string;
      prompt: string;
    }>;
  };
  prompt?: string; // The prompt used to generate this analysis
}

/**
 * Result of milestone-driven concept discovery
 */
export interface MilestoneConceptDiscovery {
  missingConcepts: MissingConcept[];
  missingRelationships: MissingRelationship[];
  prompt?: string; // The prompt used to generate this discovery
}

/**
 * Prerequisite analysis result
 * Now uses unified format with missingConcepts and missingRelationships
 */
export interface PrerequisiteAnalysis {
  // Unified fields (always present)
  missingConcepts: MissingConcept[];
  missingRelationships: MissingRelationship[];
  // Strategy-specific metadata
  metadata?: {
    directPrerequisites?: Array<{
      name: string;
      reason: string;
      existsInGraph: boolean;
    }>;
    indirectPrerequisites?: Array<{
      name: string;
      reason: string;
      existsInGraph: boolean;
    }>;
    suggestedPrerequisites?: Array<{
      concept: string;
      addPrerequisite: string;
      reason: string;
    }>;
  };
  prompt?: string; // The prompt used to generate this analysis
}

/**
 * Goal-aware relationship discovery result
 * Now uses unified format with missingConcepts and missingRelationships
 */
export interface GoalAwareRelationships {
  // Unified fields (always present)
  missingConcepts: MissingConcept[];
  missingRelationships: MissingRelationship[];
  // Strategy-specific metadata
  metadata?: {
    complementaryRelationships?: Array<{
      source: string;
      target: string;
      type: 'complementary';
      reason: string;
      strength: number;
    }>;
    sequentialRelationships?: Array<{
      source: string;
      target: string;
      type: 'sequential';
      reason: string;
      strength: number;
    }>;
    hierarchicalRelationships?: Array<{
      source: string;
      target: string;
      type: 'hierarchical';
      reason: string;
      strength: number;
    }>;
  };
  prompt?: string; // The prompt used to generate this discovery
}

/**
 * Cross-layer concept discovery result
 * Now uses unified format with missingConcepts and missingRelationships
 */
export interface CrossLayerDiscovery {
  // Unified fields (always present)
  missingConcepts: MissingConcept[];
  missingRelationships: MissingRelationship[];
  // Strategy-specific metadata
  metadata?: {
    bridgingConcepts?: Array<{
      name: string;
      reason: string;
      suggestedLayer: number;
      prerequisites: string[];
      enables: string[];
    }>;
    missingFoundations?: Array<{
      name: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  };
  prompt?: string; // The prompt used to generate this discovery
}

/**
 * Options for layer completeness analysis
 */
export interface AnalyzeLayerCompletenessOptions {
  layerConcepts: EnhancedConcept[];
  milestone: Milestone;
  learningGoal: LearningGoal;
  layerNumber: number; // Layer number that corresponds to this milestone (1-based)
  uid?: string;
}

/**
 * Options for milestone-driven concept discovery
 */
export interface DiscoverMissingConceptsOptions {
  milestone: Milestone;
  currentGraph: {
    concepts: Record<string, EnhancedConcept>;
    relationships?: Record<string, Relationship[]>;
  };
  learningGoal: LearningGoal;
  layerNumber: number; // Layer number that corresponds to this milestone (1-based)
  uid?: string;
}

/**
 * Options for prerequisite chain analysis
 */
export interface AnalyzePrerequisiteChainOptions {
  concept: EnhancedConcept;
  graph: {
    concepts: Record<string, EnhancedConcept>;
    relationships?: Record<string, Relationship[]>;
  };
  learningGoal: LearningGoal;
  uid?: string;
}

/**
 * Options for goal-aware relationship discovery
 */
export interface DiscoverGoalAwareRelationshipsOptions {
  graph: {
    concepts: Record<string, EnhancedConcept>;
    relationships?: Record<string, Relationship[]>;
  };
  learningGoal: LearningGoal;
  uid?: string;
}

/**
 * Options for cross-layer concept discovery
 */
export interface DiscoverCrossLayerConceptsOptions {
  layer1Concepts: EnhancedConcept[];
  layer2Concepts: EnhancedConcept[];
  learningGoal: LearningGoal;
  targetMilestone?: Milestone;
  uid?: string;
}

/**
 * Enrichment options for service
 */
export interface EnrichmentOptions {
  discoverMissingConcepts?: boolean;
  analyzePrerequisites?: boolean;
  discoverRelationships?: boolean;
  analyzeLayers?: boolean;
  discoverCrossLayer?: boolean;
  autoApply?: boolean;
  stream?: boolean; // Whether to stream results
}

/**
 * Enrichment result
 */
export interface EnrichmentResult {
  graphId: string;
  enrichments: Array<
    | LayerCompletenessAnalysis
    | MilestoneConceptDiscovery
    | PrerequisiteAnalysis
    | GoalAwareRelationships
    | CrossLayerDiscovery
  >;
  applied: boolean;
  stats: {
    conceptsAdded?: number;
    relationshipsAdded?: number;
  };
}

