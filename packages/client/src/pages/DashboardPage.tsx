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
import { useConceptsByLayer } from '../features/knowledge-graph/hooks/useConceptsByLayer';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import type { DashboardEntity, DashboardKnowledgeMapNode } from '@design-system/organisms/DashboardBoard';
import type { GraphViewEdge } from '@almadar/ui';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigateEvent();
  const { on } = useEventBus();
  const { t } = useTranslate();

  const { items: jumpBackInItems, isLoading: isLoadingJumpBackIn } = useJumpBackIn();
  const { learningPaths: pathSummaries } = useLearningPaths();

  // Use the most recently updated learning path for the knowledge map hero
  const primaryGraphId = pathSummaries[0]?.id ?? '';
  const { concepts: mapConcepts } = useConceptsByLayer(primaryGraphId, {
    includeRelationships: true,
    enabled: !!primaryGraphId,
  });

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
      const nodeId = event.payload?.nodeId as string | undefined;
      const graphId = event.payload?.graphId as string | undefined;
      if (nodeId && graphId) {
        navigate(`/concepts/${graphId}/concept/${encodeURIComponent(nodeId)}`);
      }
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

  // Node cap: limit to 60 concepts so the graph stays readable
  const NODE_CAP = 60;
  const knowledgeMap = useMemo((): DashboardEntity['knowledgeMap'] => {
    if (!primaryGraphId || mapConcepts.length === 0) return undefined;
    const capped = mapConcepts.slice(0, NODE_CAP);
    const cappedIds = new Set(capped.map(c => c.id));
    const nodes: DashboardKnowledgeMapNode[] = capped.map(c => ({
      id: c.id,
      label: c.name,
      graphId: primaryGraphId,
      group: String(c.layer),
    }));
    const edgeSet = new Set<string>();
    const edges: GraphViewEdge[] = [];
    for (const c of capped) {
      for (const childId of c.children) {
        if (!cappedIds.has(childId)) continue;
        const key = `${c.id}→${childId}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source: c.id, target: childId });
        }
      }
    }
    return { nodes, edges, graphId: primaryGraphId };
  }, [primaryGraphId, mapConcepts]);

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
