/**
 * Graph Operation Stream Handler
 * 
 * Handles streaming for graph operations that generate mutations.
 * Streams content chunks and mutations as they're generated.
 */

import { Request, Response } from 'express';
import type { MutationBatch } from '../types/mutations';
import type { NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';

export interface GraphOperationStreamOptions {
  /**
   * Callback to process the final accumulated content and generate mutations
   * Called after streaming completes
   * @param fullContent - The complete streamed content
   * @returns Object with mutations, content, and optionally graph
   */
  onComplete?: (
    fullContent: string
  ) => Promise<{
    mutations: MutationBatch;
    content: any;
    graph?: NodeBasedKnowledgeGraph;
  }>;

  /**
   * Callback to process mutations as they arrive (optional, for incremental mutations)
   * @param mutations - Mutations generated from partial content
   */
  onMutations?: (mutations: MutationBatch) => void;

  /**
   * Custom error message for stream errors
   */
  errorMessage?: string;
}

/**
 * Handles streaming a graph operation that generates mutations
 * Streams content chunks and mutations as Server-Sent Events (SSE)
 * 
 * @param stream - Async iterable stream from LLM API
 * @param req - Express request object
 * @param res - Express response object
 * @param options - Configuration for stream handling
 * @returns Promise that resolves with the full accumulated content
 */
export async function handleGraphOperationStream(
  stream: AsyncIterable<any>,
  req: Request,
  res: Response,
  options: GraphOperationStreamOptions = {}
): Promise<string> {
  const { onComplete, onMutations, errorMessage = 'Stream error' } = options;

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
    // Stream content chunks
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
            // Send content chunk
            res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
            
            // Optionally try to generate mutations from partial content
            // This is optional and may not work for all operations
            if (onMutations) {
              try {
                // Some operations might support incremental mutation generation
                // For now, we'll skip this and generate mutations at the end
              } catch (e) {
                // Ignore errors in incremental mutation generation
              }
            }
          } catch (writeError) {
            // Client disconnected during write
            clientDisconnected = true;
            break;
          }
        }
      }
    }

    // Always process and save graph, even if client disconnected
    // This ensures mutations are persisted regardless of client connection status
    if (onComplete && fullContent) {
      let result: { mutations: MutationBatch; content: any; graph?: NodeBasedKnowledgeGraph } | null = null;
      let processError: Error | null = null;

      try {
        // Process final content and generate mutations
        // This includes parsing, applying mutations, and saving the graph
        result = await onComplete(fullContent);
        
        console.log('[handleGraphOperationStream] Successfully processed stream completion', {
          mutationsCount: result.mutations?.mutations?.length || 0,
          hasGraph: !!result.graph,
        });
      } catch (error) {
        processError = error instanceof Error ? error : new Error(String(error));
        console.error('[handleGraphOperationStream] Error processing stream completion:', {
          error: processError.message,
          stack: processError.stack,
          fullContentLength: fullContent.length,
        });
        // Don't re-throw - we still want to try to send error to client if possible
      }

      // Try to send response to client if still connected
      if (!clientDisconnected && !res.writableEnded) {
        try {
          if (processError) {
            // Send error to client
            res.write(`data: ${JSON.stringify({ 
              error: errorMessage, 
              details: processError.message,
              done: true 
            })}\n\n`);
          } else if (result) {
            // Send mutations if available
            if (result.mutations && result.mutations.mutations.length > 0) {
              res.write(`data: ${JSON.stringify({ mutations: result.mutations, done: false })}\n\n`);
            }

            // Send final event with complete result
            const finalEvent: Record<string, any> = {
              content: result.content,
              mutations: result.mutations,
              graph: result.graph,
              done: true,
            };
            
            res.write(`data: ${JSON.stringify(finalEvent)}\n\n`);
          }
        } catch (writeError) {
          // Client disconnected during write - this is OK, graph was already saved
          console.warn('[handleGraphOperationStream] Client disconnected during response write, but graph was saved');
        }
      } else if (processError) {
        // Client disconnected but we had an error - log it
        console.error('[handleGraphOperationStream] Client disconnected and processing failed:', processError.message);
      } else if (result) {
        // Client disconnected but processing succeeded - graph was saved
        console.log('[handleGraphOperationStream] Client disconnected but graph was successfully saved');
      }
    }
  } catch (streamError) {
    console.error('[handleGraphOperationStream] Error streaming response:', streamError);
    
    // Still try to process and save if we have content and onComplete
    if (onComplete && fullContent) {
      try {
        const result = await onComplete(fullContent);
        console.log('[handleGraphOperationStream] Successfully processed stream after error', {
          mutationsCount: result.mutations?.mutations?.length || 0,
        });
      } catch (processError) {
        console.error('[handleGraphOperationStream] Failed to process stream after error:', processError);
      }
    }
    
    if (!clientDisconnected && !res.writableEnded) {
      try {
        res.write(`data: ${JSON.stringify({ 
          error: errorMessage, 
          details: streamError instanceof Error ? streamError.message : 'Unknown error',
          done: true 
        })}\n\n`);
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

