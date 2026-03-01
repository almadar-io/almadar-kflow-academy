/**
 * Unit Tests for Publishing Services
 * 
 * Tests CoursePublishingService, ModulePublishingService, and LessonPublishingService
 */

import { GraphCacheManager } from '../../../../services/knowledgeGraphAccess/core/GraphCacheManager';
import { GraphLoader } from '../../../../services/knowledgeGraphAccess/core/GraphLoader';
import { NodeMutationService } from '../../../../services/knowledgeGraphAccess/mutation/NodeMutationService';
import { RelationshipMutationService } from '../../../../services/knowledgeGraphAccess/mutation/RelationshipMutationService';
import { PublishingQueryService } from '../../../../services/knowledgeGraphAccess/publishing/PublishingQueryService';
import { CoursePublishingService } from '../../../../services/knowledgeGraphAccess/publishing/CoursePublishingService';
import { ModulePublishingService } from '../../../../services/knowledgeGraphAccess/publishing/ModulePublishingService';
import { LessonPublishingService } from '../../../../services/knowledgeGraphAccess/publishing/LessonPublishingService';
import type { NodeBasedKnowledgeGraph } from '../../../../types/nodeBasedKnowledgeGraph';
import { createGraphNode } from '../../../../types/nodeBasedKnowledgeGraph';

// Mock Firebase Admin
jest.mock('../../../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(),
}));

// Mock knowledgeGraphService with inline implementation
jest.mock('../../../../services/knowledgeGraphService');

import {
  getNodeBasedKnowledgeGraph,
  saveNodeBasedKnowledgeGraph,
} from '../../../../services/knowledgeGraphService';

const mockGetGraph = getNodeBasedKnowledgeGraph as jest.MockedFunction<typeof getNodeBasedKnowledgeGraph>;
const mockSaveGraph = saveNodeBasedKnowledgeGraph as jest.MockedFunction<typeof saveNodeBasedKnowledgeGraph>;

describe('Publishing Services', () => {
  let cacheManager: GraphCacheManager;
  let loader: GraphLoader;
  let nodeMutation: NodeMutationService;
  let relMutation: RelationshipMutationService;
  let publishingQuery: PublishingQueryService;
  let coursePublishing: CoursePublishingService;
  let modulePublishing: ModulePublishingService;
  let lessonPublishing: LessonPublishingService;

  const mockUid = 'test-user-123';
  const mockGraphId = 'test-graph-123';

  // Helper to create a test graph
  const createTestGraph = (): NodeBasedKnowledgeGraph => {
    const now = Date.now();
    
    // Create graph node
    const graphNode = createGraphNode(mockGraphId, 'Graph', {
      id: mockGraphId,
      name: 'Test Course Graph',
    });

    // Create seed concept
    const seedNode = createGraphNode('seed-concept', 'Concept', {
      id: 'seed-concept',
      name: 'React Fundamentals',
      description: 'Learn React basics',
      layer: 0,
      isSeed: true,
    });

    // Create layer 1
    const layer1Node = createGraphNode('layer-1', 'Layer', {
      id: 'layer-1',
      name: 'Components',
      description: 'React components module',
      layerNumber: 1,
      goal: 'Learn about React components',
    });

    // Create layer 2
    const layer2Node = createGraphNode('layer-2', 'Layer', {
      id: 'layer-2',
      name: 'State Management',
      description: 'Managing state in React',
      layerNumber: 2,
      goal: 'Master React state',
    });

    // Create concepts in layer 1
    const concept1Node = createGraphNode('concept-1', 'Concept', {
      id: 'concept-1',
      name: 'Functional Components',
      description: 'Learn functional components',
      layer: 1,
      sequence: 0,
    });

    const concept2Node = createGraphNode('concept-2', 'Concept', {
      id: 'concept-2',
      name: 'Class Components',
      description: 'Learn class components',
      layer: 1,
      sequence: 1,
    });

    // Create concepts in layer 2
    const concept3Node = createGraphNode('concept-3', 'Concept', {
      id: 'concept-3',
      name: 'useState Hook',
      description: 'Learn useState',
      layer: 2,
      sequence: 0,
    });

    // Create lesson for concept-1
    const lessonNode = createGraphNode('lesson-concept-1', 'Lesson', {
      id: 'lesson-concept-1',
      content: '# Functional Components\n\nFunctional components are...',
    });

    return {
      id: mockGraphId,
      seedConceptId: 'seed-concept',
      createdAt: now,
      updatedAt: now,
      version: 1,
      nodes: {
        [mockGraphId]: graphNode,
        'seed-concept': seedNode,
        'layer-1': layer1Node,
        'layer-2': layer2Node,
        'concept-1': concept1Node,
        'concept-2': concept2Node,
        'concept-3': concept3Node,
        'lesson-concept-1': lessonNode,
      },
      nodeTypes: {
        Graph: [mockGraphId],
        Concept: ['seed-concept', 'concept-1', 'concept-2', 'concept-3'],
        Layer: ['layer-1', 'layer-2'],
        LearningGoal: [],
        Milestone: [],
        PracticeExercise: [],
        Lesson: ['lesson-concept-1'],
        ConceptMetadata: [],
        GraphMetadata: [],
        FlashCard: [],
        CourseSettings: [],
        ModuleSettings: [],
        LessonSettings: [],
      },
      relationships: [
        { id: 'rel-1', source: 'concept-1', target: 'lesson-concept-1', type: 'hasLesson', direction: 'forward', createdAt: now },
      ],
    };
  };

  let testGraph: NodeBasedKnowledgeGraph;

  beforeEach(() => {
    jest.clearAllMocks();

    testGraph = createTestGraph();

    // Mock getNodeBasedKnowledgeGraphById - returns the test graph
    mockGetGraph.mockImplementation(async () => {
      return { ...testGraph };
    });

    // Mock saveNodeBasedKnowledgeGraph - updates the test graph
    mockSaveGraph.mockImplementation(async (_uid: string, graph: NodeBasedKnowledgeGraph) => {
      testGraph = { ...graph };
      return { ...testGraph };
    });

    // Initialize services
    cacheManager = new GraphCacheManager();
    loader = new GraphLoader(cacheManager);
    nodeMutation = new NodeMutationService(loader);
    relMutation = new RelationshipMutationService(loader);
    publishingQuery = new PublishingQueryService(loader);
    coursePublishing = new CoursePublishingService(loader, nodeMutation, relMutation, publishingQuery);
    modulePublishing = new ModulePublishingService(loader, nodeMutation, relMutation, publishingQuery, coursePublishing);
    lessonPublishing = new LessonPublishingService(loader, nodeMutation, relMutation, publishingQuery, coursePublishing);
  });

  afterEach(() => {
    cacheManager.clearAllCache();
  });

  // ==================== CoursePublishingService Tests ====================

  describe('CoursePublishingService', () => {
    describe('publishCourse', () => {
      it('should create CourseSettings node when publishing a course', async () => {
        const result = await coursePublishing.publishCourse(mockUid, mockGraphId, {
          title: 'React Fundamentals Course',
          description: 'Learn React from scratch',
          visibility: 'public',
        });

        expect(result.courseSettingsId).toBe(`course-settings-${mockGraphId}`);
        
        // Verify the node was created in the graph
        const savedGraph = testGraph;
        const settingsNode = savedGraph.nodes[result.courseSettingsId];
        expect(settingsNode).toBeDefined();
        expect(settingsNode.type).toBe('CourseSettings');
        expect(settingsNode.properties?.isPublished).toBe(true);
        expect(settingsNode.properties?.visibility).toBe('public');
      });

      it('should use seed concept name as default title', async () => {
        const result = await coursePublishing.publishCourse(mockUid, mockGraphId, {});

        const savedGraph = testGraph;
        const settingsNode = savedGraph.nodes[result.courseSettingsId];
        expect(settingsNode.properties?.title).toBe('React Fundamentals');
      });

      it('should update existing course settings instead of creating duplicate', async () => {
        // First publish
        await coursePublishing.publishCourse(mockUid, mockGraphId, {
          title: 'Original Title',
        });

        // Clear cache to force reload
        cacheManager.clearAllCache();

        // Publish again with different settings
        const result = await coursePublishing.publishCourse(mockUid, mockGraphId, {
          title: 'Updated Title',
        });

        expect(result.courseSettingsId).toBe(`course-settings-${mockGraphId}`);
      });
    });

    describe('unpublishCourse', () => {
      it('should mark course as unpublished', async () => {
        // First publish
        await coursePublishing.publishCourse(mockUid, mockGraphId, {});
        cacheManager.clearAllCache();

        // Then unpublish
        await coursePublishing.unpublishCourse(mockUid, mockGraphId);

        const savedGraph = testGraph;
        const settingsNode = savedGraph.nodes[`course-settings-${mockGraphId}`];
        expect(settingsNode.properties?.isPublished).toBe(false);
      });

      it('should throw error when course is not published', async () => {
        await expect(
          coursePublishing.unpublishCourse(mockUid, mockGraphId)
        ).rejects.toThrow('Course is not published');
      });
    });

    describe('getCourseSettings', () => {
      it('should return course settings if published', async () => {
        await coursePublishing.publishCourse(mockUid, mockGraphId, {
          title: 'Test Course',
          visibility: 'public',
        });
        cacheManager.clearAllCache();

        const settings = await coursePublishing.getCourseSettings(mockUid, mockGraphId);

        expect(settings).not.toBeNull();
        expect(settings?.title).toBe('Test Course');
        expect(settings?.visibility).toBe('public');
      });

      it('should return null if not published', async () => {
        const settings = await coursePublishing.getCourseSettings(mockUid, mockGraphId);
        expect(settings).toBeNull();
      });
    });

    describe('getPublishedCourseView', () => {
      it('should return complete course view for students', async () => {
        await coursePublishing.publishCourse(mockUid, mockGraphId, {
          title: 'React Course',
          description: 'Learn React',
          visibility: 'public',
        });
        cacheManager.clearAllCache();

        const courseView = await coursePublishing.getPublishedCourseView(mockUid, mockGraphId);

        expect(courseView).not.toBeNull();
        expect(courseView?.title).toBe('React Course');
        expect(courseView?.totalModules).toBe(2); // layer-1 and layer-2
        expect(courseView?.seed.modules.length).toBe(2);
      });
    });

    describe('isCoursePublished', () => {
      it('should return true if course is published', async () => {
        await coursePublishing.publishCourse(mockUid, mockGraphId, {});
        cacheManager.clearAllCache();

        const isPublished = await coursePublishing.isCoursePublished(mockUid, mockGraphId);
        expect(isPublished).toBe(true);
      });

      it('should return false if course is not published', async () => {
        const isPublished = await coursePublishing.isCoursePublished(mockUid, mockGraphId);
        expect(isPublished).toBe(false);
      });
    });
  });

  // ==================== ModulePublishingService Tests ====================

  describe('ModulePublishingService', () => {
    describe('publishModule', () => {
      it('should create ModuleSettings node when publishing a module', async () => {
        const result = await modulePublishing.publishModule(mockUid, mockGraphId, 'layer-1', {
          title: 'Components Module',
        });

        expect(result.moduleSettingsId).toBe('module-settings-layer-1');
        
        const savedGraph = testGraph;
        const settingsNode = savedGraph.nodes[result.moduleSettingsId];
        expect(settingsNode).toBeDefined();
        expect(settingsNode.type).toBe('ModuleSettings');
        expect(settingsNode.properties?.isPublished).toBe(true);
      });

      it('should throw error for non-existent layer', async () => {
        await expect(
          modulePublishing.publishModule(mockUid, mockGraphId, 'non-existent-layer')
        ).rejects.toThrow('Layer non-existent-layer not found');
      });

      it('should use layer number as sequence by default', async () => {
        const result = await modulePublishing.publishModule(mockUid, mockGraphId, 'layer-2');

        const savedGraph = testGraph;
        const settingsNode = savedGraph.nodes[result.moduleSettingsId];
        expect(settingsNode.properties?.sequence).toBe(2); // layer-2's layerNumber
      });
    });

    describe('unpublishModule', () => {
      it('should mark module as unpublished', async () => {
        await modulePublishing.publishModule(mockUid, mockGraphId, 'layer-1');
        cacheManager.clearAllCache();

        await modulePublishing.unpublishModule(mockUid, mockGraphId, 'layer-1');

        const savedGraph = testGraph;
        const settingsNode = savedGraph.nodes['module-settings-layer-1'];
        expect(settingsNode.properties?.isPublished).toBe(false);
      });
    });

    describe('getPublishedModules', () => {
      it('should return all published modules sorted by sequence', async () => {
        // Publish both modules
        await modulePublishing.publishModule(mockUid, mockGraphId, 'layer-2');
        cacheManager.clearAllCache();
        await modulePublishing.publishModule(mockUid, mockGraphId, 'layer-1');
        cacheManager.clearAllCache();

        const modules = await modulePublishing.getPublishedModules(mockUid, mockGraphId);

        expect(modules.length).toBe(2);
        expect(modules[0].layerId).toBe('layer-1'); // sequence 1
        expect(modules[1].layerId).toBe('layer-2'); // sequence 2
      });
    });

    describe('publishAllModules', () => {
      it('should publish all modules at once', async () => {
        const result = await modulePublishing.publishAllModules(mockUid, mockGraphId);

        expect(result.publishedCount).toBe(2);
        expect(result.moduleSettingsIds).toContain('module-settings-layer-1');
        expect(result.moduleSettingsIds).toContain('module-settings-layer-2');
      });
    });
  });

  // ==================== LessonPublishingService Tests ====================

  describe('LessonPublishingService', () => {
    describe('publishLesson', () => {
      it('should create LessonSettings node when publishing a lesson', async () => {
        const result = await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-1', {
          title: 'Functional Components Lesson',
        });

        expect(result.lessonSettingsId).toBe('lesson-settings-concept-1');
        
        const savedGraph = testGraph;
        const settingsNode = savedGraph.nodes[result.lessonSettingsId];
        expect(settingsNode).toBeDefined();
        expect(settingsNode.type).toBe('LessonSettings');
        expect(settingsNode.properties?.isPublished).toBe(true);
      });

      it('should throw error for non-existent concept', async () => {
        await expect(
          lessonPublishing.publishLesson(mockUid, mockGraphId, 'non-existent-concept')
        ).rejects.toThrow('Concept non-existent-concept not found');
      });

      it('should allow setting assessment requirements', async () => {
        const result = await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-1', {
          hasAssessment: true,
          assessmentRequired: true,
          passingScore: 80,
        });

        const savedGraph = testGraph;
        const settingsNode = savedGraph.nodes[result.lessonSettingsId];
        expect(settingsNode.properties?.hasAssessment).toBe(true);
        expect(settingsNode.properties?.assessmentRequired).toBe(true);
        expect(settingsNode.properties?.passingScore).toBe(80);
      });
    });

    describe('unpublishLesson', () => {
      it('should mark lesson as unpublished', async () => {
        await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-1');
        cacheManager.clearAllCache();

        await lessonPublishing.unpublishLesson(mockUid, mockGraphId, 'concept-1');

        const savedGraph = testGraph;
        const settingsNode = savedGraph.nodes['lesson-settings-concept-1'];
        expect(settingsNode.properties?.isPublished).toBe(false);
      });
    });

    describe('getPublishedLessons', () => {
      it('should return published lessons for a module', async () => {
        // Publish lessons in layer 1
        await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-1');
        cacheManager.clearAllCache();
        await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-2');
        cacheManager.clearAllCache();

        const lessons = await lessonPublishing.getPublishedLessons(mockUid, mockGraphId, 'layer-1');

        expect(lessons.length).toBe(2);
        expect(lessons[0].conceptId).toBe('concept-1'); // sequence 0
        expect(lessons[1].conceptId).toBe('concept-2'); // sequence 1
      });

      it('should include content availability info', async () => {
        await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-1');
        cacheManager.clearAllCache();

        const lessons = await lessonPublishing.getPublishedLessons(mockUid, mockGraphId, 'layer-1');

        const concept1Lesson = lessons.find(l => l.conceptId === 'concept-1');
        expect(concept1Lesson?.hasContent).toBe(true); // has lesson node with content
      });
    });

    describe('publishAllLessonsInModule', () => {
      it('should publish all lessons in a module', async () => {
        const result = await lessonPublishing.publishAllLessonsInModule(
          mockUid,
          mockGraphId,
          'layer-1'
        );

        expect(result.publishedCount).toBe(2); // concept-1 and concept-2
        expect(result.lessonSettingsIds).toContain('lesson-settings-concept-1');
        expect(result.lessonSettingsIds).toContain('lesson-settings-concept-2');
      });
    });

    describe('getAllPublishedLessons', () => {
      it('should return all published lessons across modules', async () => {
        // Publish lessons in different layers
        await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-1');
        cacheManager.clearAllCache();
        await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-3');
        cacheManager.clearAllCache();

        const allLessons = await lessonPublishing.getAllPublishedLessons(mockUid, mockGraphId);

        expect(allLessons.length).toBe(2);
        const conceptIds = allLessons.map(l => l.conceptId);
        expect(conceptIds).toContain('concept-1');
        expect(conceptIds).toContain('concept-3');
      });
    });

    describe('getLessonContentForPublishing', () => {
      it('should return lesson content', async () => {
        const content = await lessonPublishing.getLessonContentForPublishing(
          mockUid,
          mockGraphId,
          'concept-1'
        );

        expect(content).not.toBeNull();
        expect(content?.content).toContain('Functional Components');
      });
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration: Full Publishing Flow', () => {
    it('should handle complete course publishing workflow', async () => {
      // 1. Publish course
      const courseResult = await coursePublishing.publishCourse(mockUid, mockGraphId, {
        title: 'Complete React Course',
        visibility: 'public',
      });
      expect(courseResult.courseSettingsId).toBeDefined();
      cacheManager.clearAllCache();

      // 2. Publish all modules
      const modulesResult = await modulePublishing.publishAllModules(mockUid, mockGraphId);
      expect(modulesResult.publishedCount).toBe(2);
      cacheManager.clearAllCache();

      // 3. Publish all lessons in module 1
      const lessonsResult = await lessonPublishing.publishAllLessonsInModule(
        mockUid,
        mockGraphId,
        'layer-1'
      );
      expect(lessonsResult.publishedCount).toBe(2);
      cacheManager.clearAllCache();

      // 4. Verify published state
      const courseView = await coursePublishing.getPublishedCourseView(mockUid, mockGraphId);
      expect(courseView?.isPublished).toBe(true);
      expect(courseView?.totalModules).toBe(2);

      const publishedModules = await modulePublishing.getPublishedModules(mockUid, mockGraphId);
      expect(publishedModules.length).toBe(2);

      const publishedLessons = await lessonPublishing.getPublishedLessons(
        mockUid,
        mockGraphId,
        'layer-1'
      );
      expect(publishedLessons.length).toBe(2);
    });

    it('should auto-create CourseSettings when publishing a module without course', async () => {
      // Verify no CourseSettings exists initially
      const initialSettings = await coursePublishing.getCourseSettings(mockUid, mockGraphId);
      expect(initialSettings).toBeNull();

      // Publish a module - should auto-create CourseSettings
      await modulePublishing.publishModule(mockUid, mockGraphId, 'layer-1');
      cacheManager.clearAllCache();

      // Verify CourseSettings was auto-created
      const settings = await coursePublishing.getCourseSettings(mockUid, mockGraphId);
      expect(settings).not.toBeNull();
      expect(settings?.isPublished).toBe(true);
      expect(settings?.title).toBe('React Fundamentals'); // Uses seed concept name
      expect(settings?.visibility).toBe('private'); // Default visibility
    });

    it('should auto-create CourseSettings when publishing a lesson without course', async () => {
      // Verify no CourseSettings exists initially
      const initialSettings = await coursePublishing.getCourseSettings(mockUid, mockGraphId);
      expect(initialSettings).toBeNull();

      // Publish a lesson - should auto-create CourseSettings
      await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-1');
      cacheManager.clearAllCache();

      // Verify CourseSettings was auto-created
      const settings = await coursePublishing.getCourseSettings(mockUid, mockGraphId);
      expect(settings).not.toBeNull();
      expect(settings?.isPublished).toBe(true);
      expect(settings?.title).toBe('React Fundamentals'); // Uses seed concept name
      expect(settings?.visibility).toBe('private'); // Default visibility
    });

    it('should not create duplicate CourseSettings when publishing multiple lessons', async () => {
      // Publish first lesson - creates CourseSettings
      await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-1');
      cacheManager.clearAllCache();

      const firstSettings = await coursePublishing.getCourseSettings(mockUid, mockGraphId);
      const firstSettingsId = `course-settings-${mockGraphId}`;
      expect(firstSettings?.id).toBe(firstSettingsId);

      // Publish second lesson - should reuse existing CourseSettings
      await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-2');
      cacheManager.clearAllCache();

      const secondSettings = await coursePublishing.getCourseSettings(mockUid, mockGraphId);
      expect(secondSettings?.id).toBe(firstSettingsId); // Same ID

      // Verify only one CourseSettings node exists
      const savedGraph = testGraph;
      const courseSettingsNodes = Object.values(savedGraph.nodes).filter(
        n => n.type === 'CourseSettings'
      );
      expect(courseSettingsNodes.length).toBe(1);
    });

    it('should ensure course appears in MentorPage after publishing lessons', async () => {
      // Publish lessons without explicitly publishing course
      await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-1');
      cacheManager.clearAllCache();
      await lessonPublishing.publishLesson(mockUid, mockGraphId, 'concept-2');
      cacheManager.clearAllCache();

      // Verify CourseSettings exists and is published
      const settings = await coursePublishing.getCourseSettings(mockUid, mockGraphId);
      expect(settings).not.toBeNull();
      expect(settings?.isPublished).toBe(true);

      // Verify course view can be retrieved (simulating MentorPage query)
      const courseView = await coursePublishing.getPublishedCourseView(mockUid, mockGraphId);
      expect(courseView).not.toBeNull();
      expect(courseView?.isPublished).toBe(true);
      expect(courseView?.graphId).toBe(mockGraphId);
    });
  });
});
