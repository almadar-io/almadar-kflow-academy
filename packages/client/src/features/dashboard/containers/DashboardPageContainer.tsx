import React, { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router';
import { useEventBus } from '@almadar/ui';
import { useAuthContext } from '../../auth/AuthContext';
import { DashboardPage } from '@design-system/pages/DashboardPage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useRecentActivity } from '../hooks';
import { useJumpBackIn } from '../hooks/useJumpBackIn';
import { useNavigateEvent } from '../../../hooks/useNavigateEvent';
import type { JumpBackInItem } from '../preferencesApi';
import type { RecentActivity } from '../statisticsApi';

const DashboardPageContainer: React.FC = () => {
  const navigate = useNavigateEvent();
  const location = useLocation();
  const { user } = useAuthContext();
  const { on, emit } = useEventBus();

  const { activity, isLoading: isLoadingActivity, formatTimestamp } = useRecentActivity(5);
  const { items: jumpBackInItems, isLoading: isLoadingJumpBackIn } = useJumpBackIn();

  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  useEffect(() => {
    const unsubCreate = on('UI:CREATE_LEARNING_PATH', () => {
      navigate('/learn');
    });
    const unsubBrowse = on('UI:BROWSE_STORIES', () => {
      navigate('/stories');
    });
    const unsubJump = on('UI:JUMP_BACK_IN_CLICK', (event) => {
      const payload = event.payload as { itemId: string; type: string; graphId?: string } | undefined;
      if (payload?.type === 'learningPath' && payload.graphId) {
        navigate(`/concepts/${payload.graphId}`);
      }
    });
    const unsubActivity = on('UI:ACTIVITY_CLICK', (event) => {
      const payload = event.payload as { type: string; conceptId?: string; graphId?: string; storyId?: string } | undefined;
      if (!payload) return;
      if (payload.type === 'concept_studied' && payload.conceptId) {
        if (payload.graphId) {
          navigate(`/concepts/${payload.graphId}/concept/${encodeURIComponent(payload.conceptId)}`);
        }
      } else if (payload.type === 'story_completed' && payload.storyId) {
        navigate(`/stories/${payload.storyId}`);
      }
    });
    return () => {
      unsubCreate();
      unsubBrowse();
      unsubJump();
      unsubActivity();
    };
  }, [on, navigate]);

  const handleJumpBackInClick = useCallback((item: JumpBackInItem) => {
    emit('UI:JUMP_BACK_IN_CLICK', {
      itemId: item.metadata.graphId || '',
      type: item.type,
      graphId: item.metadata.graphId,
    });
  }, [emit]);

  const handleActivityClick = useCallback((activity: RecentActivity) => {
    emit('UI:ACTIVITY_CLICK', {
      type: activity.type,
      conceptId: activity.metadata?.conceptId,
      graphId: activity.metadata?.graphId,
      storyId: activity.metadata?.storyId,
    });
  }, [emit]);

  return (
    <DashboardPage
      userName={user?.displayName || undefined}
      jumpBackInItems={jumpBackInItems}
      isLoadingJumpBackIn={isLoadingJumpBackIn}
      activities={activity}
      isLoadingActivity={isLoadingActivity}
      formatTimestamp={formatTimestamp}
      onJumpBackInClick={handleJumpBackInClick}
      onCreateLearningPath={() => emit('UI:CREATE_LEARNING_PATH', {})}
      onBrowseStories={() => emit('UI:BROWSE_STORIES', {})}
      onActivityClick={handleActivityClick}
      user={templateUser}
      navigationItems={navigationItems}
    />
  );
};

DashboardPageContainer.displayName = 'DashboardPageContainer';

export default DashboardPageContainer;
export { DashboardPageContainer };
