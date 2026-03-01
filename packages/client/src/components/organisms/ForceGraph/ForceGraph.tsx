/**
 * ForceGraph Organism
 * 
 * A generic force-directed graph visualization component.
 * Uses react-force-graph-2d for performance.
 * 
 * Features:
 * - Pan: Click and drag on the background to pan the graph (desktop and mobile)
 * - Zoom: Use mouse wheel to zoom in/out, or pinch gesture on mobile
 * - Node dragging: Click and drag nodes to reposition them
 * - Interactive controls: Zoom buttons, pause/resume, and stabilize
 * - Mobile support: Touch gestures for panning and pinch-to-zoom
 * 
 * @example
 * ```tsx
 * <ForceGraph
 *   nodes={[
 *     { id: '1', label: 'Node 1', group: 'A' },
 *     { id: '2', label: 'Node 2', group: 'B' },
 *   ]}
 *   edges={[
 *     { source: '1', target: '2', label: 'connects' }
 *   ]}
 *   onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
 *   enablePanZoom={true}
 * />
 * ```
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomIn, ZoomOut, Maximize2, Pause, Play, Lock } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

// ============================================================================
// Types
// ============================================================================

export interface ForceGraphNode {
  /**
   * Unique identifier for the node
   */
  id: string;
  
  /**
   * Display label for the node
   */
  label: string;
  
  /**
   * Optional group/category for coloring
   */
  group?: string | number;
  
  /**
   * Optional custom color (overrides group color)
   */
  color?: string;
  
  /**
   * Optional size multiplier (default: 1)
   */
  size?: number;
  
  /**
   * Whether this is a primary/root node
   */
  isPrimary?: boolean;
  
  /**
   * Optional description for tooltip
   */
  description?: string;
  
  /**
   * Additional custom properties
   */
  [key: string]: any;
}

export interface ForceGraphEdge {
  /**
   * Source node ID
   */
  source: string;
  
  /**
   * Target node ID
   */
  target: string;
  
  /**
   * Optional edge label
   */
  label?: string;
  
  /**
   * Optional edge weight/strength (default: 1)
   */
  weight?: number;
  
  /**
   * Optional custom color
   */
  color?: string;
  
  /**
   * Additional custom properties
   */
  [key: string]: any;
}

export interface ForceGraphLegendItem {
  /**
   * Legend item key
   */
  key: string;
  
  /**
   * Display label
   */
  label: string;
  
  /**
   * Color for the legend item
   */
  color: string;
}

export interface ForceGraphProps {
  /**
   * Graph nodes
   */
  nodes: ForceGraphNode[];
  
  /**
   * Graph edges
   */
  edges: ForceGraphEdge[];
  
  /**
   * Callback when a node is clicked
   */
  onNodeClick?: (nodeId: string, node: ForceGraphNode) => void;
  
  /**
   * Callback when a node is hovered
   */
  onNodeHover?: (nodeId: string | null, node: ForceGraphNode | null) => void;
  
  /**
   * Currently selected node ID (for highlighting)
   */
  selectedNodeId?: string | null;
  
  /**
   * Callback when background is clicked (for deselection)
   */
  onNodeDeselect?: () => void;
  
  /**
   * Fixed width (auto-sizes if not provided)
   */
  width?: number;
  
  /**
   * Fixed height (auto-sizes if not provided)
   */
  height?: number;
  
  /**
   * Whether to show node labels
   */
  showLabels?: boolean;
  
  /**
   * Whether to show zoom controls
   */
  showZoomControls?: boolean;
  
  /**
   * Whether to enable pan and zoom interactions (mouse wheel zoom, drag to pan)
   * @default true
   */
  enablePanZoom?: boolean;
  
  /**
   * Whether to show legend
   */
  showLegend?: boolean;
  
  /**
   * Custom legend items (auto-generated from groups if not provided)
   */
  legendItems?: ForceGraphLegendItem[];
  
  /**
   * Color palette for groups (cycles through if more groups than colors)
   */
  colorPalette?: string[];
  
  /**
   * Custom node color function
   */
  nodeColorFn?: (node: ForceGraphNode) => string;
  
  /**
   * Custom edge color function
   */
  edgeColorFn?: (edge: ForceGraphEdge) => string;
  
  /**
   * Empty state message
   */
  emptyMessage?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// Default Color Palette
// ============================================================================

const DEFAULT_COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Deep Orange
  '#6366f1', // Indigo
];

const PRIMARY_NODE_COLOR = '#8b5cf6'; // Purple for primary nodes
const DEFAULT_EDGE_COLOR = '#9ca3af'; // Gray

// ============================================================================
// Component
// ============================================================================

export const ForceGraph: React.FC<ForceGraphProps> = ({
  nodes,
  edges,
  onNodeClick,
  onNodeHover,
  selectedNodeId = null,
  onNodeDeselect,
  width,
  height,
  showLabels = true,
  showZoomControls = true,
  enablePanZoom = true,
  showLegend = true,
  legendItems,
  colorPalette = DEFAULT_COLOR_PALETTE,
  nodeColorFn,
  edgeColorFn,
  emptyMessage = 'No graph data available',
  className,
}) => {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: width || 800, height: height || 600 });
  const [isPaused, setIsPaused] = useState(false);
  const [isStabilized, setIsStabilized] = useState(false);

  // Build group-to-color mapping
  const groupColorMap = useMemo(() => {
    const map = new Map<string | number, string>();
    const groups = new Set(nodes.map(n => n.group).filter(g => g !== undefined));
    let colorIndex = 0;
    groups.forEach(group => {
      if (group !== undefined) {
        map.set(group, colorPalette[colorIndex % colorPalette.length]);
        colorIndex++;
      }
    });
    return map;
  }, [nodes, colorPalette]);

  // Generate legend items from groups if not provided
  const computedLegendItems = useMemo((): ForceGraphLegendItem[] => {
    if (legendItems) return legendItems;
    
    const items: ForceGraphLegendItem[] = [];
    
    // Add primary node legend if any
    if (nodes.some(n => n.isPrimary)) {
      items.push({ key: 'primary', label: 'Primary', color: PRIMARY_NODE_COLOR });
    }
    
    // Add group-based items
    groupColorMap.forEach((color, group) => {
      items.push({ 
        key: String(group), 
        label: String(group), 
        color 
      });
    });
    
    return items;
  }, [legendItems, nodes, groupColorMap]);

  // Get node color
  const getNodeColor = useCallback((node: ForceGraphNode): string => {
    if (nodeColorFn) return nodeColorFn(node);
    if (node.color) return node.color;
    if (node.isPrimary) return PRIMARY_NODE_COLOR;
    if (node.group !== undefined && groupColorMap.has(node.group)) {
      return groupColorMap.get(node.group)!;
    }
    return colorPalette[0];
  }, [nodeColorFn, groupColorMap, colorPalette]);

  // Get edge color
  const getEdgeColor = useCallback((edge: ForceGraphEdge): string => {
    if (edgeColorFn) return edgeColorFn(edge);
    if (edge.color) return edge.color;
    return DEFAULT_EDGE_COLOR;
  }, [edgeColorFn]);

  // Get connected node IDs for highlighting (for hover)
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const connected = new Set<string>([hoveredNodeId]);
    edges.forEach(edge => {
      if (edge.source === hoveredNodeId) connected.add(edge.target);
      if (edge.target === hoveredNodeId) connected.add(edge.source);
    });
    return connected;
  }, [hoveredNodeId, edges]);

  // Get connected node IDs for selected node
  const selectedConnectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>([selectedNodeId]);
    edges.forEach(edge => {
      if (edge.source === selectedNodeId) connected.add(edge.target);
      if (edge.target === selectedNodeId) connected.add(edge.source);
    });
    return connected;
  }, [selectedNodeId, edges]);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    const originalNode = nodes.find(n => n.id === node.id);
    if (originalNode && onNodeClick) {
      onNodeClick(node.id, originalNode);
    }
  }, [nodes, onNodeClick]);

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    const nodeId = node?.id || null;
    setHoveredNodeId(nodeId);
    
    if (onNodeHover) {
      const originalNode = node ? nodes.find(n => n.id === node.id) : null;
      onNodeHover(nodeId, originalNode || null);
    }
  }, [nodes, onNodeHover]);

  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.3, 300);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.3, 300);
    }
  }, []);

  const handleZoomReset = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  }, []);

  // Handle pause/resume simulation
  const handlePauseToggle = useCallback(() => {
    if (graphRef.current) {
      if (isPaused) {
        // Resume simulation
        graphRef.current.resumeAnimation();
        setIsPaused(false);
      } else {
        // Pause simulation
        graphRef.current.pauseAnimation();
        setIsPaused(true);
      }
    }
  }, [isPaused]);

  // Handle stabilization (stop simulation completely)
  const handleStabilize = useCallback(() => {
    if (graphRef.current) {
      // Stop the simulation
      graphRef.current.pauseAnimation();
      setIsPaused(true);
      setIsStabilized(true);
    }
  }, []);

  // Configure force simulation when graph ref is available
  useEffect(() => {
    if (graphRef.current && graphRef.current.d3Force) {
      const simulation = graphRef.current.d3Force();
      if (simulation) {
        // Configure charge force (repulsion between nodes)
        const chargeForce = simulation.force('charge');
        if (chargeForce) {
          chargeForce.strength(isStabilized ? -50 : -200);
        }
        // Configure link force (attraction between connected nodes)
        const linkForce = simulation.force('link');
        if (linkForce) {
          linkForce.distance((link: any) => (link.weight || 1) * 50);
          linkForce.strength((link: any) => (link.weight || 1) * 0.3);
        }
        // Configure center force (pulls nodes to center)
        const centerForce = simulation.force('center');
        if (centerForce) {
          centerForce.strength(isStabilized ? 0 : 0.1);
        }
      }
    }
  }, [isStabilized, nodes, edges]);

  // Auto-size to container
  useEffect(() => {
    if (!width || !height) {
      const updateDimensions = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setDimensions({
            width: rect.width || 800,
            height: rect.height || 600,
          });
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, [width, height]);

  // Empty state
  if (nodes.length === 0) {
    return (
      <div 
        ref={containerRef}
        className={cn(
          'flex items-center justify-center h-full min-h-[400px]',
          'bg-gray-50 dark:bg-gray-900 rounded-lg',
          className
        )}
      >
        <Typography color="secondary">{emptyMessage}</Typography>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative w-full h-full min-h-[400px]',
        'bg-white dark:bg-gray-900 rounded-lg',
        'border border-gray-200 dark:border-gray-700',
        className
      )}
      style={{ touchAction: enablePanZoom ? 'none' : 'auto' }}
    >
      {/* Zoom Controls */}
      {showZoomControls && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
          <Button
            variant="secondary"
            size="sm"
            icon={ZoomIn}
            onClick={handleZoomIn}
            aria-label="Zoom in"
          >
            <span className="sr-only">Zoom in</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={ZoomOut}
            onClick={handleZoomOut}
            aria-label="Zoom out"
          >
            <span className="sr-only">Zoom out</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Maximize2}
            onClick={handleZoomReset}
            aria-label="Fit to view"
          >
            <span className="sr-only">Fit to view</span>
          </Button>
          <div className="h-px bg-gray-300 dark:bg-gray-600 my-1" />
          <Button
            variant={isPaused ? "primary" : "secondary"}
            size="sm"
            icon={isPaused ? Play : Pause}
            onClick={handlePauseToggle}
            aria-label={isPaused ? "Resume animation" : "Pause animation"}
            title={isPaused ? "Resume animation" : "Pause animation"}
          >
            <span className="sr-only">{isPaused ? "Resume" : "Pause"}</span>
          </Button>
          {!isStabilized && (
            <Button
              variant="secondary"
              size="sm"
              icon={Lock}
              onClick={handleStabilize}
              aria-label="Stabilize graph"
              title="Stop simulation and lock positions"
            >
              <span className="sr-only">Stabilize</span>
            </Button>
          )}
        </div>
      )}

      {/* Legend */}
      {showLegend && computedLegendItems.length > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-[200px]">
          <Typography variant="small" weight="medium" className="mb-2">
            Legend
          </Typography>
          <div className="space-y-1.5">
            {computedLegendItems.map(item => (
              <div key={item.key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <Typography variant="small" color="secondary" className="truncate">
                  {item.label}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graph */}
      {/* @ts-ignore - react-force-graph-2d types may be incomplete */}
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links: edges }}
        nodeId="id"
        enableZoomInteraction={enablePanZoom}
        enablePanInteraction={enablePanZoom}
        enableNodeDrag={true}
        enablePointerInteraction={true}
        nodeLabel={(node: any) => node.description || node.label}
        nodeColor={(node: any) => {
          const baseColor = getNodeColor(node);
          const isSelected = selectedNodeId === node.id;
          const isSelectedConnected = selectedNodeId && selectedConnectedNodeIds.has(node.id);
          
          // Selected node should be bright
          if (isSelected) return baseColor;
          
          // If a node is selected, dim non-connected nodes
          if (selectedNodeId && !isSelectedConnected) {
            return baseColor + '40';
          }
          
          // Hover highlighting (only if no node is selected)
          if (hoveredNodeId && !selectedNodeId && !connectedNodeIds.has(node.id)) {
            return baseColor + '40'; // Dim non-connected nodes
          }
          
          return baseColor;
        }}
        nodeVal={(node: any) => {
          const baseSize = node.isPrimary ? 12 : (node.size || 1) * 6;
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id && !selectedNodeId;
          
          // Selected node should be larger
          if (isSelected) return baseSize * 2;
          
          // Hovered node (only if no node is selected)
          if (isHovered) return baseSize * 1.5;
          
          return baseSize;
        }}
        linkSource="source"
        linkTarget="target"
        linkLabel={(link: any) => link.label || ''}
        linkColor={(link: any) => {
          const baseColor = getEdgeColor(link);
          if (hoveredNodeId) {
            if (link.source.id === hoveredNodeId || link.target.id === hoveredNodeId ||
                link.source === hoveredNodeId || link.target === hoveredNodeId) {
              return baseColor;
            }
            return baseColor + '20';
          }
          return baseColor;
        }}
        linkWidth={(link: any) => {
          const baseWidth = (link.weight || 1) * 2;
          if (hoveredNodeId) {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            if (sourceId === hoveredNodeId || targetId === hoveredNodeId) {
              return baseWidth * 1.5;
            }
            return baseWidth * 0.5;
          }
          return baseWidth;
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.1}
        // Reduce alpha decay to slow down simulation (0 = stopped)
        d3AlphaDecay={isStabilized ? 0 : 0.0228}
        // Increase velocity decay for damping (makes movement smoother and less bouncy)
        d3VelocityDecay={0.6}
        onNodeDrag={(node: any) => {
          // When dragging, temporarily pause to prevent jumping
          if (!isPaused && !isStabilized && graphRef.current) {
            graphRef.current.pauseAnimation();
          }
        }}
        onNodeDragEnd={(node: any) => {
          // Resume after drag ends, unless stabilized
          if (!isStabilized && !isPaused && graphRef.current) {
            graphRef.current.resumeAnimation();
          }
        }}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={() => {
          setHoveredNodeId(null);
          // Deselect node when clicking background
          if (onNodeDeselect) {
            onNodeDeselect();
          }
        }}
        nodeCanvasObjectMode={() => 'replace'}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const nodeColor = getNodeColor(node);
          const baseSize = node.isPrimary ? 12 : (node.size || 1) * 6;
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id && !selectedNodeId;
          const isDimmed = (selectedNodeId && !selectedConnectedNodeIds.has(node.id)) ||
                          (hoveredNodeId && !selectedNodeId && !connectedNodeIds.has(node.id));
          
          // Calculate node size
          let nodeSize = baseSize;
          if (isSelected) {
            nodeSize = baseSize * 2; // Selected nodes are larger
          } else if (isHovered) {
            nodeSize = baseSize * 1.5;
          }

          // Glow effect for selected node (stronger than hover)
          if (isSelected) {
            const glowGradient = ctx.createRadialGradient(
              node.x || 0, node.y || 0, 0,
              node.x || 0, node.y || 0, nodeSize * 3
            );
            glowGradient.addColorStop(0, nodeColor + 'CC');
            glowGradient.addColorStop(0.3, nodeColor + '80');
            glowGradient.addColorStop(0.6, nodeColor + '40');
            glowGradient.addColorStop(1, nodeColor + '00');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, nodeSize * 3, 0, 2 * Math.PI);
            ctx.fill();
          } else if (isHovered) {
            // Glow effect for hovered node (only if no node is selected)
            const glowGradient = ctx.createRadialGradient(
              node.x || 0, node.y || 0, 0,
              node.x || 0, node.y || 0, nodeSize * 2.5
            );
            glowGradient.addColorStop(0, nodeColor + '80');
            glowGradient.addColorStop(0.5, nodeColor + '40');
            glowGradient.addColorStop(1, nodeColor + '00');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, nodeSize * 2.5, 0, 2 * Math.PI);
            ctx.fill();
          }

          // Draw node circle
          ctx.fillStyle = isDimmed ? nodeColor + '40' : nodeColor;
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI);
          ctx.fill();

          // Border for selected node (thicker and more prominent)
          if (isSelected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5 / globalScale;
            ctx.stroke();
            // Add outer ring for extra emphasis
            ctx.strokeStyle = nodeColor;
            ctx.lineWidth = 2 / globalScale;
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, nodeSize + 2, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (isHovered) {
            // Border for hovered node (only if no node is selected)
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 / globalScale;
            ctx.stroke();
          }

          // Label
          if (showLabels && globalScale >= 0.5) {
            const label = node.label || node.id;
            const fontSize = isSelected ? 14 / globalScale : 12 / globalScale;
            ctx.font = `bold ${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.fillStyle = isDimmed ? '#9ca3af' : (isSelected || isHovered ? '#ffffff' : '#374151');
            ctx.fillText(label, node.x || 0, (node.y || 0) + nodeSize + 12);
            ctx.shadowBlur = 0;
          }
        }}
        // Increase cooldown ticks for more stability before auto-zoom
        cooldownTicks={isStabilized ? 0 : 150}
        onEngineStop={() => {
          // Auto-zoom to fit when simulation stops (only if not stabilized)
          if (graphRef.current?.zoomToFit && !isStabilized) {
            graphRef.current.zoomToFit(400);
          }
        }}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
};

ForceGraph.displayName = 'ForceGraph';
