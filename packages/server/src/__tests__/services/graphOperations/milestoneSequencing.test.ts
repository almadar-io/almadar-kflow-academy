/**
 * Tests for Milestone Sequencing in Graph Operations
 * 
 * Ensures that:
 * 1. Milestones are created with proper sequence properties
 * 2. Layers are correctly linked to their target milestones
 * 3. Milestone picking respects sequence order
 * 4. Layer-to-Milestone relationships (hasMilestone) are created correctly
 */

import { progressiveExpandMultipleFromText } from '../../../services/graphOperations/progressiveExpandMultipleFromText';
import { generateGoals } from '../../../services/graphOperations/generateGoals';
import type { NodeBasedKnowledgeGraph, GraphNode } from '../../../types/nodeBasedKnowledgeGraph';
import type { MutationContext, GraphMutation } from '../../../types/mutations';
import type { LearningGoal } from '../../../types/goal';
import { callLLM } from '../../../services/llm';

// Mock LLM service
jest.mock('../../../services/llm', () => ({
  callLLM: jest.fn(),
}));

describe('Milestone Sequencing', () => {
  const graphId = 'test-graph-milestone';
  const seedConceptId = 'seed-concept-milestone';
  const goalNodeId = 'goal-node-milestone';

  /**
   * Helper to create a mock graph with milestones
   */
  const createMockGraphWithMilestones = (milestoneCount: number = 3): NodeBasedKnowledgeGraph => {
    const graph: NodeBasedKnowledgeGraph = {
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
          properties: { name: 'Python Programming' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        [goalNodeId]: {
          id: goalNodeId,
          type: 'LearningGoal',
          properties: {
            name: 'Master Python',
            description: 'Become proficient in Python programming',
            type: 'skill_mastery',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
      relationships: [],
      nodeTypes: {
        Graph: [graphId],
        Concept: [seedConceptId],
        Layer: [],
        LearningGoal: [goalNodeId],
        Milestone: [],
        PracticeExercise: [],
        Lesson: [],
        ConceptMetadata: [],
        GraphMetadata: [],
        FlashCard: [],
      },
    };

    // Add milestone nodes with sequence property
    for (let i = 0; i < milestoneCount; i++) {
      const milestoneId = `milestone-${graphId}-${i}`;
      graph.nodes[milestoneId] = {
        id: milestoneId,
        type: 'Milestone',
        properties: {
          name: `Milestone ${i + 1}`,
          description: `Description for milestone ${i + 1}`,
          sequence: i,  // Explicit sequence
          completed: false,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      graph.nodeTypes.Milestone.push(milestoneId);
    }

    return graph;
  };

  /**
   * Helper to create a mock learning goal with milestones
   */
  const createMockLearningGoal = (milestoneCount: number = 3): LearningGoal => ({
    id: goalNodeId,
    graphId,
    title: 'Master Python',
    description: 'Become proficient in Python programming',
    type: 'skill_mastery',
    target: 'Python proficiency',
    milestones: Array.from({ length: milestoneCount }, (_, i) => ({
      id: `milestone-${graphId}-${i}`,
      title: `Milestone ${i + 1}`,
      description: `Description for milestone ${i + 1}`,
      completed: false,
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
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

  describe('generateGoals - Milestone Sequence Creation', () => {
    it('should create milestones with explicit sequence property', async () => {
      const graph = createMockGraphWithMilestones(0); // No existing milestones
      const context = createMutationContext(graph);

      const mockGoalResponse = {
        content: JSON.stringify({
          title: 'Learn Python',
          description: 'Master Python programming',
          type: 'skill_mastery',
          target: 'Python proficiency',
          milestones: [
            { title: 'Basics', description: 'Learn syntax and basics' },
            { title: 'Data Structures', description: 'Master lists, dicts, etc.' },
            { title: 'Functions', description: 'Write reusable functions' },
          ],
        }),
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockGoalResponse);

      const result = await generateGoals({
        graph,
        mutationContext: context,
        anchorAnswer: 'I want to learn Python',
        questionAnswers: [],
      });

      if ('mutations' in result) {
        // Find milestone node mutations
        const milestoneMutations = result.mutations.mutations.filter(
          (m): m is GraphMutation & { type: 'create_node'; node: GraphNode } =>
            m.type === 'create_node' && m.node?.type === 'Milestone'
        );

        expect(milestoneMutations).toHaveLength(3);

        // Verify sequence property on each milestone
        milestoneMutations.forEach((mutation, index) => {
          expect(mutation.node.properties.sequence).toBe(index);
        });

        // Verify milestones are ordered correctly
        expect(milestoneMutations[0].node.properties.name).toBe('Basics');
        expect(milestoneMutations[1].node.properties.name).toBe('Data Structures');
        expect(milestoneMutations[2].node.properties.name).toBe('Functions');
      }
    });

    it('should create hasMilestone relationships with sequence metadata', async () => {
      const graph = createMockGraphWithMilestones(0);
      const context = createMutationContext(graph);

      const mockGoalResponse = {
        content: JSON.stringify({
          title: 'Learn Python',
          description: 'Master Python',
          type: 'skill_mastery',
          target: 'Python',
          milestones: [
            { title: 'M1', description: 'First' },
            { title: 'M2', description: 'Second' },
          ],
        }),
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockGoalResponse);

      const result = await generateGoals({
        graph,
        mutationContext: context,
        anchorAnswer: 'Python',
        questionAnswers: [],
      });

      if ('mutations' in result) {
        // Find hasMilestone relationship mutations (from goal to milestones)
        const hasMilestoneRels = result.mutations.mutations.filter(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasMilestone'
        );

        expect(hasMilestoneRels).toHaveLength(2);

        // Verify sequence is stored on relationships
        hasMilestoneRels.forEach((rel, index) => {
          if (rel.type === 'create_relationship' && rel.relationship) {
            expect(rel.relationship.metadata?.sequence).toBe(index);
          }
        });
      }
    });
  });

  describe('progressiveExpandMultipleFromText - Milestone Selection', () => {
    it('should select the correct milestone based on layer number', async () => {
      const graph = createMockGraphWithMilestones(3);
      const context = createMutationContext(graph);
      const learningGoal = createMockLearningGoal(3);

      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <goal>Milestone 1: Learn the basics</goal>
          <concept>Variables</concept>
          <description>Store data in variables</description>
          <parents>Python Programming</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        // Find the layer node
        const layerMutation = result.mutations.mutations.find(
          (m): m is GraphMutation & { type: 'create_node'; node: GraphNode } =>
            m.type === 'create_node' && m.node?.type === 'Layer'
        );

        expect(layerMutation).toBeDefined();
        // First layer should target first milestone (sequence 0)
        expect(layerMutation?.node.properties.targetMilestoneSequence).toBe(0);
        expect(layerMutation?.node.properties.targetMilestoneTitle).toBe('Milestone 1');
      }
    });

    it('should create hasMilestone relationship from Layer to Milestone', async () => {
      const graph = createMockGraphWithMilestones(3);
      const context = createMutationContext(graph);
      const learningGoal = createMockLearningGoal(3);

      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <goal>Learn basics</goal>
          <concept>Variables</concept>
          <description>Store data</description>
          <parents>Python Programming</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        // Find hasMilestone relationship from layer
        const layerToMilestoneRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' &&
               m.relationship?.type === 'hasMilestone' &&
               m.relationship?.source?.startsWith('layer-')
        );

        expect(layerToMilestoneRel).toBeDefined();

        if (layerToMilestoneRel?.type === 'create_relationship' && layerToMilestoneRel.relationship) {
          // Target should be the first milestone
          expect(layerToMilestoneRel.relationship.target).toBe(`milestone-${graphId}-0`);
          expect(layerToMilestoneRel.relationship.metadata?.layerNumber).toBe(1);
          expect(layerToMilestoneRel.relationship.metadata?.milestoneSequence).toBe(0);
        }
      }
    });

    it('should respect milestone sequence when generating subsequent layers', async () => {
      const graph = createMockGraphWithMilestones(3);
      
      // Add an existing layer (simulating that layer 1 was already created)
      const existingLayerId = `layer-${graphId}-1`;
      graph.nodes[existingLayerId] = {
        id: existingLayerId,
        type: 'Layer',
        properties: {
          layerNumber: 1,
          name: 'Level 1',
          goal: 'First layer goal',
          targetMilestoneSequence: 0,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      graph.nodeTypes.Layer.push(existingLayerId);

      const context = createMutationContext(graph);
      const learningGoal = createMockLearningGoal(3);

      const mockResponse = {
        content: `
          <level-name>Level 2</level-name>
          <goal>Milestone 2: Build on basics</goal>
          <concept>Data Types</concept>
          <description>Understand data types</description>
          <parents>Variables</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        // Find the new layer node
        const layerMutation = result.mutations.mutations.find(
          (m): m is GraphMutation & { type: 'create_node'; node: GraphNode } =>
            m.type === 'create_node' && m.node?.type === 'Layer'
        );

        expect(layerMutation).toBeDefined();
        // Second layer should be layer number 2
        expect(layerMutation?.node.properties.layerNumber).toBe(2);
        // Second layer should target second milestone (sequence 1)
        expect(layerMutation?.node.properties.targetMilestoneSequence).toBe(1);
        expect(layerMutation?.node.properties.targetMilestoneTitle).toBe('Milestone 2');

        // Verify the hasMilestone relationship points to correct milestone
        const layerToMilestoneRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' &&
               m.relationship?.type === 'hasMilestone' &&
               m.relationship?.source?.startsWith('layer-')
        );

        if (layerToMilestoneRel?.type === 'create_relationship' && layerToMilestoneRel.relationship) {
          expect(layerToMilestoneRel.relationship.target).toBe(`milestone-${graphId}-1`);
        }
      }
    });

    it('should clamp to last milestone when layer count exceeds milestone count', async () => {
      const graph = createMockGraphWithMilestones(2); // Only 2 milestones
      
      // Add 3 existing layers
      for (let i = 1; i <= 3; i++) {
        const layerId = `layer-${graphId}-${i}`;
        graph.nodes[layerId] = {
          id: layerId,
          type: 'Layer',
          properties: {
            layerNumber: i,
            name: `Level ${i}`,
            goal: `Layer ${i} goal`,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        graph.nodeTypes.Layer.push(layerId);
      }

      const context = createMutationContext(graph);
      const learningGoal = createMockLearningGoal(2);

      const mockResponse = {
        content: `
          <level-name>Level 4</level-name>
          <goal>Advanced topics</goal>
          <concept>Advanced Concept</concept>
          <description>Advanced stuff</description>
          <parents>Previous Concept</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        const layerMutation = result.mutations.mutations.find(
          (m): m is GraphMutation & { type: 'create_node'; node: GraphNode } =>
            m.type === 'create_node' && m.node?.type === 'Layer'
        );

        expect(layerMutation).toBeDefined();
        // Layer 4 should still target milestone 2 (sequence 1, the last one)
        expect(layerMutation?.node.properties.targetMilestoneSequence).toBe(1);
      }
    });

    it('should handle out-of-order milestone nodes correctly', async () => {
      // Create a graph where milestone nodes are not in sequence order
      const graph = createMockGraphWithMilestones(0);
      
      // Add milestones out of order in the nodes object
      graph.nodes['milestone-last'] = {
        id: 'milestone-last',
        type: 'Milestone',
        properties: {
          name: 'Third Milestone',
          sequence: 2,
          completed: false,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      graph.nodes['milestone-first'] = {
        id: 'milestone-first',
        type: 'Milestone',
        properties: {
          name: 'First Milestone',
          sequence: 0,
          completed: false,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      graph.nodes['milestone-middle'] = {
        id: 'milestone-middle',
        type: 'Milestone',
        properties: {
          name: 'Second Milestone',
          sequence: 1,
          completed: false,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      graph.nodeTypes.Milestone = ['milestone-last', 'milestone-first', 'milestone-middle'];

      const context = createMutationContext(graph);
      const learningGoal: LearningGoal = {
        id: goalNodeId,
        graphId,
        title: 'Test Goal',
        description: 'Test',
        type: 'skill_mastery',
        target: 'Test',
        milestones: [
          { id: 'milestone-first', title: 'First Milestone', completed: false },
          { id: 'milestone-middle', title: 'Second Milestone', completed: false },
          { id: 'milestone-last', title: 'Third Milestone', completed: false },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <goal>First goal</goal>
          <concept>First Concept</concept>
          <description>First description</description>
          <parents>Python Programming</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        const layerMutation = result.mutations.mutations.find(
          (m): m is GraphMutation & { type: 'create_node'; node: GraphNode } =>
            m.type === 'create_node' && m.node?.type === 'Layer'
        );

        expect(layerMutation).toBeDefined();
        // Should correctly identify milestone-first (sequence 0) as the target
        expect(layerMutation?.node.properties.targetMilestoneSequence).toBe(0);
        expect(layerMutation?.node.properties.targetMilestoneId).toBe('milestone-first');

        // Verify relationship targets the correct milestone
        const layerToMilestoneRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' &&
               m.relationship?.type === 'hasMilestone' &&
               m.relationship?.source?.startsWith('layer-')
        );

        if (layerToMilestoneRel?.type === 'create_relationship' && layerToMilestoneRel.relationship) {
          expect(layerToMilestoneRel.relationship.target).toBe('milestone-first');
        }
      }
    });

    it('should work when no milestones exist', async () => {
      const graph = createMockGraphWithMilestones(0); // No milestones
      const context = createMutationContext(graph);
      // Learning goal with no milestones
      const learningGoal: LearningGoal = {
        id: goalNodeId,
        graphId,
        title: 'Simple Goal',
        description: 'No milestones',
        type: 'skill_mastery',
        target: 'Simple target',
        milestones: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <goal>Simple goal</goal>
          <concept>Simple Concept</concept>
          <description>Simple description</description>
          <parents>Python Programming</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        // Should still create layer without milestone reference
        const layerMutation = result.mutations.mutations.find(
          (m): m is GraphMutation & { type: 'create_node'; node: GraphNode } =>
            m.type === 'create_node' && m.node?.type === 'Layer'
        );

        expect(layerMutation).toBeDefined();
        expect(layerMutation?.node.properties.targetMilestoneId).toBeNull();
        expect(layerMutation?.node.properties.targetMilestoneSequence).toBeNull();

        // Should NOT create hasMilestone relationship
        const layerToMilestoneRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' &&
               m.relationship?.type === 'hasMilestone' &&
               m.relationship?.source?.startsWith('layer-')
        );

        expect(layerToMilestoneRel).toBeUndefined();
      }
    });

    it('should fallback to learningGoal.milestones when no milestone nodes exist', async () => {
      const graph = createMockGraphWithMilestones(0); // No milestone nodes
      const context = createMutationContext(graph);
      // Learning goal with milestones (passed as parameter, not in graph)
      const learningGoal = createMockLearningGoal(3);

      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <goal>First goal</goal>
          <concept>First Concept</concept>
          <description>Description</description>
          <parents>Python Programming</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        const layerMutation = result.mutations.mutations.find(
          (m): m is GraphMutation & { type: 'create_node'; node: GraphNode } =>
            m.type === 'create_node' && m.node?.type === 'Layer'
        );

        expect(layerMutation).toBeDefined();
        // Should use milestones from learningGoal parameter
        expect(layerMutation?.node.properties.targetMilestoneSequence).toBe(0);
        expect(layerMutation?.node.properties.targetMilestoneTitle).toBe('Milestone 1');
      }
    });
  });

  describe('Layer-to-Milestone Relationship Verification', () => {
    it('should create hasMilestone relationship with correct structure', async () => {
      const graph = createMockGraphWithMilestones(3);
      const context = createMutationContext(graph);
      const learningGoal = createMockLearningGoal(3);

      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <goal>First layer goal</goal>
          <concept>Variables</concept>
          <description>Store data</description>
          <parents>Python Programming</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        // Find ALL hasMilestone relationships
        const hasMilestoneRels = result.mutations.mutations.filter(
          m => m.type === 'create_relationship' && m.relationship?.type === 'hasMilestone'
        );

        // Should have exactly one Layer->Milestone relationship
        const layerToMilestoneRel = hasMilestoneRels.find(
          m => m.type === 'create_relationship' && m.relationship?.source?.startsWith('layer-')
        );

        expect(layerToMilestoneRel).toBeDefined();
        
        if (layerToMilestoneRel?.type === 'create_relationship' && layerToMilestoneRel.relationship) {
          const rel = layerToMilestoneRel.relationship;
          
          // Verify relationship structure
          expect(rel.id).toContain('layer-');
          expect(rel.id).toContain('hasMilestone');
          expect(rel.source).toMatch(/^layer-/);
          expect(rel.target).toMatch(/^milestone-/);
          expect(rel.type).toBe('hasMilestone');
          expect(rel.direction).toBe('forward');
          
          // Verify metadata
          expect(rel.metadata).toBeDefined();
          expect(rel.metadata?.layerNumber).toBe(1);
          expect(rel.metadata?.milestoneSequence).toBe(0);
        }
      }
    });

    it('should link each layer to the correct milestone in sequence', async () => {
      const graph = createMockGraphWithMilestones(5);
      const learningGoal = createMockLearningGoal(5);

      // Generate 3 layers sequentially and verify each links to correct milestone
      const layerMilestoneLinks: Array<{ layerNumber: number; milestoneId: string; milestoneSequence: number }> = [];

      for (let layerNum = 1; layerNum <= 3; layerNum++) {
        // Add previous layers to graph
        if (layerNum > 1) {
          const prevLayerId = `layer-${graphId}-${layerNum - 1}`;
          graph.nodes[prevLayerId] = {
            id: prevLayerId,
            type: 'Layer',
            properties: {
              layerNumber: layerNum - 1,
              name: `Level ${layerNum - 1}`,
              goal: `Layer ${layerNum - 1} goal`,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          graph.nodeTypes.Layer.push(prevLayerId);
        }

        const context = createMutationContext(graph);

        const mockResponse = {
          content: `
            <level-name>Level ${layerNum}</level-name>
            <goal>Layer ${layerNum} goal</goal>
            <concept>Concept ${layerNum}</concept>
            <description>Description ${layerNum}</description>
            <parents>Python Programming</parents>
          `,
          model: 'test-model',
        };

        (callLLM as jest.Mock).mockResolvedValue(mockResponse);

        const result = await progressiveExpandMultipleFromText({
          graph,
          mutationContext: context,
          numConcepts: 1,
          learningGoal,
        });

        if ('mutations' in result) {
          const layerToMilestoneRel = result.mutations.mutations.find(
            m => m.type === 'create_relationship' &&
                 m.relationship?.type === 'hasMilestone' &&
                 m.relationship?.source?.startsWith('layer-')
          );

          if (layerToMilestoneRel?.type === 'create_relationship' && layerToMilestoneRel.relationship) {
            layerMilestoneLinks.push({
              layerNumber: layerToMilestoneRel.relationship.metadata?.layerNumber,
              milestoneId: layerToMilestoneRel.relationship.target,
              milestoneSequence: layerToMilestoneRel.relationship.metadata?.milestoneSequence,
            });
          }
        }
      }

      // Verify each layer links to the correct milestone
      expect(layerMilestoneLinks).toHaveLength(3);
      
      expect(layerMilestoneLinks[0].layerNumber).toBe(1);
      expect(layerMilestoneLinks[0].milestoneSequence).toBe(0);
      expect(layerMilestoneLinks[0].milestoneId).toBe(`milestone-${graphId}-0`);

      expect(layerMilestoneLinks[1].layerNumber).toBe(2);
      expect(layerMilestoneLinks[1].milestoneSequence).toBe(1);
      expect(layerMilestoneLinks[1].milestoneId).toBe(`milestone-${graphId}-1`);

      expect(layerMilestoneLinks[2].layerNumber).toBe(3);
      expect(layerMilestoneLinks[2].milestoneSequence).toBe(2);
      expect(layerMilestoneLinks[2].milestoneId).toBe(`milestone-${graphId}-2`);
    });

    it('should NOT create Layer->Milestone relationship when milestone nodes do not exist', async () => {
      const graph = createMockGraphWithMilestones(0); // No milestone nodes
      const context = createMutationContext(graph);
      // Learning goal with milestones in parameter only (not in graph as nodes)
      const learningGoal = createMockLearningGoal(3);

      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <goal>First goal</goal>
          <concept>First Concept</concept>
          <description>Description</description>
          <parents>Python Programming</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        // Find Layer->Milestone relationship (should NOT exist)
        const layerToMilestoneRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' &&
               m.relationship?.type === 'hasMilestone' &&
               m.relationship?.source?.startsWith('layer-')
        );

        // Relationship should NOT be created because milestone nodes don't exist
        expect(layerToMilestoneRel).toBeUndefined();

        // But layer should still store milestone info in properties
        const layerMutation = result.mutations.mutations.find(
          (m): m is GraphMutation & { type: 'create_node'; node: GraphNode } =>
            m.type === 'create_node' && m.node?.type === 'Layer'
        );

        expect(layerMutation).toBeDefined();
        expect(layerMutation?.node.properties.targetMilestoneSequence).toBe(0);
        expect(layerMutation?.node.properties.targetMilestoneTitle).toBe('Milestone 1');
        // But targetMilestoneId should reference the learningGoal milestone id
        expect(layerMutation?.node.properties.targetMilestoneId).toBe(`milestone-${graphId}-0`);
      }
    });

    it('should create relationship with unique ID containing layer and milestone identifiers', async () => {
      const graph = createMockGraphWithMilestones(2);
      const context = createMutationContext(graph);
      const learningGoal = createMockLearningGoal(2);

      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <goal>Goal</goal>
          <concept>Concept</concept>
          <description>Desc</description>
          <parents>Python Programming</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        const layerToMilestoneRel = result.mutations.mutations.find(
          m => m.type === 'create_relationship' &&
               m.relationship?.type === 'hasMilestone' &&
               m.relationship?.source?.startsWith('layer-')
        );

        expect(layerToMilestoneRel).toBeDefined();
        
        if (layerToMilestoneRel?.type === 'create_relationship' && layerToMilestoneRel.relationship) {
          const relId = layerToMilestoneRel.relationship.id;
          
          // Relationship ID should contain layer, hasMilestone, and milestone identifiers
          expect(relId).toContain('layer-');
          expect(relId).toContain('hasMilestone');
          expect(relId).toContain('milestone-');
          
          // Should be in format: rel-{source}-{type}-{target}
          expect(relId).toMatch(/^rel-layer.*-hasMilestone-milestone/);
        }
      }
    });

    it('should store targetMilestoneId on layer node for easy lookup', async () => {
      const graph = createMockGraphWithMilestones(3);
      const context = createMutationContext(graph);
      const learningGoal = createMockLearningGoal(3);

      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <goal>Goal</goal>
          <concept>Concept</concept>
          <description>Desc</description>
          <parents>Python Programming</parents>
        `,
        model: 'test-model',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: context,
        numConcepts: 1,
        learningGoal,
      });

      if ('mutations' in result) {
        const layerMutation = result.mutations.mutations.find(
          (m): m is GraphMutation & { type: 'create_node'; node: GraphNode } =>
            m.type === 'create_node' && m.node?.type === 'Layer'
        );

        expect(layerMutation).toBeDefined();
        
        // Layer should store milestone reference properties
        expect(layerMutation?.node.properties.targetMilestoneId).toBe(`milestone-${graphId}-0`);
        expect(layerMutation?.node.properties.targetMilestoneSequence).toBe(0);
        expect(layerMutation?.node.properties.targetMilestoneTitle).toBe('Milestone 1');
      }
    });
  });
});
