/**
 * Tests for Publishing/Course Node Types
 */

import {
  createCourseSettingsNode,
  createModuleSettingsNode,
  createLessonSettingsNode,
  createAssessmentNode,
  createAssessmentQuestionNode,
  createTranslationNode,
  createLanguageConfigNode,
  createPublishingRelationship,
  createEmptyNodeTypeIndex,
  generateNodeId,
  type CourseSettingsNodeProperties,
  type ModuleSettingsNodeProperties,
  type LessonSettingsNodeProperties,
  type AssessmentNodeProperties,
  type AssessmentQuestionNodeProperties,
  type TranslationNodeProperties,
  type LanguageConfigNodeProperties,
} from '../../types/nodeBasedKnowledgeGraph';

describe('Publishing Node Types', () => {
  describe('createCourseSettingsNode', () => {
    it('should create a course settings node with defaults', () => {
      const node = createCourseSettingsNode('graph-123', {
        title: 'Web Development Course',
        description: 'Learn web development',
      });

      expect(node.type).toBe('CourseSettings');
      expect(node.id).toBe('course-settings-graph-123');
      
      const props = node.properties as CourseSettingsNodeProperties;
      expect(props.title).toBe('Web Development Course');
      expect(props.description).toBe('Learn web development');
      expect(props.visibility).toBe('private');
      expect(props.isPublished).toBe(false);
      expect(props.enrollmentEnabled).toBe(false);
      expect(props.supportedLanguages).toEqual(['en']);
      expect(props.defaultLanguage).toBe('en');
    });

    it('should create a published course settings node', () => {
      const node = createCourseSettingsNode('graph-123', {
        title: 'Python Course',
        description: 'Learn Python programming',
        visibility: 'public',
        isPublished: true,
        enrollmentEnabled: true,
        maxStudents: 100,
        price: 49.99,
        currency: 'USD',
        tags: ['python', 'programming'],
        supportedLanguages: ['en', 'es', 'ar'],
      });

      const props = node.properties as CourseSettingsNodeProperties;
      expect(props.visibility).toBe('public');
      expect(props.isPublished).toBe(true);
      expect(props.enrollmentEnabled).toBe(true);
      expect(props.maxStudents).toBe(100);
      expect(props.price).toBe(49.99);
      expect(props.currency).toBe('USD');
      expect(props.tags).toEqual(['python', 'programming']);
      expect(props.supportedLanguages).toEqual(['en', 'es', 'ar']);
    });
  });

  describe('createModuleSettingsNode', () => {
    it('should create a module settings node', () => {
      const node = createModuleSettingsNode('layer-1', {
        title: 'Getting Started',
        description: 'Introduction to the course',
        sequence: 0,
      });

      expect(node.type).toBe('ModuleSettings');
      expect(node.id).toBe('module-settings-layer-1');
      
      const props = node.properties as ModuleSettingsNodeProperties;
      expect(props.layerId).toBe('layer-1');
      expect(props.title).toBe('Getting Started');
      expect(props.sequence).toBe(0);
      expect(props.isPublished).toBe(false);
    });
  });

  describe('createLessonSettingsNode', () => {
    it('should create a lesson settings node', () => {
      const node = createLessonSettingsNode('concept-123', {
        title: 'Introduction to Variables',
        sequence: 0,
        hasAssessment: true,
        assessmentRequired: true,
        passingScore: 70,
      });

      expect(node.type).toBe('LessonSettings');
      expect(node.id).toBe('lesson-settings-concept-123');
      
      const props = node.properties as LessonSettingsNodeProperties;
      expect(props.conceptId).toBe('concept-123');
      expect(props.hasAssessment).toBe(true);
      expect(props.assessmentRequired).toBe(true);
      expect(props.passingScore).toBe(70);
    });
  });

  describe('createAssessmentNode', () => {
    it('should create an assessment node with defaults', () => {
      const node = createAssessmentNode('concept-123', {
        title: 'Variables Quiz',
        description: 'Test your knowledge of variables',
      });

      expect(node.type).toBe('Assessment');
      
      const props = node.properties as AssessmentNodeProperties;
      expect(props.title).toBe('Variables Quiz');
      expect(props.type).toBe('quiz');
      expect(props.passingScore).toBe(70);
      expect(props.shuffleQuestions).toBe(true);
      expect(props.shuffleAnswers).toBe(true);
    });

    it('should create an exam with custom settings', () => {
      const node = createAssessmentNode('concept-123', {
        title: 'Final Exam',
        type: 'exam',
        timeLimit: 60,
        passingScore: 80,
        maxAttempts: 2,
        shuffleQuestions: false,
      });

      const props = node.properties as AssessmentNodeProperties;
      expect(props.type).toBe('exam');
      expect(props.timeLimit).toBe(60);
      expect(props.passingScore).toBe(80);
      expect(props.maxAttempts).toBe(2);
      expect(props.shuffleQuestions).toBe(false);
    });
  });

  describe('createAssessmentQuestionNode', () => {
    it('should create a multiple choice question', () => {
      const node = createAssessmentQuestionNode('concept-123', {
        question: 'What is a variable?',
        options: ['A container for data', 'A type of loop', 'A function', 'A class'],
        correctAnswer: 'A container for data',
        explanation: 'Variables store data values.',
        points: 5,
      }, 0);

      expect(node.type).toBe('AssessmentQuestion');
      
      const props = node.properties as AssessmentQuestionNodeProperties;
      expect(props.type).toBe('multiple_choice');
      expect(props.question).toBe('What is a variable?');
      expect(props.options).toHaveLength(4);
      expect(props.correctAnswer).toBe('A container for data');
      expect(props.points).toBe(5);
    });

    it('should create a true/false question', () => {
      const node = createAssessmentQuestionNode('concept-123', {
        type: 'true_false',
        question: 'Python is a compiled language.',
        correctAnswer: 'false',
        explanation: 'Python is an interpreted language.',
      }, 1);

      const props = node.properties as AssessmentQuestionNodeProperties;
      expect(props.type).toBe('true_false');
      expect(props.correctAnswer).toBe('false');
      expect(props.sequence).toBe(1);
    });
  });

  describe('createTranslationNode', () => {
    it('should create a translation node', () => {
      const node = createTranslationNode(
        'lesson-123',
        'Lesson',
        'es',
        { content: '# Variables\n\nLas variables almacenan datos.' },
        { aiModel: 'gpt-4' }
      );

      expect(node.type).toBe('Translation');
      expect(node.id).toBe('translation-lesson-123-es');
      
      const props = node.properties as TranslationNodeProperties;
      expect(props.sourceNodeId).toBe('lesson-123');
      expect(props.sourceNodeType).toBe('Lesson');
      expect(props.language).toBe('es');
      expect(props.translatedContent.content).toContain('Variables');
      expect(props.translatedBy).toBe('ai');
      expect(props.aiModel).toBe('gpt-4');
      expect(props.status).toBe('draft');
    });

    it('should create a reviewed translation', () => {
      const now = Date.now();
      const node = createTranslationNode(
        'concept-123',
        'Concept',
        'ar',
        { name: 'المتغيرات', description: 'تخزن المتغيرات البيانات' },
        {
          status: 'approved',
          reviewedBy: 'user-456',
          reviewedAt: now,
          quality: 95,
        }
      );

      const props = node.properties as TranslationNodeProperties;
      expect(props.language).toBe('ar');
      expect(props.status).toBe('approved');
      expect(props.reviewedBy).toBe('user-456');
      expect(props.quality).toBe(95);
    });
  });

  describe('createLanguageConfigNode', () => {
    it('should create a language config with defaults', () => {
      const node = createLanguageConfigNode('graph-123', { language: 'es' });

      expect(node.type).toBe('LanguageConfig');
      expect(node.id).toBe('lang-config-graph-123-es');
      
      const props = node.properties as LanguageConfigNodeProperties;
      expect(props.language).toBe('es');
      expect(props.displayName).toBe('Spanish');
      expect(props.nativeDisplayName).toBe('Español');
      expect(props.direction).toBe('ltr');
      expect(props.isEnabled).toBe(true);
      expect(props.autoTranslate).toBe(false);
    });

    it('should create Arabic config with RTL', () => {
      const node = createLanguageConfigNode('graph-123', {
        language: 'ar',
        autoTranslate: true,
        aiTranslationModel: 'gpt-4',
      });

      const props = node.properties as LanguageConfigNodeProperties;
      expect(props.language).toBe('ar');
      expect(props.displayName).toBe('Arabic');
      expect(props.nativeDisplayName).toBe('العربية');
      expect(props.direction).toBe('rtl');
      expect(props.autoTranslate).toBe(true);
    });

    it('should handle custom language', () => {
      const node = createLanguageConfigNode('graph-123', {
        language: 'custom',
        displayName: 'Custom Lang',
        nativeDisplayName: 'Custom',
        direction: 'ltr',
      });

      const props = node.properties as LanguageConfigNodeProperties;
      expect(props.language).toBe('custom');
      expect(props.displayName).toBe('Custom Lang');
    });
  });

  describe('createPublishingRelationship', () => {
    it('should create a course settings relationship', () => {
      const rel = createPublishingRelationship('graph-123', 'course-settings-123', 'hasCourseSettings');

      expect(rel.source).toBe('graph-123');
      expect(rel.target).toBe('course-settings-123');
      expect(rel.type).toBe('hasCourseSettings');
      expect(rel.direction).toBe('forward');
    });

    it('should create all publishing relationship types', () => {
      const types: Array<'hasCourseSettings' | 'hasModuleSettings' | 'hasLessonSettings' | 'hasAssessment' | 'hasQuestion' | 'hasTranslation' | 'hasLanguageConfig'> = [
        'hasCourseSettings',
        'hasModuleSettings',
        'hasLessonSettings',
        'hasAssessment',
        'hasQuestion',
        'hasTranslation',
        'hasLanguageConfig',
      ];

      for (const type of types) {
        const rel = createPublishingRelationship('source', 'target', type);
        expect(rel.type).toBe(type);
      }
    });
  });

  describe('generateNodeId', () => {
    it('should generate IDs for all new node types', () => {
      expect(generateNodeId('CourseSettings', { graphId: 'g1' })).toBe('course-settings-g1');
      expect(generateNodeId('ModuleSettings', { layerId: 'l1' })).toBe('module-settings-l1');
      expect(generateNodeId('LessonSettings', { conceptId: 'c1' })).toBe('lesson-settings-c1');
      // Note: index 0 is falsy in JS, so 'unknown' is used. Use index 1 for testing.
      expect(generateNodeId('Assessment', { conceptId: 'c1', index: 1 })).toBe('assessment-c1-1');
      expect(generateNodeId('AssessmentQuestion', { conceptId: 'c1', index: 1 })).toBe('question-c1-1');
      expect(generateNodeId('Translation', { sourceNodeId: 's1', language: 'es' })).toBe('translation-s1-es');
      expect(generateNodeId('LanguageConfig', { graphId: 'g1', language: 'ar' })).toBe('lang-config-g1-ar');
    });
  });

  describe('createEmptyNodeTypeIndex', () => {
    it('should create index with all node types', () => {
      const index = createEmptyNodeTypeIndex();

      // Original types
      expect(index.Graph).toEqual([]);
      expect(index.Concept).toEqual([]);
      expect(index.Layer).toEqual([]);
      expect(index.FlashCard).toEqual([]);

      // New publishing types
      expect(index.CourseSettings).toEqual([]);
      expect(index.ModuleSettings).toEqual([]);
      expect(index.LessonSettings).toEqual([]);
      expect(index.Assessment).toEqual([]);
      expect(index.AssessmentQuestion).toEqual([]);
      expect(index.Translation).toEqual([]);
      expect(index.LanguageConfig).toEqual([]);
    });
  });
});
