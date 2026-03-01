/**
 * Tests for Graph Operation Stream Handler
 * 
 * Tests that ensure onComplete is always called and graph is saved,
 * even if client disconnects or errors occur.
 */

import type { Request, Response } from 'express';
import { handleGraphOperationStream } from '../../utils/graphOperationStreamHandler';
import type { MutationBatch } from '../../types/mutations';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';

describe('handleGraphOperationStream', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockWrite: jest.Mock;
  let mockEnd: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockRemoveListener: jest.Mock;
  let mockOn: jest.Mock;
  let eventHandlers: Record<string, (() => void)[]>;

  const uid = 'test-user-1';
  const graphId = 'test-graph-1';

  const sampleGraph: NodeBasedKnowledgeGraph = {
    id: graphId,
    seedConceptId: 'concept-1',
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
      'concept-1': {
        id: 'concept-1',
        type: 'Concept',
        properties: { name: 'React' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
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

  beforeEach(() => {
    eventHandlers = {};
    mockWrite = jest.fn().mockReturnValue(true);
    mockEnd = jest.fn();
    mockSetHeader = jest.fn();
    mockRemoveListener = jest.fn();
    mockOn = jest.fn((event: string, handler: () => void) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    });

    mockRequest = {
      on: mockOn,
      removeListener: mockRemoveListener,
    };

    mockResponse = {
      setHeader: mockSetHeader,
      write: mockWrite,
      end: mockEnd,
      headersSent: false,
      writableEnded: false,
    };
  });

  // Helper to create a mock stream
  function createMockStream(content: string): AsyncIterable<any> {
    const chunks = content.split(' ').map(word => ({
      choices: [{ delta: { content: word + ' ' } }],
    }));

    return (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })();
  }

  describe('onComplete execution', () => {
    it('should always call onComplete even if client disconnects', async () => {
      const stream = createMockStream('test content here');
      const mockSaveGraph = jest.fn().mockResolvedValue(undefined);
      const mockApplyMutations = jest.fn().mockReturnValue({
        graph: { ...sampleGraph, updatedAt: Date.now() },
        errors: [],
      });

      let onCompleteCalled = false;
      let onCompleteContent = '';

      const onComplete = jest.fn(async (fullContent: string) => {
        onCompleteCalled = true;
        onCompleteContent = fullContent;
        
        const mutations: MutationBatch = {
          mutations: [],
          metadata: { operation: 'test', timestamp: Date.now() },
        };
        
        const { graph: updatedGraph } = mockApplyMutations(sampleGraph, mutations);
        await mockSaveGraph(uid, updatedGraph);

        return {
          mutations,
          content: { narrative: fullContent },
          graph: updatedGraph,
        };
      });

      // Simulate client disconnection after first chunk
      setTimeout(() => {
        if (eventHandlers['close']) {
          eventHandlers['close'][0]();
        }
      }, 10);

      await handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Test error',
      });

      // onComplete should have been called despite disconnection
      expect(onCompleteCalled).toBe(true);
      expect(onCompleteContent).toBe('test content here ');
      expect(mockSaveGraph).toHaveBeenCalled();
    });

    it('should call onComplete even if response is already ended', async () => {
      const stream = createMockStream('test content');
      const mockSaveGraph = jest.fn().mockResolvedValue(undefined);

      let onCompleteCalled = false;

      const onComplete = jest.fn(async (fullContent: string) => {
        onCompleteCalled = true;
        const mutations: MutationBatch = {
          mutations: [],
          metadata: { operation: 'test', timestamp: Date.now() },
        };
        await mockSaveGraph(uid, sampleGraph);
        return {
          mutations,
          content: { narrative: fullContent },
          graph: sampleGraph,
        };
      });

      // Mark response as ended
      (mockResponse as any).writableEnded = true;

      await handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Test error',
      });

      // onComplete should still be called
      expect(onCompleteCalled).toBe(true);
      expect(mockSaveGraph).toHaveBeenCalled();
    });

    it('should call onComplete even if streaming throws an error', async () => {
      // Create a stream that throws an error
      const errorStream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk1' } }] };
        throw new Error('Stream error');
      })();

      const mockSaveGraph = jest.fn().mockResolvedValue(undefined);
      let onCompleteCalled = false;

      const onComplete = jest.fn(async (fullContent: string) => {
        onCompleteCalled = true;
        const mutations: MutationBatch = {
          mutations: [],
          metadata: { operation: 'test', timestamp: Date.now() },
        };
        await mockSaveGraph(uid, sampleGraph);
        return {
          mutations,
          content: { narrative: fullContent },
          graph: sampleGraph,
        };
      });

      await handleGraphOperationStream(errorStream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Stream error',
      });

      // onComplete should be called with accumulated content
      expect(onCompleteCalled).toBe(true);
      expect(onComplete).toHaveBeenCalledWith('chunk1');
      expect(mockSaveGraph).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle errors in onComplete gracefully and still attempt to save', async () => {
      const stream = createMockStream('test content');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const onComplete = jest.fn(async (fullContent: string) => {
        // Simulate error during parsing
        throw new Error('Parse error');
      });

      await handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Test error',
      });

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[handleGraphOperationStream] Error processing stream completion:'),
        expect.objectContaining({
          error: 'Parse error',
        })
      );

      // Error should be sent to client if still connected
      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringContaining('"error":"Test error"')
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle save errors gracefully', async () => {
      const stream = createMockStream('test content');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockSaveGraph = jest.fn().mockRejectedValue(new Error('Save failed'));

      const onComplete = jest.fn(async (fullContent: string) => {
        const mutations: MutationBatch = {
          mutations: [],
          metadata: { operation: 'test', timestamp: Date.now() },
        };
        // This will throw
        try {
          await mockSaveGraph(uid, sampleGraph);
        } catch (error) {
          // Re-throw to test error handling
          throw error;
        }
        return {
          mutations,
          content: { narrative: fullContent },
          graph: sampleGraph,
        };
      });

      await expect(
        handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
          onComplete,
          errorMessage: 'Test error',
        })
      ).resolves.toBeDefined();

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('graph persistence', () => {
    it('should save graph even if client disconnects before onComplete finishes', async () => {
      const stream = createMockStream('test content');
      const mockSaveGraph = jest.fn().mockImplementation(async () => {
        // Simulate slow save
        await new Promise(resolve => setTimeout(resolve, 100));
        return undefined;
      });

      const onComplete = jest.fn(async (fullContent: string) => {
        const mutations: MutationBatch = {
          mutations: [{ type: 'create_node', node: sampleGraph.nodes['concept-1'] }],
          metadata: { operation: 'test', timestamp: Date.now() },
        };
        const updatedGraph = { ...sampleGraph, updatedAt: Date.now() };
        await mockSaveGraph(uid, updatedGraph);
        return {
          mutations,
          content: { narrative: fullContent },
          graph: updatedGraph,
        };
      });

      // Disconnect client immediately
      (mockResponse as any).writableEnded = true;

      await handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Test error',
      });

      // Graph should still be saved
      expect(onComplete).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
    });

    it('should save graph even if write to client fails', async () => {
      const stream = createMockStream('test content');
      const mockSaveGraph = jest.fn().mockResolvedValue(undefined);
      mockWrite.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const onComplete = jest.fn(async (fullContent: string) => {
        const mutations: MutationBatch = {
          mutations: [],
          metadata: { operation: 'test', timestamp: Date.now() },
        };
        await mockSaveGraph(uid, sampleGraph);
        return {
          mutations,
          content: { narrative: fullContent },
          graph: sampleGraph,
        };
      });

      await handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Test error',
      });

      // Graph should be saved despite write failure
      expect(onComplete).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalled();
    });
  });

  describe('response handling', () => {
    it('should send mutations and final event to client when onComplete succeeds', async () => {
      const stream = createMockStream('test content');
      const mutations: MutationBatch = {
        mutations: [{ type: 'create_node', node: sampleGraph.nodes['concept-1'] }],
        metadata: { operation: 'test', timestamp: Date.now() },
      };

      const onComplete = jest.fn(async (fullContent: string) => {
        return {
          mutations,
          content: { narrative: fullContent },
          graph: sampleGraph,
        };
      });

      await handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Test error',
      });

      // Should send mutations
      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringContaining('"mutations"')
      );

      // Should send final event with done: true
      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringContaining('"done":true')
      );
    });

    it('should send error to client when onComplete fails', async () => {
      const stream = createMockStream('test content');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const onComplete = jest.fn(async (fullContent: string) => {
        throw new Error('Processing failed');
      });

      await handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Test error',
      });

      // Should send error event
      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringContaining('"error":"Test error"')
      );
      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringContaining('"details":"Processing failed"')
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clean up event listeners', async () => {
      const stream = createMockStream('test content');

      const onComplete = jest.fn(async (fullContent: string) => {
        return {
          mutations: { mutations: [], metadata: { operation: 'test', timestamp: Date.now() } },
          content: { narrative: fullContent },
        };
      });

      await handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Test error',
      });

      // Should remove event listeners
      expect(mockRemoveListener).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRemoveListener).toHaveBeenCalledWith('aborted', expect.any(Function));
    });

    it('should end response in finally block', async () => {
      const stream = createMockStream('test content');

      const onComplete = jest.fn(async (fullContent: string) => {
        return {
          mutations: { mutations: [], metadata: { operation: 'test', timestamp: Date.now() } },
          content: { narrative: fullContent },
        };
      });

      await handleGraphOperationStream(stream, mockRequest as Request, mockResponse as Response, {
        onComplete,
        errorMessage: 'Test error',
      });

      // Should end response
      expect(mockEnd).toHaveBeenCalled();
    });
  });
});

