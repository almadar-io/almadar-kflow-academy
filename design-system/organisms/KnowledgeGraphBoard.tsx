/**
 * KnowledgeGraphBoard Organism
 *
 * Knowledge graph with view toggling (graph/list), layer navigation, legend,
 * and node selection. Extracted from KnowledgeGraphTemplate for flattener compliance.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Grid, Network, List as ListIcon } from "lucide-react";
import {
  Box,
  VStack,
  HStack,
  Card,
  Button,
  Typography,
  PageHeader,
  Section,
  LoadingState,
  useEventBus,
  useTranslate,
  type EntityDisplayProps,
} from '@almadar/ui';
import {
  ForceDirectedGraph,
  GraphNode,
  GraphRelationship,
} from "../organisms/ForceDirectedGraph";
import { ConceptCard, ConceptEntity } from "../organisms/ConceptCard";
import { LayerNavigator, LayerInfo } from "../molecules/LayerNavigator";
import {
  GraphLegend,
  LegendItem,
  NODE_TYPE_COLORS,
} from "../molecules/GraphLegend";
import { LearningGoalDisplay } from "../molecules/LearningGoalDisplay";

export type { GraphNode, GraphRelationship, ConceptEntity, LayerInfo };

export interface KnowledgeGraphEntity {
  id: string;
  title: string;
  description?: string;
  nodes: GraphNode[];
  links: GraphRelationship[];
  layers: LayerInfo[];
  currentLayer: number;
  concepts?: ConceptEntity[];
  learningGoal?: string;
}

export interface KnowledgeGraphBoardProps extends EntityDisplayProps<KnowledgeGraphEntity> {
  defaultView?: "graph" | "list";
  showLayerNav?: boolean;
  showLegend?: boolean;
  selectedNodeId?: string | null;
  selectNodeEvent?: string;
  toggleViewEvent?: string;
  viewConceptEvent?: string;
}

export function KnowledgeGraphBoard({
  entity,
  isLoading,
  defaultView = "graph",
  showLayerNav = true,
  showLegend = true,
  selectedNodeId,
  selectNodeEvent,
  toggleViewEvent,
  viewConceptEvent,
  className = "",
}: KnowledgeGraphBoardProps): React.JSX.Element {
  const { emit, on } = useEventBus();
  const { t } = useTranslate();
  const [viewMode, setViewMode] = useState<"graph" | "list">(defaultView);

  const resolved = Array.isArray(entity) ? entity[0] : (entity as KnowledgeGraphEntity | undefined);
  const nodes = resolved?.nodes ?? [];
  const links = resolved?.links ?? [];
  const layers = resolved?.layers ?? [];
  const currentLayer = resolved?.currentLayer ?? 0;

  // Listen for node selections from ForceDirectedGraph and forward
  useEffect(() => {
    const unsub = on('UI:SELECT_GRAPH_NODE', (event) => {
      const nodeId = (event.payload as Record<string, string> | undefined)?.nodeId;
      if (nodeId && selectNodeEvent) {
        emit(`UI:${selectNodeEvent}`, { nodeId, graphId: resolved?.id });
      }
    });
    return unsub;
  }, [on, emit, selectNodeEvent, resolved?.id]);

  const handleToggleGraph = useCallback(() => {
    setViewMode("graph");
    if (toggleViewEvent) emit(`UI:${toggleViewEvent}`, { mode: "graph", graphId: resolved?.id });
  }, [toggleViewEvent, emit, resolved?.id]);

  const handleToggleList = useCallback(() => {
    setViewMode("list");
    if (toggleViewEvent) emit(`UI:${toggleViewEvent}`, { mode: "list", graphId: resolved?.id });
  }, [toggleViewEvent, emit, resolved?.id]);

  const handleViewConcept = useCallback(() => {
    if (viewConceptEvent && selectedNodeId) emit(`UI:${viewConceptEvent}`, { conceptId: selectedNodeId });
  }, [viewConceptEvent, emit, selectedNodeId]);

  const layerConcepts = resolved?.concepts?.filter(
    (c: ConceptEntity) => c.layer === currentLayer,
  );

  const legendItems: LegendItem[] = Object.entries(NODE_TYPE_COLORS)
    .map(([type, color]) => ({
      id: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      color,
      count: nodes.filter((n: GraphNode) => n.type === type).length,
    }))
    .filter((item) => item.count > 0);

  if (isLoading || !resolved) {
    return <LoadingState message="Loading knowledge graph..." />;
  }

  return (
    <Box className={`min-h-screen bg-[var(--color-background)] ${className}`}>
      <PageHeader
        title={resolved.title}
        subtitle={resolved.description}
      >
        <HStack gap="md" align="center">
          <HStack gap="xs" className="bg-gray-100 rounded-lg p-1">
            <Button
              onClick={handleToggleGraph}
              variant="secondary"
              size="sm"
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                viewMode === "graph"
                  ? "bg-white text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
            >
              <Network size={16} />
              {t('graph.graph')}
            </Button>
            <Button
              onClick={handleToggleList}
              variant="secondary"
              size="sm"
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                viewMode === "list"
                  ? "bg-white text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
            >
              <ListIcon size={16} />
              {t('graph.list')}
            </Button>
          </HStack>
        </HStack>
      </PageHeader>

      {showLayerNav && layers.length > 0 && (
        <Box className="max-w-7xl mx-auto px-4 py-3 border-b border-gray-100 bg-white">
          <LayerNavigator
            layers={layers}
            currentLayer={currentLayer}
            showCounts
          />
        </Box>
      )}

      {resolved.learningGoal && (
        <Box className="max-w-7xl mx-auto px-4 py-4">
          <LearningGoalDisplay
            goal={resolved.learningGoal}
            layerNumber={currentLayer}
            graphId={resolved.id}
          />
        </Box>
      )}

      <Box className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === "graph" ? (
          <HStack gap="lg" align="start">
            <Box className="flex-1">
              <Card className="overflow-hidden">
                <ForceDirectedGraph
                  graph={{
                    nodes: Object.fromEntries(
                      nodes.map((n: GraphNode) => [n.id, n]),
                    ),
                    relationships: links,
                  }}
                  height={600}
                  nodeClickEvent="SELECT_GRAPH_NODE"
                />
              </Card>
            </Box>

            <VStack gap="md" className="w-64 flex-shrink-0">
              {showLegend && legendItems.length > 0 && (
                <GraphLegend
                  title={t('graph.nodeTypes')}
                  items={legendItems}
                  interactive
                />
              )}

              {selectedNodeId && (
                <Section title={t('graph.selectedConcept')} variant="card">
                  {(() => {
                    const node = nodes.find(
                      (n: GraphNode) => n.id === selectedNodeId,
                    );
                    if (!node) return null;
                    return (
                      <VStack gap="xs">
                        <Typography variant="small" className="text-[var(--color-foreground)]">
                          {node.properties.label}
                        </Typography>
                        {node.type && (
                          <Typography
                            variant="small"
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default}20`,
                              color:
                                NODE_TYPE_COLORS[node.type] ||
                                NODE_TYPE_COLORS.default,
                            }}
                          >
                            {node.type}
                          </Typography>
                        )}
                        <Button
                          onClick={handleViewConcept}
                          variant="primary"
                          size="sm"
                          className="w-full px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          {t('graph.viewDetails')}
                        </Button>
                      </VStack>
                    );
                  })()}
                </Section>
              )}

              <Section title={t('graph.statistics')} variant="card">
                <VStack gap="xs">
                  <HStack justify="between">
                    <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">{t('graph.concepts')}</Typography>
                    <Typography variant="small" className="text-sm font-medium">
                      {nodes.length}
                    </Typography>
                  </HStack>
                  <HStack justify="between">
                    <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">{t('graph.connections')}</Typography>
                    <Typography variant="small" className="text-sm font-medium">
                      {links.length}
                    </Typography>
                  </HStack>
                  <HStack justify="between">
                    <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">{t('graph.layers')}</Typography>
                    <Typography variant="small" className="text-sm font-medium">
                      {layers.length}
                    </Typography>
                  </HStack>
                </VStack>
              </Section>
            </VStack>
          </HStack>
        ) : (
          <VStack gap="md">
            {layerConcepts && layerConcepts.length > 0 ? (
              layerConcepts.map((concept: ConceptEntity) => (
                <Box key={concept.id} data-entity-row={concept.id}>
                  <ConceptCard
                    entity={concept}
                    operations={[
                      { label: t('graph.view'), action: "view", variant: "primary" },
                    ]}
                  />
                </Box>
              ))
            ) : (
              <Section variant="card">
                <VStack gap="md" align="center" className="py-12">
                  <Grid size={48} className="text-[var(--color-muted-foreground)]" />
                  <Typography variant="small" className="text-[var(--color-muted-foreground)]">
                    {t('graph.noConceptsInLayer')}
                  </Typography>
                </VStack>
              </Section>
            )}
          </VStack>
        )}
      </Box>
    </Box>
  );
}

KnowledgeGraphBoard.displayName = "KnowledgeGraphBoard";

export default KnowledgeGraphBoard;
