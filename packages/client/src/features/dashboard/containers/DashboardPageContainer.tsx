/**
 * Container component for DashboardPage
 * Handles data fetching, state management, and passes data to library DashboardPage
 */

import React, { useCallback } from 'react';
import { useLocation } from 'react-router';
import { useAuthContext } from '../../auth/AuthContext';
import { DashboardPage } from '../../../components/pages/DashboardPage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useRecentActivity } from '../hooks';
import { useJumpBackIn } from '../hooks/useJumpBackIn';
import { useNavigateEvent } from '../../../hooks/useNavigateEvent';
import type { JumpBackInItem } from '../preferencesApi';
import type { RecentActivity } from '../statisticsApi';

const DashboardPageContainer: React.FC = () => {
  const navigate = useNavigateEvent();
  const location = useLocation();
  const { user, signOut } = useAuthContext();

  // Logout handler
  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Data fetching hooks
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
    if (item.type === 'learningPath' && item.metadata.graphId) {
      navigate(`/concepts/${item.metadata.graphId}`);
    }
    // Courses not yet implemented for jump back in navigation
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
