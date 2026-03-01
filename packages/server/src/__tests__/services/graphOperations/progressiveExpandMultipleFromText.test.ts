/**
 * Tests for Progressive Expand Multiple From Text (Mutation-based)
 * 
 * Tests bidirectional relationship creation in progressiveExpandMultipleFromText
 */

import { progressiveExpandMultipleFromText } from '../../../services/graphOperations/progressiveExpandMultipleFromText';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';
import type { MutationContext } from '../../../types/mutations';
import { callLLM } from '../../../services/llm';

// Mock LLM service
jest.mock('../../../services/llm', () => ({
  callLLM: jest.fn(),
}));

describe('progressiveExpandMultipleFromText - Bidirectional Relationships', () => {
  const graphId = 'test-graph-1';
  const seedConceptId = 'seed-concept-1';
  
  const createMockGraph = (): NodeBasedKnowledgeGraph => ({
    id: graphId,
    seedConceptId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: {
      [graphId]: {
        id: graphId,
        type: 'Graph',
        properties: { name: 'Test Graph' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      [seedConceptId]: {
        id: seedConceptId,
        type: 'Concept',
        properties: { name: 'React' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
    relationships: [],
    nodeTypes: {
      Graph: [graphId],
      Concept: [seedConceptId],
      Layer: [],
      LearningGoal: [],
      Milestone: [],
      PracticeExercise: [],
      Lesson: [],
      ConceptMetadata: [],
      GraphMetadata: [],
      FlashCard: [],
    },
  });

  const createMutationContext = (graph: NodeBasedKnowledgeGraph): MutationContext => ({
    graphId,
    seedConceptId,
    existingNodes: graph.nodes,
    existingRelationships: graph.relationships,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bidirectional relationship creation', () => {
    it('should create both hasParent and hasChild relationships', async () => {
      const graph = createMockGraph();
      const context = createMutationContext(graph);
      
      const mockResponse = {
        content: `
          <level-name>Foundation</level-name>
          <goal>Learn React basics</goal>
          <concept>Components</concept>
          <description>Building blocks of React</description>
          <parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
      });

      if ('mutations' in result) {
        // Find hasChild relationship (parent -> hasChild -> child)
        const hasChildRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasChild'
        ) as { type: 'create_relationship'; relationship: any } | undefined;
        
        // Find hasParent relationship (child -> hasParent -> parent)
        const hasParentRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasParent'
        ) as { type: 'create_relationship'; relationship: any } | undefined;

        expect(hasChildRel).toBeDefined();
        expect(hasParentRel).toBeDefined();

        // Verify hasChild relationship structure
        expect(hasChildRel?.relationship?.source).toBe(seedConceptId);
        expect(hasChildRel?.relationship?.type).toBe('hasChild');

        // Verify hasParent relationship structure
        expect(hasParentRel?.relationship?.target).toBe(seedConceptId);
        expect(hasParentRel?.relationship?.type).toBe('hasParent');
        
        // Verify they point to the same concept (child)
        const childNodeId = hasChildRel?.relationship?.target;
        expect(hasParentRel?.relationship?.source).toBe(childNodeId);
      }
    });

    it('should handle multiple parents correctly', async () => {
      const graph = createMockGraph();
      
      // Add another parent concept
      const parentConceptId = 'parent-concept-1';
      graph.nodes[parentConceptId] = {
        id: parentConceptId,
        type: 'Concept',
        properties: { name: 'JavaScript' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      graph.nodeTypes.Concept.push(parentConceptId);
      
      const context = createMutationContext(graph);
      
      const mockResponse = {
        content: `
          <level-name>Foundation</level-name>
          <concept>React Components</concept>
          <description>React building blocks</description>
          <parents>React, JavaScript</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
      });

      if ('mutations' in result) {
        // Should create relationships for both parents
        const hasChildRels = result.mutations.mutations.filter(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasChild'
        ) as Array<{ type: 'create_relationship'; relationship: any }>;
        
        const hasParentRels = result.mutations.mutations.filter(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasParent'
        ) as Array<{ type: 'create_relationship'; relationship: any }>;

        // Should have 2 hasChild and 2 hasParent relationships (one for each parent)
        expect(hasChildRels.length).toBe(2);
        expect(hasParentRels.length).toBe(2);

        // Verify relationships point to correct parents
        const seedChildRel = hasChildRels.find(
          r => r.relationship?.source === seedConceptId
        );
        const jsChildRel = hasChildRels.find(
          r => r.relationship?.source === parentConceptId
        );
        
        expect(seedChildRel).toBeDefined();
        expect(jsChildRel).toBeDefined();

        // Verify hasParent relationships
        const seedParentRel = hasParentRels.find(
          r => r.relationship?.target === seedConceptId
        );
        const jsParentRel = hasParentRels.find(
          r => r.relationship?.target === parentConceptId
        );
        
        expect(seedParentRel).toBeDefined();
        expect(jsParentRel).toBeDefined();
      }
    });

    it('should not create relationships if parent node is not found', async () => {
      const graph = createMockGraph();
      const context = createMutationContext(graph);
      
      const mockResponse = {
        content: `
          <level-name>Foundation</level-name>
          <concept>Components</concept>
          <description>Building blocks</description>
          <parents>NonExistentParent</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
      });

      if ('mutations' in result) {
        // Should not create any parent-child relationships
        const hasChildRels = result.mutations.mutations.filter(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasChild'
        );
        
        const hasParentRels = result.mutations.mutations.filter(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasParent'
        );

        expect(hasChildRels.length).toBe(0);
        expect(hasParentRels.length).toBe(0);
        
        // But should still create the concept node and layer relationship
        const conceptNodeMutation = result.mutations.mutations.find(
          m => m.type === 'create_node' && 
               m.node?.type === 'Concept'
        );
        expect(conceptNodeMutation).toBeDefined();
      }
    });

    it('should generate unique relationship IDs for hasChild and hasParent', async () => {
      const graph = createMockGraph();
      const context = createMutationContext(graph);
      
      const mockResponse = {
        content: `
          <level-name>Foundation</level-name>
          <concept>Components</concept>
          <description>Building blocks</description>
          <parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
      });

      if ('mutations' in result) {
        const hasChildRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasChild'
        ) as { type: 'create_relationship'; relationship: any } | undefined;
        
        const hasParentRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasParent'
        ) as { type: 'create_relationship'; relationship: any } | undefined;

        // Relationship IDs should be different
        expect(hasChildRel?.relationship?.id).toBeDefined();
        expect(hasParentRel?.relationship?.id).toBeDefined();
        expect(hasChildRel?.relationship?.id).not.toBe(hasParentRel?.relationship?.id);
      }
    });

    it('should handle seed concept as parent correctly', async () => {
      const graph = createMockGraph();
      const context = createMutationContext(graph);
      
      const mockResponse = {
        content: `
          <level-name>Foundation</level-name>
          <concept>Components</concept>
          <description>Building blocks</description>
          <parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
      });

      if ('mutations' in result) {
        // Find relationships - should match by concept name "React"
        const hasChildRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' && 
               m.relationship?.type === 'hasChild' &&
               m.relationship?.source === seedConceptId
        ) as { type: 'create_relationship'; relationship: any } | undefined;
        
        const hasParentRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' && 
               m.relationship?.type === 'hasParent' &&
               m.relationship?.target === seedConceptId
        ) as { type: 'create_relationship'; relationship: any } | undefined;

        expect(hasChildRel).toBeDefined();
        expect(hasParentRel).toBeDefined();
      }
    });

    it('should create belongsToLayer relationship when creating concepts', async () => {
      const graph = createMockGraph();
      const context = createMutationContext(graph);
      
      const mockResponse = {
        content: `
          <level-name>Foundation</level-name>
          <goal>Learn React basics</goal>
          <concept>Components</concept>
          <description>Building blocks of React</description>
          <parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
      });

      if ('mutations' in result && result.mutations) {
        // Find containsConcept relationship (layer -> containsConcept -> concept)
        const containsConceptRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' && m.relationship?.type === 'containsConcept'
        ) as { type: 'create_relationship'; relationship: any } | undefined;
        
        // Find belongsToLayer relationship (concept -> belongsToLayer -> layer)
        const belongsToLayerRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' && m.relationship?.type === 'belongsToLayer'
        ) as { type: 'create_relationship'; relationship: any } | undefined;

        expect(containsConceptRel).toBeDefined();
        expect(belongsToLayerRel).toBeDefined();

        // Verify containsConcept relationship structure
        expect(containsConceptRel?.relationship?.type).toBe('containsConcept');
        
        // Verify belongsToLayer relationship structure
        expect(belongsToLayerRel?.relationship?.type).toBe('belongsToLayer');
        // Source should be the concept node ID
        expect(belongsToLayerRel?.relationship?.source).toBeDefined();
        // Target should be the layer node ID
        expect(belongsToLayerRel?.relationship?.target).toBeDefined();
        
        // Verify they reference the same layer and concept
        expect(containsConceptRel?.relationship?.source).toBe(belongsToLayerRel?.relationship?.target);
        expect(containsConceptRel?.relationship?.target).toBe(belongsToLayerRel?.relationship?.source);
      }
    });
  });
});

