import { Request, Response } from 'express';
import { setupSSE, sendSSEEvent, sendSSEDone, closeSSE } from '@almadar/server';
import type { MutationBatch } from '../types/mutations';
import type { NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';

export interface GraphOperationStreamOptions {
  onComplete?: (fullContent: string) => Promise<{
    mutations: MutationBatch;
    content: unknown;
    graph?: NodeBasedKnowledgeGraph;
  }>;
  onMutations?: (mutations: MutationBatch) => void;
  errorMessage?: string;
}

type StreamChunk = { choices?: Array<{ delta?: { content?: string } }>; content?: string };

export async function handleGraphOperationStream(
  stream: AsyncIterable<unknown>,
  req: Request,
  res: Response,
  options: GraphOperationStreamOptions = {}
): Promise<string> {
  const { onComplete, errorMessage = 'Stream error' } = options;

  setupSSE(res);

  let fullContent = '';
  let clientDisconnected = false;

  const cleanup = () => {
    clientDisconnected = true;
    if (!res.writableEnded) res.end();
  };

  req.on('close', cleanup);
  req.on('aborted', cleanup);

  try {
    for await (const rawChunk of stream) {
      if (clientDisconnected) break;

      const chunk = rawChunk as StreamChunk;
      const content = chunk.choices?.[0]?.delta?.content ?? chunk.content ?? '';

      if (content) {
        fullContent += content;
        if (!clientDisconnected && !res.writableEnded) {
          try {
            sendSSEEvent(res, { type: 'message', data: { content }, timestamp: Date.now() });
          } catch {
            clientDisconnected = true;
            break;
          }
        }
      }
    }

    if (onComplete && fullContent) {
      let result: { mutations: MutationBatch; content: unknown; graph?: NodeBasedKnowledgeGraph } | null = null;
      let processError: Error | null = null;

      try {
        result = await onComplete(fullContent);
      } catch (error) {
        processError = error instanceof Error ? error : new Error(String(error));
      }

      if (!clientDisconnected && !res.writableEnded) {
        try {
          if (processError) {
            sendSSEEvent(res, { type: 'error', data: { error: errorMessage, details: processError.message }, timestamp: Date.now() });
          } else if (result) {
            if (result.mutations?.mutations.length > 0) {
              sendSSEEvent(res, { type: 'message', data: { mutations: result.mutations }, timestamp: Date.now() });
            }
            sendSSEEvent(res, { type: 'complete', data: { content: result.content, mutations: result.mutations, graph: result.graph }, timestamp: Date.now() });
          }
          sendSSEDone(res);
        } catch {
          // client disconnected during write
        }
      }
    }
  } catch (streamError) {
    if (onComplete && fullContent) {
      try {
        await onComplete(fullContent);
      } catch {
        // best-effort
      }
    }

    if (!clientDisconnected && !res.writableEnded) {
      try {
        sendSSEEvent(res, {
          type: 'error',
          data: { error: errorMessage, details: streamError instanceof Error ? streamError.message : 'Unknown error' },
          timestamp: Date.now(),
        });
      } catch {
        // client gone
      }
    }
  } finally {
    req.removeListener('close', cleanup);
    req.removeListener('aborted', cleanup);
    if (!res.writableEnded) closeSSE(res);
  }

  return fullContent;
}
