/**
 * DashboardBoard Organism
 *
 * Knowledge-graph-led dashboard: the learner's knowledge map is the hero, with their
 * latest learning paths below and a single "Generate a learning path" action.
 *
 * Events Emitted:
 * - UI:LEARNING_PATH_CLICK — user clicks a learning path, payload: { pathId, graphId }
 * - UI:CREATE_LEARNING_PATH — user clicks generate a learning path
 * - UI:DELETE_LEARNING_PATH — user clicks delete path, payload: { pathId }
 * - UI:KNOWLEDGE_NODE_CLICK — user clicks a knowledge map node, payload: { nodeId, graphId }
 * - UI:KNOWLEDGE_NODE_OPEN — user opens the selected node's destination, payload: { graphId, nodeId? }
 * - UI:KNOWLEDGE_NODE_DRILL — user drills a path node into its concept map, payload: { graphId }
 * - UI:KNOWLEDGE_BACK — user returns from the L2 concept map to the L1 path map, payload: {}
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Brain, BookOpen, X, Map, Network, Layers } from 'lucide-react';
import {
  Box,
  VStack,
  HStack,
  Card,
  Button,
  Typography,
  Container,
  Badge,
  EmptyState,
  GraphCanvas,
  Spinner,
  useEventBus,
  useTranslate,
  type DisplayStateProps,
  type GraphNode,
  type GraphEdge,
  type GraphSimilarity,
} from '@almadar/ui';
import { ConnectButton } from '../molecules/ConnectButton';
import { SearchInput } from '../molecules/SearchInput';
import { FilterBar } from '../molecules/FilterBar';
import { StatBadge } from '../molecules/StatBadge';
import { ConceptCard } from './ConceptCard';

export interface DashboardLearningPath {
  id: string;
  graphId: string;
  name: string;
  conceptCount: number;
  levelCount: number;
  description?: string;
  updatedAt?: number;
}

/** Server-paginated learning-path list state for the Home card grid (infinite scroll). */
export interface DashboardPathList {
  items: DashboardLearningPath[];
  total: number;
  totalPages: number;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

export type DashboardLevelFilter = 'all' | '1' | '2-3' | '4plus';
export type DashboardSort = 'recent' | 'oldest' | 'az' | 'za';

export interface DashboardFilterLabels {
  searchPlaceholder: string;
  all: string;
  one: string;
  twoThree: string;
  fourPlus: string;
  sortLabel: string;
  results: (count: number) => string;
  range: (start: number, end: number, total: number) => string;
  pageOf: (page: number, total: number) => string;
}

export type DashboardKnowledgeMapNode = GraphNode & {
  graphId: string;
};

/** Which level the hero knowledge map is showing. */
export type DashboardMapLevel = 'L1' | 'L2';

export interface DashboardStat {
  value: string | number;
  label: string;
  icon?: 'paths' | 'concepts' | 'levels';
}

export interface DashboardEntity {
  /** Display name for the welcome heading. */
  welcomeName?: string;
  /** Aggregate stats row (Home header). */
  stats?: DashboardStat[];
  /** Server-paginated, searchable, filterable learning-path list (Home card grid). */
  pathList?: DashboardPathList;
  /** Current filter state + change handlers (page owns the state). */
  filter?: { search: string; sort: DashboardSort; levelFilter: DashboardLevelFilter };
  onSearchChange?: (value: string) => void;
  onSortChange?: (value: DashboardSort) => void;
  onLevelFilterChange?: (value: DashboardLevelFilter) => void;
  onLoadMore?: () => void;
  filterLabels?: DashboardFilterLabels;
  sortOptions?: Array<{ value: string; label: string }>;
  /** Pre-built knowledge map for the force-directed graph hero */
  knowledgeMap?: {
    nodes: DashboardKnowledgeMapNode[];
    edges: GraphEdge[];
    /** All-pairs path cosine similarity — layout only (L1 map). */
    similarity?: GraphSimilarity[];
    /** The graphId these concepts belong to (for click navigation) */
    graphId: string;
  };
  /** graphId → learning-path goal metadata, used as AI-tutor domain context. */
  pathMeta?: Record<string, { title?: string; description?: string; seedConcept?: string }>;
  /** Rich concept data for drilled (L2) concepts — rendered as ConceptCards below the canvas. */
  l2Concepts?: Array<{ id: string; name: string; description?: string; hasLesson?: boolean; layer?: number }>;
}

export interface DashboardBoardProps extends DisplayStateProps {
  entity?: DashboardEntity;
  /** L1 = graph-of-paths, L2 = concepts of one drilled path. Default L1. */
  level?: DashboardMapLevel;
  /** True while the current level's map data is loading — shows a loader in the map area. */
  mapLoading?: boolean;
}

export function DashboardBoard({
  entity,
  level = 'L1',
  mapLoading = false,
  className = '',
}: DashboardBoardProps): React.JSX.Element {
  const dash = (entity && typeof entity === 'object' && !Array.isArray(entity)) ? entity as DashboardEntity : undefined;
  const { emit } = useEventBus();
  const { t } = useTranslate();
  const [selectedNode, setSelectedNode] = useState<DashboardKnowledgeMapNode | null>(null);
  // Drives the popover's mount transition (tailwindcss-animate isn't loaded, so we toggle
  // opacity/translate on the frame after the popover mounts).
  const [popoverVisible, setPopoverVisible] = useState(false);

  // Drop the selection (and its action popover) when the map level changes, so a node from the
  // other level doesn't linger after drilling in or going back.
  useEffect(() => { setSelectedNode(null); }, [level]);

  useEffect(() => {
    if (!selectedNode) {
      setPopoverVisible(false);
      return;
    }
    const frame = requestAnimationFrame(() => setPopoverVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [selectedNode]);

  const handlePathClick = useCallback((pathId: string, graphId: string) => {
    emit('UI:LEARNING_PATH_CLICK', { pathId, graphId });
  }, [emit]);

  const handleCreatePath = useCallback(() => {
    emit('UI:CREATE_LEARNING_PATH', {});
  }, [emit]);

  const handleDeletePath = useCallback((pathId: string) => {
    emit('UI:DELETE_LEARNING_PATH', { pathId });
  }, [emit]);

  // Single-click: on desktop (no action bar) navigate straight to the detail page;
  // on mobile, select the node so the top action bar (Open/Connect) appears.
  const handleKnowledgeNodeClick = useCallback((node: GraphNode) => {
    const mapNode = node as DashboardKnowledgeMapNode;
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      emit('UI:KNOWLEDGE_NODE_OPEN', { graphId: mapNode.graphId });
    } else {
      setSelectedNode(mapNode);
      emit('UI:KNOWLEDGE_NODE_CLICK', { nodeId: mapNode.id, graphId: mapNode.graphId });
    }
  }, [emit]);

  // Double-click navigates straight to the graph detail page (no parallel L2 drill).
  const handleKnowledgeNodeDoubleClick = useCallback((node: GraphNode) => {
    const mapNode = node as DashboardKnowledgeMapNode;
    emit('UI:KNOWLEDGE_NODE_OPEN', { graphId: mapNode.graphId });
  }, [emit]);

  // Clicking a merged node's count badge expands that cluster (L1 only). The page owns the
  // expanded-groups set and recomputes the map, so we just emit the group id over the bus.
  const handleBadgeClick = useCallback((node: GraphNode) => {
    const mapNode = node as DashboardKnowledgeMapNode;
    emit('UI:KNOWLEDGE_NODE_BADGE_CLICK', { nodeId: mapNode.id, graphId: mapNode.graphId });
  }, [emit]);

  const handleClearSelected = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleOpenSelected = useCallback(() => {
    if (!selectedNode) return;
    emit('UI:KNOWLEDGE_NODE_OPEN', { graphId: selectedNode.graphId });
  }, [emit, selectedNode]);

  const handleConnectSelected = useCallback(() => {
    if (!selectedNode) return;
    const canonicalId = selectedNode.label;
    if (!canonicalId) return;
    const siblings = (dash?.knowledgeMap?.nodes ?? [])
      .filter((n) => n.id !== selectedNode.id)
      .map((n) => n.label)
      .filter(Boolean)
      .slice(0, 8);
    const meta = dash?.pathMeta?.[selectedNode.graphId];
    const ctxParts = ['knowledge map'];
    if (meta?.description) ctxParts.push(`subject: ${meta.description}`);
    else if (meta?.title) ctxParts.push(`subject: ${meta.title}`);
    if (meta?.seedConcept) ctxParts.push(`seed concept: ${meta.seedConcept}`);
    if (siblings.length) ctxParts.push(`other topics: ${siblings.join(', ')}`);
    emit('UI:PEER_CONNECT_OPEN', { nodeKey: `path:${canonicalId}`, context: ctxParts.join('; ') });
  }, [emit, selectedNode, dash]);

  const hasMap = (dash?.knowledgeMap?.nodes?.length ?? 0) > 0;
  const pathList = dash?.pathList;
  const paths = pathList?.items ?? [];
  const hasFilter = !!dash?.filter && (dash.filter.search.trim() !== '' || dash.filter.levelFilter !== 'all');

  // Infinite scroll: when the sentinel enters the viewport (with a 200px lead), load the next page.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMore = dash?.onLoadMore;
  const canLoadMore = !!pathList?.hasMore && !pathList?.isLoadingMore;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !onLoadMore) return;
    // The app shell scrolls an inner overflow-y-auto container (not the window);
    // find the sentinel's nearest scrollable ancestor and listen there.
    let root: HTMLElement | null = null;
    let node = el.parentElement;
    while (node) {
      const s = getComputedStyle(node);
      if (/(auto|scroll)/.test(s.overflowY)) { root = node; break; }
      node = node.parentElement;
    }
    const target: HTMLElement | Window = root ?? window;
    const onScroll = () => {
      if (!canLoadMore) return;
      const rect = el.getBoundingClientRect();
      const bottom = root ? root.getBoundingClientRect().bottom : window.innerHeight;
      if (rect.top <= bottom + 300) onLoadMore();
    };
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [onLoadMore, canLoadMore]);

  return (
    <Container size="lg" padding="sm" className={`py-4 ${className}`}>
      {/* Selected-node actions: a top section bar on MOBILE only. Desktop has no
          action bar — double-click navigates, single-click just highlights. */}
      {selectedNode && typeof document !== 'undefined' &&
        createPortal(
          <Box
            className={`lg:hidden fixed top-0 inset-x-0 z-[60] transition-all duration-200 ease-out ${
              popoverVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <Card
              padding="sm"
              className="w-full rounded-none border-x-0 border-t-0 border-b border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-lg)]"
            >
              <HStack gap="sm" align="center" justify="between">
                <Typography
                  variant="small"
                  className="font-medium text-[var(--color-foreground)] truncate"
                >
                  {selectedNode.label ?? selectedNode.id}
                </Typography>
                <HStack gap="xs" align="center" className="flex-shrink-0">
                  <Button onClick={handleOpenSelected} variant="primary" size="sm">
                    {t('dashboard.open')}
                  </Button>
                  <ConnectButton size="sm" onClick={handleConnectSelected} />
                  <Button
                    onClick={handleClearSelected}
                    variant="ghost"
                    size="sm"
                    icon={X}
                    aria-label={t('learning.close')}
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  />
                </HStack>
              </HStack>
            </Card>
          </Box>,
          document.body
        )}
      {typeof document !== 'undefined' && createPortal(
        <Box className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={handleCreatePath}
            variant="primary"
            icon={Plus}
            aria-label={t('dashboard.createPath')}
            style={{ height: '3.5rem', width: '3.5rem' }}
            className="rounded-full p-0 shadow-lg flex items-center justify-center"
          />
        </Box>,
        document.body,
      )}
      <VStack gap="md">
        {/* Welcome + aggregate stats */}
        <VStack gap="sm">
          <HStack justify="between" align="center">
            {dash?.welcomeName && (
              <Typography variant="h1" className="text-2xl font-bold text-[var(--color-foreground)]">
                {t('dashboard.welcome', { name: dash.welcomeName })}
              </Typography>
            )}
            <Button onClick={handleCreatePath} variant="primary" icon={Plus} className="flex items-center gap-2 shrink-0">
              {t('dashboard.createPath')}
            </Button>
          </HStack>
          {dash?.stats && dash.stats.length > 0 && (
            <HStack gap="md" wrap>
              {dash.stats.map((stat, i) => {
                const iconMap = { paths: Map, concepts: Network, levels: Layers } as const;
                return (
                  <StatBadge
                    key={i}
                    value={stat.value}
                    label={stat.label}
                    icon={stat.icon ? iconMap[stat.icon] : undefined}
                  />
                );
              })}
            </HStack>
          )}
        </VStack>
        {(hasMap || mapLoading) && (
          <>
            {/* Hero: the knowledge map */}
            <VStack gap="sm" className="mt-4">
              <Box className="relative rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)]">
                {mapLoading || !hasMap ? (
                  <Box className="flex items-center justify-center" style={{ height: 420 }}>
                    <Spinner size="lg" />
                  </Box>
                ) : (
                  <GraphCanvas
                    nodes={dash!.knowledgeMap!.nodes}
                    edges={dash!.knowledgeMap!.edges}
                    similarity={dash!.knowledgeMap!.similarity}
                    height={420}
                    showLabels
                    interactive
                    draggable
                    repulsion={700}
                    linkDistance={180}
                    nodeSpacing={48}
                    selectedNodeId={selectedNode?.id}
                    onNodeClick={handleKnowledgeNodeClick}
                    onNodeDoubleClick={handleKnowledgeNodeDoubleClick}
                    onBadgeClick={handleBadgeClick}
                    className="w-full"
                  />
                )}
              </Box>
            </VStack>

            {/* Learning paths: search + filter + paginated grid */}
            <VStack gap="md">
              <SearchInput
                value={dash?.filter?.search ?? ''}
                onChange={(v) => dash?.onSearchChange?.(v)}
                placeholder={dash?.filterLabels?.searchPlaceholder ?? ''}
              />
              {dash?.filterLabels && dash.sortOptions && dash.filter && (
                <FilterBar
                  levelFilter={dash.filter.levelFilter}
                  onLevelFilterChange={(v) => dash.onLevelFilterChange?.(v)}
                  sort={dash.filter.sort}
                  onSortChange={(v) => dash.onSortChange?.(v)}
                  labels={{
                    all: dash.filterLabels.all,
                    one: dash.filterLabels.one,
                    twoThree: dash.filterLabels.twoThree,
                    fourPlus: dash.filterLabels.fourPlus,
                    sortLabel: dash.filterLabels.sortLabel,
                    results: dash.filterLabels.results,
                  }}
                  resultCount={pathList?.total ?? 0}
                  sortOptions={dash.sortOptions}
                />
              )}

              {pathList?.total === 0 ? (
                hasFilter ? (
                  <Box className="flex flex-col items-center justify-center py-16 text-center">
                    <Typography variant="body" color="muted">
                      {t('dashboard.noResults')}
                    </Typography>
                  </Box>
                ) : (
                  <Box className="flex items-center justify-center py-12">
                    <EmptyState
                      icon={Brain}
                      title={t('dashboard.noPathsTitle')}
                      description={t('dashboard.noPathsDesc')}
                      actionLabel={t('dashboard.createPath')}
                      onAction={handleCreatePath}
                    />
                  </Box>
                )
              ) : pathList?.isLoading && paths.length === 0 ? (
                <Box className="flex items-center justify-center py-16">
                  <Spinner size="lg" />
                </Box>
              ) : (
                <>
                  <VStack gap="md">
                    {paths.map((path: DashboardLearningPath) => {
                      const handleClick = () => handlePathClick(path.id, path.graphId);
                      const meta = dash?.pathMeta?.[path.graphId];
                      const levelWord = path.levelCount === 1 ? t('dashboard.levelSingular') : t('dashboard.levelsLabel');
                      const conceptWord = path.conceptCount === 1 ? t('dashboard.conceptSingular') : t('dashboard.conceptsLabel');
                      const meaningfulDesc = path.description && path.description !== path.name
                        ? path.description
                        : meta?.seedConcept ? `${t('dashboard.startsWith')}: ${meta.seedConcept}` : undefined;
                      return (
                        <ConceptCard
                          key={path.id}
                          id={path.id}
                          name={path.name}
                          description={meaningfulDesc}
                          icon={BookOpen}
                          hideLessonBadge
                          metaBadges={[
                            { label: `${path.levelCount} ${levelWord}`, variant: 'primary' },
                            { label: `${path.conceptCount} ${conceptWord}` },
                          ]}
                          onClick={handleClick}
                          onConnect={() => emit('UI:PEER_CONNECT_OPEN', {
                            nodeKey: `path:${path.name}`,
                            context: [
                              'learning path',
                              meta?.description ? `subject: ${meta.description}` : meta?.title ? `subject: ${meta.title}` : '',
                              meta?.seedConcept ? `seed concept: ${meta.seedConcept}` : '',
                            ].filter(Boolean).join('; '),
                          })}
                          operations={[
                            { label: '', icon: Trash2, onClick: () => handleDeletePath(path.id), variant: 'danger' as const },
                          ]}
                          className="cursor-pointer"
                        />
                      );
                    })}
                  </VStack>

                  {/* Infinite-scroll sentinel */}
                  {pathList?.hasMore && (
                    <Box ref={sentinelRef} className="flex items-center justify-center py-8">
                      {pathList.isLoadingMore && <Spinner size="md" />}
                    </Box>
                  )}
                </>
              )}
            </VStack>
          </>
        )}
      </VStack>
    </Container>
  );
}

DashboardBoard.displayName = 'DashboardBoard';
