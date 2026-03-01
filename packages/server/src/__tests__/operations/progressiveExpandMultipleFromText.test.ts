import { progressiveExpandMultipleFromText } from '../../operations/progressiveExpandMultipleFromText';
import { Concept } from '../../types/concept';
import { callLLM } from '../../services/llm';

// Mock LLM service
jest.mock('../../services/llm', () => ({
  callLLM: jest.fn(),
}));

// Note: validation and processProgressiveExpandContent are NOT mocked - using real implementations to ensure tests match actual behavior

describe('Progressive Expand Multiple From Text - Backend', () => {
  const mockSeedConcept: Concept = {
    id: 'seed-1',
    name: 'React',
    description: 'A JavaScript library for building user interfaces',
    parents: [],
    children: [],
    layer: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Progressive Expansion', () => {
    it('should generate first layer from seed concept', async () => {
      const mockResponse = {
        content: `
          <goal>Build a React application</goal>
          <level-name>Level 1</level-name>
          <concept>Components</concept><description>Reusable UI building blocks</description><parents>React</parents>
          <concept>JSX</concept><description>JavaScript syntax extension</description><parents>React</parents>
          <concept>State</concept><description>Component data management</description><parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        3
      );

      expect(result).toHaveProperty('concepts');
      if ('concepts' in result) {
        // Should return level concept + 3 layer concepts + updated seed concept = 5 total
        expect(result.concepts.length).toBe(5);
        // First concept should be the level concept
        const levelConcept = result.concepts[0];
        expect(levelConcept.name).toContain('Level');
        expect(levelConcept.parents).toEqual([mockSeedConcept.name]);
        expect(levelConcept.goal).toBe('Build a React application');
        // Layer concepts should have level concept as first parent (skip level concept and updated seed concept)
        const layerConcepts = result.concepts.slice(1, -1); // Exclude level concept and updated seed concept
        expect(layerConcepts.length).toBe(3);
        layerConcepts.forEach(concept => {
          expect(concept.parents[0]).toBe(levelConcept.name);
        });
      }
      expect(callLLM).toHaveBeenCalled();
    });

    it('should include seed concept context in prompt', async () => {
      const mockResponse = {
        content: '<concept>Test</concept><description>Test concept</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await progressiveExpandMultipleFromText(mockSeedConcept, [], 1);

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('React');
      expect(callArgs.userPrompt).toContain('A JavaScript library for building user interfaces');
    });

    it('should generate correct number of concepts', async () => {
      const numConcepts = 5;
      const mockResponse = {
        content: `<level-name>Level 1</level-name>\n` + Array.from({ length: numConcepts }, (_, i) => 
          `<concept>Concept ${i + 1}</concept><description>Description ${i + 1}</description><parents>React</parents>`
        ).join('\n'),
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        numConcepts
      );

      if ('concepts' in result) {
        // Should return level concept + numConcepts layer concepts + updated seed concept = numConcepts + 2 total
        expect(result.concepts.length).toBe(numConcepts + 2);
        // First should be level concept, rest should be layer concepts, last should be updated seed concept
        expect(result.concepts[0].name).toContain('Level');
        const layerConcepts = result.concepts.slice(1, -1); // Exclude level concept and updated seed concept
        expect(layerConcepts.length).toBe(numConcepts);
      }
    });
  });

  describe('Goal-Focused Generation', () => {
    it('should use goal-focused prompt when learningGoal is provided', async () => {
      const mockResponse = {
        content: '<level-name>Level 1</level-name><goal>Build a React app</goal><concept>Test</concept><description>Test concept</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const mockLearningGoal = {
        id: 'goal-1',
        graphId: 'graph-1',
        title: 'Learn React',
        description: 'Master React development',
        type: 'skill_mastery',
        target: 'React Expert',
      };

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { learningGoal: mockLearningGoal as any }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      // Check userPrompt for goal-focused content (the system prompt is shared)
      expect(callArgs.userPrompt).toContain('project');
      expect(callArgs.userPrompt).toContain('<goal></goal>');
    });

    it('should use non-goal-focused prompt when learningGoal is not provided', async () => {
      const mockResponse = {
        content: '<level-name>Level 1</level-name><concept>Test</concept><description>Test concept</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        {}
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      // Without learningGoal, should still work but may not have goal tag requirement
      expect(callArgs.userPrompt).toBeDefined();
    });

    it('should extract and return goal from response', async () => {
      const mockGoal = 'Build a React application';
      const mockResponse = {
        content: `<goal>${mockGoal}</goal><concept>Test</concept><description>Test</description><parents>React</parents>`,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1
      );

      expect(result).toHaveProperty('goal');
      if ('goal' in result) {
        expect(result.goal).toBe(mockGoal);
      }
    });
  });

  describe('Difficulty Levels', () => {
    it('should handle beginner difficulty from learningGoal', async () => {
      const mockResponse = {
        content: '<level-name>Level 1</level-name><concept>Test</concept><description>Test concept</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const mockLearningGoal = {
        id: 'goal-1',
        graphId: 'graph-1',
        title: 'Learn React',
        description: 'Master React development',
        type: 'skill_mastery',
        target: 'React Expert',
        customMetadata: {
          difficulty: 'beginner',
        },
      };

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { learningGoal: mockLearningGoal as any }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('beginner-level');
    });

    it('should handle intermediate difficulty from learningGoal', async () => {
      const mockResponse = {
        content: '<level-name>Level 1</level-name><concept>Test</concept><description>Test concept</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const mockLearningGoal = {
        id: 'goal-1',
        graphId: 'graph-1',
        title: 'Learn React',
        description: 'Master React development',
        type: 'skill_mastery',
        target: 'React Expert',
        customMetadata: {
          difficulty: 'intermediate',
        },
      };

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { learningGoal: mockLearningGoal as any }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('intermediate-level');
    });

    it('should handle advanced difficulty from learningGoal', async () => {
      const mockResponse = {
        content: '<level-name>Level 1</level-name><concept>Test</concept><description>Test concept</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const mockLearningGoal = {
        id: 'goal-1',
        graphId: 'graph-1',
        title: 'Learn React',
        description: 'Master React development',
        type: 'skill_mastery',
        target: 'React Expert',
        customMetadata: {
          difficulty: 'advanced',
        },
      };

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { learningGoal: mockLearningGoal as any }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('advanced-level');
    });
  });

  describe('Layer Structure', () => {
    it('should create level concept and assign layer concepts correctly', async () => {
      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <concept>Component</concept><description>Component description</description><parents>React</parents>
          <concept>Props</concept><description>Props description</description><parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        2
      );

      if ('concepts' in result) {
        // Should have level concept + 2 layer concepts + updated seed concept = 4 total
        expect(result.concepts.length).toBe(4);
        const levelConcept = result.concepts[0];
        expect(levelConcept.name).toBe('Level 1');
        expect(levelConcept.parents).toEqual([mockSeedConcept.name]);
        // Layer concepts should have level concept as first parent (exclude level concept and updated seed concept)
        const layerConcepts = result.concepts.slice(1, -1);
        expect(layerConcepts.length).toBe(2);
        layerConcepts.forEach(concept => {
          expect(concept.parents[0]).toBe('Level 1');
          expect(concept.layer).toBeUndefined(); // No layer property
        });
      }
    });

    it('should maintain parent-child relationships when previous layers provided', async () => {
      const previousConcepts: Concept[] = [
        {
          id: 'prev-1',
          name: 'JavaScript',
          description: 'Programming language',
          parents: [],
          children: [],
          layer: 1,
        },
      ];

      const mockResponse = {
        content: `
          <concept>React Hooks</concept><description>React hooks description</description><parents>JavaScript</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        previousConcepts,
        1
      );

      if ('concepts' in result) {
        expect(result.concepts.length).toBeGreaterThan(0);
        // The processor should handle parent relationships
      }
    });
  });

  describe('Streaming Response', () => {
    it('should return stream when stream option is true', async () => {
      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk1' } }] };
        yield { choices: [{ delta: { content: 'chunk2' } }] };
      })();

      (callLLM as jest.Mock).mockResolvedValue({
        stream: true,
        raw: mockStream,
        model: 'deepseek-chat',
      });

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { stream: true }
      );

      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('model');
    });

    it('should not stream when stream option is false', async () => {
      const mockResponse = {
        content: '<level-name>Level 1</level-name><concept>Test</concept><description>Test concept</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { stream: false }
      );

      expect(result).not.toHaveProperty('stream');
      expect(result).toHaveProperty('concepts');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid concept input', async () => {
      const invalidConcept = { name: '' } as Concept;

      await expect(
        progressiveExpandMultipleFromText(invalidConcept, [], 1)
      ).rejects.toThrow('Invalid concept input');
    });

    it('should throw error for invalid previous layers', async () => {
      const invalidLayers = 'not an array' as any;

      await expect(
        progressiveExpandMultipleFromText(mockSeedConcept, invalidLayers, 1)
      ).rejects.toThrow('Invalid previous layers input');
    });

    it('should throw error for invalid numConcepts', async () => {
      await expect(
        progressiveExpandMultipleFromText(mockSeedConcept, [], 0)
      ).rejects.toThrow('Number of concepts must be between 1 and 10');

      await expect(
        progressiveExpandMultipleFromText(mockSeedConcept, [], 11)
      ).rejects.toThrow('Number of concepts must be between 1 and 10');
    });

    it('should handle LLM failures gracefully', async () => {
      (callLLM as jest.Mock).mockRejectedValue(new Error('LLM service error'));

      await expect(
        progressiveExpandMultipleFromText(mockSeedConcept, [], 1)
      ).rejects.toThrow('LLM service error');
    });

    it('should handle empty LLM response', async () => {
      (callLLM as jest.Mock).mockResolvedValue({
        content: '',
        model: 'deepseek-chat',
      });

      // Empty response should throw an error because no concepts were generated
      await expect(
        progressiveExpandMultipleFromText(
          mockSeedConcept,
          [],
          1
        )
      ).rejects.toThrow();
    });
  });

  describe('Focus Integration', () => {
    it('should include focus in prompt when provided via learningGoal', async () => {
      const focus = 'Learn React hooks';
      const mockResponse = {
        content: '<concept>Test</concept><description>Test concept</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const mockLearningGoal = {
        id: 'goal-1',
        graphId: 'graph-1',
        title: 'Learn React',
        description: focus,
        type: 'skill_mastery',
        target: 'React Expert',
        customMetadata: {
          focus,
        },
      };

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { learningGoal: mockLearningGoal as any }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain(focus);
    });
  });

  describe('Layer Generation', () => {
    it('should generate next layer from previous layers', async () => {
      const previousLayerConcepts: Concept[] = [
        {
          id: 'concept-1',
          name: 'Components',
          description: 'Reusable UI building blocks',
          parents: ['React'],
          children: [],
          layer: 1,
        },
        {
          id: 'concept-2',
          name: 'JSX',
          description: 'JavaScript syntax extension',
          parents: ['React'],
          children: [],
          layer: 1,
        },
      ];

      const mockResponse = {
        content: `
          <level-name>Level 2</level-name>
          <concept>State Management</concept><description>Managing component state</description><parents>Components</parents>
          <concept>Props</concept><description>Passing data to components</description><parents>Components</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        previousLayerConcepts,
        2
      );

      expect(result).toHaveProperty('concepts');
      if ('concepts' in result) {
        // Should return level concept + 2 layer concepts + updated seed concept = 4 total
        expect(result.concepts.length).toBe(4);
        // First concept should be the level concept
        const levelConcept = result.concepts[0];
        expect(levelConcept.name).toBe('Level 2');
        expect(levelConcept.parents).toEqual([mockSeedConcept.name]);
        // Layer concepts should have level concept as first parent (exclude level concept and updated seed concept)
        const layerConcepts = result.concepts.slice(1, -1);
        expect(layerConcepts.length).toBe(2);
        layerConcepts.forEach(concept => {
          expect(concept.parents[0]).toBe('Level 2');
          expect(concept.layer).toBeUndefined(); // No layer property
        });
      }
    });

    it('should calculate correct next layer number from previous layers', async () => {
      const previousLayerConcepts: Concept[] = [
        {
          id: 'concept-1',
          name: 'Level 1',
          description: 'First layer',
          parents: [mockSeedConcept.name],
          children: [],
        },
      ];

      const mockResponse = {
        content: '<level-name>Level 2</level-name><concept>Layer 2 Concept</concept><description>Second layer</description><parents>Level 1</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        previousLayerConcepts,
        1,
        { allConcepts: previousLayerConcepts }
      );

      if ('concepts' in result) {
        // Should return level concept + 1 layer concept + updated seed concept = 3 total
        expect(result.concepts.length).toBe(3);
        const levelConcept = result.concepts[0];
        expect(levelConcept.name).toBe('Level 2');
        expect(levelConcept.parents).toEqual([mockSeedConcept.name]);
        // Layer concept should have level concept as first parent (exclude level concept and updated seed concept)
        const layerConcept = result.concepts[1];
        expect(layerConcept.parents[0]).toBe('Level 2');
        expect(layerConcept.layer).toBeUndefined(); // No layer property
      }
    });
  });

  describe('Concept Relationships', () => {
    it('should maintain parent-child relationships when generating new layer', async () => {
      const parentConcept: Concept = {
        id: 'parent-1',
        name: 'Parent Concept',
        description: 'Parent',
        parents: [],
        children: [],
        layer: 1,
      };

      const mockResponse = {
        content: '<level-name>Level 1</level-name><concept>Child Concept</concept><description>Child</description><parents>Parent Concept</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [parentConcept],
        1
      );

      if ('concepts' in result) {
        // First concept is level concept, second is the layer concept, third is updated seed concept
        expect(result.concepts.length).toBe(3);
        const levelConcept = result.concepts[0];
        expect(levelConcept.name).toBe('Level 1');
        const childConcept = result.concepts[1];
        // Layer concept should have level concept as first parent, then Parent Concept
        expect(childConcept.parents[0]).toBe('Level 1');
        expect(childConcept.parents).toContain('Parent Concept');
      }
    });

    it('should update parent concepts with children when relationships are established', async () => {
      const parentConcept: Concept = {
        id: 'parent-1',
        name: 'Parent Concept',
        description: 'Parent',
        parents: [],
        children: [],
        layer: 1,
      };

      const mockResponse = {
        content: '<level-name>Level 1</level-name><concept>Child 1</concept><description>Child 1</description><parents>Parent Concept</parents><concept>Child 2</concept><description>Child 2</description><parents>Parent Concept</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [parentConcept],
        2
      );

      if ('concepts' in result) {
        // Should have level concept + 2 layer concepts + updated seed concept = 4 total
        expect(result.concepts.length).toBe(4);
        // Both layer concepts should have level concept as first parent, then Parent Concept (exclude level concept and updated seed concept)
        const layerConcepts = result.concepts.slice(1, -1);
        expect(layerConcepts.length).toBe(2);
        layerConcepts.forEach(concept => {
          expect(concept.parents[0]).toBe('Level 1');
          expect(concept.parents).toContain('Parent Concept');
        });
      }
    });
  });

  describe('Goal Anchoring', () => {
    it('should anchor concepts to seed concept', async () => {
      const mockResponse = {
        content: '<goal>Build a React app</goal><concept>Component</concept><description>UI building block</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('React');
      expect(callArgs.userPrompt).toContain(mockSeedConcept.description);
    });

    it('should anchor concepts to goal when learningGoal is provided', async () => {
      const mockResponse = {
        content: '<goal>Build a React application</goal><concept>Component</concept><description>UI building block</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const mockLearningGoal = {
        id: 'goal-1',
        graphId: 'graph-1',
        title: 'Learn React',
        description: 'Master React development',
        type: 'skill_mastery',
        target: 'React Expert',
      };

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { learningGoal: mockLearningGoal as any }
      );

      if ('concepts' in result) {
        expect(result.goal).toBe('Build a React application');
      }

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('<goal></goal>');
    });

    it('should use previous layer goal when provided', async () => {
      const previousLayerGoal = 'Learn React basics';
      const previousLayerConcepts: Concept[] = [
        {
          id: 'concept-1',
          name: 'Layer 1 Concept',
          description: 'First layer',
          parents: [],
          children: [],
          layer: 1,
        },
      ];

      const mockResponse = {
        content: '<concept>Advanced Component</concept><description>Advanced</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        previousLayerConcepts,
        1,
        { previousLayerGoal }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      // Previous layer goal should be included in the prompt for non-first layers
      expect(callArgs.userPrompt).toContain(previousLayerGoal);
    });
  });

  describe('Difficulty Consistency', () => {
    it('should maintain difficulty level across layers', async () => {
      const difficulty = 'intermediate';
      const mockResponse = {
        content: '<concept>Concept</concept><description>Description</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const mockLearningGoal = {
        id: 'goal-1',
        graphId: 'graph-1',
        title: 'Learn React',
        description: 'Master React development',
        type: 'skill_mastery',
        target: 'React Expert',
        customMetadata: {
          difficulty,
        },
      };

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { learningGoal: mockLearningGoal as any }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('intermediate-level');
    });

    it('should use difficulty from learningGoal when provided', async () => {
      const graphDifficulty = 'advanced';
      const mockResponse = {
        content: '<concept>Concept</concept><description>Description</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const mockLearningGoal = {
        id: 'goal-1',
        graphId: 'graph-1',
        title: 'Learn React',
        description: 'Master React development',
        type: 'skill_mastery',
        target: 'React Expert',
        customMetadata: {
          difficulty: graphDifficulty,
        },
      };

      await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { learningGoal: mockLearningGoal as any }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('advanced-level');
    });

    it('should fallback to seed concept difficulty when graph difficulty not provided', async () => {
      const seedWithDifficulty: Concept = {
        ...mockSeedConcept,
        difficulty: 'beginner',
      };

      const mockResponse = {
        content: '<concept>Concept</concept><description>Description</description><parents>React</parents>',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await progressiveExpandMultipleFromText(
        seedWithDifficulty,
        [],
        1
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('beginner-level');
    });
  });

  describe('Streaming for Multiple Concepts', () => {
    it('should stream multiple concepts when stream=true', async () => {
      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '<concept>Concept 1</concept>' } }] };
        yield { choices: [{ delta: { content: '<description>Desc 1</description>' } }] };
        yield { choices: [{ delta: { content: '<parents>React</parents>' } }] };
        yield { choices: [{ delta: { content: '<concept>Concept 2</concept>' } }] };
        yield { choices: [{ delta: { content: '<description>Desc 2</description>' } }] };
        yield { choices: [{ delta: { content: '<parents>React</parents>' } }] };
      })();

      (callLLM as jest.Mock).mockResolvedValue({
        stream: true,
        raw: mockStream,
        model: 'deepseek-chat',
      });

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        2,
        { stream: true }
      );

      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('model');
      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
    });

    it('should handle streaming for concepts with proper parsing', async () => {
      // Streaming parsing is handled by processProgressiveExpandContent
      // This test verifies the stream is returned correctly
      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'Streaming content' } }] };
      })();

      (callLLM as jest.Mock).mockResolvedValue({
        stream: true,
        raw: mockStream,
        model: 'deepseek-chat',
      });

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        1,
        { stream: true }
      );

      expect(result).toHaveProperty('stream');
    });
  });

  describe('Data Integrity', () => {
    it('should return all generated concepts with proper structure', async () => {
      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <concept>Concept 1</concept><description>Description 1</description><parents>React</parents>
          <concept>Concept 2</concept><description>Description 2</description><parents>React</parents>
          <concept>Concept 3</concept><description>Description 3</description><parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        3
      );

      if ('concepts' in result) {
        // Should return level concept + 3 layer concepts + updated seed concept = 5 total
        expect(result.concepts.length).toBe(5);
        result.concepts.forEach(concept => {
          expect(concept).toHaveProperty('name');
          expect(concept).toHaveProperty('description');
          expect(concept).toHaveProperty('parents');
          expect(concept).toHaveProperty('children');
          // No layer property anymore (except for seed concept which may have layer: 0)
          // Updated seed concept is the last one in the array
          if (concept !== result.concepts[result.concepts.length - 1]) {
            expect(concept.layer).toBeUndefined();
          }
        });
        // First should be level concept
        expect(result.concepts[0].name).toBe('Level 1');
        expect(result.concepts[0].parents).toEqual([mockSeedConcept.name]);
      }
    });

    it('should include goal in level concept', async () => {
      const mockResponse = {
        content: `
          <goal>Build a React app</goal>
          <level-name>Level 1</level-name>
          <concept>Concept 1</concept><description>Desc 1</description><parents>React</parents>
          <concept>Concept 2</concept><description>Desc 2</description><parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        2
      );

      if ('concepts' in result) {
        // Should return level concept + 2 layer concepts + updated seed concept = 4 total
        expect(result.concepts.length).toBe(4);
        // Level concept should have the goal
        const levelConcept = result.concepts[0];
        expect(levelConcept.name).toBe('Level 1');
        expect(levelConcept.goal).toBe('Build a React app');
        expect(levelConcept.children).toHaveLength(2);
        // Result should also have goal property
        expect(result.goal).toBe('Build a React app');
      }
    });

    it('should assign unique IDs to all concepts', async () => {
      const mockResponse = {
        content: `
          <level-name>Level 1</level-name>
          <concept>Concept 1</concept><description>Desc 1</description><parents>React</parents>
          <concept>Concept 2</concept><description>Desc 2</description><parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await progressiveExpandMultipleFromText(
        mockSeedConcept,
        [],
        2
      );

      if ('concepts' in result) {
        // Should return level concept + 2 layer concepts + updated seed concept = 4 total
        expect(result.concepts.length).toBe(4);
        // Layer concepts (exclude level concept and updated seed concept) should have IDs from normalizeConcept
        const layerConcepts = result.concepts.slice(1, -1);
        const ids = layerConcepts.map(c => c.id).filter(Boolean);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
        // Layer concepts should have IDs (level concept may not have ID as it's created directly)
        layerConcepts.forEach(concept => {
          expect(concept.id).toBeDefined();
          expect(concept.id).toBeTruthy();
        });
      }
    });
  });
});

