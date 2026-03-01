/**
 * Force-Directed Graph Visualization Component
 * 
 * Uses D3.js force simulation to visualize NodeBasedKnowledgeGraph
 * Built with react-force-graph-2d for performance
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { NodeBasedKnowledgeGraph, GraphNode, Relationship } from '../types';
import { JsonViewer } from '../../../components/JsonViewer';

export interface ForceDirectedGraphProps {
  graph: NodeBasedKnowledgeGraph | null;
  onNodeClick?: (node: any) => void;
  width?: number;
  height?: number;
  showLabels?: boolean;
  nodeColor?: (node: any) => string;
  linkColor?: (link: any) => string;
}

interface D3Node {
  id: string;
  name: string;
  type: string;
  layer?: number;
  isSeed?: boolean;
  description?: string;
  [key: string]: any;
}

interface D3Link {
  source: string | D3Node;
  target: string | D3Node;
  type: string;
  strength?: number;
  [key: string]: any;
}

/**
 * Convert NodeBasedKnowledgeGraph to D3.js format
 */
function convertGraphToD3Format(graph: NodeBasedKnowledgeGraph): { nodes: D3Node[]; links: D3Link[] } {
  const nodes: D3Node[] = [];
  const links: D3Link[] = [];
  const nodeMap = new Map<string, D3Node>();

  // Convert all nodes to D3 format
  for (const node of Object.values(graph.nodes)) {
    const d3Node: D3Node = {
      id: node.id,
      name: node.properties.name || node.id,
      type: node.type,
      layer: node.properties.layer,
      isSeed: node.properties.isSeed || node.id === graph.seedConceptId,
      description: node.properties.description,
      ...node.properties,
    };
    nodes.push(d3Node);
    nodeMap.set(node.id, d3Node);
  }

  // Convert relationships to D3 links
  for (const rel of graph.relationships) {
    const sourceNode = nodeMap.get(rel.source);
    const targetNode = nodeMap.get(rel.target);

    if (sourceNode && targetNode) {
      links.push({
        source: sourceNode.id,
        target: targetNode.id,
        type: rel.type,
        strength: rel.strength || 1.0,
        direction: rel.direction,
      });
    }
  }

  return { nodes, links };
}

/**
 * Get color for node based on type
 * Each node type has a distinct color
 */
function getNodeColor(node: D3Node): string {
  switch (node.type) {
    case 'Concept':
      if (node.isSeed) {
        return '#8b5cf6'; // Purple for seed concepts
      }
      // Color by layer if available
      if (node.layer !== undefined && node.layer > 0) {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        return colors[(node.layer - 1) % colors.length];
      }
      return '#3b82f6'; // Blue for concepts
    case 'Layer':
      return '#10b981'; // Green for layers
    case 'LearningGoal':
      return '#f59e0b'; // Orange for goals
    case 'Milestone':
      return '#ec4899'; // Pink for milestones
    case 'Lesson':
      return '#06b6d4'; // Cyan for lessons
    case 'PracticeExercise':
      return '#84cc16'; // Lime for practice
    case 'FlashCard':
      return '#a855f7'; // Purple for flash cards
    case 'ConceptMetadata':
      return '#64748b'; // Slate for metadata
    case 'GraphMetadata':
      return '#64748b'; // Slate for graph metadata
    case 'Graph':
      return '#1e293b'; // Dark slate for graph root
    default:
      return '#6b7280'; // Gray for other types
  }
}

/**
 * Node type color mapping for legend
 */
export const NODE_TYPE_COLORS: Record<string, { color: string; label: string }> = {
  Concept: { color: '#3b82f6', label: 'Concept' },
  SeedConcept: { color: '#8b5cf6', label: 'Seed Concept' },
  Layer: { color: '#10b981', label: 'Layer' },
  LearningGoal: { color: '#f59e0b', label: 'Learning Goal' },
  Milestone: { color: '#ec4899', label: 'Milestone' },
  Lesson: { color: '#06b6d4', label: 'Lesson' },
  PracticeExercise: { color: '#84cc16', label: 'Practice Exercise' },
  FlashCard: { color: '#a855f7', label: 'Flash Card' },
  Metadata: { color: '#64748b', label: 'Metadata' },
  Graph: { color: '#1e293b', label: 'Graph' },
  Other: { color: '#6b7280', label: 'Other' },
};

/**
 * Get color for link based on relationship type
 */
function getLinkColor(link: D3Link): string {
  switch (link.type) {
    case 'hasParent':
    case 'hasChild':
      return '#3b82f6'; // Blue for hierarchical
    case 'hasPrerequisite':
    case 'isPrerequisiteOf':
      return '#ef4444'; // Red for prerequisites
    case 'belongsToLayer':
    case 'containsConcept':
      return '#10b981'; // Green for layer relationships
    case 'hasLearningGoal':
    case 'belongsToGoal':
      return '#f59e0b'; // Orange for goal relationships
    case 'hasMilestone':
      return '#ec4899'; // Pink for milestone relationships
    case 'hasLesson':
      return '#06b6d4'; // Cyan for lesson relationships
    default:
      return '#9ca3af'; // Gray for other relationships
  }
}

const ForceDirectedGraph: React.FC<ForceDirectedGraphProps> = ({
  graph,
  onNodeClick,
  width,
  height,
  showLabels = true,
  nodeColor,
  linkColor,
}) => {
  const graphRef = useRef<any>(null);
  const [hoveredNode, setHoveredNode] = useState<D3Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Convert graph to D3 format
  const { nodes, links } = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    return convertGraphToD3Format(graph);
  }, [graph]);

  // Get connected node IDs for hovered node
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>([hoveredNode.id]);
    links.forEach((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      if (sourceId === hoveredNode.id) {
        connected.add(targetId);
      } else if (targetId === hoveredNode.id) {
        connected.add(sourceId);
      }
    });
    return connected;
  }, [hoveredNode, links]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: any) => {
      // Get the full GraphNode from the original graph
      if (graph && node.id) {
        const fullNode = graph.nodes[node.id];
        if (fullNode) {
          setSelectedNode(fullNode);
        }
      }
      
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick, graph]
  );

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node || null);
  }, []);

  // Auto-fit to container
  const [dimensions, setDimensions] = React.useState({ width: width || 800, height: height || 600 });

  useEffect(() => {
    if (!width || !height) {
      const updateDimensions = () => {
        const container = graphRef.current?.parentElement;
        if (container) {
          setDimensions({
            width: container.clientWidth || 800,
            height: container.clientHeight || 600,
          });
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, [width, height]);

  if (!graph || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No graph data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 relative">
      {/* Legend/Guide */}
      <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-xs">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Node Types
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_TYPE_COLORS.SeedConcept.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {NODE_TYPE_COLORS.SeedConcept.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_TYPE_COLORS.Concept.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {NODE_TYPE_COLORS.Concept.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_TYPE_COLORS.Layer.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {NODE_TYPE_COLORS.Layer.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_TYPE_COLORS.LearningGoal.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {NODE_TYPE_COLORS.LearningGoal.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_TYPE_COLORS.Milestone.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {NODE_TYPE_COLORS.Milestone.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_TYPE_COLORS.Lesson.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {NODE_TYPE_COLORS.Lesson.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_TYPE_COLORS.PracticeExercise.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {NODE_TYPE_COLORS.PracticeExercise.label}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Hover over a node to highlight its connections
          </p>
        </div>
      </div>

      {/* Node Properties Viewer */}
      {selectedNode && (
        <div className="absolute top-4 right-4 z-10 mt-[280px] max-w-xs w-80">
          <JsonViewer
            data={selectedNode}
            title={`Node: ${selectedNode.properties?.name || selectedNode.id}`}
            maxHeight="calc(100vh - 320px)"
          />
        </div>
      )}

      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links }}
        nodeId="id"
        nodeLabel={(node: any) => {
          const label = node.name || node.id;
          const type = node.type || 'Unknown';
          const layer = node.layer !== undefined ? ` (Layer ${node.layer})` : '';
          return `${label}\n${type}${layer}`;
        }}
        nodeColor={(node: any) => {
          const baseColor = nodeColor ? nodeColor(node) : getNodeColor(node);
          // Highlight hovered node and its connections
          if (hoveredNode) {
            if (node.id === hoveredNode.id) {
              return baseColor; // Keep hovered node bright (will be highlighted by size)
            }
            if (connectedNodeIds.has(node.id)) {
              return baseColor; // Keep connected nodes bright
            }
            // Dim non-connected nodes
            return baseColor + '40'; // Add transparency
          }
          return baseColor;
        }}
        nodeVal={(node: any) => {
          // Size nodes by type and importance (circular nodes)
          // Make hovered node larger to highlight it
          const baseSize = node.isSeed ? 12 : 
                          (node.type === 'Layer' || node.type === 'LearningGoal') ? 10 :
                          node.type === 'Milestone' ? 8 : 6;
          
          // Highlight hovered node by making it larger
          if (hoveredNode && node.id === hoveredNode.id) {
            return baseSize * 1.5; // 50% larger when hovered
          }
          
          return baseSize;
        }}
        linkSource="source"
        linkTarget="target"
        linkLabel={(link: any) => link.type || 'relationship'}
        linkColor={(link: any) => {
          const baseColor = linkColor ? linkColor(link) : getLinkColor(link);
          // Highlight links connected to hovered node
          if (hoveredNode) {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            if (sourceId === hoveredNode.id || targetId === hoveredNode.id) {
              return baseColor; // Keep connected links bright
            }
            // Dim non-connected links
            return baseColor + '20'; // Add transparency
          }
          return baseColor;
        }}
        linkWidth={(link: any) => {
          // Make connected links thicker on hover
          if (hoveredNode) {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            if (sourceId === hoveredNode.id || targetId === hoveredNode.id) {
              return (link.strength || 1.0) * 3; // Thicker for connected links
            }
            return (link.strength || 1.0) * 1; // Thinner for non-connected links
          }
          return (link.strength || 1.0) * 2;
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.1}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={() => {
          setHoveredNode(null);
          setSelectedNode(null);
        }}
        nodeCanvasObjectMode={() => 'replace'}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          // Get node color and size
          const getNodeColorFn = nodeColor || getNodeColor;
          const nodeColorValue = getNodeColorFn(node);
          const baseSize = node.isSeed ? 12 : 
                          (node.type === 'Layer' || node.type === 'LearningGoal') ? 10 :
                          node.type === 'Milestone' ? 8 : 6;
          const nodeSize = hoveredNode && node.id === hoveredNode.id ? baseSize * 1.5 : baseSize;
          
          // Highlight hovered node with glow effect
          const isHovered = hoveredNode && node.id === hoveredNode.id;
          
          if (isHovered) {
            // Draw glow effect for hovered node
            const glowGradient = ctx.createRadialGradient(
              node.x || 0, node.y || 0, 0,
              node.x || 0, node.y || 0, nodeSize * 2.5
            );
            glowGradient.addColorStop(0, nodeColorValue + '80');
            glowGradient.addColorStop(0.5, nodeColorValue + '40');
            glowGradient.addColorStop(1, nodeColorValue + '00');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, nodeSize * 2.5, 0, 2 * Math.PI);
            ctx.fill();
          }
          
          // Draw circular node with color (always circular)
          ctx.fillStyle = nodeColorValue;
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add white border for hovered node
          if (isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 / globalScale;
            ctx.stroke();
          }
          
          // Draw label
          if (showLabels && globalScale >= 0.5) {
            const label = node.name || node.id;
            const fontSize = 12 / globalScale;
            ctx.font = `bold ${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Add text shadow for better visibility
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.fillStyle = isHovered ? '#ffffff' : (node.isSeed ? '#8b5cf6' : '#374151');
            ctx.fillText(label, node.x || 0, (node.y || 0) + nodeSize + 12);
            ctx.shadowBlur = 0; // Reset shadow
          }
        }}
        cooldownTicks={100}
        onEngineStop={() => {
          if (graphRef.current && typeof graphRef.current.zoomToFit === 'function') {
            graphRef.current.zoomToFit(400);
          }
        }}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
};

export default ForceDirectedGraph;

