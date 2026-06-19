/**
 * DashboardPage — thin assembler
 *
 * Calls feature hooks, derives DashboardBoardTemplateEntity, mounts
 * DashboardBoardTemplate. All navigation and interaction handled via
 * the event bus (UI:QUICK_ACTION, UI:ACTIVITY_CLICK,
 * UI:LEARNING_PATH_CLICK, UI:CREATE_LEARNING_PATH, UI:DELETE_LEARNING_PATH).
 */

import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { useEventBus, useTranslate } from '@almadar/ui';
import { Brain, BookOpen } from 'lucide-react';
import { DashboardBoardTemplate } from '@design-system/templates/DashboardTemplate/DashboardBoardTemplate';
import type { DashboardBoardTemplateEntity } from '@design-system/templates/DashboardTemplate/DashboardBoardTemplate';
import { useAuthContext } from '../features/auth/AuthContext';
import { useRecentActivity } from '../features/dashboard/hooks/useRecentActivity';
import { useJumpBackIn } from '../features/dashboard/hooks/useJumpBackIn';
import { useDashboardStats } from '../features/dashboard/hooks';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import type { DashboardEntity } from '@design-system/organisms/DashboardBoard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigateEvent();
  const { on } = useEventBus();
  const { t } = useTranslate();

  const { activity, isLoading: isLoadingActivity, formatTimestamp } = useRecentActivity(5);
  const { items: jumpBackInItems, isLoading: isLoadingJumpBackIn } = useJumpBackIn();
  const { stats, isLoading: isLoadingStats } = useDashboardStats();

  const templateUser = getUserForTemplate(user);

  useEffect(() => {
    const unsubQuick = on('UI:QUICK_ACTION', (event) => {
      const actionId = event.payload?.actionId as string | undefined;
      if (actionId === 'createPath') navigate('/learn');
      else if (actionId === 'browseStories') navigate('/stories');
    });
    const unsubActivity = on('UI:ACTIVITY_CLICK', (event) => {
      const activityId = event.payload?.activityId as string | undefined;
      const type = event.payload?.type as string | undefined;
      if (!activityId) return;
      const matched = activity.find(a => a.id === activityId);
      if (!matched) return;
      if (type === 'concept_studied' && matched.metadata?.conceptId) {
        if (matched.metadata.graphId) {
          navigate(`/concepts/${matched.metadata.graphId}/concept/${encodeURIComponent(matched.metadata.conceptId)}`);
        }
      } else if (type === 'story_completed' && matched.metadata?.storyId) {
        navigate(`/stories/${matched.metadata.storyId}`);
      }
    });
    const unsubPath = on('UI:LEARNING_PATH_CLICK', (event) => {
      const graphId = event.payload?.graphId as string | undefined;
      if (graphId) navigate(`/concepts/${graphId}`);
    });
    const unsubCreate = on('UI:CREATE_LEARNING_PATH', () => {
      navigate('/learn');
    });
    return () => {
      unsubQuick();
      unsubActivity();
      unsubPath();
      unsubCreate();
    };
  }, [on, navigate, activity]);

  const navItems = useMemo(
    () => getNavigationItems(location.pathname, mainNavItems),
    [location.pathname]
  );

  const learningPaths = useMemo(
    () =>
      jumpBackInItems
        .filter(item => item.type === 'learningPath' && item.metadata.graphId)
        .map(item => ({
          id: item.id,
          graphId: item.metadata.graphId ?? item.id,
          name: item.title,
          seedConcept: item.description ?? '',
          conceptCount: item.metadata.conceptCount ?? 0,
          levelCount: item.metadata.levelCount ?? 0,
          description: item.description,
        })),
    [jumpBackInItems]
  );

  const recentActivity = useMemo(
    () =>
      activity.map(a => ({
        id: a.id,
        type: a.type,
        title: a.resourceName,
        timestamp: formatTimestamp(a.timestamp),
      })),
    [activity, formatTimestamp]
  );

  const dashboard: DashboardEntity = {
    welcomeName: user?.displayName?.split(' ')[0] ?? t('nav.user'),
    stats: [
      { label: t('dashboard.stat.streak'), value: stats.learningStreak },
      { label: t('dashboard.stat.concepts'), value: stats.conceptsMastered },
    ],
    jumpBackInStories: [],
    recentActivity,
    learningPaths,
    quickActions: [
      { id: 'createPath', label: t('dashboard.action.createPath'), icon: Brain },
      { id: 'browseStories', label: t('dashboard.action.browseStories'), icon: BookOpen },
    ],
  };

  const entity: DashboardBoardTemplateEntity = {
    shell: {
      navigationItems: navItems.map(item => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        href: item.href,
        active: item.active,
      })),
      user: templateUser,
      brandName: 'KFlow',
      activeRoute: location.pathname,
      theme: 'light',
    },
    dashboard,
  };

  const isLoading = isLoadingActivity || isLoadingJumpBackIn || isLoadingStats;

  return <DashboardBoardTemplate entity={entity} isLoading={isLoading} />;
};

DashboardPage.displayName = 'DashboardPage';
