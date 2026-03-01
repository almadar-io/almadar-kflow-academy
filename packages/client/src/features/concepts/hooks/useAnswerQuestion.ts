import { useState, useCallback } from 'react';
import { ConceptsAPI } from '../ConceptsAPI';

interface UseAnswerQuestionOptions {
  conceptGraphId: string;
  conceptId: string;
}

interface UseAnswerQuestionReturn {
  answer: string | null;
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
  isStreaming: boolean;
  answerQuestion: (question: string, selectedText?: string) => Promise<void>;
  reset: () => void;
}

export const useAnswerQuestion = ({
  conceptGraphId,
  conceptId,
}: UseAnswerQuestionOptions): UseAnswerQuestionReturn => {
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const answerQuestion = useCallback(async (question: string, selectedText?: string) => {
    if (!question.trim()) return;

    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setAnswer(null);
    setStreamingContent('');

    try {
      const response = await ConceptsAPI.answerQuestion(
        {
          conceptGraphId,
          conceptId,
          question: question.trim(),
          selectedText,
        },
        (chunk: string) => {
          // Stream handler - update content as it arrives
          setStreamingContent(prev => prev + chunk);
        }
      );

      // The response.answer will contain the final answer from onDone callback
      // If streaming completed successfully, streamingContent should match response.answer
      // But we use response.answer as the source of truth
      if (response.answer) {
        setAnswer(response.answer);
        setStreamingContent(response.answer);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get answer. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [conceptGraphId, conceptId]);

  const reset = useCallback(() => {
    setAnswer(null);
    setError(null);
    setStreamingContent('');
  }, []);

  return {
    answer,
    isLoading,
    error,
    streamingContent,
    isStreaming,
    answerQuestion,
    reset,
  };
};

