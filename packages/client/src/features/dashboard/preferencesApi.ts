import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';

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

export interface UserPreferences {
  // Daily goal preferences (existing)
  dailyLessonGoal: number;
  dailyGoalStartDate?: number;
  
  // Learning preferences (Phase 1 - merged)
  // Note: currentKnowledge and proficiencyLevels are derived from UserProgress, not stored here
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  timePerWeek?: number; // Hours per week available for learning
  interests?: string[]; // User's learning interests/topics
  
  // Metadata
  updatedAt: number;
  createdAt: number;
}

export interface DailyActivity {
  type: 'lesson_completed' | 'concept_studied';
  resourceId: string;
  resourceName: string;
  timestamp: number;
  metadata?: {
    courseId?: string;
    lessonId?: string;
    conceptId?: string;
  };
}

export interface DailyProgress {
  date: string; // YYYY-MM-DD
  goal: number;
  completed: number;
  progressPercentage: number;
  activities: DailyActivity[];
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const headers = await withAuthHeaders();
  const result = await apiClient.fetch('/api/user/preferences', {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return result.preferences;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  preferences: Partial<Omit<UserPreferences, 'createdAt' | 'updatedAt'>>
): Promise<UserPreferences> {
  const headers = await withAuthHeaders();
  const result = await apiClient.fetch('/api/user/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(preferences),
  });
  return result.preferences;
}

/**
 * Get daily progress
 */
export async function getDailyProgress(): Promise<DailyProgress> {
  const headers = await withAuthHeaders();
  const result = await apiClient.fetch('/api/user/statistics/daily-progress', {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return result.progress;
}

/**
 * Get recommended courses
 */
export async function getRecommendedCourses(limit: number = 5): Promise<any[]> {
  const headers = await withAuthHeaders();
  const result = await apiClient.fetch(`/api/user/recommendations/courses?limit=${limit}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return result.courses || [];
}

/**
 * Get continue learning courses
 */
export async function getContinueLearningCourses(limit: number = 5): Promise<any[]> {
  const headers = await withAuthHeaders();
  const result = await apiClient.fetch(`/api/user/recommendations/continue-learning?limit=${limit}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return result.courses || [];
}

/**
 * Achievement types
 */
export type AchievementType =
  | 'first_lesson_completed'
  | 'first_course_completed'
  | 'streak_7_days'
  | 'streak_30_days'
  | 'concepts_mastered_10'
  | 'concepts_mastered_50'
  | 'courses_completed_5';

/**
 * Achievement data structure
 */
export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
  progress?: number;
}

/**
 * Get all achievements with progress
 */
export async function getAchievements(): Promise<Achievement[]> {
  const headers = await withAuthHeaders();
  const result = await apiClient.fetch('/api/user/achievements', {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return result.achievements || [];
}

/**
 * Jump Back In item
 */
export interface JumpBackInItem {
  id: string;
  type: 'course' | 'learningPath';
  title: string;
  description?: string;
  lastAccessedAt: number;
  progress?: {
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
  };
  metadata: {
    courseId?: string;
    enrollmentId?: string;
    graphId?: string;
    seedConceptId?: string;
    conceptCount?: number;
    levelCount?: number;
  };
}

/**
 * Get all jump back in items
 */
export async function getJumpBackInItems(): Promise<JumpBackInItem[]> {
  const headers = await withAuthHeaders();
  const result = await apiClient.fetch('/api/user/jump-back-in', {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return result.items || [];
}

