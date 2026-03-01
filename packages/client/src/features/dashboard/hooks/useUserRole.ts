import { useAppSelector } from '../../../app/hooks';

export interface UserRole {
  isMentor: boolean;
  isLearner: boolean;
  hasLearningPaths: boolean;
}

/**
 * Hook to detect user role based on their data
 * Simplified version - no mentor/student features
 */
export function useUserRole(): UserRole {
  const { graphs } = useAppSelector(state => state.concepts);

  return {
    isMentor: false,
    isLearner: graphs.length > 0,
    hasLearningPaths: graphs.length > 0,
  };
}
