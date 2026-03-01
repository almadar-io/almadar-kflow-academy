/**
 * Hook for managing lesson annotations (questions and notes)
 * 
 * Provides functions to add, update, and delete questions and notes
 * attached to a lesson node in the knowledge graph.
 */

import { useState, useCallback } from 'react';
import { graphOperationsApi } from '../api/graphOperationsApi';
import type { QuestionAnswerItem, NoteItem, UpdateNodeMutation } from '../types';
import { useAppDispatch } from '../../../app/hooks';
import { updateGraph } from '../knowledgeGraphSlice';
import { generateUUID } from '../../../utils/uuid';

export interface UseLessonAnnotationsReturn {
  // Question operations
  addQuestion: (lessonNodeId: string, question: Omit<QuestionAnswerItem, 'id' | 'timestamp'>) => Promise<QuestionAnswerItem>;
  updateQuestion: (lessonNodeId: string, questionId: string, updates: Partial<Omit<QuestionAnswerItem, 'id'>>) => Promise<void>;
  deleteQuestion: (lessonNodeId: string, questionId: string) => Promise<void>;
  
  // Note operations
  addNote: (lessonNodeId: string, note: Omit<NoteItem, 'id' | 'timestamp'>) => Promise<NoteItem>;
  updateNote: (lessonNodeId: string, noteId: string, updates: Partial<Omit<NoteItem, 'id'>>) => Promise<void>;
  deleteNote: (lessonNodeId: string, noteId: string) => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
}

/**
 * Hook to manage lesson annotations
 * 
 * @param graphId - The ID of the graph containing the lesson
 * @param currentQuestions - Current questions array from the lesson node
 * @param currentNotes - Current notes array from the lesson node
 * @returns Object with annotation management functions and state
 */
export function useLessonAnnotations(
  graphId: string,
  currentQuestions: QuestionAnswerItem[] = [],
  currentNotes: NoteItem[] = []
): UseLessonAnnotationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  /**
   * Helper to apply mutations to the graph
   */
  const applyMutation = useCallback(async (
    lessonNodeId: string,
    properties: Record<string, any>
  ) => {
    if (!graphId) {
      throw new Error('Graph ID is required');
    }

    const mutation: UpdateNodeMutation = {
      type: 'update_node',
      nodeId: lessonNodeId,
      properties,
    };

    const response = await graphOperationsApi.applyMutations(graphId, {
      mutations: {
        mutations: [mutation],
        metadata: {
          operation: 'update_lesson_annotations',
          timestamp: Date.now(),
        },
      },
    });

    if (response.graph) {
      dispatch(updateGraph({ graphId, updates: response.graph }));
    }

    return response.graph;
  }, [graphId, dispatch]);

  // ========== Question Operations ==========

  const addQuestion = useCallback(async (
    lessonNodeId: string,
    question: Omit<QuestionAnswerItem, 'id' | 'timestamp'>
  ): Promise<QuestionAnswerItem> => {
    setLoading(true);
    setError(null);

    try {
      const newQuestion: QuestionAnswerItem = {
        ...question,
        id: generateUUID(),
        timestamp: Date.now(),
      };

      const updatedQuestions = [...currentQuestions, newQuestion];

      await applyMutation(lessonNodeId, {
        questions: updatedQuestions,
      });

      return newQuestion;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add question';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentQuestions, applyMutation]);

  const updateQuestion = useCallback(async (
    lessonNodeId: string,
    questionId: string,
    updates: Partial<Omit<QuestionAnswerItem, 'id'>>
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const updatedQuestions = currentQuestions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      );

      await applyMutation(lessonNodeId, {
        questions: updatedQuestions,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update question';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentQuestions, applyMutation]);

  const deleteQuestion = useCallback(async (
    lessonNodeId: string,
    questionId: string
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const updatedQuestions = currentQuestions.filter(q => q.id !== questionId);

      await applyMutation(lessonNodeId, {
        questions: updatedQuestions,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete question';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentQuestions, applyMutation]);

  // ========== Note Operations ==========

  const addNote = useCallback(async (
    lessonNodeId: string,
    note: Omit<NoteItem, 'id' | 'timestamp'>
  ): Promise<NoteItem> => {
    setLoading(true);
    setError(null);

    try {
      const newNote: NoteItem = {
        ...note,
        id: generateUUID(),
        timestamp: Date.now(),
      };

      const updatedNotes = [...currentNotes, newNote];

      await applyMutation(lessonNodeId, {
        notes: updatedNotes,
      });

      return newNote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add note';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentNotes, applyMutation]);

  const updateNote = useCallback(async (
    lessonNodeId: string,
    noteId: string,
    updates: Partial<Omit<NoteItem, 'id'>>
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const updatedNotes = currentNotes.map(n =>
        n.id === noteId ? { ...n, ...updates } : n
      );

      await applyMutation(lessonNodeId, {
        notes: updatedNotes,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentNotes, applyMutation]);

  const deleteNote = useCallback(async (
    lessonNodeId: string,
    noteId: string
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const updatedNotes = currentNotes.filter(n => n.id !== noteId);

      await applyMutation(lessonNodeId, {
        notes: updatedNotes,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentNotes, applyMutation]);

  return {
    addQuestion,
    updateQuestion,
    deleteQuestion,
    addNote,
    updateNote,
    deleteNote,
    loading,
    error,
  };
}

