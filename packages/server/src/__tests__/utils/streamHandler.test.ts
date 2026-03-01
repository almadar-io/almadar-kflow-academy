import { Request, Response } from 'express';
import { handleStreamResponse, StreamHandlerOptions } from '../../utils/streamHandler';

describe('Stream Handler - Backend', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockWrite: jest.Mock;
  let mockEnd: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockRemoveListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWrite = jest.fn().mockReturnValue(true);
    mockEnd = jest.fn();
    mockSetHeader = jest.fn();
    mockRemoveListener = jest.fn();

    mockRequest = {
      on: jest.fn(),
      removeListener: mockRemoveListener,
    } as any;

    mockResponse = {
      setHeader: mockSetHeader,
      write: mockWrite,
      end: mockEnd,
      headersSent: false,
      writableEnded: false,
    } as any;
  });

  describe('SSE Format', () => {
    it('should set correct SSE headers', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'test' } }] };
      })();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockSetHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockSetHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockSetHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    });

    it('should format SSE events correctly', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk1' } }] };
        yield { choices: [{ delta: { content: 'chunk2' } }] };
      })();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWrite).toHaveBeenCalledWith('data: {"content":"chunk1","done":false}\n\n');
      expect(mockWrite).toHaveBeenCalledWith('data: {"content":"chunk2","done":false}\n\n');
    });

    it('should send final done event', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'content' } }] };
      })();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      // Should have content chunks and final done event
      const writeCalls = mockWrite.mock.calls;
      const finalCall = writeCalls[writeCalls.length - 1];
      expect(finalCall[0]).toContain('"done":true');
    });
  });

  describe('Stream Processing', () => {
    it('should send stream chunks correctly', async () => {
      const chunks = ['chunk1', 'chunk2', 'chunk3'];
      const stream = (async function* () {
        for (const chunk of chunks) {
          yield { choices: [{ delta: { content: chunk } }] };
        }
      })();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWrite).toHaveBeenCalledTimes(chunks.length + 1); // +1 for done event
      chunks.forEach((chunk, index) => {
        expect(mockWrite).toHaveBeenNthCalledWith(
          index + 1,
          `data: ${JSON.stringify({ content: chunk, done: false })}\n\n`
        );
      });
    });

    it('should accumulate full content from chunks', async () => {
      const chunks = ['Hello ', 'World', '!'];
      const stream = (async function* () {
        for (const chunk of chunks) {
          yield { choices: [{ delta: { content: chunk } }] };
        }
      })();

      const fullContent = await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(fullContent).toBe('Hello World!');
    });

    it('should handle chunks with content property directly', async () => {
      const stream = (async function* () {
        yield { content: 'direct content' };
      })();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockWrite).toHaveBeenCalledWith(
        'data: {"content":"direct content","done":false}\n\n'
      );
    });

    it('should skip empty content chunks', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'valid' } }] };
        yield { choices: [{ delta: { content: '' } }] };
        yield { choices: [{ delta: {} }] };
      })();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      // Should only write the valid chunk + done event
      expect(mockWrite).toHaveBeenCalledTimes(2);
      expect(mockWrite).toHaveBeenCalledWith(
        'data: {"content":"valid","done":false}\n\n'
      );
    });
  });

  describe('Completion Event', () => {
    it('should send done event at end of stream', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'content' } }] };
      })();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      const writeCalls = mockWrite.mock.calls;
      const finalCall = writeCalls[writeCalls.length - 1];
      const finalData = JSON.parse(finalCall[0].replace('data: ', '').replace(/\n\n$/, ''));
      
      expect(finalData.done).toBe(true);
      expect(finalData.content).toBe('');
    });

    it('should include additional data from onComplete callback', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'content' } }] };
      })();

      const options: StreamHandlerOptions = {
        onComplete: (fullContent) => ({
          prerequisites: ['prereq1', 'prereq2'],
          metadata: { processed: true },
        }),
      };

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response,
        options
      );

      const writeCalls = mockWrite.mock.calls;
      const finalCall = writeCalls[writeCalls.length - 1];
      const finalData = JSON.parse(finalCall[0].replace('data: ', '').replace(/\n\n$/, ''));
      
      expect(finalData.done).toBe(true);
      expect(finalData.prerequisites).toEqual(['prereq1', 'prereq2']);
      expect(finalData.metadata).toEqual({ processed: true });
    });

    it('should call onComplete with full accumulated content', async () => {
      const chunks = ['chunk1', 'chunk2'];
      const stream = (async function* () {
        for (const chunk of chunks) {
          yield { choices: [{ delta: { content: chunk } }] };
        }
      })();

      const onComplete = jest.fn().mockReturnValue({});
      const options: StreamHandlerOptions = { onComplete };

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response,
        options
      );

      expect(onComplete).toHaveBeenCalledWith('chunk1chunk2');
    });
  });

  describe('Error Handling', () => {
    it('should send error as SSE event when stream fails', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk1' } }] };
        throw new Error('Stream error');
      })();

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      const writeCalls = mockWrite.mock.calls;
      const errorCall = writeCalls.find(call => {
        const data = JSON.parse(call[0].replace('data: ', '').replace(/\n\n$/, ''));
        return data.error !== undefined;
      });

      expect(errorCall).toBeDefined();
      if (errorCall) {
        const errorData = JSON.parse(errorCall[0].replace('data: ', '').replace(/\n\n$/, ''));
        expect(errorData.error).toBe('Stream error');
        expect(errorData.done).toBe(true);
      }

      consoleErrorSpy.mockRestore();
    });

    it('should use custom error message when provided', async () => {
      const stream = (async function* () {
        throw new Error('Original error');
      })();

      const options: StreamHandlerOptions = {
        errorMessage: 'Custom error message',
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response,
        options
      );

      const writeCalls = mockWrite.mock.calls;
      const errorCall = writeCalls.find(call => {
        const data = JSON.parse(call[0].replace('data: ', '').replace(/\n\n$/, ''));
        return data.error !== undefined;
      });

      expect(errorCall).toBeDefined();
      if (errorCall) {
        const errorData = JSON.parse(errorCall[0].replace('data: ', '').replace(/\n\n$/, ''));
        expect(errorData.error).toBe('Custom error message');
      }

      consoleErrorSpy.mockRestore();
    });

    it('should handle write errors gracefully', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk' } }] };
      })();

      mockWrite.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      // Should still return accumulated content
      expect(result).toBe('chunk');
    });

    it('should not send error event if client already disconnected', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk' } }] };
        throw new Error('Stream error');
      })();

      // Simulate client disconnection
      (mockResponse as any).writableEnded = true;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      // Should not try to write error if client disconnected
      const errorWrites = mockWrite.mock.calls.filter(call => {
        try {
          const data = JSON.parse(call[0].replace('data: ', '').replace(/\n\n$/, ''));
          return data.error !== undefined;
        } catch {
          return false;
        }
      });

      expect(errorWrites.length).toBe(0);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Client Disconnection', () => {
    it('should handle client disconnection during stream', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk1' } }] };
        yield { choices: [{ delta: { content: 'chunk2' } }] };
        yield { choices: [{ delta: { content: 'chunk3' } }] };
      })();

      let disconnectCallback: () => void;
      (mockRequest.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'close' || event === 'aborted') {
          disconnectCallback = callback;
        }
      });

      // Start streaming
      const streamPromise = handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      // Simulate disconnection after first chunk
      await new Promise(resolve => setTimeout(resolve, 10));
      if (disconnectCallback!) {
        disconnectCallback();
      }

      const result = await streamPromise;

      // Should return content accumulated before disconnection
      expect(result.length).toBeGreaterThan(0);
    });

    it('should stop iterating when client disconnects', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk1' } }] };
        yield { choices: [{ delta: { content: 'chunk2' } }] };
        yield { choices: [{ delta: { content: 'chunk3' } }] };
      })();

      (mockRequest.on as jest.Mock).mockImplementation((event: string, callback: () => void) => {
        if (event === 'close' || event === 'aborted') {
          setTimeout(() => {
            callback();
          }, 10);
        }
      });

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      // Should have processed some chunks before disconnection
      expect(mockWrite).toHaveBeenCalled();
    });

    it('should clean up event listeners on completion', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk' } }] };
      })();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockRemoveListener).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRemoveListener).toHaveBeenCalledWith('aborted', expect.any(Function));
    });

    it('should end response on completion', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk' } }] };
      })();

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEnd).toHaveBeenCalled();
    });

    it('should not end response if already ended', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: 'chunk' } }] };
      })();

      (mockResponse as any).writableEnded = true;

      await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      // Should not call end if already ended
      expect(mockEnd).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stream', async () => {
      const stream = (async function* () {
        // No chunks
      })();

      const result = await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(result).toBe('');
      // Should still send done event
      expect(mockWrite).toHaveBeenCalled();
      const finalCall = mockWrite.mock.calls[mockWrite.mock.calls.length - 1];
      const finalData = JSON.parse(finalCall[0].replace('data: ', '').replace(/\n\n$/, ''));
      expect(finalData.done).toBe(true);
    });

    it('should handle stream with only whitespace content', async () => {
      const stream = (async function* () {
        yield { choices: [{ delta: { content: '   \n\t  ' } }] };
      })();

      const result = await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(result).toBe('   \n\t  ');
    });

    it('should handle very long content chunks', async () => {
      const longContent = 'a'.repeat(10000);
      const stream = (async function* () {
        yield { choices: [{ delta: { content: longContent } }] };
      })();

      const result = await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(result).toBe(longContent);
      expect(mockWrite).toHaveBeenCalled();
    });

    it('should handle special characters in content', async () => {
      const specialContent = 'Hello\nWorld\t"quotes"\n\n';
      const stream = (async function* () {
        yield { choices: [{ delta: { content: specialContent } }] };
      })();

      const result = await handleStreamResponse(
        stream,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(result).toBe(specialContent);
      // JSON should be properly escaped
      const writeCall = mockWrite.mock.calls[0];
      expect(writeCall[0]).toContain('Hello\\nWorld');
    });
  });
});

