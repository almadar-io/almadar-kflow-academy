import { useEffect, useRef } from 'react';
import { useEventBus } from '@almadar/ui';
import type { EventPayload } from '@almadar/core';

export interface ServerEventMessage {
  type: string;
  payload?: EventPayload;
  timestamp?: number;
  source?: string;
}

export function useServerEvents(enabled = true) {
  const { emit } = useEventBus();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/events`);
    wsRef.current = ws;

    ws.onmessage = (e: MessageEvent) => {
      const msg = JSON.parse(e.data as string) as ServerEventMessage;
      if (msg.type && msg.type !== 'CONNECTED') {
        emit(msg.type, msg.payload);
      }
    };

    ws.onerror = (err) => {
      console.error('[useServerEvents] WebSocket error', err);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled, emit]);

  const sendEvent = (type: string, payload: EventPayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  return { wsRef, sendEvent };
}
