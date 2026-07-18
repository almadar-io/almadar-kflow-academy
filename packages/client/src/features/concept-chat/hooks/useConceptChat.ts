import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { startConceptChat, sendConceptChatMessage } from '../api/conceptChatApi';
import type { ConceptPersonaDTO, ConceptChatMessageDTO } from '@kflow-academy/shared';

export interface UseConceptChat {
  persona: ConceptPersonaDTO | null;
  transcript: ConceptChatMessageDTO[];
  isStarting: boolean;
  isSending: boolean;
  start: () => void;
  send: (message: string) => void;
  reset: () => void;
}

/**
 * On-the-fly concept chat: generates the originator persona on open, holds persona +
 * transcript in memory, and replies in character. Stateless server-side by design.
 */
export function useConceptChat(conceptLabel: string): UseConceptChat {
  const [persona, setPersona] = useState<ConceptPersonaDTO | null>(null);
  const [transcript, setTranscript] = useState<ConceptChatMessageDTO[]>([]);

  const startMutation = useMutation({
    mutationFn: () => startConceptChat({ conceptLabel }),
    onSuccess: ({ persona: p, greeting }) => {
      setPersona(p);
      setTranscript([{ role: 'assistant', content: greeting }]);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      sendConceptChatMessage({
        conceptLabel,
        history: transcript,
        message,
      }),
    onSuccess: ({ reply }, message) => {
      setTranscript((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: reply },
      ]);
    },
  });

  const startMutate = startMutation.mutate;
  const start = useCallback(() => {
    setPersona(null);
    setTranscript([]);
    startMutate();
  }, [startMutate]);

  const sendMutate = sendMutation.mutate;
  const send = useCallback(
    (message: string) => {
      if (!persona) return;
      sendMutate(message);
    },
    [persona, sendMutate],
  );

  const reset = useCallback(() => {
    setPersona(null);
    setTranscript([]);
  }, []);

  return {
    persona,
    transcript,
    isStarting: startMutation.isPending,
    isSending: sendMutation.isPending,
    start,
    send,
    reset,
  };
}
