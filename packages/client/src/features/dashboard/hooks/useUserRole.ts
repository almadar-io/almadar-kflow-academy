import { useAppSelector } from '../../../app/hooks';
import { useMentorPublishedCourses } from '../../knowledge-graph/hooks';
import { useEnrolledCourses } from '../../student/hooks/useEnrolledCourses';

export interface UserRole {
  isMentor: boolean;
  isLearner: boolean;
  hasLearningPaths: boolean;
}

/**
 * Hook to detect user role based on their data
 */
export function useUserRole(): UserRole {
  const { graphs } = useAppSelector(state => state.concepts);
  const courses = useMentorPublishedCourses();
  const { enrolledCourses } = useEnrolledCourses();

  return {
    isMentor: (courses.data || []).length > 0,
    isLearner: enrolledCourses.length > 0,
    hasLearningPaths: graphs.length > 0,
  };
}
