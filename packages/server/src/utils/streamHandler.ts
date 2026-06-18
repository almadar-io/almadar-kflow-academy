import { Request, Response } from 'express';
import { setupSSE, sendSSEEvent, sendSSEDone, closeSSE } from '@almadar/server';

export interface StreamHandlerOptions {
  onComplete?: (fullContent: string) => Record<string, unknown> | Promise<Record<string, unknown>> | undefined;
  errorMessage?: string;
}

type StreamChunk = { choices?: Array<{ delta?: { content?: string } }>; content?: string };

export async function handleStreamResponse(
  stream: AsyncIterable<unknown>,
  req: Request,
  res: Response,
  options: StreamHandlerOptions = {}
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

    if (!clientDisconnected && !res.writableEnded) {
      const additionalData = onComplete ? await onComplete(fullContent) : undefined;
      sendSSEEvent(res, { type: 'complete', data: { content: '', ...additionalData }, timestamp: Date.now() });
      sendSSEDone(res);
    }
  } catch (streamError) {
    if (!clientDisconnected && !res.writableEnded) {
      try {
        sendSSEEvent(res, { type: 'error', data: { error: errorMessage }, timestamp: Date.now() });
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
