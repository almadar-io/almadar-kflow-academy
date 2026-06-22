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
 */

import React, { useCallback } from 'react';
import { BookOpen, Plus, Trash2, Brain } from 'lucide-react';
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
  GraphView,
  useEventBus,
  useTranslate,
  type DisplayStateProps,
  type GraphViewNode,
  type GraphViewEdge,
} from '@almadar/ui';

export interface DashboardLearningPath {
  id: string;
  graphId: string;
  name: string;
  seedConcept: string;
  conceptCount: number;
  levelCount: number;
  description?: string;
}

export interface DashboardKnowledgeMapNode extends GraphViewNode {
  graphId: string;
}

export interface DashboardEntity {
  welcomeName: string;
  learningPaths: DashboardLearningPath[];
  /** Pre-built knowledge map for the force-directed graph hero */
  knowledgeMap?: {
    nodes: DashboardKnowledgeMapNode[];
    edges: GraphViewEdge[];
    /** The graphId these concepts belong to (for click navigation) */
    graphId: string;
  };
}

export interface DashboardBoardProps extends DisplayStateProps {
  entity?: DashboardEntity;
}

export function DashboardBoard({
  entity,
  className = '',
}: DashboardBoardProps): React.JSX.Element {
  const dash = (entity && typeof entity === 'object' && !Array.isArray(entity)) ? entity as DashboardEntity : undefined;
  const { emit } = useEventBus();
  const { t } = useTranslate();

  const handlePathClick = useCallback((pathId: string, graphId: string) => {
    emit('UI:LEARNING_PATH_CLICK', { pathId, graphId });
  }, [emit]);

  const handleCreatePath = useCallback(() => {
    emit('UI:CREATE_LEARNING_PATH', {});
  }, [emit]);

  const handleDeletePath = useCallback((pathId: string) => {
    emit('UI:DELETE_LEARNING_PATH', { pathId });
  }, [emit]);

  const handleKnowledgeNodeClick = useCallback((node: GraphViewNode) => {
    const mapNode = node as DashboardKnowledgeMapNode;
    emit('UI:KNOWLEDGE_NODE_CLICK', { nodeId: mapNode.id, graphId: mapNode.graphId });
  }, [emit]);

  const hasMap = (dash?.knowledgeMap?.nodes?.length ?? 0) > 0;
  const paths = dash?.learningPaths ?? [];

  return (
    <Container size="lg" padding="sm" className={`py-6 ${className}`}>
      <VStack gap="xl">
        {/* Welcome */}
        <Typography variant="h1" className="text-2xl font-bold text-[var(--color-foreground)]">
          {t('dashboard.welcome', { name: dash?.welcomeName ?? '' })}
        </Typography>

        {hasMap ? (
          <>
            {/* Hero: the knowledge map */}
            <VStack gap="sm">
              <Typography variant="h3" className="text-lg font-semibold text-[var(--color-foreground)]">
                {t('dashboard.knowledgeMap')}
              </Typography>
              <Box className="rounded-lg overflow-hidden border border-[var(--color-border)]">
                <GraphView
                  nodes={dash!.knowledgeMap!.nodes}
                  edges={dash!.knowledgeMap!.edges}
                  height={500}
                  showLabels
                  zoomToFit
                  onNodeClick={handleKnowledgeNodeClick}
                  className="w-full"
                />
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
                          <VStack gap="xs">
                            <Typography variant="h4" className="font-semibold text-[var(--color-foreground)]">
                              {path.name}
                            </Typography>
                            <Typography variant="small" className="text-[var(--color-muted-foreground)]">
                              {path.seedConcept}
                            </Typography>
                          </VStack>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            className="p-1 text-[var(--color-muted-foreground)] hover:text-red-500"
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
                        {path.description && (
                          <Typography variant="small" className="text-[var(--color-muted-foreground)] line-clamp-2">
                            {path.description}
                          </Typography>
                        )}
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
