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

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Brain, ArrowLeft, X } from 'lucide-react';
import {
  Box,
  VStack,
  HStack,
  Card,
  Button,
  Typography,
  SimpleGrid,
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

export interface DashboardLearningPath {
  id: string;
  graphId: string;
  name: string;
  conceptCount: number;
  levelCount: number;
  description?: string;
}

export type DashboardKnowledgeMapNode = GraphNode & {
  graphId: string;
};

/** Which level the hero knowledge map is showing. */
export type DashboardMapLevel = 'L1' | 'L2';

export interface DashboardEntity {
  welcomeName: string;
  learningPaths: DashboardLearningPath[];
  /** Pre-built knowledge map for the force-directed graph hero */
  knowledgeMap?: {
    nodes: DashboardKnowledgeMapNode[];
    edges: GraphEdge[];
    /** All-pairs path cosine similarity — layout only (L1 map). */
    similarity?: GraphSimilarity[];
    /** The graphId these concepts belong to (for click navigation) */
    graphId: string;
  };
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

  const handleKnowledgeNodeClick = useCallback((node: GraphNode) => {
    const mapNode = node as DashboardKnowledgeMapNode;
    setSelectedNode(mapNode);
    emit('UI:KNOWLEDGE_NODE_CLICK', { nodeId: mapNode.id, graphId: mapNode.graphId });
  }, [emit]);

  // Double-click is a shortcut for the selected node's primary action: in L1 it drills into
  // the path's concept map, in L2 it opens the concept. Single-click still just selects.
  const handleKnowledgeNodeDoubleClick = useCallback((node: GraphNode) => {
    const mapNode = node as DashboardKnowledgeMapNode;
    if (level === 'L2') {
      emit('UI:KNOWLEDGE_NODE_OPEN', { graphId: mapNode.graphId, nodeId: mapNode.id });
    } else {
      emit('UI:KNOWLEDGE_NODE_DRILL', { graphId: mapNode.graphId });
    }
  }, [emit, level]);

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
    if (level === 'L2') {
      emit('UI:KNOWLEDGE_NODE_OPEN', { graphId: selectedNode.graphId, nodeId: selectedNode.id });
    } else {
      emit('UI:KNOWLEDGE_NODE_OPEN', { graphId: selectedNode.graphId });
    }
  }, [emit, level, selectedNode]);

  const handleDrillSelected = useCallback(() => {
    if (!selectedNode) return;
    emit('UI:KNOWLEDGE_NODE_DRILL', { graphId: selectedNode.graphId });
  }, [emit, selectedNode]);

  const handleConnectSelected = useCallback(() => {
    if (!selectedNode) return;
    const kind = level === 'L1' ? 'path' : 'concept';
    const canonicalId = selectedNode.label;
    if (!canonicalId) return;
    const siblings = (dash?.knowledgeMap?.nodes ?? [])
      .filter((n) => n.id !== selectedNode.id)
      .map((n) => n.label)
      .filter(Boolean)
      .slice(0, 8);
    const ctx = `knowledge map level ${level}` + (siblings.length ? `; other topics in this map: ${siblings.join(', ')}` : '');
    emit('UI:PEER_CONNECT_OPEN', { nodeKey: `${kind}:${canonicalId}`, context: ctx });
  }, [emit, level, selectedNode, dash]);

  const handleBack = useCallback(() => {
    setSelectedNode(null);
    emit('UI:KNOWLEDGE_BACK', {});
  }, [emit]);

  const hasMap = (dash?.knowledgeMap?.nodes?.length ?? 0) > 0;
  const paths = dash?.learningPaths ?? [];

  return (
    <Container size="lg" padding="sm" className={`py-6 ${className}`}>
      {/* Selected-node actions render in a viewport-fixed top HUD (not pinned to the
          scrollable map) so they stay reachable on mobile and when scrolled away. */}
      {selectedNode && typeof document !== 'undefined' &&
        createPortal(
          <Box
            className={`fixed top-4 inset-x-4 sm:inset-x-0 z-[60] flex justify-center transition-all duration-200 ease-out ${
              popoverVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <Card
              padding="sm"
              className="w-full sm:w-auto bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-lg)]"
            >
              <HStack gap="sm" align="center" justify="between" wrap>
                <Typography
                  variant="small"
                  className="font-medium text-[var(--color-foreground)] truncate max-w-[10rem] sm:max-w-[16rem]"
                >
                  {selectedNode.label ?? selectedNode.id}
                </Typography>
                <HStack gap="xs" align="center">
                  <Button onClick={handleOpenSelected} variant="primary" size="sm">
                    {t('dashboard.open')}
                  </Button>
                  {level === 'L1' && (
                    <Button onClick={handleDrillSelected} variant="secondary" size="sm">
                      {t('dashboard.showConcepts')}
                    </Button>
                  )}
                  <Button onClick={handleConnectSelected} variant="secondary" size="sm">
                    {t('connections.connect')}
                  </Button>
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
      <VStack gap="xl">
        {/* Welcome */}
        <Typography variant="h1" className="text-2xl font-bold text-[var(--color-foreground)]">
          {t('dashboard.welcome', { name: dash?.welcomeName ?? '' })}
        </Typography>

        {(hasMap || mapLoading) ? (
          <>
            {/* Hero: the knowledge map */}
            <VStack gap="sm">
              <Box className="relative rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)]">
                {mapLoading || !hasMap ? (
                  <Box className="flex items-center justify-center" style={{ height: 500 }}>
                    <Spinner size="lg" />
                  </Box>
                ) : (
                  <>
                    <GraphCanvas
                      nodes={dash!.knowledgeMap!.nodes}
                      edges={dash!.knowledgeMap!.edges}
                      similarity={dash!.knowledgeMap!.similarity}
                      height={500}
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

                    {/* Back control — overlaid top-left, returns from the L2 concept map to L1. */}
                    {level === 'L2' && (
                      <Button
                        onClick={handleBack}
                        variant="ghost"
                        size="sm"
                        className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)] transition-all duration-200"
                      >
                        <ArrowLeft size={16} />
                        {t('dashboard.back')}
                      </Button>
                    )}

                  </>
                )}
              </Box>
            </VStack>

            {/* Latest learning paths */}
            <VStack gap="sm">
              <HStack justify="between" align="center">
                <Typography variant="h3" className="text-lg font-semibold text-[var(--color-foreground)]">
                  {t('dashboard.learningPaths')}
                </Typography>
                <Button onClick={handleCreatePath} variant="primary" size="sm" className="flex items-center gap-1">
                  <Plus size={16} />
                  {t('dashboard.createPath')}
                </Button>
              </HStack>

              <SimpleGrid minChildWidth="280px" gap="md">
                {paths.map((path: DashboardLearningPath) => {
                  const handleClick = () => handlePathClick(path.id, path.graphId);
                  const handleDelete = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleDeletePath(path.id);
                  };
                  return (
                    <Card
                      key={path.id}
                      data-entity-row={path.id}
                      className="p-4 cursor-pointer border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-1 transition-all duration-[var(--transition-normal)]"
                      onClick={handleClick}
                    >
                      <VStack gap="sm">
                        <HStack justify="between" align="start">
                          <VStack gap="xs" className="flex-1 min-w-0">
                            <Typography variant="h4" className="font-semibold text-[var(--color-foreground)]">
                              {path.name}
                            </Typography>
                            {path.description && (
                              <Typography variant="small" className="text-[var(--color-muted-foreground)] line-clamp-2">
                                {path.description}
                              </Typography>
                            )}
                          </VStack>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            className="p-1 text-[var(--color-muted-foreground)] hover:text-error flex-shrink-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </HStack>
                        <HStack gap="sm">
                          <Badge variant="info" size="sm">
                            {t('dashboard.concepts', { count: path.conceptCount })}
                          </Badge>
                          <Badge variant="default" size="sm">
                            {t('dashboard.levels', { count: path.levelCount })}
                          </Badge>
                        </HStack>
                      </VStack>
                    </Card>
                  );
                })}
              </SimpleGrid>
            </VStack>
          </>
        ) : (
          /* No knowledge yet — one clear call to generate the first learning path */
          <Box className="flex-1 flex items-center justify-center min-h-[50vh]">
            <EmptyState
              icon={Brain}
              title={t('dashboard.noPathsTitle')}
              description={t('dashboard.noPathsDesc')}
              actionLabel={t('dashboard.createPath')}
              onAction={handleCreatePath}
            />
          </Box>
        )}
      </VStack>
    </Container>
  );
}

DashboardBoard.displayName = 'DashboardBoard';
