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
import { Plus, Trash2, Brain, BookOpen, X } from 'lucide-react';
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
import { ConnectButton } from '../molecules/ConnectButton';
import { ConceptCard } from './ConceptCard';

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

  const handleKnowledgeNodeClick = useCallback((node: GraphNode) => {
    const mapNode = node as DashboardKnowledgeMapNode;
    setSelectedNode(mapNode);
    emit('UI:KNOWLEDGE_NODE_CLICK', { nodeId: mapNode.id, graphId: mapNode.graphId });
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
  const paths = dash?.learningPaths ?? [];

  return (
    <Container size="lg" padding="sm" className={`py-6 ${className}`}>
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
                  const meta = dash?.pathMeta?.[path.graphId];
                  const desc = [
                    path.description,
                    `${path.conceptCount} ${t('dashboard.conceptsLabel')}`,
                    `${path.levelCount} ${t('dashboard.levelsLabel')}`,
                  ].filter(Boolean).join(' · ');
                  return (
                    <ConceptCard
                      key={path.id}
                      id={path.id}
                      name={path.name}
                      description={desc}
                      icon={BookOpen}
                      hideLessonBadge
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
