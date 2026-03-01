/**
 * Tests for Graph Operation Parsers
 * 
 * Verifies that parsers correctly use the unified `name` property
 * instead of `title` or `levelName` for all node types.
 */

import { parseProgressiveExpandContent, parseGenerateGoalsContent } from '../../utils/graphOperationParsers';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode } from '../../types/nodeBasedKnowledgeGraph';
import type { MutationContext } from '../../types/mutations';
import { isCreateNodeMutation } from '../../types/mutations';

describe('Graph Operation Parsers - Property Name Unification', () => {
  const graphId = 'test-graph-1';
  const seedConceptId = 'seed-1';
  
  const createMutationContext = (seedId: string = seedConceptId): MutationContext => ({
    graphId,
    seedConceptId: seedId,
    existingNodes: {},
    existingRelationships: [],
  });

  describe('parseProgressiveExpandContent', () => {
    it('should store levelName as name property in Layer node', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': createGraphNode('seed-1', 'Concept', {
            id: 'seed-1',
            name: 'React',
            description: 'A library',
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      const content = `
        <level-name>Introduction Layer</level-name>
        <goal>Learn the basics</goal>
        <concept>Components</concept>
        <description>Building blocks of React</description>
        <parents>React</parents>
      `;

      const result = await parseProgressiveExpandContent(
        content,
        graph,
        createMutationContext('seed-1')
      );

      // Find the layer node mutation
      const layerMutation = result.mutations.mutations.find(
        m => isCreateNodeMutation(m) && m.node?.type === 'Layer'
      );

      expect(layerMutation).toBeDefined();
      expect(isCreateNodeMutation(layerMutation!)).toBe(true);
      const layerNode = isCreateNodeMutation(layerMutation!) ? layerMutation.node : undefined;
      expect(layerNode).toBeDefined();
      
      // Verify name property is set from levelName
      expect(layerNode!.properties.name).toBe('Introduction Layer');
      
      // Verify levelName is NOT stored as a separate property
      expect(layerNode!.properties.levelName).toBeUndefined();
      
      // Verify other properties are still present
      expect(layerNode!.properties.layerNumber).toBe(1);
      expect(layerNode!.properties.goal).toBe('Learn the basics');
    });

    it('should generate name from levelNumber if levelName is not provided', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': createGraphNode('seed-1', 'Concept', {
            id: 'seed-1',
            name: 'React',
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      const content = `
        <goal>Learn the basics</goal>
        <concept>Components</concept>
        <description>Building blocks</description>
      `;

      const result = await parseProgressiveExpandContent(
        content,
        graph,
        createMutationContext('seed-1')
      );

      const layerMutation = result.mutations.mutations.find(
        m => isCreateNodeMutation(m) && m.node?.type === 'Layer'
      );

      expect(layerMutation).toBeDefined();
      expect(isCreateNodeMutation(layerMutation!)).toBe(true);
      const layerNode = isCreateNodeMutation(layerMutation!) ? layerMutation.node : undefined;
      
      // Should generate name from levelNumber
      expect(layerNode!.properties.name).toBe('Level 1');
      expect(layerNode!.properties.levelName).toBeUndefined();
    });

    it('should NOT store levelName as a separate property', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': createGraphNode('seed-1', 'Concept', {
            id: 'seed-1',
            name: 'React',
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      const content = `
        <level-name>Custom Layer Name</level-name>
        <goal>Learn basics</goal>
      `;

      const result = await parseProgressiveExpandContent(
        content,
        graph,
        createMutationContext('seed-1')
      );

      const layerMutation = result.mutations.mutations.find(
        m => isCreateNodeMutation(m) && m.node?.type === 'Layer'
      );

      expect(layerMutation).toBeDefined();
      expect(isCreateNodeMutation(layerMutation!)).toBe(true);
      const layerNode = isCreateNodeMutation(layerMutation!) ? layerMutation.node : undefined;
      expect(layerNode).toBeDefined();
      
      // Verify levelName is NOT in properties
      expect(layerNode!.properties.levelName).toBeUndefined();
      
      // Verify name is present instead
      expect(layerNode!.properties.name).toBe('Custom Layer Name');
    });
  });

  describe('parseGenerateGoalsContent', () => {
    it('should store goal name as name property, not title', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': createGraphNode('seed-1', 'Concept', {
            id: 'seed-1',
            name: 'React',
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      const content = JSON.stringify({
        title: 'Learn React',  // LLM response uses title
        description: 'Master React framework',
        type: 'skill',
        target: 'intermediate',
        milestones: [],
      });

      const result = await parseGenerateGoalsContent(
        content,
        graph,
        createMutationContext('seed-1')
      );

      // Find the LearningGoal node mutation
      const goalMutation = result.mutations.mutations.find(
        m => isCreateNodeMutation(m) && m.node?.type === 'LearningGoal'
      );

      expect(goalMutation).toBeDefined();
      expect(isCreateNodeMutation(goalMutation!)).toBe(true);
      const goalNode = isCreateNodeMutation(goalMutation!) ? goalMutation.node : undefined;
      expect(goalNode).toBeDefined();
      
      // Verify name property is set (mapped from title in LLM response)
      expect(goalNode!.properties.name).toBe('Learn React');
      
      // Verify title is NOT stored as a separate property
      expect(goalNode!.properties.title).toBeUndefined();
    });

    it('should prefer name over title if both are provided in LLM response', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': createGraphNode('seed-1', 'Concept', {
            id: 'seed-1',
            name: 'React',
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      const content = JSON.stringify({
        name: 'Correct Goal Name',  // Should prefer this
        title: 'Old Title Name',    // Should ignore this
        description: 'Description',
        type: 'skill',
        milestones: [],
      });

      const result = await parseGenerateGoalsContent(
        content,
        graph,
        createMutationContext('seed-1')
      );

      const goalMutation = result.mutations.mutations.find(
        m => isCreateNodeMutation(m) && m.node?.type === 'LearningGoal'
      );

      expect(goalMutation).toBeDefined();
      expect(isCreateNodeMutation(goalMutation!)).toBe(true);
      const goalNode = isCreateNodeMutation(goalMutation!) ? goalMutation.node : undefined;
      expect(goalNode).toBeDefined();
      
      // Should use name if provided
      expect(goalNode!.properties.name).toBe('Correct Goal Name');
      expect(goalNode!.properties.title).toBeUndefined();
    });

    it('should store milestone name as name property, not title', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': createGraphNode('seed-1', 'Concept', {
            id: 'seed-1',
            name: 'React',
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      const content = JSON.stringify({
        title: 'Learn React',
        description: 'Master React',
        type: 'skill',
        milestones: [
          {
            title: 'Complete Basics',  // LLM uses title
            description: 'Finish basics course',
            completed: false,
          },
        ],
      });

      const result = await parseGenerateGoalsContent(
        content,
        graph,
        createMutationContext('seed-1')
      );

      // Find milestone node mutations
      const milestoneMutations = result.mutations.mutations.filter(
        m => isCreateNodeMutation(m) && m.node?.type === 'Milestone'
      );

      expect(milestoneMutations).toHaveLength(1);
      const milestoneMutation = milestoneMutations[0];
      expect(milestoneMutation).toBeDefined();
      expect(isCreateNodeMutation(milestoneMutation!)).toBe(true);
      const milestoneNode = isCreateNodeMutation(milestoneMutation!) ? milestoneMutation.node : undefined;
      expect(milestoneNode).toBeDefined();
      
      // Verify name property is set (mapped from title)
      expect(milestoneNode!.properties.name).toBe('Complete Basics');
      
      // Verify title is NOT stored
      expect(milestoneNode!.properties.title).toBeUndefined();
    });

    it('should NOT store title property in LearningGoal or Milestone nodes', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': createGraphNode('seed-1', 'Concept', {
            id: 'seed-1',
            name: 'React',
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      const content = JSON.stringify({
        title: 'Test Goal',
        description: 'Description',
        type: 'skill',
        milestones: [
          {
            title: 'Test Milestone',
            description: 'Milestone desc',
            completed: false,
          },
        ],
      });

      const result = await parseGenerateGoalsContent(
        content,
        graph,
        createMutationContext('seed-1')
      );

      const goalMutation = result.mutations.mutations.find(
        m => isCreateNodeMutation(m) && m.node?.type === 'LearningGoal'
      );
      const milestoneMutation = result.mutations.mutations.find(
        m => isCreateNodeMutation(m) && m.node?.type === 'Milestone'
      );

      expect(goalMutation).toBeDefined();
      expect(milestoneMutation).toBeDefined();
      expect(isCreateNodeMutation(goalMutation!)).toBe(true);
      expect(isCreateNodeMutation(milestoneMutation!)).toBe(true);
      
      const goalNode = isCreateNodeMutation(goalMutation!) ? goalMutation.node : undefined;
      const milestoneNode = isCreateNodeMutation(milestoneMutation!) ? milestoneMutation.node : undefined;

      expect(goalNode).toBeDefined();
      expect(milestoneNode).toBeDefined();

      // Verify neither has title property
      expect(goalNode!.properties.title).toBeUndefined();
      expect(milestoneNode!.properties.title).toBeUndefined();
      
      // Verify both have name property
      expect(goalNode!.properties.name).toBe('Test Goal');
      expect(milestoneNode!.properties.name).toBe('Test Milestone');
    });
  });
});
