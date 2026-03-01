/**
 * Tests for Streaming Utilities (streaming.ts)
 */

import {
  handleStreamingRequest,
  graphOperationsStreamingApi,
} from '../../../../features/knowledge-graph/api/streaming';
import { auth } from '../../../../config/firebase';

// Mock fetch
global.fetch = jest.fn();

// Mock auth
jest.mock('../../../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

const mockAuth = auth as jest.Mocked<typeof auth>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Helper to make currentUser writable in tests
let mockUser: any = null;
Object.defineProperty(mockAuth, 'currentUser', {
  get: () => mockUser,
  set: (value) => {
    mockUser = value;
  },
  configurable: true,
  enumerable: true,
});

describe('handleStreamingRequest', () => {
  let mockReader: any;
  let mockRead: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    } as any;

    mockRead = jest.fn();
    mockReader = {
      read: mockRead,
    };
  });

  describe('non-streaming responses', () => {
    it('should return JSON for non-streaming responses', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ result: 'success' }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const callbacks = {
        onChunk: jest.fn(),
        onMutations: jest.fn(),
        onDone: jest.fn(),
      };

      const result = await handleStreamingRequest<{ result: string }>(
        '/api/test',
        {},
        callbacks
      );

      expect(result).toEqual({ result: 'success' });
      expect(mockResponse.json).toHaveBeenCalled();
      expect(callbacks.onChunk).not.toHaveBeenCalled();
    });
  });

  describe('streaming responses (SSE)', () => {
    it('should handle streaming chunks', async () => {
      const chunks = [
        'data: {"content":"Hello","done":false}\n\n',
        'data: {"content":" World","done":false}\n\n',
        'data: {"content":"","done":true}\n\n',
      ];

      let chunkIndex = 0;
      mockRead.mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          const chunk = chunks[chunkIndex++];
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode(chunk),
          });
        }
        return Promise.resolve({ done: true });
      });

      const mockResponse = {
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const onChunk = jest.fn();
      const onDone = jest.fn();

      await handleStreamingRequest(
        '/api/test',
        {},
        {
          onChunk,
          onDone,
        }
      );

      expect(onChunk).toHaveBeenCalledWith('Hello');
      expect(onChunk).toHaveBeenCalledWith(' World');
      expect(onDone).toHaveBeenCalled();
    });

    it('should handle mutations in stream', async () => {
      const mutation = {
        mutations: [
          {
            type: 'create_node' as const,
            node: {
              id: 'node-1',
              type: 'Concept' as const,
              properties: {},
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        ],
        metadata: {
          operation: 'test',
          timestamp: Date.now(),
        },
      };

      const chunks = [
        `data: {"mutations":${JSON.stringify(mutation)},"done":false}\n\n`,
        'data: {"content":"","done":true}\n\n',
      ];

      let chunkIndex = 0;
      mockRead.mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          const chunk = chunks[chunkIndex++];
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode(chunk),
          });
        }
        return Promise.resolve({ done: true });
      });

      const mockResponse = {
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const onMutations = jest.fn();
      const onDone = jest.fn();

      await handleStreamingRequest(
        '/api/test',
        {},
        {
          onMutations,
          onDone,
        }
      );

      expect(onMutations).toHaveBeenCalledWith(mutation);
      expect(onDone).toHaveBeenCalled();
    });

    it('should handle errors in stream', async () => {
      const chunks = ['data: {"error":"Stream error","done":true}\n\n'];

      mockRead.mockImplementation(() => {
        return Promise.resolve({
          done: false,
          value: new TextEncoder().encode(chunks[0]),
        });
      });

      const mockResponse = {
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const onError = jest.fn();

      await expect(
        handleStreamingRequest(
          '/api/test',
          {},
          {
            onError,
          }
        )
      ).rejects.toThrow('Stream error');

      expect(onError).toHaveBeenCalledWith('Stream error');
    });

    it('should handle incomplete chunks across reads', async () => {
      const chunk1 = 'data: {"content":"Hello';
      const chunk2 = ' World","done":false}\n\n';
      const chunk3 = 'data: {"content":"","done":true}\n\n';

      let chunkIndex = 0;
      mockRead.mockImplementation(() => {
        if (chunkIndex === 0) {
          chunkIndex++;
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode(chunk1),
          });
        }
        if (chunkIndex === 1) {
          chunkIndex++;
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode(chunk2),
          });
        }
        if (chunkIndex === 2) {
          chunkIndex++;
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode(chunk3),
          });
        }
        return Promise.resolve({ done: true });
      });

      const mockResponse = {
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const onChunk = jest.fn();

      await handleStreamingRequest(
        '/api/test',
        {},
        {
          onChunk,
        }
      );

      expect(onChunk).toHaveBeenCalledWith('Hello World');
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      mockUser = null;

      await expect(
        handleStreamingRequest('/api/test', {}, {})
      ).rejects.toThrow('User not authenticated');
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ message: 'Not found' }),
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        handleStreamingRequest('/api/test', {}, {})
      ).rejects.toThrow('Not found');
    });

    it('should handle missing response body', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
        body: null,
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        handleStreamingRequest('/api/test', {}, {})
      ).rejects.toThrow('Response body is not readable');
    });
  });

  describe('graphOperationsStreamingApi', () => {
    beforeEach(() => {
      mockUser = {
        getIdToken: jest.fn().mockResolvedValue('mock-token'),
      } as any;
    });

    it('should call progressiveExpand with streaming enabled', async () => {
      const chunks = ['data: {"content":"","done":true}\n\n'];

      let chunkIndex = 0;
      mockRead.mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          const chunk = chunks[chunkIndex++];
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode(chunk),
          });
        }
        return Promise.resolve({ done: true });
      });

      const mockResponse = {
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const callbacks = {
        onChunk: jest.fn(),
        onDone: jest.fn(),
      };

      await graphOperationsStreamingApi.progressiveExpand(
        'graph-1',
        { numConcepts: 5 },
        callbacks
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/graph-operations/graph-1/expand?stream=true'),
        expect.objectContaining({
          method: 'POST',
          body: expect.not.stringContaining('"stream"'),
        })
      );
    });

    it('should call explainConcept with streaming enabled', async () => {
      const chunks = ['data: {"content":"","done":true}\n\n'];

      let chunkIndex = 0;
      mockRead.mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          const chunk = chunks[chunkIndex++];
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode(chunk),
          });
        }
        return Promise.resolve({ done: true });
      });

      const mockResponse = {
        ok: true,
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      } as any;

      mockFetch.mockResolvedValue(mockResponse);

      const callbacks = {
        onChunk: jest.fn(),
        onDone: jest.fn(),
      };

      await graphOperationsStreamingApi.explainConcept(
        'graph-1',
        { targetNodeId: 'node-1' },
        callbacks
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/graph-operations/graph-1/explain?stream=true'),
        expect.objectContaining({
          method: 'POST',
          body: expect.not.stringContaining('"stream"'),
        })
      );
    });
  });
});

