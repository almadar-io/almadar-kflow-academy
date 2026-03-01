import { Request, Response } from 'express';

/**
 * Options for handling streaming responses
 */
export interface StreamHandlerOptions {
  /**
   * Callback to process the final accumulated content
   * Called after streaming completes, before sending the final event
   * @param fullContent - The complete streamed content
   * @returns Additional data to include in the final event (e.g., prerequisites)
   */
  onComplete?: (fullContent: string) => Record<string, any> | Promise<Record<string, any>> | undefined;
  
  /**
   * Custom error message for stream errors
   */
  errorMessage?: string;
}

/**
 * Handles streaming an async iterable to the client as Server-Sent Events (SSE)
 * Manages client disconnections, error handling, and cleanup
 * 
 * @param stream - Async iterable stream (e.g., from LLM API)
 * @param req - Express request object
 * @param res - Express response object
 * @param options - Optional configuration for stream handling
 * @returns Promise that resolves with the full accumulated content
 */
export async function handleStreamResponse(
  stream: AsyncIterable<any>,
  req: Request,
  res: Response,
  options: StreamHandlerOptions = {}
): Promise<string> {
  const { onComplete, errorMessage = 'Stream error' } = options;

  // Set up Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

  let fullContent = '';
  let clientDisconnected = false;

  // Handle client disconnection
  const cleanup = () => {
    clientDisconnected = true;
    if (!res.headersSent) {
      res.end();
    } else if (!res.writableEnded) {
      res.end();
    }
  };

  req.on('close', cleanup);
  req.on('aborted', cleanup);

  try {
    for await (const chunk of stream) {
      // Stop iterating if client disconnected
      if (clientDisconnected) {
        break;
      }

      // Extract content from chunk (adjust based on your stream format)
      const content = chunk.choices?.[0]?.delta?.content || chunk.content || '';
      
      if (content) {
        fullContent += content;
        
        // Only write if response is still writable
        if (!clientDisconnected && !res.writableEnded) {
          try {
            res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
          } catch (writeError) {
            // Client disconnected during write
            clientDisconnected = true;
            break;
          }
        }
      }
    }

    // Only process and send final data if client is still connected
    if (!clientDisconnected && !res.writableEnded) {
      // Call optional completion callback to get additional data
      // Await in case the callback is async
      const additionalData = onComplete ? await onComplete(fullContent) : undefined;

      // Send final event with complete content and any additional data
      const finalEvent: Record<string, any> = {
        content: '',
        done: true,
        ...(additionalData || {}),
      };
      
      res.write(`data: ${JSON.stringify(finalEvent)}\n\n`);
    }
  } catch (streamError) {
    console.error('Error streaming response:', streamError);
    if (!clientDisconnected && !res.writableEnded) {
      try {
        res.write(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`);
      } catch (writeError) {
        // Ignore write errors if client already disconnected
      }
    }
  } finally {
    // Clean up event listeners
    req.removeListener('close', cleanup);
    req.removeListener('aborted', cleanup);
    
    // Ensure response is closed
    if (!res.writableEnded) {
      res.end();
    }
  }

  return fullContent;
}

