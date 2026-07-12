/**
 * DashboardPage — thin assembler
 *
 * Knowledge-graph-led dashboard: the knowledge map is the hero, latest learning paths
 * below, and a single "Generate a learning path" action (navigates to /learn, which hosts
 * the goal/path-generation modal). All interaction via the event bus
 * (UI:LEARNING_PATH_CLICK, UI:CREATE_LEARNING_PATH, UI:DELETE_LEARNING_PATH, UI:KNOWLEDGE_NODE_CLICK).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router';
import { useEventBus, useTranslate } from '@almadar/ui';
import kflowLogo from '../assets/kflow-logo.svg';
import { DashboardBoardTemplate } from '@design-system/templates/DashboardTemplate/DashboardBoardTemplate';
import type { DashboardBoardTemplateEntity } from '@design-system/templates/DashboardTemplate/DashboardBoardTemplate';
import { useAuthContext } from '../features/auth/AuthContext';
import { useJumpBackIn, JUMP_BACK_IN_QUERY_KEY } from '../features/dashboard/hooks/useJumpBackIn';
import { useLearningPaths } from '../features/knowledge-graph/hooks/useLearningPaths';
import { knowledgeGraphKeys } from '../features/knowledge-graph/hooks/queryKeys';
import { auth } from '../config/firebase';
import { apiClient } from '../services/apiClient';
import type { UiNotifyPayload } from '../app/uiEvents';
import { useLearningPathMap } from '../features/knowledge-graph/hooks/useLearningPathMap';
import { useConceptsByLayer } from '../features/knowledge-graph/hooks/useConceptsByLayer';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import type { DashboardEntity, DashboardMapLevel } from '@design-system/organisms/DashboardBoard';

const L2_CONCEPT_CAP = 60;

export const DashboardPage: React.FC = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigateEvent();
  const queryClient = useQueryClient();
  const { on, emit } = useEventBus();
  const { t } = useTranslate();

  const handleDeletePath = useCallback(
    async (pathId: string) => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User is not authenticated');
        const token = await currentUser.getIdToken();
        await apiClient.fetch(`/api/graphs/${pathId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        emit('UI:NOTIFY', { severity: 'success', message: t('learn.deleteSuccess') } satisfies UiNotifyPayload);
        await queryClient.invalidateQueries({ queryKey: JUMP_BACK_IN_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.learningPaths() });
      } catch {
        emit('UI:NOTIFY', { severity: 'error', message: t('learn.deleteError') } satisfies UiNotifyPayload);
      }
    },
    [emit, t, queryClient]
  );

  const { items: jumpBackInItems, isLoading: isLoadingJumpBackIn } = useJumpBackIn();
  const { learningPaths: pathSummaries, loading: pathsLoading, semanticEdges = [] } = useLearningPaths();

  // Hero map level: L1 = graph-of-paths, L2 = concepts of the drilled path.
  const [level, setLevel] = useState<DashboardMapLevel>('L1');
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);

  // Top-level knowledge map: every learning path is a node, connected to the paths it shares concepts with.
  // Augmented with semanticEdges from cross-graph vector search (Chroma) for similar-path clustering.
  const pathMapInputs = useMemo(
    () => pathSummaries.map(p => ({ graphId: p.id, name: p.title, conceptCount: p.conceptCount })),
    [pathSummaries]
  );
  const pathMap = useLearningPathMap(pathMapInputs, semanticEdges);

  // L2 drill: the concepts of one path, edged by concept parent -> child.
  const { concepts: l2Concepts, loading: l2Loading } = useConceptsByLayer(selectedGraphId ?? '', {
    includeRelationships: true,
    enabled: level === 'L2' && !!selectedGraphId,
  });

  const conceptMap = useMemo((): DashboardEntity['knowledgeMap'] => {
    if (level !== 'L2' || !selectedGraphId || l2Concepts.length === 0) return undefined;
    const capped = l2Concepts.slice(0, L2_CONCEPT_CAP);
    const idSet = new Set(capped.map(c => c.id));
    const nodes = capped.map(c => ({
      id: c.id,
      label: c.name,
      group: String(c.layer),
      graphId: selectedGraphId,
      size: 8,
    }));
    const edges = capped.flatMap(c =>
      c.children
        .filter(childId => idSet.has(childId))
        .map(childId => ({ source: c.id, target: childId }))
    );
    return { nodes, edges, graphId: selectedGraphId };
  }, [level, selectedGraphId, l2Concepts]);

  const templateUser = getUserForTemplate(user);

  useEffect(() => {
    const unsubPath = on('UI:LEARNING_PATH_CLICK', (event) => {
      const graphId = event.payload?.graphId as string | undefined;
      if (graphId) navigate(`/concepts/${graphId}`);
    });
    const unsubCreate = on('UI:CREATE_LEARNING_PATH', () => {
      navigate('/learn');
    });
    const unsubDelete = on('UI:DELETE_LEARNING_PATH', (event) => {
      const pathId = event.payload?.pathId as string | undefined;
      if (pathId) handleDeletePath(pathId);
    });
    // Node click only highlights + populates the in-board action bar (handled in DashboardBoard);
    // navigation now happens via the explicit OPEN/DRILL actions below.
    const unsubKnowledgeNode = on('UI:KNOWLEDGE_NODE_CLICK', () => {});
    const unsubOpen = on('UI:KNOWLEDGE_NODE_OPEN', (event) => {
      const graphId = event.payload?.graphId as string | undefined;
      if (!graphId) return;
      const nodeId = event.payload?.nodeId as string | undefined;
      if (nodeId) {
        navigate(`/concepts/${graphId}/concept/${encodeURIComponent(nodeId)}`);
      } else {
        navigate(`/concepts/${graphId}`);
      }
    });
    const unsubDrill = on('UI:KNOWLEDGE_NODE_DRILL', (event) => {
      const graphId = event.payload?.graphId as string | undefined;
      if (!graphId) return;
      setSelectedGraphId(graphId);
      setLevel('L2');
    });
    const unsubBack = on('UI:KNOWLEDGE_BACK', () => {
      setLevel('L1');
      setSelectedGraphId(null);
    });
    return () => {
      unsubPath();
      unsubCreate();
      unsubDelete();
      unsubKnowledgeNode();
      unsubOpen();
      unsubDrill();
      unsubBack();
    };
  }, [on, navigate, handleDeletePath]);

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
          conceptCount: item.metadata.conceptCount ?? 0,
          levelCount: item.metadata.levelCount ?? 0,
          description: item.description,
        })),
    [jumpBackInItems]
  );

  const l1KnowledgeMap = useMemo((): DashboardEntity['knowledgeMap'] => {
    if (!pathMap || pathMap.nodes.length === 0) return undefined;
    return { nodes: pathMap.nodes, edges: pathMap.edges, graphId: pathSummaries[0]?.id ?? '' };
  }, [pathMap, pathSummaries]);

  // No cross-level fallback: L2 shows ONLY the drilled path's concepts (a loader covers the gap).
  const knowledgeMap = level === 'L2' ? conceptMap : l1KnowledgeMap;

  // Show a loader in the map area while its data is in flight (instead of an empty/stale graph).
  const mapLoading =
    level === 'L2'
      ? !!selectedGraphId && l2Loading && !conceptMap
      : pathsLoading && !l1KnowledgeMap;

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
    mapLevel: level,
    mapLoading,
  };

  return <DashboardBoardTemplate entity={entity} isLoading={isLoadingJumpBackIn} />;
};

DashboardPage.displayName = 'DashboardPage';
