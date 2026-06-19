import { cache, CACHE_TTL } from './cacheService';
import { studentData } from './studentDataAccess';

export interface UserPreferences {
  dailyLessonGoal: number;
  dailyGoalStartDate?: number;
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  timePerWeek?: number;
  interests?: string[];
  updatedAt: number;
  createdAt: number;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'updatedAt' | 'createdAt'> = {
  dailyLessonGoal: 3,
};

export async function getUserPreferences(uid: string): Promise<UserPreferences> {
  const cacheKey = `preferences:${uid}`;
  const cached = cache.get<UserPreferences>(cacheKey);
  if (cached !== null) return cached;

  const stored = await studentData.getPreferences(uid);

  let preferences: UserPreferences;
  if (!stored) {
    const now = Date.now();
    preferences = { ...DEFAULT_PREFERENCES, updatedAt: now, createdAt: now };
  } else {
    preferences = {
      ...DEFAULT_PREFERENCES,
      dailyLessonGoal: stored.dailyLessonGoal ?? DEFAULT_PREFERENCES.dailyLessonGoal,
      dailyGoalStartDate: stored.dailyGoalStartDate,
      learningStyle: stored.learningStyle as UserPreferences['learningStyle'],
      timePerWeek: stored.timePerWeek,
      interests: stored.interests,
      updatedAt: stored.updatedAt,
      createdAt: stored.createdAt,
    };
  }

  cache.set(cacheKey, preferences, CACHE_TTL.USER_PREFERENCES);
  return preferences;
}

export async function updateUserPreferences(
  uid: string,
  preferences: Partial<Omit<UserPreferences, 'createdAt' | 'updatedAt'>>
): Promise<UserPreferences> {
  const existing = await getUserPreferences(uid);
  const now = Date.now();

  const updatedPreferences: UserPreferences = {
    ...existing,
    ...preferences,
    updatedAt: now,
    createdAt: existing.createdAt,
    dailyGoalStartDate: preferences.dailyLessonGoal !== undefined ? now : existing.dailyGoalStartDate,
  };

  await studentData.setPreferences(uid, {
    dailyLessonGoal: updatedPreferences.dailyLessonGoal,
    dailyGoalStartDate: updatedPreferences.dailyGoalStartDate,
    learningStyle: updatedPreferences.learningStyle,
    timePerWeek: updatedPreferences.timePerWeek,
    interests: updatedPreferences.interests ?? [],
    updatedAt: updatedPreferences.updatedAt,
    createdAt: updatedPreferences.createdAt,
  });
  cache.delete(`preferences:${uid}`);
  return updatedPreferences;
}
