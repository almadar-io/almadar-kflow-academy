import { explain } from '../../operations/explain';
import { Concept, ConceptGraph } from '../../types/concept';
import { callLLM } from '../../services/llm';
import { processPrerequisitesFromLesson } from '../../utils/prerequisites';

// Mock LLM service
jest.mock('../../services/llm', () => ({
  callLLM: jest.fn(),
}));

// Mock validation
jest.mock('../../utils/validation', () => ({
  validateConcept: jest.fn((concept) => concept && concept.name),
}));

// Mock prerequisites processing
jest.mock('../../utils/prerequisites', () => ({
  processPrerequisitesFromLesson: jest.fn((lesson, concept, graph) => {
    // Simple mock that extracts prerequisites from <prq> tags
    const prqMatch = lesson.match(/<prq>([\s\S]*?)<\/prq>/i);
    if (prqMatch) {
      const prqText = prqMatch[1].trim();
      return prqText.split(',').map((p: string) => p.trim()).filter(Boolean);
    }
    return [];
  }),
}));

describe('Explain Operation - Backend', () => {
  const mockConcept: Concept = {
    id: 'concept-1',
    name: 'React Components',
    description: 'Reusable UI building blocks',
    parents: ['React'],
    children: ['Functional Components', 'Class Components'],
    layer: 1,
  };

  const mockSeedConcept: Concept = {
    id: 'seed-1',
    name: 'React',
    description: 'A JavaScript library for building user interfaces',
    parents: [],
    children: [],
    layer: 0,
  };

  const mockGraph: ConceptGraph = {
    concepts: new Map([
      ['React', mockSeedConcept],
      ['React Components', mockConcept],
    ]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Simple Lesson', () => {
    it('should generate concise lesson when simple=true', async () => {
      const mockLesson = `# React Components

<prq>JavaScript, HTML</prq>

React components are reusable pieces of UI.

## Example

\`\`\`javascript
function Button() {
  return <button>Click me</button>;
}
\`\`\`

## Practice

<question>What is a React component?</question>
<answer>A React component is a reusable piece of UI.</answer>
`;

      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, { simple: true });

      expect(result).toHaveLength(1);
      expect(result[0].lesson).toBe(mockLesson.trim());
      expect(callLLM).toHaveBeenCalled();
      
      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('concise lesson');
      expect(callArgs.userPrompt).toContain('Keep it short and focused');
    });

    it('should include prerequisites in simple lesson', async () => {
      const mockLesson = '<prq>JavaScript, HTML</prq>\n\n# Lesson Title\n\nContent.';
      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, { simple: true, graph: mockGraph });

      expect(result[0].prerequisites).toEqual(['JavaScript', 'HTML']);
      expect(processPrerequisitesFromLesson).toHaveBeenCalled();
    });
  });

  describe('Detailed Lesson', () => {
    it('should generate comprehensive lesson when simple=false', async () => {
      const mockLesson = `# React Components: A Comprehensive Guide

<prq>JavaScript, HTML, CSS</prq>

## Introduction

React components are the building blocks of React applications.

## Core Concepts

Components allow you to split the UI into independent, reusable pieces.

## Examples

\`\`\`javascript
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}
\`\`\`

## Practice

<question>How do you create a functional component?</question>
<answer>You create a function that returns JSX.</answer>

## Key Takeaways

- Components are reusable
- Components can accept props
- Components can have state
`;

      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, { simple: false });

      expect(result).toHaveLength(1);
      expect(result[0].lesson).toBe(mockLesson.trim());
      
      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('master-quality lesson');
      expect(callArgs.userPrompt).not.toContain('Keep it short');
    });

    it('should include multiple sections in detailed lesson', async () => {
      const mockLesson = `# Title

## Section 1
Content 1

## Section 2
Content 2

## Section 3
Content 3
`;

      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, { simple: false });

      expect(result[0].lesson).toContain('Section 1');
      expect(result[0].lesson).toContain('Section 2');
      expect(result[0].lesson).toContain('Section 3');
    });
  });

  describe('Context Building', () => {
    it('should include concept context in prompt', async () => {
      const mockResponse = {
        content: '# Lesson',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await explain(mockConcept, mockSeedConcept, {});

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('React Components');
      expect(callArgs.userPrompt).toContain('Reusable UI building blocks');
      expect(callArgs.userPrompt).toContain('Known Parents: React');
      expect(callArgs.userPrompt).toContain('Known Children: Functional Components, Class Components');
      expect(callArgs.userPrompt).toContain('Layer: 1');
    });

    it('should include seed concept context when provided', async () => {
      const mockResponse = {
        content: '# Lesson',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await explain(mockConcept, mockSeedConcept, {});

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('React');
      expect(callArgs.userPrompt).toContain('broader topic');
    });

    it('should include difficulty level in context when provided via learningGoal', async () => {
      const mockResponse = {
        content: '# Lesson',
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

      await explain(mockConcept, mockSeedConcept, { learningGoal: mockLearningGoal as any });

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('intermediate-level');
      expect(callArgs.userPrompt).toContain('Learner Level: intermediate-level');
    });

    it('should include focus in context when provided via learningGoal', async () => {
      const mockResponse = {
        content: '# Lesson',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const mockLearningGoal = {
        id: 'goal-1',
        graphId: 'graph-1',
        title: 'Learn React',
        description: 'Building web applications',
        type: 'skill_mastery',
        target: 'React Expert',
        customMetadata: {
          focus: 'Building web applications',
        },
      };

      await explain(mockConcept, mockSeedConcept, { learningGoal: mockLearningGoal as any });

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('Building web applications');
      expect(callArgs.userPrompt).toContain('Learning Focus: Building web applications');
    });
  });

  describe('Format Validation', () => {
    it('should include introduction section in simple lesson', async () => {
      const mockLesson = '# Title\n\nBrief introduction paragraph.';
      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, { simple: true });

      expect(result[0].lesson).toContain('Title');
      expect(result[0].lesson).toContain('introduction');
    });

    it('should include examples section', async () => {
      const mockLesson = '# Title\n\n## Example\n\n```javascript\ncode\n```';
      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, { simple: true });

      expect(result[0].lesson).toContain('Example');
      expect(result[0].lesson).toContain('```javascript');
    });

    it('should include practice section', async () => {
      const mockLesson = '# Title\n\n## Practice\n\n<question>Q?</question>\n<answer>A.</answer>';
      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, { simple: true });

      expect(result[0].lesson).toContain('Practice');
      expect(result[0].lesson).toContain('<question>');
      expect(result[0].lesson).toContain('<answer>');
    });
  });

  describe('Quiz Generation', () => {
    it('should format quiz blocks correctly', async () => {
      const mockLesson = '<question>What is React?</question>\n<answer>React is a JavaScript library.</answer>';
      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, {});

      expect(result[0].lesson).toContain('<question>What is React?</question>');
      expect(result[0].lesson).toContain('<answer>React is a JavaScript library.</answer>');
    });

    it('should handle multiple quiz blocks', async () => {
      const mockLesson = `
<question>Question 1?</question>
<answer>Answer 1.</answer>

<question>Question 2?</question>
<answer>Answer 2.</answer>
`;

      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, {});

      expect(result[0].lesson).toContain('Question 1');
      expect(result[0].lesson).toContain('Question 2');
      expect(result[0].lesson).toContain('Answer 1');
      expect(result[0].lesson).toContain('Answer 2');
    });
  });

  describe('Code Block Formatting', () => {
    it('should include code blocks with language identifiers', async () => {
      const mockLesson = '```javascript\nconst x = 1;\n```';
      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, {});

      expect(result[0].lesson).toContain('```javascript');
      expect(result[0].lesson).toContain('const x = 1;');
    });

    it('should handle multiple code blocks', async () => {
      const mockLesson = `
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`python
x = 1
\`\`\`
`;

      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, {});

      expect(result[0].lesson).toContain('```javascript');
      expect(result[0].lesson).toContain('```python');
    });

    it('should handle code blocks without language identifiers', async () => {
      const mockLesson = '```\ncode without language\n```';
      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, {});

      expect(result[0].lesson).toContain('```');
      expect(result[0].lesson).toContain('code without language');
    });
  });

  describe('Streaming', () => {
    it('should return stream when stream=true', async () => {
      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'Chunk 1' } }] };
        yield { choices: [{ delta: { content: 'Chunk 2' } }] };
      })();

      (callLLM as jest.Mock).mockResolvedValue({
        stream: true,
        raw: mockStream,
        model: 'deepseek-chat',
      });

      const result = await explain(mockConcept, mockSeedConcept, { stream: true });

      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('model');
      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
    });

    it('should not return stream when stream=false', async () => {
      const mockResponse = {
        content: '# Lesson',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, { stream: false });

      expect(result).not.toHaveProperty('stream');
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('lesson');
    });
  });

  describe('Cost Tracking', () => {
    it('should pass uid to callLLM for cost tracking', async () => {
      const mockResponse = {
        content: '# Lesson',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await explain(mockConcept, mockSeedConcept, { uid: 'test-uid' });

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs.uid).toBe('test-uid');
    });

    it('should track costs even when uid is not provided', async () => {
      const mockResponse = {
        content: '# Lesson',
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await explain(mockConcept, mockSeedConcept, {});

      expect(callLLM).toHaveBeenCalled();
      // Cost tracking is handled in llm.ts, so we just verify the call was made
    });
  });

  describe('Error Handling', () => {
    it('should throw error when concept is invalid', async () => {
      const invalidConcept = { name: '' } as Concept;

      await expect(explain(invalidConcept, mockSeedConcept, {})).rejects.toThrow('Invalid concept input');
    });

    it('should throw error when LLM returns empty content', async () => {
      (callLLM as jest.Mock).mockResolvedValue({
        content: '',
        model: 'deepseek-chat',
      });

      await expect(explain(mockConcept, mockSeedConcept, {})).rejects.toThrow('Explain operation returned empty content');
    });

    it('should handle LLM errors gracefully', async () => {
      (callLLM as jest.Mock).mockRejectedValue(new Error('LLM service error'));

      await expect(explain(mockConcept, mockSeedConcept, {})).rejects.toThrow('LLM service error');
    });
  });

  describe('Prerequisites Processing', () => {
    it('should skip prerequisites for auto-generated concepts', async () => {
      const autoGeneratedConcept = { ...mockConcept, isAutoGenerated: true };
      const mockLesson = '# Lesson';
      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      await explain(autoGeneratedConcept, mockSeedConcept, { graph: mockGraph });

      const callArgs = (callLLM as jest.Mock).mock.calls[0][0];
      // For auto-generated concepts, prerequisites section should be skipped
      expect(callArgs.userPrompt).not.toContain('<prq>');
      // The prompt should indicate prerequisites are skipped
      expect(callArgs.userPrompt).toMatch(/skip|do not|omit/i);
    });

    it('should process prerequisites for normal concepts', async () => {
      const mockLesson = '<prq>JavaScript, HTML</prq>\n\n# Lesson';
      const mockResponse = {
        content: mockLesson,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      const result = await explain(mockConcept, mockSeedConcept, { graph: mockGraph });

      expect(processPrerequisitesFromLesson).toHaveBeenCalledWith(
        mockLesson.trim(),
        mockConcept,
        mockGraph
      );
      expect(result[0].prerequisites).toEqual(['JavaScript', 'HTML']);
    });
  });
});

