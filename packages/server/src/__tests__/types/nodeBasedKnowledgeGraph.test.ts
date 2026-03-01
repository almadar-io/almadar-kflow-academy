/**
 * Tests for Node-Based Knowledge Graph Type Definitions
 * 
 * These tests verify that all node types use the unified `name` property
 * for their display name, as per the property name unification plan.
 */

import {
  createGraphNode,
  type LearningGoalNodeProperties,
  type MilestoneNodeProperties,
  type LayerNodeProperties,
  type ConceptNodeProperties,
  type GraphNode,
} from '../../types/nodeBasedKnowledgeGraph';

describe('Node Property Name Unification', () => {
  describe('LearningGoalNodeProperties', () => {
    it('should use name property instead of title', () => {
      const goalNode = createGraphNode('goal-1', 'LearningGoal', {
        id: 'goal-1',
        name: 'Learn React',  // Using name, not title
        description: 'Master React framework',
        type: 'skill',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const props = goalNode.properties as LearningGoalNodeProperties;
      
      expect(props.name).toBe('Learn React');
      expect(props.name).toBeDefined();
      // Verify title is not the expected property
      expect((props as any).title).toBeUndefined();
    });

    it('should allow creating LearningGoal node with name property', () => {
      const props: LearningGoalNodeProperties = {
        id: 'goal-1',
        name: 'Learn TypeScript',
        description: 'Master TypeScript',
        type: 'skill',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const node = createGraphNode('goal-1', 'LearningGoal', props);
      
      expect(node.type).toBe('LearningGoal');
      expect(node.properties.name).toBe('Learn TypeScript');
    });
  });

  describe('MilestoneNodeProperties', () => {
    it('should use name property instead of title', () => {
      const milestoneNode = createGraphNode('milestone-1', 'Milestone', {
        id: 'milestone-1',
        name: 'Complete Basics',  // Using name, not title
        description: 'Finish the basics course',
        completed: false,
      });

      const props = milestoneNode.properties as MilestoneNodeProperties;
      
      expect(props.name).toBe('Complete Basics');
      expect(props.name).toBeDefined();
      // Verify title is not the expected property
      expect((props as any).title).toBeUndefined();
    });

    it('should allow creating Milestone node with name property', () => {
      const props: MilestoneNodeProperties = {
        id: 'milestone-1',
        name: 'Build First Project',
        description: 'Create your first React app',
        completed: false,
      };

      const node = createGraphNode('milestone-1', 'Milestone', props);
      
      expect(node.type).toBe('Milestone');
      expect(node.properties.name).toBe('Build First Project');
    });
  });

  describe('LayerNodeProperties', () => {
    it('should support optional name property', () => {
      const layerNode = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        name: 'Introduction Layer',  // Optional name property
        layerNumber: 1,
        goal: 'Learn the basics',
        prompt: 'Generate concepts for layer 1',
        response: 'Generated concepts',
        createdAt: Date.now(),
      });

      const props = layerNode.properties as LayerNodeProperties;
      
      expect(props.name).toBe('Introduction Layer');
      expect(props.layerNumber).toBe(1);
    });

    it('should allow creating Layer node without name property', () => {
      const props: LayerNodeProperties = {
        id: 'layer-1',
        layerNumber: 1,
        goal: 'Learn fundamentals',
        prompt: 'Generate concepts',
        response: 'Generated',
        createdAt: Date.now(),
      };

      const node = createGraphNode('layer-1', 'Layer', props);
      
      expect(node.type).toBe('Layer');
      expect(node.properties.layerNumber).toBe(1);
      expect(node.properties.name).toBeUndefined();
    });

    it('should allow creating Layer node with name property set from levelName', () => {
      const props: LayerNodeProperties = {
        id: 'layer-2',
        name: 'Advanced Concepts',  // Migrated from levelName
        layerNumber: 2,
        goal: 'Master advanced topics',
        prompt: 'Generate advanced concepts',
        response: 'Generated advanced concepts',
        createdAt: Date.now(),
      };

      const node = createGraphNode('layer-2', 'Layer', props);
      
      expect(node.type).toBe('Layer');
      expect(node.properties.name).toBe('Advanced Concepts');
      // Verify levelName is not used
      expect((node.properties as any).levelName).toBeUndefined();
    });
  });

  describe('ConceptNodeProperties', () => {
    it('should continue using name property (already correct)', () => {
      const conceptNode = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React Hooks',
        description: 'Understanding React hooks',
      });

      const props = conceptNode.properties as ConceptNodeProperties;
      
      expect(props.name).toBe('React Hooks');
      expect(props.name).toBeDefined();
    });
  });

  describe('Consistent property access across node types', () => {
    it('should allow accessing name property on all node types that need display names', () => {
      const nodes: GraphNode[] = [
        createGraphNode('concept-1', 'Concept', {
          id: 'concept-1',
          name: 'JavaScript',
          description: 'Programming language',
        }),
        createGraphNode('goal-1', 'LearningGoal', {
          id: 'goal-1',
          name: 'Learn JavaScript',
          description: 'Master JavaScript',
          type: 'skill',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
        createGraphNode('milestone-1', 'Milestone', {
          id: 'milestone-1',
          name: 'Complete Basics',
          completed: false,
        }),
        createGraphNode('layer-1', 'Layer', {
          id: 'layer-1',
          name: 'Foundation Layer',
          layerNumber: 1,
          goal: 'Learn basics',
          prompt: 'Generate',
          response: 'Generated',
          createdAt: Date.now(),
        }),
      ];

      // All should have name property accessible
      expect(nodes[0].properties.name).toBe('JavaScript');
      expect(nodes[1].properties.name).toBe('Learn JavaScript');
      expect(nodes[2].properties.name).toBe('Complete Basics');
      expect(nodes[3].properties.name).toBe('Foundation Layer');
    });

    it('should provide a consistent way to get node display name', () => {
      const getNodeDisplayName = (node: GraphNode): string => {
        return node.properties.name || node.id;
      };

      const goalNode = createGraphNode('goal-1', 'LearningGoal', {
        id: 'goal-1',
        name: 'Learn React',
        description: 'Description',
        type: 'skill',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const milestoneNode = createGraphNode('milestone-1', 'Milestone', {
        id: 'milestone-1',
        name: 'Build App',
        completed: false,
      });

      const conceptNode = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React',
        description: 'A library',
      });

      expect(getNodeDisplayName(goalNode)).toBe('Learn React');
      expect(getNodeDisplayName(milestoneNode)).toBe('Build App');
      expect(getNodeDisplayName(conceptNode)).toBe('React');
    });
  });
});
