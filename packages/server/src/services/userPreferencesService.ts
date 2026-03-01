import { getFirestore } from '../config/firebaseAdmin';
import { cache, CACHE_TTL } from './cacheService';

/**
 * User preferences stored in users/{uid}/preferences/settings document
 * Merged with learning preferences from Phase 1
 */
export interface UserPreferences {
  // Daily goal preferences (existing)
  dailyLessonGoal: number; // Default: 3
  dailyGoalStartDate?: number; // When goal was set (timestamp)
  
  // Learning preferences (Phase 1)
  // Note: currentKnowledge and proficiencyLevels are derived from UserProgress, not stored here
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  timePerWeek?: number; // Hours per week available for learning
  interests?: string[]; // User's learning interests/topics
  
  // Metadata
  updatedAt: number;
  createdAt: number;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'updatedAt' | 'createdAt'> = {
  dailyLessonGoal: 3,
  // Learning preferences default to undefined (optional fields)
};

/**
 * Get user preferences (returns defaults if not set)
 */
export async function getUserPreferences(uid: string): Promise<UserPreferences> {
  // Check cache first
  const cacheKey = `preferences:${uid}`;
  const cached = cache.get<UserPreferences>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const db = getFirestore();
  const prefsRef = db.collection('users').doc(uid).collection('preferences').doc('settings');
  
  const prefsDoc = await prefsRef.get();
  
  let preferences: UserPreferences;
  if (!prefsDoc.exists) {
    // Return defaults
    const now = Date.now();
    preferences = {
      ...DEFAULT_PREFERENCES,
      updatedAt: now,
      createdAt: now,
    };
  } else {
    const data = prefsDoc.data() as UserPreferences;
    preferences = {
      ...DEFAULT_PREFERENCES,
      ...data,
      // Ensure required fields are present
      dailyLessonGoal: data.dailyLessonGoal ?? DEFAULT_PREFERENCES.dailyLessonGoal,
      // Preserve optional learning preference fields if they exist
      learningStyle: data.learningStyle,
      timePerWeek: data.timePerWeek,
      interests: data.interests,
    };
  }

  // Cache the result
  cache.set(cacheKey, preferences, CACHE_TTL.USER_PREFERENCES);
  return preferences;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  uid: string,
  preferences: Partial<Omit<UserPreferences, 'createdAt' | 'updatedAt'>>
): Promise<UserPreferences> {
  const db = getFirestore();
  const prefsRef = db.collection('users').doc(uid).collection('preferences').doc('settings');
  
  const existing = await prefsRef.get();
  const now = Date.now();
  
  const updatedPreferences: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(existing.exists ? (existing.data() as UserPreferences) : {}),
    ...preferences,
    updatedAt: now,
    createdAt: existing.exists ? (existing.data() as UserPreferences).createdAt : now,
    // Set dailyGoalStartDate if goal is being changed
    dailyGoalStartDate: preferences.dailyLessonGoal !== undefined 
      ? now 
      : (existing.exists ? (existing.data() as UserPreferences).dailyGoalStartDate : undefined),
  };
  
  await prefsRef.set(updatedPreferences);
  
  // Invalidate cache
  cache.delete(`preferences:${uid}`);
  
  return updatedPreferences;
}

