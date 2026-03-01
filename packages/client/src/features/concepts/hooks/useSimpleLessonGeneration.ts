import { useState, useCallback, useRef } from 'react';
import { ConceptsAPI } from '../ConceptsAPI';
import { Concept } from '../types';

interface UseSimpleLessonGenerationReturn {
  lesson: string;
  isGenerating: boolean;
  error: string | null;
  generateSimpleLesson: (concept: Concept, graphId: string) => Promise<void>;
  clearLesson: () => void;
}

/**
 * Hook for generating a detailed lesson for a concept
 * Detailed lessons include learning science tags (activation, reflection, Bloom's taxonomy) and practice questions
 */
export const useSimpleLessonGeneration = (): UseSimpleLessonGenerationReturn => {
  const [lesson, setLesson] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generatingRef = useRef(false);

  const generateSimpleLesson = useCallback(async (concept: Concept, graphId: string) => {
    if (!concept || !concept.name) {
      setError('Concept is required');
      return;
    }

    // Prevent double calls
    if (generatingRef.current) {
      return;
    }

    generatingRef.current = true;
    setIsGenerating(true);
    setError(null);
    setLesson('');

    try {
      // Use explainConcept to generate a detailed lesson with learning science tags and practice questions
      const response = await ConceptsAPI.explainConcept({
        concept,
        graphId,
        minimal: true,
        stream: true, // Enable streaming for real-time updates
      }, (chunk: string) => {
        // Update lesson in real-time as it streams
        setLesson(prev => prev + chunk);
      });

      // If streaming didn't populate the lesson, use the response
      if (!lesson && response.concepts && response.concepts.length > 0) {
        setLesson(response.concepts[0].lesson || '');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate lesson';
      setError(errorMessage);
      console.error('Error generating simple lesson:', err);
    } finally {
      setIsGenerating(false);
      generatingRef.current = false;
    }
  }, []);

  const clearLesson = useCallback(() => {
    setLesson('');
    setError(null);
  }, []);

  return {
    lesson,
    isGenerating,
    error,
    generateSimpleLesson,
    clearLesson,
  };
};

