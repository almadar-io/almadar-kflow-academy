/**
 * @deprecated This API is deprecated. Use features/knowledge-graph/hooks instead.
 * This file contains the old goal API and will be removed in a future version.
 * 
 * Migration guide:
 * - Use useGenerateGoals hook instead of createGoal/createGraphWithGoal
 * - Use MentorGoalForm component instead of GoalForm
 * - Use knowledge-graph hooks for all goal-related operations
 */

import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';
import { parseIncrementalJSON } from '../../utils/jsonParser';

// Helper function for auth headers
const withAuthHeaders = async (): Promise<HeadersInit> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Goal question generation request
 */
export interface GenerateGoalQuestionsRequest {
  anchorAnswer: string;
  goalDescription?: string;
  goalType?: string;
  domain?: string;
}

/**
 * Goal question response
 */
export interface GoalQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'text' | 'scale' | 'yes_no';
  selectionType?: 'single' | 'multi'; // 'single' for radio buttons (one answer), 'multi' for checkboxes (multiple answers). Defaults to 'multi' for backward compatibility
  options: string[];
  allowOther: boolean;
  allowSkip: boolean;
  required?: boolean;
  helpText?: string;
}

export interface GenerateGoalQuestionsResponse {
  questions: GoalQuestion[];
  inferredGoalType?: string;
  suggestedDomain?: string;
  model?: string;
}

/**
 * Generate goal questions based on anchor answer
 */
export async function generateGoalQuestions(
  request: GenerateGoalQuestionsRequest
): Promise<GenerateGoalQuestionsResponse> {
  const headers = await withAuthHeaders();
  return apiClient.fetch('/api/learning/generate-goal-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(request),
  });
}

/**
 * Goal question answer
 */
export interface GoalQuestionAnswer {
  questionId: string;
  answer?: string | string[]; // Can be single answer or array for multiple selections
  isOther?: boolean;
  otherValue?: string;
  skipped?: boolean;
}

/**
 * Create goal request
 */
export interface CreateGoalRequest {
  anchorAnswer: string;
  questionAnswers: GoalQuestionAnswer[];
  graphId?: string;
  stream?: boolean;
}

/**
 * Learning goal
 */
export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: number;
  completed: boolean;
  completedAt?: number;
}

export interface LearningGoal {
  id: string;
  graphId: string;
  title: string;
  description: string;
  type: string;
  target: string;
  estimatedTime?: number;
  milestones?: Milestone[];
  shortTermGoals?: string[];
  customMetadata?: Record<string, any>;
  assessedLevel?: 'beginner' | 'intermediate' | 'advanced';
  placementTestId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateGoalResponse {
  goal: LearningGoal;
  model?: string;
}

/**
 * Create a learning goal
 */
export async function createGoal(
  request: CreateGoalRequest,
  onStream?: (chunk: string, partialGoal: any) => void
): Promise<CreateGoalResponse> {
  const headers = await withAuthHeaders();
  
  // Handle streaming if requested
  const shouldStream = request.stream && onStream;
  if (shouldStream) {
    return handleStreamingGoalCreation(request, headers, onStream);
  }
  
  // Non-streaming fallback
  return apiClient.fetch('/api/learning/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ ...request, stream: false }),
  });
}

/**
 * Handle streaming goal creation with incremental JSON parsing
 */
async function handleStreamingGoalCreation(
  request: CreateGoalRequest,
  headers: HeadersInit,
  onStream: (chunk: string, partialGoal: any) => void
): Promise<CreateGoalResponse> {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  const response = await fetch(`${API_BASE_URL}/api/learning/goals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create goal' }));
    throw new Error(error.message || 'Failed to create goal');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let finalResult: CreateGoalResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }

            // Stream content chunks
            if (data.content) {
              fullContent += data.content;
              // Parse incremental JSON to extract available key-value pairs
              const partialGoal = parseIncrementalJSON(fullContent);
              onStream(data.content, partialGoal);
            }

            // Capture final result when streaming completes
            // The backend sends the final result in the done event with goal and model
            if (data.done) {
              if (data.goal) {
                finalResult = {
                  goal: data.goal,
                  model: data.model,
                };
              } else if (data.error) {
                throw new Error(data.error);
              }
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    }
  } catch (error) {
    throw error;
  }

  if (!finalResult) {
    throw new Error('Streaming goal creation did not return a result');
  }

  return finalResult;
}

/**
 * Create graph with goal request
 */
export interface CreateGraphWithGoalRequest {
  anchorAnswer: string;
  questionAnswers: GoalQuestionAnswer[];
  seedConceptName?: string;
  seedConceptDescription?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  focus?: string;
  goalFocused?: boolean;
  stream?: boolean; // Whether to stream the goal generation
  // Manual goal entry - if provided, use this goal exactly and only generate milestones
  manualGoal?: {
    title: string;
    description: string;
    type?: string;
    target?: string;
    estimatedTime?: number;
  };
}

export interface CreateGraphWithGoalResponse {
  goal: LearningGoal;
  graphId: string;
  seedConceptId: string;
}

/**
 * Create a graph and goal together
 */
export async function createGraphWithGoal(
  request: CreateGraphWithGoalRequest,
  onStream?: (chunk: string, partialGoal: any) => void
): Promise<CreateGraphWithGoalResponse> {
  const headers = await withAuthHeaders();
  
  // Handle streaming if requested
  const shouldStream = request.stream && onStream;
  if (shouldStream) {
    return handleStreamingGraphWithGoal(request, headers, onStream);
  }
  
  // Non-streaming fallback
  return apiClient.fetch('/api/learning/goals/with-graph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ ...request, stream: false }),
  });
}

/**
 * Handle streaming graph and goal creation with incremental JSON parsing
 */
async function handleStreamingGraphWithGoal(
  request: CreateGraphWithGoalRequest,
  headers: HeadersInit,
  onStream: (chunk: string, partialGoal: any) => void
): Promise<CreateGraphWithGoalResponse> {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  const response = await fetch(`${API_BASE_URL}/api/learning/goals/with-graph`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create graph with goal' }));
    throw new Error(error.message || 'Failed to create graph with goal');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let finalResult: CreateGraphWithGoalResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }

            // Stream content chunks
            if (data.content) {
              fullContent += data.content;
              // Parse incremental JSON to extract available key-value pairs
              const partialGoal = parseIncrementalJSON(fullContent);
              onStream(data.content, partialGoal);
            }

            // Capture final result when streaming completes
            // The backend sends the final result in the done event with goal, graphId, and seedConceptId
            if (data.done) {
              if (data.goal && data.graphId) {
                finalResult = {
                  goal: data.goal,
                  graphId: data.graphId,
                  seedConceptId: data.seedConceptId || '',
                };
              } else if (data.error) {
                throw new Error(data.error);
              }
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during streaming:', error);
    throw error;
  }

  // If we didn't get a final result, try to parse from fullContent as fallback
  if (!finalResult) {
    if (fullContent) {
      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const goalData = JSON.parse(jsonMatch[0]);
          console.warn('Streaming completed but no final result received. Attempting to parse from full content:', goalData);
          // Note: We can't create the graph from frontend, so this is just for debugging
          // The backend should always send the final result
        }
      } catch (parseError) {
        console.error('Failed to parse full content as fallback:', parseError);
      }
      console.error('Streaming failed. Full content received (first 500 chars):', fullContent.substring(0, 500));
    }
    throw new Error('Streaming graph and goal creation did not return a result. The backend may not have sent the final event properly. Check console for details.');
  }

  return finalResult;
}

/**
 * Get all goals for current user
 */
export interface GetGoalsResponse {
  goals: LearningGoal[];
}

export async function getUserGoals(
  graphId?: string
): Promise<GetGoalsResponse> {
  const headers = await withAuthHeaders();
  const query = graphId ? `?graphId=${encodeURIComponent(graphId)}` : '';
  return apiClient.fetch(`/api/learning/goals${query}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * Get a specific goal by ID
 */
export interface GetGoalResponse {
  goal: LearningGoal;
}

export async function getGoalById(goalId: string): Promise<GetGoalResponse> {
  const headers = await withAuthHeaders();
  return apiClient.fetch(`/api/learning/goals/${goalId}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * Update goal request
 */
export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  type?: string;
  target?: string;
  estimatedTime?: number;
  milestones?: Milestone[];
  customMetadata?: Record<string, any>;
  assessedLevel?: 'beginner' | 'intermediate' | 'advanced';
  placementTestId?: string;
}

/**
 * Update a learning goal
 */
export async function updateGoal(
  goalId: string,
  updates: UpdateGoalRequest
): Promise<GetGoalResponse> {
  const headers = await withAuthHeaders();
  return apiClient.fetch(`/api/learning/goals/${goalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a learning goal
 */
export async function deleteGoal(goalId: string): Promise<void> {
  const headers = await withAuthHeaders();
  return apiClient.fetch(`/api/learning/goals/${goalId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

