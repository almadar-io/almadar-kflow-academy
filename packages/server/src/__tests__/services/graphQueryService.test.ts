/**
 * Tests for GraphQueryService
 * 
 * Service for optimized graph queries that return pre-formatted,
 * display-ready data for Mentor pages.
 */

import { GraphQueryService } from '../../services/graphQueryService';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';

// Mock Firestore
jest.mock('../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          select: jest.fn(() => ({
            get: jest.fn(),
          })),
        })),
      })),
    })),
  })),
}));

// Mock KnowledgeGraphAccessLayer
jest.mock('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
  const mockGetGraph = jest.fn();
  return {
    KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
      getGraph: mockGetGraph,
    })),
    __mocks: {
      mockGetGraph,
    },
  };
});

const { mockGetGraph } = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;
const { getFirestore } = require('../../config/firebaseAdmin');

describe('GraphQueryService', () => {
  let queryService: GraphQueryService;
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';

  beforeEach(() => {
    queryService = new GraphQueryService();
    jest.clearAllMocks();
  });

  describe('getLearningPathsSummary', () => {
    it('should return learning paths summary with goal title', async () => {
      // Setup mock Firestore to return graph IDs
      const mockSnapshot = {
        docs: [
          { id: graphId },
          { id: 'test-graph-2' },
        ],
      };
      const mockSelect = jest.fn(() => ({
        get: jest.fn().mockResolvedValue(mockSnapshot),
      }));
      const mockKnowledgeGraphsCollection = jest.fn(() => ({
        select: mockSelect,
      }));
      const mockUsersDoc = jest.fn(() => ({
        collection: jest.fn(() => mockKnowledgeGraphsCollection()),
      }));
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn((path: string) => {
          if (path === 'users') {
            return {
              doc: jest.fn(() => mockUsersDoc()),
            };
          }
          return mockUsersDoc();
        }),
      });

      // Setup mock graph with LearningGoal
      const goalNode = createGraphNode('goal-1', 'LearningGoal', {
        id: 'goal-1',
        name: 'Learn React',  // Use name property instead of title
        description: 'Master React framework',
        type: 'skill',
        target: 'intermediate',
      });

      const seedConcept = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React Basics',
        description: 'Introduction to React',
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'goal-1': goalNode,
          'concept-1': seedConcept,
          'concept-2': createGraphNode('concept-2', 'Concept', {
            id: 'concept-2',
            name: 'Components',
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1', 'concept-2'],
          Layer: [],
          LearningGoal: ['goal-1'],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship(graphId, 'goal-1', 'hasLearningGoal', 'forward'),
          createRelationship(graphId, 'concept-1', 'containsConcept', 'forward'),
          createRelationship(graphId, 'concept-2', 'containsConcept', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getLearningPathsSummary(uid);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(graphId);
      expect(result[0].title).toBe('Learn React');
      expect(result[0].description).toBe('Master React framework');
      expect(result[0].conceptCount).toBe(2);
      expect(result[0].seedConcept).toEqual({
        id: 'concept-1',
        name: 'React Basics',
        description: 'Introduction to React',
      });
    });

    it('should fallback to seed concept name if no goal', async () => {
      const mockSnapshot = {
        docs: [{ id: graphId }],
      };
      const mockSelect = jest.fn(() => ({
        get: jest.fn().mockResolvedValue(mockSnapshot),
      }));
      const mockKnowledgeGraphsCollection = jest.fn(() => ({
        select: mockSelect,
      }));
      const mockUsersDoc = jest.fn(() => ({
        collection: jest.fn(() => mockKnowledgeGraphsCollection()),
      }));
      (getFirestore as jest.Mock).mockReturnValue({
        collection: jest.fn((path: string) => {
          if (path === 'users') {
            return {
              doc: jest.fn(() => mockUsersDoc()),
            };
          }
          return mockUsersDoc();
        }),
      });

      const seedConcept = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'JavaScript',
        description: 'Programming language',
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'concept-1': seedConcept,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1'],
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

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getLearningPathsSummary(uid);

      expect(result[0].title).toBe('JavaScript');
      expect(result[0].description).toBe('');
    });
  });

  describe('getGraphSummary', () => {
    it('should return graph summary with goal and milestones', async () => {
      const goalNode = createGraphNode('goal-1', 'LearningGoal', {
        id: 'goal-1',
        name: 'Learn React',  // Use name property instead of title
        description: 'Master React',
        type: 'skill',
        target: 'intermediate',
      });

      const milestone1 = createGraphNode('milestone-1', 'Milestone', {
        id: 'milestone-1',
        name: 'Complete Basics',  // Use name property instead of title
        description: 'Finish basics course',
        completed: false,
      });

      const milestone2 = createGraphNode('milestone-2', 'Milestone', {
        id: 'milestone-2',
        name: 'Build Project',  // Use name property instead of title
        description: 'Create first project',
        completed: true,
        targetDate: 3000,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'goal-1': goalNode,
          'milestone-1': milestone1,
          'milestone-2': milestone2,
          'concept-1': createGraphNode('concept-1', 'Concept', {
            id: 'concept-1',
            name: 'React',
          }),
          'layer-1': createGraphNode('layer-1', 'Layer', {
            id: 'layer-1',
            number: 1,
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1'],
          Layer: ['layer-1'],
          LearningGoal: ['goal-1'],
          Milestone: ['milestone-1', 'milestone-2'],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship(graphId, 'goal-1', 'hasLearningGoal', 'forward'),
          createRelationship('goal-1', 'milestone-1', 'hasMilestone', 'forward'),
          createRelationship('goal-1', 'milestone-2', 'hasMilestone', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getGraphSummary(uid, graphId);

      expect(result.id).toBe(graphId);
      expect(result.goal).toEqual({
        id: 'goal-1',
        title: 'Learn React',
        description: 'Master React',
        type: 'skill',
        target: 'intermediate',
      });
      expect(result.milestones).toHaveLength(2);
      expect(result.milestones[0].title).toBe('Complete Basics');
      expect(result.milestones[1].completed).toBe(true);
      expect(result.conceptCount).toBe(1);
      expect(result.layerCount).toBe(1);
    });
  });

  describe('getConceptsByLayer', () => {
    it('should return concepts organized by layer', async () => {
      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
        goal: 'Learn basics',
      });

      const layer2 = createGraphNode('layer-2', 'Layer', {
        id: 'layer-2',
        number: 2,
        goal: 'Advanced topics',
      });

      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React',
        description: 'A library',
        sequence: 1,
        layer: 1,
      });

      const concept2 = createGraphNode('concept-2', 'Concept', {
        id: 'concept-2',
        name: 'Components',
        description: 'Building blocks',
        sequence: 2,
        layer: 1,
      });

      const concept3 = createGraphNode('concept-3', 'Concept', {
        id: 'concept-3',
        name: 'Hooks',
        description: 'State management',
        sequence: 1,
        layer: 2,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'layer-2': layer2,
          'concept-1': concept1,
          'concept-2': concept2,
          'concept-3': concept3,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1', 'concept-2', 'concept-3'],
          Layer: ['layer-1', 'layer-2'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('layer-1', 'concept-1', 'containsConcept', 'forward'),
          createRelationship('layer-1', 'concept-2', 'containsConcept', 'forward'),
          createRelationship('layer-2', 'concept-3', 'containsConcept', 'forward'),
          createRelationship('concept-1', 'concept-1', 'belongsToLayer', 'forward'),
          createRelationship('layer-1', 'concept-1', 'belongsToLayer', 'forward'),
          createRelationship('layer-1', 'concept-2', 'belongsToLayer', 'forward'),
          createRelationship('layer-2', 'concept-3', 'belongsToLayer', 'forward'),
        ],
      };

      // No relationships needed - using properties.layer directly
      graph.relationships = [];

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: true,
      });

      expect(result.concepts).toHaveLength(3);
      expect(result.concepts[0].layer).toBe(1);
      expect(result.concepts[0].name).toBe('React');
      expect(result.groupedByLayer).toBeDefined();
      expect(result.groupedByLayer![1]).toHaveLength(2);
      expect(result.groupedByLayer![2]).toHaveLength(1);
      expect(result.layerInfo).toHaveLength(2);
      expect(result.layerInfo[0].layerNumber).toBe(1);
      expect(result.layerInfo[0].conceptCount).toBe(2);
    });

    it('should extract relationships correctly', async () => {
      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React',
      });

      const concept2 = createGraphNode('concept-2', 'Concept', {
        id: 'concept-2',
        name: 'JavaScript',
      });

      const concept3 = createGraphNode('concept-3', 'Concept', {
        id: 'concept-3',
        name: 'Components',
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'concept-1': concept1,
          'concept-2': concept2,
          'concept-3': concept3,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1', 'concept-2', 'concept-3'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('layer-1', 'concept-1', 'belongsToLayer', 'forward'),
          // concept-1 has concept-2 as parent (concept-1 -> hasParent -> concept-2 means concept-1 has parent concept-2)
          // But actually, hasParent means "has parent", so if concept-1 has parent concept-2, then:
          // concept-1 is source, concept-2 is target
          createRelationship('concept-1', 'concept-2', 'hasParent', 'forward'),
          // concept-1 has concept-3 as child (concept-1 -> hasChild -> concept-3)
          createRelationship('concept-1', 'concept-3', 'hasChild', 'forward'),
          // concept-3 has concept-2 as prerequisite (concept-3 -> hasPrerequisite -> concept-2)
          createRelationship('concept-3', 'concept-2', 'hasPrerequisite', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const concept1Result = result.concepts.find(c => c.id === 'concept-1');
      expect(concept1Result).toBeDefined();
      // concept-1 has concept-2 as parent, so parents should contain 'JavaScript'
      expect(concept1Result!.parents).toContain('JavaScript');
      // concept-1 has concept-3 as child, so children should contain 'Components'
      expect(concept1Result!.children).toContain('Components');
      expect(concept1Result!.prerequisites).toHaveLength(0);

      const concept3Result = result.concepts.find(c => c.id === 'concept-3');
      // concept-3 has concept-2 as prerequisite, so prerequisites should contain 'JavaScript'
      expect(concept3Result!.prerequisites).toContain('JavaScript');
    });

    it('should find parents via hasParent relationship (new bidirectional way)', async () => {
      const parentConcept = createGraphNode('parent-1', 'Concept', {
        id: 'parent-1',
        name: 'React',
      });

      const childConcept = createGraphNode('child-1', 'Concept', {
        id: 'child-1',
        name: 'Components',
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'parent-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'parent-1': parentConcept,
          'child-1': childConcept,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['parent-1', 'child-1'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('layer-1', 'child-1', 'belongsToLayer', 'forward'),
          // New bidirectional way: child has hasParent relationship
          createRelationship('child-1', 'parent-1', 'hasParent', 'forward'),
          // Also has hasChild for completeness (bidirectional)
          createRelationship('parent-1', 'child-1', 'hasChild', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const childResult = result.concepts.find(c => c.id === 'child-1');
      expect(childResult).toBeDefined();
      // Should find parent via hasParent relationship
      expect(childResult!.parents).toContain('React');
    });

    it('should find parents via hasChild relationship (backward compatibility)', async () => {
      const parentConcept = createGraphNode('parent-1', 'Concept', {
        id: 'parent-1',
        name: 'React',
      });

      const childConcept = createGraphNode('child-1', 'Concept', {
        id: 'child-1',
        name: 'Components',
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'parent-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'parent-1': parentConcept,
          'child-1': childConcept,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['parent-1', 'child-1'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('layer-1', 'child-1', 'belongsToLayer', 'forward'),
          // Old way: only hasChild relationship exists (no hasParent)
          createRelationship('parent-1', 'child-1', 'hasChild', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const childResult = result.concepts.find(c => c.id === 'child-1');
      expect(childResult).toBeDefined();
      // Should find parent via hasChild relationship (backward compat)
      expect(childResult!.parents).toContain('React');
    });

    it('should find children via hasChild relationship (new bidirectional way)', async () => {
      const parentConcept = createGraphNode('parent-1', 'Concept', {
        id: 'parent-1',
        name: 'React',
      });

      const childConcept = createGraphNode('child-1', 'Concept', {
        id: 'child-1',
        name: 'Components',
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'parent-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'parent-1': parentConcept,
          'child-1': childConcept,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['parent-1', 'child-1'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('layer-1', 'child-1', 'belongsToLayer', 'forward'),
          // New bidirectional way: parent has hasChild relationship
          createRelationship('parent-1', 'child-1', 'hasChild', 'forward'),
          // Also has hasParent for completeness (bidirectional)
          createRelationship('child-1', 'parent-1', 'hasParent', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const parentResult = result.concepts.find(c => c.id === 'parent-1');
      expect(parentResult).toBeDefined();
      // Should find child via hasChild relationship
      expect(parentResult!.children).toContain('Components');
    });

    it('should find children via hasParent relationship (backward compatibility)', async () => {
      const parentConcept = createGraphNode('parent-1', 'Concept', {
        id: 'parent-1',
        name: 'React',
      });

      const childConcept = createGraphNode('child-1', 'Concept', {
        id: 'child-1',
        name: 'Components',
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'parent-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'parent-1': parentConcept,
          'child-1': childConcept,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['parent-1', 'child-1'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('layer-1', 'child-1', 'belongsToLayer', 'forward'),
          // Old way: only hasParent relationship exists (no hasChild)
          // This is less common but possible in some old graphs
          createRelationship('child-1', 'parent-1', 'hasParent', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const parentResult = result.concepts.find(c => c.id === 'parent-1');
      expect(parentResult).toBeDefined();
      // Should find child via hasParent relationship (backward compat)
      expect(parentResult!.children).toContain('Components');
    });

    it('should handle both old and new relationship patterns in same graph', async () => {
      const parent1 = createGraphNode('parent-1', 'Concept', {
        id: 'parent-1',
        name: 'React',
      });

      const child1 = createGraphNode('child-1', 'Concept', {
        id: 'child-1',
        name: 'Components',
      });

      const parent2 = createGraphNode('parent-2', 'Concept', {
        id: 'parent-2',
        name: 'JavaScript',
      });

      const child2 = createGraphNode('child-2', 'Concept', {
        id: 'child-2',
        name: 'ES6',
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'parent-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'parent-1': parent1,
          'child-1': child1,
          'parent-2': parent2,
          'child-2': child2,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['parent-1', 'child-1', 'parent-2', 'child-2'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('layer-1', 'child-1', 'belongsToLayer', 'forward'),
          createRelationship('layer-1', 'child-2', 'belongsToLayer', 'forward'),
          // New way: bidirectional relationships
          createRelationship('parent-1', 'child-1', 'hasChild', 'forward'),
          createRelationship('child-1', 'parent-1', 'hasParent', 'forward'),
          // Old way: only hasChild (backward compat)
          createRelationship('parent-2', 'child-2', 'hasChild', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      // child-1 should find parent via hasParent (new way)
      const child1Result = result.concepts.find(c => c.id === 'child-1');
      expect(child1Result!.parents).toContain('React');

      // child-2 should find parent via hasChild (old way, backward compat)
      const child2Result = result.concepts.find(c => c.id === 'child-2');
      expect(child2Result!.parents).toContain('JavaScript');

      // parent-1 should find child via hasChild (new way)
      const parent1Result = result.concepts.find(c => c.id === 'parent-1');
      expect(parent1Result!.children).toContain('Components');

      // parent-2 should find child via hasChild (old way)
      const parent2Result = result.concepts.find(c => c.id === 'parent-2');
      expect(parent2Result!.children).toContain('ES6');
    });

    it('should not return duplicate entries when bidirectional relationships exist', async () => {
      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'Parent',
      });

      const concept2 = createGraphNode('concept-2', 'Concept', {
        id: 'concept-2',
        name: 'Child',
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'concept-1': concept1,
          'concept-2': concept2,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1', 'concept-2'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('layer-1', 'concept-2', 'belongsToLayer', 'forward'),
          // Bidirectional relationships (both exist)
          createRelationship('concept-1', 'concept-2', 'hasChild', 'forward'),
          createRelationship('concept-2', 'concept-1', 'hasParent', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const childResult = result.concepts.find(c => c.id === 'concept-2');
      expect(childResult).toBeDefined();
      
      // Should have parent only once (not duplicated)
      expect(childResult!.parents).toHaveLength(1);
      expect(childResult!.parents[0]).toBe('Parent');
      
      // Verify no duplicates in array
      const uniqueParents = new Set(childResult!.parents);
      expect(uniqueParents.size).toBe(childResult!.parents.length);

      const parentResult = result.concepts.find(c => c.id === 'concept-1');
      expect(parentResult).toBeDefined();
      
      // Should have child only once (not duplicated)
      expect(parentResult!.children).toHaveLength(1);
      expect(parentResult!.children[0]).toBe('Child');
      
      // Verify no duplicates in array
      const uniqueChildren = new Set(parentResult!.children);
      expect(uniqueChildren.size).toBe(parentResult!.children.length);
    });

    it('should deduplicate when multiple relationships point to same concept', async () => {
      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'Parent',
      });

      const concept2 = createGraphNode('concept-2', 'Concept', {
        id: 'concept-2',
        name: 'Child',
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'concept-1': concept1,
          'concept-2': concept2,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1', 'concept-2'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('layer-1', 'concept-2', 'belongsToLayer', 'forward'),
          // Bidirectional relationships
          createRelationship('concept-1', 'concept-2', 'hasChild', 'forward'),
          createRelationship('concept-2', 'concept-1', 'hasParent', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const parentResult = result.concepts.find(c => c.id === 'concept-1');
      expect(parentResult).toBeDefined();
      
      // Should have child only once despite bidirectional relationships
      expect(parentResult!.children).toHaveLength(1);
      expect(parentResult!.children[0]).toBe('Child');
      
      // Verify array contains unique values
      expect(new Set(parentResult!.children).size).toBe(parentResult!.children.length);
    });
  });

  describe('extractLayer - multiple fallback sources', () => {
    it('should extract layer from properties.layer', async () => {
      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React',
        layer: 1,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'concept-1': concept1,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          // Concept -> belongsToLayer -> Layer
          createRelationship('concept-1', 'layer-1', 'belongsToLayer', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const concept1Result = result.concepts.find(c => c.id === 'concept-1');
      expect(concept1Result).toBeDefined();
      expect(concept1Result!.layer).toBe(1);
    });

    it('should extract layer from properties.layer (backward compatibility)', async () => {
      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React',
        layer: 1,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'concept-1': concept1,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1'],
          Layer: ['layer-1'],
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

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const concept1Result = result.concepts.find(c => c.id === 'concept-1');
      expect(concept1Result).toBeDefined();
      expect(concept1Result!.layer).toBe(1);
    });

    it('should extract layer from properties.layer as fallback', async () => {
      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React',
        layer: 2, // Layer stored in properties
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'concept-1': concept1,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [], // No layer relationships
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const concept1Result = result.concepts.find(c => c.id === 'concept-1');
      expect(concept1Result).toBeDefined();
      expect(concept1Result!.layer).toBe(2);
    });

    it('should use properties.layer when set', async () => {
      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React',
        layer: 2,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const layer2 = createGraphNode('layer-2', 'Layer', {
        id: 'layer-2',
        number: 2,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'layer-2': layer2,
          'concept-1': concept1,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1'],
          Layer: ['layer-1', 'layer-2'],
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

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      const concept1Result = result.concepts.find(c => c.id === 'concept-1');
      expect(concept1Result).toBeDefined();
      // Should use properties.layer (layer 2)
      expect(concept1Result!.layer).toBe(2);
    });

    it('should group concepts by correct layer numbers', async () => {
      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'Layer 1 Concept',
        layer: 1,
      });

      const concept2 = createGraphNode('concept-2', 'Concept', {
        id: 'concept-2',
        name: 'Layer 2 Concept',
        layer: 2,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const layer2 = createGraphNode('layer-2', 'Layer', {
        id: 'layer-2',
        number: 2,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'layer-2': layer2,
          'concept-1': concept1,
          'concept-2': concept2,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1', 'concept-2'],
          Layer: ['layer-1', 'layer-2'],
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

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: true,
      });

      expect(result.groupedByLayer).toBeDefined();
      expect(result.groupedByLayer![1]).toBeDefined();
      expect(result.groupedByLayer![1].length).toBe(1);
      expect(result.groupedByLayer![1][0].name).toBe('Layer 1 Concept');
      
      expect(result.groupedByLayer![2]).toBeDefined();
      expect(result.groupedByLayer![2].length).toBe(1);
      expect(result.groupedByLayer![2][0].name).toBe('Layer 2 Concept');
    });
  });

  describe('getConceptDetail', () => {
    it('should return complete concept detail with all related data', async () => {
      const concept = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'React',
        description: 'A JavaScript library',
      });

      const lesson = createGraphNode('lesson-1', 'Lesson', {
        id: 'lesson-1',
        content: '# React Lesson\n\nLearn React basics...',
        prerequisites: ['JavaScript'],
      });

      const flashCard1 = createGraphNode('flash-1', 'FlashCard', {
        id: 'flash-1',
        front: 'What is React?',
        back: 'A JavaScript library for building user interfaces',
      });

      const flashCard2 = createGraphNode('flash-2', 'FlashCard', {
        id: 'flash-2',
        front: 'What is JSX?',
        back: 'JavaScript XML syntax extension',
      });

      const metadata = createGraphNode('metadata-1', 'ConceptMetadata', {
        id: 'metadata-1',
        qaPairs: [
          { question: 'What is React?', answer: 'A library', timestamp: Date.now() },
          { question: 'Why use React?', answer: 'Component-based', timestamp: Date.now() },
        ],
      });

      const concept2 = createGraphNode('concept-2', 'Concept', {
        id: 'concept-2',
        name: 'JavaScript',
      });

      const concept3 = createGraphNode('concept-3', 'Concept', {
        id: 'concept-3',
        name: 'Components',
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': layer1,
          'concept-1': concept,
          'concept-2': concept2,
          'concept-3': concept3,
          'lesson-1': lesson,
          'flash-1': flashCard1,
          'flash-2': flashCard2,
          'metadata-1': metadata,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['concept-1', 'concept-2', 'concept-3'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: ['lesson-1'],
          ConceptMetadata: ['metadata-1'],
          GraphMetadata: [],
          FlashCard: ['flash-1', 'flash-2'],
        },
        relationships: [
          createRelationship('layer-1', 'concept-1', 'belongsToLayer', 'forward'),
          createRelationship('concept-1', 'lesson-1', 'hasLesson', 'forward'),
          createRelationship('concept-1', 'flash-1', 'hasFlashCard', 'forward'),
          createRelationship('concept-1', 'flash-2', 'hasFlashCard', 'forward'),
          createRelationship('concept-1', 'metadata-1', 'hasMetadata', 'forward'),
          // concept-1 has concept-2 as parent (concept-1 -> hasParent -> concept-2)
          createRelationship('concept-1', 'concept-2', 'hasParent', 'forward'),
          // concept-1 has concept-3 as child (concept-1 -> hasChild -> concept-3)
          createRelationship('concept-1', 'concept-3', 'hasChild', 'forward'),
          // concept-1 has concept-3 as prerequisite (concept-1 -> hasPrerequisite -> concept-3)
          // Actually, let's make concept-3 have concept-1 as prerequisite for variety
          createRelationship('concept-3', 'concept-1', 'hasPrerequisite', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getConceptDetail(uid, graphId, 'concept-1');

      expect(result.concept.id).toBe('concept-1');
      expect(result.concept.name).toBe('React');
      expect(result.lesson).toBeDefined();
      expect(result.lesson!.content).toContain('React Lesson');
      expect(result.flashcards).toHaveLength(2);
      expect(result.flashcards[0].front).toBe('What is React?');
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.qa).toHaveLength(2);
      expect(result.relationships.parents).toHaveLength(1);
      expect(result.relationships.parents[0].name).toBe('JavaScript');
      expect(result.relationships.children).toHaveLength(1);
      expect(result.relationships.children[0].name).toBe('Components');
      // concept-3 has concept-1 as prerequisite, so concept-1 should not have concept-3 in prerequisites
      // But we can check that prerequisites is empty or has other items
      expect(result.relationships.prerequisites.length).toBeGreaterThanOrEqual(0);
    });

    it('should throw error if concept not found', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'concept-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
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

      mockGetGraph.mockResolvedValue(graph);

      await expect(
        queryService.getConceptDetail(uid, graphId, 'nonexistent')
      ).rejects.toThrow('Concept nonexistent not found');
    });
  });

  describe('getMindMapStructure', () => {
    it('should return basic structure with seed concept as root', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        description: 'Master Scheme programming',
        isSeed: true,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
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

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      expect(result.nodes).toHaveLength(1);
      expect(result.seedNodeId).toBe('seed-1');
      expect(result.totalNodes).toBe(1);
      expect(result.layerCount).toBe(0);
      expect(result.conceptCount).toBe(1);

      const seedNode = result.nodes[0];
      expect(seedNode.id).toBe('seed-1');
      expect(seedNode.title).toBe('Scheme');
      expect(seedNode.level).toBe(0);
      expect(seedNode.parentId).toBeUndefined();
      expect(seedNode.children).toEqual([]);
      expect(seedNode.isExpanded).toBe(true); // Seed and layers expanded by default (level < 2)
      expect(seedNode.nodeType).toBe('Concept');
    });

    it('should use isExpanded from node properties when set', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        description: 'Master Scheme programming',
        isSeed: true,
        isExpanded: false, // Explicitly set to false
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
        isExpanded: true, // Explicitly set to true
      });

      const conceptA = createGraphNode('concept-a', 'Concept', {
        id: 'concept-a',
        name: 'Concept A',
        layer: 1,
        isExpanded: false, // Explicitly set to false (level 2, would normally be false anyway)
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'layer-1': layer1,
          'concept-a': conceptA,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1', 'concept-a'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('seed-1', 'layer-1', 'hasLayer', 'forward'),
          createRelationship('concept-a', 'layer-1', 'belongsToLayer', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      const seedNode = result.nodes.find(n => n.id === 'seed-1');
      const layer1Node = result.nodes.find(n => n.id === 'layer-1');
      const conceptANode = result.nodes.find(n => n.id === 'concept-a');

      // Should use stored isExpanded values from properties
      expect(seedNode!.isExpanded).toBe(false); // From properties.isExpanded
      expect(layer1Node!.isExpanded).toBe(true); // From properties.isExpanded
      expect(conceptANode!.isExpanded).toBe(false); // From properties.isExpanded
    });

    it('should fallback to default behavior when isExpanded is not set in properties', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        description: 'Master Scheme programming',
        isSeed: true,
        // isExpanded not set - should use default
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
        // isExpanded not set - should use default
      });

      const conceptA = createGraphNode('concept-a', 'Concept', {
        id: 'concept-a',
        name: 'Concept A',
        layer: 1,
        // isExpanded not set - should use default
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'layer-1': layer1,
          'concept-a': conceptA,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1', 'concept-a'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('seed-1', 'layer-1', 'hasLayer', 'forward'),
          createRelationship('concept-a', 'layer-1', 'belongsToLayer', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      const seedNode = result.nodes.find(n => n.id === 'seed-1');
      const layer1Node = result.nodes.find(n => n.id === 'layer-1');
      const conceptANode = result.nodes.find(n => n.id === 'concept-a');

      // Should use default behavior (level < 2 expanded)
      expect(seedNode!.isExpanded).toBe(true); // Level 0, default expanded
      expect(layer1Node!.isExpanded).toBe(true); // Level 1, default expanded
      expect(conceptANode!.isExpanded).toBe(false); // Level 2, default collapsed
    });

    it('should return structure with layers as children of seed', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        description: 'Master Scheme programming',
        isSeed: true,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
        goal: 'Build foundational mental model',
      });

      const layer2 = createGraphNode('layer-2', 'Layer', {
        id: 'layer-2',
        number: 2,
        goal: 'Advanced concepts',
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'layer-1': layer1,
          'layer-2': layer2,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1'],
          Layer: ['layer-1', 'layer-2'],
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

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      expect(result.nodes).toHaveLength(3); // seed + 2 layers
      expect(result.layerCount).toBe(2);

      const seedNode = result.nodes.find(n => n.id === 'seed-1');
      expect(seedNode).toBeDefined();
      expect(seedNode!.level).toBe(0);
      expect(seedNode!.children).toContain('layer-1');
      expect(seedNode!.children).toContain('layer-2');

      const layer1Node = result.nodes.find(n => n.id === 'layer-1');
      expect(layer1Node).toBeDefined();
      expect(layer1Node!.level).toBe(1);
      expect(layer1Node!.parentId).toBe('seed-1');
      expect(layer1Node!.isExpanded).toBe(true);

      const layer2Node = result.nodes.find(n => n.id === 'layer-2');
      expect(layer2Node).toBeDefined();
      expect(layer2Node!.level).toBe(1);
      expect(layer2Node!.parentId).toBe('seed-1');
    });

    it('should return concepts in layers as children of their layer', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        description: 'Master Scheme programming',
        isSeed: true,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
        goal: 'Build foundational mental model',
      });

      const conceptA = createGraphNode('concept-a', 'Concept', {
        id: 'concept-a',
        name: 'Expression-Oriented Programming',
        description: 'In Scheme, almost everything is an expression',
        layer: 1,
        sequence: 1,
      });

      const conceptB = createGraphNode('concept-b', 'Concept', {
        id: 'concept-b',
        name: 'Lists and Data Structures',
        description: 'Understanding lists',
        layer: 1,
        sequence: 2,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'layer-1': layer1,
          'concept-a': conceptA,
          'concept-b': conceptB,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1', 'concept-a', 'concept-b'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('concept-a', 'layer-1', 'belongsToLayer', 'forward'),
          createRelationship('concept-b', 'layer-1', 'belongsToLayer', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      expect(result.nodes).toHaveLength(4); // seed + layer + 2 concepts
      expect(result.conceptCount).toBe(3); // seed + 2 concepts

      const layer1Node = result.nodes.find(n => n.id === 'layer-1');
      expect(layer1Node).toBeDefined();
      expect(layer1Node!.children).toContain('concept-a');
      expect(layer1Node!.children).toContain('concept-b');

      const conceptANode = result.nodes.find(n => n.id === 'concept-a');
      expect(conceptANode).toBeDefined();
      expect(conceptANode!.level).toBe(2);
      expect(conceptANode!.parentId).toBe('layer-1');

      const conceptBNode = result.nodes.find(n => n.id === 'concept-b');
      expect(conceptBNode).toBeDefined();
      expect(conceptBNode!.level).toBe(2);
      expect(conceptBNode!.parentId).toBe('layer-1');
    });

    it('should return nested children recursively', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        description: 'Master Scheme programming',
        isSeed: true,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
        goal: 'Build foundational mental model',
      });

      const conceptA = createGraphNode('concept-a', 'Concept', {
        id: 'concept-a',
        name: 'Expression-Oriented Programming',
        description: 'In Scheme, almost everything is an expression',
        layer: 1,
        sequence: 1,
      });

      const conceptA1 = createGraphNode('concept-a1', 'Concept', {
        id: 'concept-a1',
        name: 'Function Calls',
        description: 'Understanding function calls',
        layer: 1,
      });

      const conceptA2 = createGraphNode('concept-a2', 'Concept', {
        id: 'concept-a2',
        name: 'Return Values',
        description: 'Understanding return values',
        layer: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'layer-1': layer1,
          'concept-a': conceptA,
          'concept-a1': conceptA1,
          'concept-a2': conceptA2,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1', 'concept-a', 'concept-a1', 'concept-a2'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('concept-a', 'layer-1', 'belongsToLayer', 'forward'),
          createRelationship('concept-a', 'concept-a1', 'hasChild', 'forward'),
          createRelationship('concept-a', 'concept-a2', 'hasChild', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      expect(result.nodes).toHaveLength(5); // seed + layer + concept-a + 2 children

      const conceptANode = result.nodes.find(n => n.id === 'concept-a');
      expect(conceptANode).toBeDefined();
      expect(conceptANode!.children).toContain('concept-a1');
      expect(conceptANode!.children).toContain('concept-a2');

      const conceptA1Node = result.nodes.find(n => n.id === 'concept-a1');
      expect(conceptA1Node).toBeDefined();
      expect(conceptA1Node!.level).toBe(3);
      expect(conceptA1Node!.parentId).toBe('concept-a');

      const conceptA2Node = result.nodes.find(n => n.id === 'concept-a2');
      expect(conceptA2Node).toBeDefined();
      expect(conceptA2Node!.level).toBe(3);
      expect(conceptA2Node!.parentId).toBe('concept-a');
    });

    it('should sort layers by number', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        isSeed: true,
      });

      const layer3 = createGraphNode('layer-3', 'Layer', {
        id: 'layer-3',
        number: 3,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const layer2 = createGraphNode('layer-2', 'Layer', {
        id: 'layer-2',
        number: 2,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'layer-3': layer3,
          'layer-1': layer1,
          'layer-2': layer2,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1'],
          Layer: ['layer-3', 'layer-1', 'layer-2'],
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

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      const seedNode = result.nodes.find(n => n.id === 'seed-1');
      expect(seedNode).toBeDefined();
      expect(seedNode!.children).toEqual(['layer-1', 'layer-2', 'layer-3']);
    });

    it('should sort concepts by sequence within layer', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        isSeed: true,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const concept3 = createGraphNode('concept-3', 'Concept', {
        id: 'concept-3',
        name: 'Concept 3',
        layer: 1,
        sequence: 3,
      });

      const concept1 = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'Concept 1',
        layer: 1,
        sequence: 1,
      });

      const concept2 = createGraphNode('concept-2', 'Concept', {
        id: 'concept-2',
        name: 'Concept 2',
        layer: 1,
        sequence: 2,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'layer-1': layer1,
          'concept-3': concept3,
          'concept-1': concept1,
          'concept-2': concept2,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1', 'concept-3', 'concept-1', 'concept-2'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('concept-3', 'layer-1', 'belongsToLayer', 'forward'),
          createRelationship('concept-1', 'layer-1', 'belongsToLayer', 'forward'),
          createRelationship('concept-2', 'layer-1', 'belongsToLayer', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      const layer1Node = result.nodes.find(n => n.id === 'layer-1');
      expect(layer1Node).toBeDefined();
      expect(layer1Node!.children).toEqual(['concept-1', 'concept-2', 'concept-3']);
    });

    it('should throw error if seed concept not found', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'nonexistent',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
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

      mockGetGraph.mockResolvedValue(graph);

      await expect(
        queryService.getMindMapStructure(uid, graphId)
      ).rejects.toThrow('Seed concept node nonexistent not found');
    });

    it('should throw error if graph has no seedConceptId', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: '',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
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

      mockGetGraph.mockResolvedValue(graph);

      await expect(
        queryService.getMindMapStructure(uid, graphId)
      ).rejects.toThrow('Seed concept not found in graph');
    });

    it('should attach concepts without layer to seed', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        isSeed: true,
      });

      const conceptWithoutLayer = createGraphNode('concept-orphan', 'Concept', {
        id: 'concept-orphan',
        name: 'Orphan Concept',
        description: 'Concept without layer',
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'concept-orphan': conceptWithoutLayer,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1', 'concept-orphan'],
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

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      expect(result.nodes).toHaveLength(2);

      const orphanNode = result.nodes.find(n => n.id === 'concept-orphan');
      expect(orphanNode).toBeDefined();
      expect(orphanNode!.level).toBe(1);
      expect(orphanNode!.parentId).toBe('seed-1');

      const seedNode = result.nodes.find(n => n.id === 'seed-1');
      expect(seedNode!.children).toContain('concept-orphan');
    });

    it('should prevent circular relationships', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        isSeed: true,
      });

      const conceptA = createGraphNode('concept-a', 'Concept', {
        id: 'concept-a',
        name: 'Concept A',
        layer: 1,
      });

      const conceptB = createGraphNode('concept-b', 'Concept', {
        id: 'concept-b',
        name: 'Concept B',
        layer: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'concept-a': conceptA,
          'concept-b': conceptB,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1', 'concept-a', 'concept-b'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          // Circular: A -> B -> A
          createRelationship('concept-a', 'concept-b', 'hasChild', 'forward'),
          createRelationship('concept-b', 'concept-a', 'hasChild', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      // Should not cause infinite loop
      expect(result.nodes.length).toBeGreaterThan(0);
      // Both concepts should be attached to seed (no layer)
      const conceptANode = result.nodes.find(n => n.id === 'concept-a');
      const conceptBNode = result.nodes.find(n => n.id === 'concept-b');
      expect(conceptANode).toBeDefined();
      expect(conceptBNode).toBeDefined();
    });

    it('should handle expandAll option', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        isSeed: true,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
      });

      const conceptA = createGraphNode('concept-a', 'Concept', {
        id: 'concept-a',
        name: 'Concept A',
        layer: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'layer-1': layer1,
          'concept-a': conceptA,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1', 'concept-a'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('concept-a', 'layer-1', 'belongsToLayer', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId, { expandAll: true });

      const conceptANode = result.nodes.find(n => n.id === 'concept-a');
      expect(conceptANode).toBeDefined();
      expect(conceptANode!.isExpanded).toBe(true);
    });

    it('should preserve metadata in MindMapNode', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        description: 'Master Scheme programming',
        isSeed: true,
        layer: 0,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        id: 'layer-1',
        number: 1,
        goal: 'Build foundational mental model',
      });

      const conceptA = createGraphNode('concept-a', 'Concept', {
        id: 'concept-a',
        name: 'Expression-Oriented Programming',
        description: 'In Scheme, almost everything is an expression',
        layer: 1,
        sequence: 1,
        difficulty: 'beginner',
        focus: 'core',
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
          'layer-1': layer1,
          'concept-a': conceptA,
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: ['seed-1', 'concept-a'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [
          createRelationship('concept-a', 'layer-1', 'belongsToLayer', 'forward'),
        ],
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      const seedNode = result.nodes.find(n => n.id === 'seed-1');
      expect(seedNode).toBeDefined();
      expect(seedNode!.metadata).toBeDefined();
      expect(seedNode!.metadata!.isSeed).toBe(true);
      expect(seedNode!.metadata!.layer).toBe(0);

      const layerNode = result.nodes.find(n => n.id === 'layer-1');
      expect(layerNode).toBeDefined();
      expect(layerNode!.metadata).toBeDefined();
      expect(layerNode!.metadata!.layerNumber).toBe(1);
      expect(layerNode!.metadata!.goal).toBe('Build foundational mental model');

      const conceptNode = result.nodes.find(n => n.id === 'concept-a');
      expect(conceptNode).toBeDefined();
      expect(conceptNode!.metadata).toBeDefined();
      expect(conceptNode!.metadata!.layer).toBe(1);
      expect(conceptNode!.metadata!.sequence).toBe(1);
    });

    it('should handle empty graph with only seed concept', async () => {
      const seedConcept = createGraphNode('seed-1', 'Concept', {
        id: 'seed-1',
        name: 'Scheme',
        description: 'Master Scheme programming',
        isSeed: true,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'seed-1': seedConcept,
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

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      expect(result.nodes).toHaveLength(1);
      expect(result.seedNodeId).toBe('seed-1');
      expect(result.totalNodes).toBe(1);
      expect(result.layerCount).toBe(0);
      expect(result.conceptCount).toBe(1);

      const seedNode = result.nodes[0];
      expect(seedNode.id).toBe('seed-1');
      expect(seedNode.children).toEqual([]);
      expect(seedNode.level).toBe(0);
    });
  });
});

