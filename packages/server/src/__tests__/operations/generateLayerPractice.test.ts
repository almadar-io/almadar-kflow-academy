import { generateLayerPractice } from '../../operations/generateLayerPractice';
import { Concept } from '../../types/concept';
import { callLLM } from '../../services/llm';
import { validateConceptArray, validateConcept } from '../../utils/validation';

// Mock LLM service
jest.mock('../../services/llm', () => ({
  callLLM: jest.fn(),
}));

// Mock validation
jest.mock('../../utils/validation', () => ({
  validateConceptArray: jest.fn(),
  validateConcept: jest.fn(),
}));

describe('Generate Layer Practice - Backend', () => {
  const mockConcepts: Concept[] = [
    {
      id: 'concept-1',
      name: 'React Components',
      description: 'Building blocks of React applications',
      parents: [],
      children: [],
      layer: 1,
    },
    {
      id: 'concept-2',
      name: 'State Management',
      description: 'Managing component state',
      parents: [],
      children: [],
      layer: 1,
    },
  ];

  const mockSeedConcept: Concept = {
    id: 'seed-1',
    name: 'React',
    description: 'A JavaScript library for building user interfaces',
    parents: [],
    children: [],
    layer: 0,
  };

  const mockLayerGoal = 'Build a React application';
  const mockLayerNumber = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    (validateConceptArray as unknown as jest.Mock).mockImplementation((concepts) => Array.isArray(concepts) && concepts.length > 0);
    (validateConcept as unknown as jest.Mock).mockImplementation((concept) => concept && concept.name);
  });

  describe('Practice Generation', () => {
    it('should generate practice review for layer', async () => {
      const mockReview = '# Review\n\n## Solution\nComplete solution here.\n\n## Concepts\nHow each concept applies.';
      const mockResponse = {
        content: mockReview,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('project');
      expect(result.items[0].question).toBe(mockReview);
      expect(result.items[0].answer).toBe('');
      expect(callLLM).toHaveBeenCalledTimes(1);
    });

    it('should include concepts in prompt', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('React Components');
      expect(callArgs.userPrompt).toContain('State Management');
      expect(callArgs.userPrompt).toContain(mockLayerGoal);
    });

    it('should include layer number in prompt', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain(`Level ${mockLayerNumber}`);
    });

    it('should throw error when concepts array is empty', async () => {
      // Mock should return true for empty array so it reaches the length check
      (validateConceptArray as unknown as jest.Mock).mockReturnValue(true);
      
      await expect(
        generateLayerPractice([], mockLayerGoal, mockLayerNumber)
      ).rejects.toThrow('At least one concept is required');
    });

    it('should throw error when concepts array is invalid', async () => {
      (validateConceptArray as unknown as jest.Mock).mockReturnValue(false);

      await expect(
        generateLayerPractice(mockConcepts, mockLayerGoal, mockLayerNumber)
      ).rejects.toThrow('Invalid concepts input');
    });

    it('should throw error when LLM returns empty content', async () => {
      (callLLM as jest.Mock).mockResolvedValue({
        content: '',
        model: 'deepseek-chat',
      });

      await expect(
        generateLayerPractice(mockConcepts, mockLayerGoal, mockLayerNumber)
      ).rejects.toThrow('Failed to generate review: empty response');
    });
  });

  describe('Goal Integration', () => {
    it('should anchor practice to layer goal', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain(`**Learning Goal:** ${mockLayerGoal}`);
      expect(callArgs.userPrompt).toContain('addresses the learning goal');
    });

    it('should include goal in solution-focused structure', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('complete solution that addresses the learning goal');
      // The exact text may vary, so check for key concepts
      expect(callArgs.userPrompt).toContain('solution');
      expect(callArgs.userPrompt).toContain('concept');
    });
  });

  describe('Seed Concept Context', () => {
    it('should include seed concept in context when provided', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { seedConcept: mockSeedConcept }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain(`"${mockSeedConcept.name}"`);
      expect(callArgs.userPrompt).toContain('Overall Learning Context');
      expect(callArgs.userPrompt).toContain(mockSeedConcept.description);
    });

    it('should not include seed concept context when not provided', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).not.toContain('Overall Learning Context');
    });

    it('should throw error when seed concept is invalid', async () => {
      (validateConcept as unknown as jest.Mock).mockReturnValue(false);

      await expect(
        generateLayerPractice(
          mockConcepts,
          mockLayerGoal,
          mockLayerNumber,
          { seedConcept: {} as Concept }
        )
      ).rejects.toThrow('Invalid seed concept provided');
    });

    it('should connect review back to seed concept', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { seedConcept: mockSeedConcept }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain(`connect back to the overall learning topic "${mockSeedConcept.name}"`);
    });
  });

  describe('Difficulty Handling', () => {
    it('should include beginner difficulty in prompt', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { difficulty: 'beginner', seedConcept: mockSeedConcept }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('beginner-level');
    });

    it('should include intermediate difficulty in prompt', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { difficulty: 'intermediate', seedConcept: mockSeedConcept }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('intermediate-level');
    });

    it('should include advanced difficulty in prompt', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { difficulty: 'advanced', seedConcept: mockSeedConcept }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('advanced-level');
    });

    it('should match practice difficulty to graph difficulty level', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { 
          difficulty: 'intermediate',
          seedConcept: mockSeedConcept
        }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('intermediate-level');
      expect(callArgs.userPrompt).toContain('appropriate for the learner\'s level');
    });
  });

  describe('Streaming', () => {
    it('should return stream when stream=true', async () => {
      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk1' } }] };
        yield { choices: [{ delta: { content: 'chunk2' } }] };
      })();

      (callLLM as jest.Mock).mockResolvedValue({
        stream: true,
        raw: mockStream,
        model: 'deepseek-chat',
      });

      const result = await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { stream: true }
      );

      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('model');
      expect((result as any).stream).toBe(mockStream);
    });

    it('should not return stream when stream=false', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { stream: false }
      );

      expect(result).not.toHaveProperty('stream');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].question).toBe('# Review');
    });

    it('should stream practice content correctly', async () => {
      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '# Review\n\n' } }] };
        yield { choices: [{ delta: { content: 'Content here.' } }] };
      })();

      (callLLM as jest.Mock).mockResolvedValue({
        stream: true,
        raw: mockStream,
        model: 'deepseek-chat',
      });

      const result = await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { stream: true }
      );

      expect(result).toHaveProperty('stream');
      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
    });
  });

  describe('Data Persistence', () => {
    it('should pass uid to callLLM for cost tracking', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { uid: 'test-uid' }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.uid).toBe('test-uid');
    });

    it('should track costs even when uid is not provided', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      // The LLM service itself handles the absence of UID, but the call should still proceed
      expect(callArgs.uid).toBeUndefined();
    });
  });

  describe('Focus Integration', () => {
    it('should include focus in prompt when provided', async () => {
      const focus = 'Learn React hooks';
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { focus, seedConcept: mockSeedConcept }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain(focus);
    });

    it('should include focus in seed concept context', async () => {
      const focus = 'Building web applications';
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber,
        { 
          seedConcept: mockSeedConcept,
          focus 
        }
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain(`The learning focus for this path is: "${focus}"`);
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM errors gracefully', async () => {
      (callLLM as jest.Mock).mockRejectedValue(new Error('LLM service error'));

      await expect(
        generateLayerPractice(mockConcepts, mockLayerGoal, mockLayerNumber)
      ).rejects.toThrow('LLM service error');
    });

    it('should validate concepts before processing', async () => {
      (validateConceptArray as unknown as jest.Mock).mockReturnValue(false);

      await expect(
        generateLayerPractice(mockConcepts, mockLayerGoal, mockLayerNumber)
      ).rejects.toThrow('Invalid concepts input');
    });
  });

  describe('Review Structure', () => {
    it('should generate solution-focused review structure', async () => {
      const mockResponse = {
        content: '# Solution\n\nComplete solution.\n\n## Concept 1\nHow it applies.',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      expect(result.items[0].question).toContain('Solution');
      expect(result.items[0].question).toContain('Concept 1');
    });

    it('should use markdown format for review', async () => {
      const mockResponse = {
        content: '# Review\n\n**Bold** and *italic* text.',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      expect(result.items[0].question).toContain('# Review');
      expect(result.items[0].question).toContain('**Bold**');
    });

    it('should include system prompt for solution-focused structure', async () => {
      const mockResponse = {
        content: '# Review',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await generateLayerPractice(
        mockConcepts,
        mockLayerGoal,
        mockLayerNumber
      );

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain('solution-focused review');
      expect(callArgs.systemPrompt).toContain('complete solution');
      expect(callArgs.systemPrompt).toContain('explains how each concept learned relates');
    });
  });
});

