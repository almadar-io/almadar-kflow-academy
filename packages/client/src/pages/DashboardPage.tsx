/**
 * DashboardPage — thin assembler
 *
 * Knowledge-graph-led dashboard: the knowledge map is the hero, latest learning paths
 * below, and a single "Generate a learning path" action (navigates to /learn, which hosts
 * the goal/path-generation modal). All interaction via the event bus
 * (UI:LEARNING_PATH_CLICK, UI:CREATE_LEARNING_PATH, UI:DELETE_LEARNING_PATH, UI:KNOWLEDGE_NODE_CLICK).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router';
import { Box, Button, Card, Modal, Spinner, Stack, Typography, VStack, useEventBus, useTranslate } from '@almadar/ui';
import { X } from 'lucide-react';
import kflowLogo from '../assets/kflow-logo.svg';
import { DashboardBoardTemplate } from '@design-system/templates/DashboardTemplate/DashboardBoardTemplate';
import type { DashboardBoardTemplateEntity } from '@design-system/templates/DashboardTemplate/DashboardBoardTemplate';
import { useAuthContext } from '../features/auth/AuthContext';
import { JUMP_BACK_IN_QUERY_KEY } from '../features/dashboard/hooks/useJumpBackIn';
import { useLearningPaths } from '../features/knowledge-graph/hooks/useLearningPaths';
import { useLearningPathsList } from '../features/knowledge-graph/hooks/useLearningPathsList';
import { knowledgeGraphKeys } from '../features/knowledge-graph/hooks/queryKeys';
import { auth } from '../config/firebase';
import { apiClient } from '../services/apiClient';
import type { UiNotifyPayload } from '../app/uiEvents';
import { useLearningPathMap } from '../features/knowledge-graph/hooks/useLearningPathMap';
import { useConceptsByLayer } from '../features/knowledge-graph/hooks/useConceptsByLayer';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import { useAppDispatch } from '../app/hooks';
import { setCurrentGraphId } from '../features/knowledge-graph/knowledgeGraphSlice';
import { graphOperationsStreamingApi } from '../features/knowledge-graph/api/streaming';
import { GoalForm } from '@design-system/organisms/GoalForm';
import { CompanionMascot } from '@design-system/organisms/CompanionMascot';
import { useCompanion } from '../features/companion/hooks/useCompanion';
import type { DashboardEntity, DashboardMapLevel, DashboardFilterLabels, DashboardSort, DashboardLearningPath } from '@design-system/organisms/DashboardBoard';

const L2_CONCEPT_CAP = 60;

export const DashboardPage: React.FC = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigateEvent();
  const queryClient = useQueryClient();
  const { on, emit } = useEventBus();
  const { t } = useTranslate();
  const dispatch = useAppDispatch();
  const companion = useCompanion();

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

  // Goal/path creation flow (merged from /learn — UI:CREATE_LEARNING_PATH now opens here).
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [parsedConcepts, setParsedConcepts] = useState<Array<{ name: string; description: string }>>([]);
  const [parsedLevelName, setParsedLevelName] = useState('');
  const contentAccRef = useRef('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingPathId, setDeletingPathId] = useState<string | null>(null);

  const handleConfirmDelete = useCallback(async () => {
    const pathId = confirmDeleteId;
    if (!pathId) return;
    setConfirmDeleteId(null);
    setDeletingPathId(pathId);
    await handleDeletePath(pathId);
    setDeletingPathId(null);
  }, [confirmDeleteId, handleDeletePath]);

  const handleGoalFormComplete = useCallback(
    async (result: { goalId: string; graphId: string }) => {
      dispatch(setCurrentGraphId(result.graphId));
      setIsExpanding(true);
      setParsedConcepts([]);
      setParsedLevelName('');
      contentAccRef.current = '';
      try {
        await graphOperationsStreamingApi.progressiveExpand(
          result.graphId,
          { numConcepts: 10 },
          {
            onChunk: (chunk: string) => {
              contentAccRef.current += chunk;
              const levelMatch = contentAccRef.current.match(/<level-name>(.*?)<\/level-name>/i);
              if (levelMatch) setParsedLevelName(levelMatch[1].trim());
              const conceptMatches = [
                ...contentAccRef.current.matchAll(/<concept>(.*?)<\/concept>\s*<description>(.*?)<\/description>/gis),
              ];
              setParsedConcepts(conceptMatches.map(m => ({ name: m[1].trim(), description: m[2].trim() })));
            },
            onError: (error: string) => {
              console.error('Expansion stream error', error);
            },
          }
        );
      } catch (err) {
        console.error('Initial expansion failed', err instanceof Error ? err.message : String(err));
      }
      setIsExpanding(false);
      setParsedConcepts([]);
      setParsedLevelName('');
      contentAccRef.current = '';
      setShowGoalForm(false);
      navigate(`/concepts/${result.graphId}`);
      await queryClient.invalidateQueries({ queryKey: JUMP_BACK_IN_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.learningPaths() });
    },
    [dispatch, navigate, queryClient]
  );

  const closeGoalModal = useCallback(() => {
    setShowGoalForm(false);
    setIsExpanding(false);
  }, []);

  const { learningPaths: pathSummaries, loading: pathsLoading, similarity = [], sharedConcepts = [] } = useLearningPaths();

  // Home card grid: server-side search/sort/filter/pagination.
  // Search debouncing lives in <SearchInput> so keystrokes never re-render the page.
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<DashboardSort>('recent');
  const [clusterFilter, setClusterFilter] = useState('');
  const PAGE_LIMIT = 9;

  const list = useLearningPathsList({ search, sort, cluster: clusterFilter, limit: PAGE_LIMIT });
  const { fetchNextPage } = list;

  const handleSortChange = useCallback((v: DashboardSort) => { setSort(v); }, []);
  const handleClusterFilterChange = useCallback((v: string) => { setClusterFilter(v); }, []);
  const handleLoadMore = useCallback(() => { fetchNextPage(); }, [fetchNextPage]);

  // Hero map level: L1 = graph-of-paths, L2 = concepts of the drilled path.
  const [level, setLevel] = useState<DashboardMapLevel>('L1');
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);

  // Top-level knowledge map: every learning path is a node, connected to the paths it
  // shares concepts with (overlap computed server-side). Colors = shared-concept
  // clusters; path↔path cosine similarity (server) drives the force layout.
  const pathMapInputs = useMemo(
    () => pathSummaries.map(p => ({ graphId: p.id, name: p.title, conceptCount: p.conceptCount, cluster: p.cluster })),
    [pathSummaries]
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const pathMap = useLearningPathMap(pathMapInputs, similarity, sharedConcepts, expandedGroups);

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
      setShowGoalForm(true);
    });
    const unsubDelete = on('UI:DELETE_LEARNING_PATH', (event) => {
      const pathId = event.payload?.pathId as string | undefined;
      if (pathId) setConfirmDeleteId(pathId);
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
    const unsubBadge = on('UI:KNOWLEDGE_NODE_BADGE_CLICK', (event) => {
      const nodeId = event.payload?.nodeId as string | undefined;
      if (nodeId) setExpandedGroups((prev) => new Set(prev).add(nodeId));
    });
    return () => {
      unsubPath();
      unsubCreate();
      unsubDelete();
      unsubKnowledgeNode();
      unsubOpen();
      unsubDrill();
      unsubBack();
      unsubBadge();
    };
  }, [on, navigate, handleDeletePath]);

  const navItems = useMemo(
    () => getNavigationItems(location.pathname, mainNavItems),
    [location.pathname]
  );

  const pathMeta = useMemo((): DashboardEntity['pathMeta'] => {
    const m: NonNullable<DashboardEntity['pathMeta']> = {};
    for (const p of pathSummaries) {
      m[p.id] = { title: p.title, description: p.description, seedConcept: p.seedConcept?.name };
    }
    return m;
  }, [pathSummaries]);

  const pathListItems: DashboardLearningPath[] = useMemo(
    () =>
      list.items.map(p => ({
        id: p.id,
        graphId: p.id,
        name: p.title,
        conceptCount: p.conceptCount,
        levelCount: p.levelCount,
        description: p.description,
        updatedAt: p.updatedAt,
      })),
    [list.items]
  );

  const filterLabels: DashboardFilterLabels = useMemo(() => ({
    searchPlaceholder: t('dashboard.searchPlaceholder'),
    all: t('dashboard.filterAll'),
    results: (count: number) => t('dashboard.resultsCount', { count: String(count) }),
    range: (s: number, e: number, total: number) => t('dashboard.paginationRange', { start: String(s), end: String(e), total: String(total) }),
    pageOf: (p: number, total: number) => t('dashboard.pageOf', { page: String(p), total: String(total) }),
  }), [t]);

  const sortOptions = useMemo(() => [
    { value: 'recent', label: t('dashboard.sortRecent') },
    { value: 'oldest', label: t('dashboard.sortOldest') },
    { value: 'az', label: t('dashboard.sortAz') },
    { value: 'za', label: t('dashboard.sortZa') },
  ], [t]);

  const l1KnowledgeMap = useMemo((): DashboardEntity['knowledgeMap'] => {
    if (!pathMap || pathMap.nodes.length === 0) return undefined;
    return { nodes: pathMap.nodes, edges: pathMap.edges, similarity: pathMap.similarity, graphId: pathSummaries[0]?.id ?? '' };
  }, [pathMap, pathSummaries]);

  // No cross-level fallback: L2 shows ONLY the drilled path's concepts (a loader covers the gap).
  const knowledgeMap = level === 'L2' ? conceptMap : l1KnowledgeMap;

  // Show a loader in the map area while its data is in flight (instead of an empty/stale graph).
  const mapLoading =
    level === 'L2'
      ? !!selectedGraphId && l2Loading && !conceptMap
      : pathsLoading && !l1KnowledgeMap;

  const stats: DashboardEntity['stats'] = useMemo(() => {
    const pathCount = pathSummaries.length;
    const conceptTotal = pathSummaries.reduce((sum, p) => sum + (p.conceptCount ?? 0), 0);
    const levelTotal = pathSummaries.reduce((sum, p) => sum + (p.levelCount ?? 0), 0);
    return [
      { value: pathCount, label: t('dashboard.statPaths'), icon: 'paths' as const },
      { value: conceptTotal, label: t('dashboard.statConcepts'), icon: 'concepts' as const },
      { value: levelTotal, label: t('dashboard.statLevels'), icon: 'levels' as const },
    ];
  }, [pathSummaries, t]);

  const dashboard: DashboardEntity = {
    welcomeName: user?.displayName?.split(' ')[0] ?? t('nav.user'),
    stats,
    pathList: {
      items: pathListItems,
      total: list.total,
      totalPages: list.totalPages,
      isLoading: list.isLoading,
      isLoadingMore: list.isFetchingNextPage,
      hasMore: list.hasNextPage,
    },
    filter: { search, sort, clusterFilter, clusters: list.clusters ?? [] },
    onSearchChange: setSearch,
    onSortChange: handleSortChange,
    onClusterFilterChange: handleClusterFilterChange,
    onLoadMore: handleLoadMore,
    filterLabels,
    sortOptions,
    knowledgeMap,
    pathMeta,
    l2Concepts: level === 'L2' && selectedGraphId
      ? l2Concepts.slice(0, L2_CONCEPT_CAP).map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          hasLesson: Boolean(c.properties?.hasLesson),
          layer: c.layer,
        }))
      : undefined,
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
    deletingPathId,
    mapLevel: level,
    mapLoading,
  };

  return (
    <>
      <DashboardBoardTemplate entity={entity} isLoading={pathsLoading} />
      <Modal isOpen={showGoalForm || isExpanding} onClose={closeGoalModal} size="lg">
        {isExpanding ? (
          <VStack gap="md" align="center" className="py-8">
            <Spinner size="lg" />
            <Typography variant="h3">{t('learn.expanding.title')}</Typography>
            <Typography variant="body" color="secondary" className="text-center max-w-md">
              {parsedConcepts.length > 0
                ? t('learn.expanding.progress', { count: String(parsedConcepts.length) })
                : t('learn.expanding.building')}
            </Typography>
            {(parsedLevelName || parsedConcepts.length > 0) && (
              <VStack gap="sm" className="w-full max-h-72 overflow-y-auto">
                {parsedLevelName && (
                  <Card className="px-4 py-2 bg-[var(--color-primary-muted)]">
                    <Typography variant="small" weight="semibold">
                      {t('learn.expanding.layer', { name: parsedLevelName })}
                    </Typography>
                  </Card>
                )}
                {parsedConcepts.map((concept, i) => (
                  <Card key={i} className="px-4 py-3">
                    <Typography variant="small" weight="medium">{concept.name}</Typography>
                    <Typography variant="caption" color="secondary" className="line-clamp-2">
                      {concept.description}
                    </Typography>
                  </Card>
                ))}
              </VStack>
            )}
          </VStack>
        ) : (
          <GoalForm
            onComplete={handleGoalFormComplete}
            onCancel={() => setShowGoalForm(false)}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)} size="sm">
        <VStack gap="md">
          <Typography variant="h3">{t('dashboard.deleteConfirmTitle')}</Typography>
          <Typography variant="body" color="muted">
            {t('dashboard.deleteConfirmMessage')}
          </Typography>
          <Stack direction="horizontal" justify="end" gap="md">
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleConfirmDelete}>
              {t('common.delete')}
            </Button>
          </Stack>
        </VStack>
      </Modal>

      <CompanionMascot
        suggestion={companion.suggestion}
        loading={companion.loading}
        onAccept={companion.accept}
        onDismiss={companion.dismiss}
        onAskWhy={companion.askWhy}
      />
    </>
  );
};

DashboardPage.displayName = 'DashboardPage';
