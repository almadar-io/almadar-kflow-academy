/**
 * TreeMap Organism
 * 
 * A generic tree/hierarchical visualization component for mindmap-style displays.
 * Supports horizontal, vertical, and radial layouts.
 * 
 * @example
 * ```tsx
 * <TreeMap
 *   data={{
 *     id: 'root',
 *     label: 'Root Node',
 *     children: [
 *       { id: 'child1', label: 'Child 1' },
 *       { id: 'child2', label: 'Child 2', children: [...] },
 *     ]
 *   }}
 *   onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
 * />
 * ```
 */

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Card } from '../../molecules/Card';
import { cn } from '../../../utils/theme';

// ============================================================================
// Types
// ============================================================================

export interface TreeMapNode {
  /**
   * Unique identifier for the node
   */
  id: string;
  
  /**
   * Display label for the node
   */
  label: string;
  
  /**
   * Optional description
   */
  description?: string;
  
  /**
   * Optional color
   */
  color?: string;
  
  /**
   * Child nodes
   */
  children?: TreeMapNode[];
  
  /**
   * Whether node is expanded (for collapsible trees)
   */
  expanded?: boolean;
  
  /**
   * Whether this is the root/primary node
   */
  isRoot?: boolean;
  
  /**
   * Optional level/depth (auto-calculated if not provided)
   */
  level?: number;
  
  /**
   * Additional custom properties
   */
  [key: string]: any;
}

export interface TreeMapProps {
  /**
   * Root node data
   */
  data: TreeMapNode | null;
  
  /**
   * Selected node ID
   */
  selectedId?: string | null;
  
  /**
   * Callback when a node is clicked
   */
  onNodeClick?: (nodeId: string, node: TreeMapNode) => void;
  
  /**
   * Callback when a node is double-clicked
   */
  onNodeDoubleClick?: (nodeId: string, node: TreeMapNode) => void;
  
  /**
   * Callback when node expansion state changes
   */
  onNodeExpand?: (nodeId: string, expanded: boolean) => void;
  
  /**
   * Layout direction
   */
  layout?: 'horizontal' | 'vertical' | 'radial';
  
  /**
   * Whether nodes can be collapsed/expanded
   */
  collapsible?: boolean;
  
  /**
   * Default expansion state for nodes
   */
  defaultExpanded?: boolean;
  
  /**
   * Whether to show zoom controls
   */
  showZoomControls?: boolean;
  
  /**
   * Color palette for levels
   */
  colorPalette?: string[];
  
  /**
   * Empty state message
   */
  emptyMessage?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Callback when a node is right-clicked (for context menu)
   */
  onNodeRightClick?: (nodeId: string, node: TreeMapNode, event: React.MouseEvent) => void;
  
  /**
   * Whether to enable keyboard navigation
   */
  enableKeyboardNavigation?: boolean;
  
  /**
   * Callback for keyboard navigation (arrow keys)
   */
  onNavigateToNode?: (nodeId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_COLOR_PALETTE = [
  '#8b5cf6', // Purple (root)
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
];

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 30;

// ============================================================================
// Helper: Calculate Tree Layout
// ============================================================================

interface LayoutNode extends TreeMapNode {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

interface SubtreeBounds {
  width: number;
  height: number;
}

/**
 * Calculate the bounds of a subtree (total space needed)
 */
function calculateSubtreeBounds(
  node: TreeMapNode,
  layout: 'horizontal' | 'vertical',
  expandedNodes: Set<string>
): SubtreeBounds {
  const isExpanded = expandedNodes.has(node.id);
  
  if (!node.children || node.children.length === 0 || !isExpanded) {
    // Leaf node or collapsed node - only needs its own space
    return {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  }
  
  if (layout === 'horizontal') {
    // For horizontal layout, children extend vertically
    // Total height = sum of all children's subtree heights + gaps
    let totalHeight = 0;
    node.children.forEach((child, index) => {
      const childBounds = calculateSubtreeBounds(child, layout, expandedNodes);
      totalHeight += childBounds.height;
      if (index < node.children!.length - 1) {
        totalHeight += VERTICAL_GAP;
      }
    });
    
    // Width = node width + gap + max child width
    const maxChildWidth = Math.max(
      ...node.children.map(child => calculateSubtreeBounds(child, layout, expandedNodes).width)
    );
    const totalWidth = NODE_WIDTH + HORIZONTAL_GAP + maxChildWidth;
    
    return {
      width: totalWidth,
      height: Math.max(NODE_HEIGHT, totalHeight),
    };
  } else {
    // For vertical layout, children extend horizontally
    // Total width = sum of all children's subtree widths + gaps
    let totalWidth = 0;
    node.children.forEach((child, index) => {
      const childBounds = calculateSubtreeBounds(child, layout, expandedNodes);
      totalWidth += childBounds.width;
      if (index < node.children!.length - 1) {
        totalWidth += HORIZONTAL_GAP;
      }
    });
    
    // Height = node height + gap + max child height
    const maxChildHeight = Math.max(
      ...node.children.map(child => calculateSubtreeBounds(child, layout, expandedNodes).height)
    );
    const totalHeight = NODE_HEIGHT + VERTICAL_GAP + maxChildHeight;
    
    return {
      width: Math.max(NODE_WIDTH, totalWidth),
      height: totalHeight,
    };
  }
}

function calculateLayout(
  node: TreeMapNode,
  layout: 'horizontal' | 'vertical',
  depth: number = 0,
  startX: number = 0,
  startY: number = 0,
  expandedNodes: Set<string>
): { nodes: LayoutNode[]; connections: Array<{ from: LayoutNode; to: LayoutNode }> } {
  const nodes: LayoutNode[] = [];
  const connections: Array<{ from: LayoutNode; to: LayoutNode }> = [];
  
  const layoutNode: LayoutNode = {
    ...node,
    x: startX,
    y: startY,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    depth,
  };
  
  nodes.push(layoutNode);
  
  // If node has children and is expanded
  const isExpanded = expandedNodes.has(node.id);
  if (node.children && node.children.length > 0 && isExpanded) {
    if (layout === 'horizontal') {
      // Children go to the right
      const childX = startX + NODE_WIDTH + HORIZONTAL_GAP;
      
      // Calculate starting Y position to center children around parent
      let totalChildrenHeight = 0;
      const childBounds: SubtreeBounds[] = [];
      
      node.children.forEach((child) => {
        const bounds = calculateSubtreeBounds(child, layout, expandedNodes);
        childBounds.push(bounds);
        totalChildrenHeight += bounds.height;
      });
      
      // Add gaps between children
      const totalGaps = (node.children.length - 1) * VERTICAL_GAP;
      const totalHeight = totalChildrenHeight + totalGaps;
      
      // Start from top of centered children area
      let currentY = startY + NODE_HEIGHT / 2 - totalHeight / 2;
      
      node.children.forEach((child, index) => {
        const bounds = childBounds[index];
        
        // Center the child node vertically within its subtree bounds
        const childY = currentY + bounds.height / 2 - NODE_HEIGHT / 2;
        
        const childResult = calculateLayout(
          child,
          layout,
          depth + 1,
          childX,
          childY,
          expandedNodes
        );
        
        nodes.push(...childResult.nodes);
        connections.push(...childResult.connections);
        
        // Add connection from parent to child
        connections.push({
          from: layoutNode,
          to: childResult.nodes[0],
        });
        
        // Move to next child position
        currentY += bounds.height + VERTICAL_GAP;
      });
    } else {
      // Vertical: children go below
      const childY = startY + NODE_HEIGHT + VERTICAL_GAP;
      
      // Calculate starting X position to center children around parent
      let totalChildrenWidth = 0;
      const childBounds: SubtreeBounds[] = [];
      
      node.children.forEach((child) => {
        const bounds = calculateSubtreeBounds(child, layout, expandedNodes);
        childBounds.push(bounds);
        totalChildrenWidth += bounds.width;
      });
      
      // Add gaps between children
      const totalGaps = (node.children.length - 1) * HORIZONTAL_GAP;
      const totalWidth = totalChildrenWidth + totalGaps;
      
      // Start from left of centered children area
      let currentX = startX + NODE_WIDTH / 2 - totalWidth / 2;
      
      node.children.forEach((child, index) => {
        const bounds = childBounds[index];
        
        // Center the child node horizontally within its subtree bounds
        const childX = currentX + bounds.width / 2 - NODE_WIDTH / 2;
        
        const childResult = calculateLayout(
          child,
          layout,
          depth + 1,
          childX,
          childY,
          expandedNodes
        );
        
        nodes.push(...childResult.nodes);
        connections.push(...childResult.connections);
        
        connections.push({
          from: layoutNode,
          to: childResult.nodes[0],
        });
        
        // Move to next child position
        currentX += bounds.width + HORIZONTAL_GAP;
      });
    }
  }
  
  return { nodes, connections };
}

// ============================================================================
// Component
// ============================================================================

export const TreeMap: React.FC<TreeMapProps> = ({
  data,
  selectedId,
  onNodeClick,
  onNodeDoubleClick,
  onNodeExpand,
  layout = 'horizontal',
  collapsible = true,
  defaultExpanded = true,
  showZoomControls = true,
  colorPalette = DEFAULT_COLOR_PALETTE,
  emptyMessage = 'No data available',
  className,
  onNodeRightClick,
  enableKeyboardNavigation = false,
  onNavigateToNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Expansion state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (data && defaultExpanded) {
      // Recursively add all nodes to expanded set
      const addAll = (node: TreeMapNode) => {
        set.add(node.id);
        node.children?.forEach(addAll);
      };
      addAll(data);
    }
    return set;
  });

  // Get color for node by depth
  const getNodeColor = useCallback((node: LayoutNode): string => {
    if (node.color) return node.color;
    if (node.isRoot) return colorPalette[0];
    return colorPalette[Math.min(node.depth, colorPalette.length - 1)];
  }, [colorPalette]);

  // Calculate layout
  const { nodes: layoutNodes, connections } = useMemo(() => {
    if (!data) return { nodes: [], connections: [] };
    
    const centerX = 400;
    const centerY = 300;
    
    // Convert 'radial' to 'horizontal' since calculateLayout only supports horizontal/vertical
    const layoutType = layout === 'radial' ? 'horizontal' : layout;
    return calculateLayout(data, layoutType, 0, centerX, centerY, expandedNodes);
  }, [data, layout, expandedNodes]);

  // Calculate bounds
  const bounds = useMemo(() => {
    if (layoutNodes.length === 0) {
      return { minX: 0, maxX: 800, minY: 0, maxY: 600 };
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    layoutNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + node.width);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + node.height);
    });
    
    return {
      minX: minX - 50,
      maxX: maxX + 50,
      minY: minY - 50,
      maxY: maxY + 50,
    };
  }, [layoutNodes]);

  // Handle node click
  const handleNodeClick = useCallback((node: LayoutNode) => {
    if (onNodeClick) {
      onNodeClick(node.id, node);
    }
  }, [onNodeClick]);

  // Handle expand/collapse
  const handleToggleExpand = useCallback((node: LayoutNode, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(node.id)) {
      newExpanded.delete(node.id);
    } else {
      newExpanded.add(node.id);
    }
    setExpandedNodes(newExpanded);
    
    if (onNodeExpand) {
      onNodeExpand(node.id, !expandedNodes.has(node.id));
    }
  }, [expandedNodes, onNodeExpand]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNavigation || !selectedId || !onNavigateToNode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when container is focused
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
        onNavigateToNode(selectedId, direction);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNavigation, selectedId, onNavigateToNode]);

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z * 1.2, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z / 1.2, 0.3)), []);
  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch event handlers for mobile
  const [pinchStart, setPinchStart] = useState<{ distance: number; center: { x: number; y: number }; zoom: number; pan: { x: number; y: number } } | null>(null);

  // Calculate distance between two touches
  const getTouchDistance = useCallback((touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const getTouchCenter = useCallback((touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch for panning
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setPinchStart(null);
    } else if (e.touches.length === 2) {
      // Two touches for pinch zoom
      e.preventDefault();
      setIsDragging(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);
      setPinchStart({
        distance,
        center,
        zoom,
        pan: { ...pan }
      });
    }
  }, [pan, zoom, getTouchDistance, getTouchCenter]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      // Single touch panning
      e.preventDefault();
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && pinchStart) {
      // Two touch pinch zoom
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentCenter = getTouchCenter(touch1, touch2);
      
      // Calculate zoom factor based on distance change
      const scale = currentDistance / pinchStart.distance;
      const newZoom = Math.max(0.1, Math.min(3, pinchStart.zoom * scale));
      
      // Calculate pan adjustment to keep the pinch center point stable
      const worldCenterX = (currentCenter.x - pinchStart.pan.x) / pinchStart.zoom;
      const worldCenterY = (currentCenter.y - pinchStart.pan.y) / pinchStart.zoom;
      
      const newPanX = currentCenter.x - worldCenterX * newZoom;
      const newPanY = currentCenter.y - worldCenterY * newZoom;
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  }, [isDragging, dragStart, pinchStart, getTouchDistance, getTouchCenter]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setPinchStart(null);
  }, []);

  // Enhanced wheel handler with scroll support
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const deltaX = e.deltaX;
    const deltaY = e.deltaY;
    
    // Handle horizontal scrolling
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const scrollSpeed = 0.5;
      setPan(prevPan => ({
        x: prevPan.x - deltaX * scrollSpeed,
        y: prevPan.y
      }));
      return;
    }
    
    // Handle vertical scrolling
    if (Math.abs(deltaY) > 0) {
      // Check if holding Ctrl/Cmd for zoom, otherwise pan
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const zoomSpeed = 0.001;
        const newZoom = Math.max(0.1, Math.min(3, zoom - deltaY * zoomSpeed));
        setZoom(newZoom);
      } else {
        // Pan vertically
        const scrollSpeed = 0.5;
        setPan(prevPan => ({
          x: prevPan.x,
          y: prevPan.y - deltaY * scrollSpeed
        }));
      }
    }
  }, [zoom]);

  // Empty state
  if (!data) {
    return (
      <div 
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
        'relative w-full h-full min-h-[400px] overflow-hidden',
        'bg-gray-50 dark:bg-gray-900 rounded-lg',
        'border border-gray-200 dark:border-gray-700',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
        enableKeyboardNavigation && 'focus:outline-none',
        className
      )}
      tabIndex={enableKeyboardNavigation ? 0 : undefined}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      {/* Zoom Controls */}
      {showZoomControls && (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
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
            aria-label="Reset view"
          >
            <span className="sr-only">Reset view</span>
          </Button>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* SVG for connections */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY,
            left: bounds.minX,
            top: bounds.minY,
          }}
        >
          {connections.map((conn, index) => {
            const fromCenterX = conn.from.x + conn.from.width / 2 - bounds.minX;
            const fromCenterY = conn.from.y + conn.from.height / 2 - bounds.minY;
            const toCenterX = conn.to.x + conn.to.width / 2 - bounds.minX;
            const toCenterY = conn.to.y + conn.to.height / 2 - bounds.minY;
            
            // Curved line
            const midX = (fromCenterX + toCenterX) / 2;
            const midY = (fromCenterY + toCenterY) / 2;
            
            return (
              <path
                key={index}
                d={`M ${fromCenterX} ${fromCenterY} Q ${midX} ${fromCenterY} ${midX} ${midY} Q ${midX} ${toCenterY} ${toCenterX} ${toCenterY}`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                className="dark:stroke-gray-600"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {layoutNodes.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = expandedNodes.has(node.id);
          const isSelected = selectedId === node.id;
          const nodeColor = getNodeColor(node);
          
          return (
            <div
              key={node.id}
              className={cn(
                'absolute transition-shadow duration-200',
                'rounded-lg shadow-md cursor-pointer',
                'bg-white dark:bg-gray-800',
                'border-2',
                isSelected
                  ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900'
                  : 'hover:shadow-lg'
              )}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                borderColor: nodeColor,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onNodeDoubleClick) onNodeDoubleClick(node.id, node);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onNodeRightClick) {
                  onNodeRightClick(node.id, node, e);
                }
              }}
              data-node-id={node.id}
            >
              <div className="flex items-center h-full px-3">
                {/* Expand/Collapse button */}
                {collapsible && hasChildren && (
                  <button
                    onClick={(e) => handleToggleExpand(node, e)}
                    className="mr-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                )}
                
                {/* Color indicator */}
                <div
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: nodeColor }}
                />
                
                {/* Label */}
                <div className="min-w-0 flex-1">
                  <Typography 
                    variant="small" 
                    weight="medium"
                    className="truncate"
                  >
                    {node.label}
                  </Typography>
                  {node.description && (
                    <Typography 
                      variant="small" 
                      color="secondary"
                      className="truncate text-xs"
                    >
                      {node.description}
                    </Typography>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

TreeMap.displayName = 'TreeMap';
