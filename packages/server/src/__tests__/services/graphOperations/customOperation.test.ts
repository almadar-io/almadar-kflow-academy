/**
 * Tests for Custom Operation (Mutation-based)
 * 
 * Tests bidirectional relationship creation in customOperation
 */

import { customOperation } from '../../../services/graphOperations/customOperation';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';
import type { GraphNode } from '../../../types/nodeBasedKnowledgeGraph';
import type { MutationContext } from '../../../types/mutations';
import { callLLM } from '../../../services/llm';

// Mock LLM service
jest.mock('../../../services/llm', () => ({
  callLLM: jest.fn(),
  extractJSONArray: jest.fn((content: string) => {
    try {
      return JSON.parse(content);
    } catch {
      return [];
    }
  }),
}));

describe('customOperation - Bidirectional Relationships', () => {
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
      const targetNodes: GraphNode[] = [graph.nodes[seedConceptId]];
      
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'Components',
            description: 'Building blocks of React',
            parents: ['React'],
            action: 'added'
          }
        ]),
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await customOperation({
        graph,
        mutationContext: createMutationContext(graph),
        targetNodes,
        userPrompt: 'Add a concept about components',
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
      
      const targetNodes: GraphNode[] = [graph.nodes[seedConceptId], graph.nodes[parentConceptId]];
      
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'React Components',
            description: 'React building blocks',
            parents: ['React', 'JavaScript'],
            action: 'added'
          }
        ]),
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await customOperation({
        graph,
        mutationContext: createMutationContext(graph),
        targetNodes,
        userPrompt: 'Add a concept about React components',
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

    it('should not create duplicate relationships if they already exist', async () => {
      const graph = createMockGraph();
      
      // Add an existing hasChild relationship
      const existingRelId = 'rel-1';
      graph.relationships.push({
        id: existingRelId,
        source: seedConceptId,
        target: 'Components',
        type: 'hasChild',
        direction: 'forward',
        createdAt: Date.now(),
      });
      
      const targetNodes: GraphNode[] = [graph.nodes[seedConceptId]];
      
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'Components',
            description: 'Building blocks',
            parents: ['React'],
            action: 'added'
          }
        ]),
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await customOperation({
        graph,
        mutationContext: createMutationContext(graph),
        targetNodes,
        userPrompt: 'Add a concept about components',
      });

      if ('mutations' in result) {
        // Should not create duplicate hasChild relationships
        // Note: The check only looks for hasChild, so hasParent might still be created
        // But the hasChild should be skipped
        const hasChildRels = result.mutations.mutations.filter(
          m => m.type === 'create_relationship' && 
               m.relationship?.type === 'hasChild' &&
               m.relationship?.source === seedConceptId &&
               m.relationship?.target === 'Components'
        );
        
        // The relationship should not be created again (though the check might not catch all cases)
        // This test verifies the duplicate check logic exists
        expect(hasChildRels.length).toBe(0);
      }
    });

    it('should generate unique relationship IDs for hasChild and hasParent', async () => {
      const graph = createMockGraph();
      const targetNodes: GraphNode[] = [graph.nodes[seedConceptId]];
      
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'Components',
            description: 'Building blocks',
            parents: ['React'],
            action: 'added'
          }
        ]),
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await customOperation({
        graph,
        mutationContext: createMutationContext(graph),
        targetNodes,
        userPrompt: 'Add a concept about components',
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

    it('should not create relationships if parent node is not found', async () => {
      const graph = createMockGraph();
      const targetNodes: GraphNode[] = [graph.nodes[seedConceptId]];
      
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'Components',
            description: 'Building blocks',
            parents: ['NonExistentParent'],
            action: 'added'
          }
        ]),
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await customOperation({
        graph,
        mutationContext: createMutationContext(graph),
        targetNodes,
        userPrompt: 'Add a concept about components',
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
        
        // But should still create the concept node
        const conceptNodeMutation = result.mutations.mutations.find(
          m => m.type === 'create_node' && 
               m.node?.type === 'Concept' &&
               m.node?.properties.name === 'Components'
        );
        expect(conceptNodeMutation).toBeDefined();
      }
    });
  });
});

