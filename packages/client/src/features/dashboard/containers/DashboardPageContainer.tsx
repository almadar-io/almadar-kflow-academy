/**
 * Container component for DashboardPage
 * Handles data fetching, state management, and passes data to library DashboardPage
 */

import React, { useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import { useAuthContext } from '../../auth/AuthContext';
import { DashboardPage } from '../../../components/pages/DashboardPage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useAppSelector } from '../../../app/hooks';
import { useHomeConcepts } from '../../concepts/hooks/useHomeConcepts';
import { useDashboardStats, useRecentActivity, useUserRole } from '../hooks';
import { useJumpBackIn } from '../hooks/useJumpBackIn';
import type { JumpBackInItem } from '../preferencesApi';
import type { RecentActivity } from '../statisticsApi';

const DashboardPageContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthContext();
  const { graphs } = useAppSelector(state => state.concepts);

  // Logout handler
  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);
  
  // Data fetching hooks
  const { seedEntries, handleConceptClick } = useHomeConcepts(graphs);
  const { activity, isLoading: isLoadingActivity, formatTimestamp } = useRecentActivity(5);
  const { isMentor, isLearner, hasLearningPaths } = useUserRole();
  const { items: jumpBackInItems, isLoading: isLoadingJumpBackIn } = useJumpBackIn();

  // Navigation configuration
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  // Handle jump back in click
  const handleJumpBackInClick = (item: JumpBackInItem) => {
    if (item.type === 'course' && item.metadata.courseId) {
      navigate(`/course/${item.metadata.courseId}`);
    } else if (item.type === 'learningPath' && item.metadata.graphId && item.metadata.seedConceptId) {
      const graph = graphs.find(g => g.id === item.metadata.graphId);
      if (graph) {
        const seedConcept = Array.from(graph.concepts.values()).find(
          c => c.id === item.metadata.seedConceptId || c.isSeed
        );
        if (seedConcept) {
          handleConceptClick(item.metadata.graphId, seedConcept);
        }
      }
    }
  };

  // Handle activity click
  const handleActivityClick = (activity: RecentActivity) => {
    if (activity.metadata?.courseId) {
      navigate(`/course/${activity.metadata.courseId}`);
    } else if (activity.type === 'concept_studied' && activity.metadata?.conceptId) {
      if (activity.metadata.graphId) {
        const conceptId = encodeURIComponent(activity.metadata.conceptId);
        navigate(`/concepts/${activity.metadata.graphId}/concept/${conceptId}`);
      } else if (activity.metadata.courseId && activity.metadata.lessonId) {
        navigate(`/course/${activity.metadata.courseId}`);
      }
    }
  };

  return (
    <DashboardPage
      userName={user?.displayName || undefined}
      jumpBackInItems={jumpBackInItems}
      isLoadingJumpBackIn={isLoadingJumpBackIn}
      activities={activity}
      isLoadingActivity={isLoadingActivity}
      formatTimestamp={formatTimestamp}
      hasLearningPaths={hasLearningPaths}
      onJumpBackInClick={handleJumpBackInClick}
      onCreateLearningPath={() => navigate('/learn')}
      onBrowseCourses={() => navigate('/my-courses')}
      onMentorStudio={() => navigate('/mentor')}
      onActivityClick={handleActivityClick}
      user={templateUser}
      navigationItems={navigationItems}
      onLogoClick={() => navigate('/home')}
      onLogout={handleLogout}
    />
  );
};

DashboardPageContainer.displayName = 'DashboardPageContainer';

export default DashboardPageContainer;
export { DashboardPageContainer };
