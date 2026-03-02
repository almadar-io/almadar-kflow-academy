/**
 * Container component for DashboardPage
 * Handles data fetching, state management, and passes data to library DashboardPage
 */

import React, { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuthContext } from '../../auth/AuthContext';
import { DashboardPage } from '../../../components/pages/DashboardPage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useAppSelector } from '../../../app/hooks';
import { useHomeConcepts } from '../../concepts/hooks/useHomeConcepts';
import { useRecentActivity } from '../hooks';
import { useJumpBackIn } from '../hooks/useJumpBackIn';
import type { JumpBackInItem } from '../preferencesApi';
import type { RecentActivity } from '../statisticsApi';

const DashboardPageContainer: React.FC = () => {
  // eslint-disable-next-line almadar/no-use-navigate
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
  const { items: jumpBackInItems, isLoading: isLoadingJumpBackIn } = useJumpBackIn();

  // Navigation configuration
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  // Handle jump back in click
  const handleJumpBackInClick = (item: JumpBackInItem) => {
    if (item.type === 'story' && item.metadata.storyId) {
      navigate(`/stories/${item.metadata.storyId}`);
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
    if (activity.type === 'concept_studied' && activity.metadata?.conceptId) {
      if (activity.metadata.graphId) {
        const conceptId = encodeURIComponent(activity.metadata.conceptId);
        navigate(`/concepts/${activity.metadata.graphId}/concept/${conceptId}`);
      }
    } else if (activity.type === 'story_completed' && activity.metadata?.storyId) {
      navigate(`/stories/${activity.metadata.storyId}`);
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
      onJumpBackInClick={handleJumpBackInClick}
      onCreateLearningPath={() => navigate('/learn')}
      onBrowseStories={() => navigate('/stories')}
      onExplore={() => navigate('/explore')}
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
