/**
 * DashboardPage — thin assembler
 *
 * Knowledge-graph-led dashboard: the knowledge map is the hero, latest learning paths
 * below, and a single "Generate a learning path" action (navigates to /learn, which hosts
 * the goal/path-generation modal). All interaction via the event bus
 * (UI:LEARNING_PATH_CLICK, UI:CREATE_LEARNING_PATH, UI:DELETE_LEARNING_PATH, UI:KNOWLEDGE_NODE_CLICK).
 */

import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { useEventBus, useTranslate } from '@almadar/ui';
import kflowLogo from '../assets/kflow-logo.svg';
import { DashboardBoardTemplate } from '@design-system/templates/DashboardTemplate/DashboardBoardTemplate';
import type { DashboardBoardTemplateEntity } from '@design-system/templates/DashboardTemplate/DashboardBoardTemplate';
import { useAuthContext } from '../features/auth/AuthContext';
import { useJumpBackIn } from '../features/dashboard/hooks/useJumpBackIn';
import { useLearningPaths } from '../features/knowledge-graph/hooks/useLearningPaths';
import { useLearningPathMap } from '../features/knowledge-graph/hooks/useLearningPathMap';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import type { DashboardEntity } from '@design-system/organisms/DashboardBoard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigateEvent();
  const { on } = useEventBus();
  const { t } = useTranslate();

  const { items: jumpBackInItems, isLoading: isLoadingJumpBackIn } = useJumpBackIn();
  const { learningPaths: pathSummaries } = useLearningPaths();

  // Top-level knowledge map: every learning path is a node, connected to the paths it shares concepts with.
  const pathMapInputs = useMemo(
    () => pathSummaries.map(p => ({ graphId: p.id, name: p.title, conceptCount: p.conceptCount })),
    [pathSummaries]
  );
  const pathMap = useLearningPathMap(pathMapInputs);

  const templateUser = getUserForTemplate(user);

  useEffect(() => {
    const unsubPath = on('UI:LEARNING_PATH_CLICK', (event) => {
      const graphId = event.payload?.graphId as string | undefined;
      if (graphId) navigate(`/concepts/${graphId}`);
    });
    const unsubCreate = on('UI:CREATE_LEARNING_PATH', () => {
      navigate('/learn');
    });
    const unsubKnowledgeNode = on('UI:KNOWLEDGE_NODE_CLICK', (event) => {
      // Top-level map nodes are learning paths — clicking one drills into its concept graph.
      // For a path node the node id IS its graphId, so either field identifies the path.
      const graphId = (event.payload?.graphId ?? event.payload?.nodeId) as string | undefined;
      if (graphId) navigate(`/concepts/${graphId}`);
    });
    return () => {
      unsubPath();
      unsubCreate();
      unsubKnowledgeNode();
    };
  }, [on, navigate]);

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

  const knowledgeMap = useMemo((): DashboardEntity['knowledgeMap'] => {
    if (!pathMap || pathMap.nodes.length === 0) return undefined;
    return { nodes: pathMap.nodes, edges: pathMap.edges, graphId: pathSummaries[0]?.id ?? '' };
  }, [pathMap, pathSummaries]);

  const dashboard: DashboardEntity = {
    welcomeName: user?.displayName?.split(' ')[0] ?? t('nav.user'),
    learningPaths,
    knowledgeMap,
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
      logoSrc: kflowLogo,
      brandName: 'KFlow',
      activeRoute: location.pathname,
      theme: 'light',
    },
    dashboard,
  };

  return <DashboardBoardTemplate entity={entity} isLoading={isLoadingJumpBackIn} />;
};

DashboardPage.displayName = 'DashboardPage';
