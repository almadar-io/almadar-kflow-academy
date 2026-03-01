import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { RADIAL_VIEW_CONSTANTS } from './utils/radialViewConstants';
import { Concept } from '../concepts/types';
import { RadialViewProps, RadialNode } from './types/radialViewTypes';
import { useRadialViewLayout } from './hooks/useRadialViewLayout';
import { useRadialViewZoomPan } from './hooks/useRadialViewZoomPan';
import RadialViewContainer from './components/RadialViewContainer';
import RadialViewHeader from './components/RadialViewHeader';
import RadialViewCanvas from './components/RadialViewCanvas';
import RadialViewNode from './components/RadialViewNode';
import RadialViewConnections from './components/RadialViewConnections';
import RadialViewLayers from './components/RadialViewLayers';
import RadialViewTooltip from './components/RadialViewTooltip';
import EmptyState from './components/EmptyState';

const RadialView: React.FC<RadialViewProps> = ({
  concepts,
  selectedConcept,
  onSelectConcept,
  onNavigateToConcept
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<RadialNode | null>(null);

  const {
    zoom,
    pan,
    isDragging,
    containerWidth,
    containerHeight,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    setZoom,
    setPan,
    resetView
  } = useRadialViewZoomPan({ containerRef });

  const {
    nodes,
    connections,
    layers,
    centerX,
    centerY
  } = useRadialViewLayout({ concepts, containerWidth, containerHeight });

  // Update connection visibility based on hovered node
  const visibleConnections = useMemo(() => {
    if (!hoveredNode) {
      return connections.map(conn => ({ ...conn, visible: false }));
    }
    
    // Show connections from hovered node to its parents only (not children)
    return connections.map(conn => {
      // Only show connections where the hovered node is the target (showing its parents)
      const isConnectionToHovered = conn.target.id === hoveredNode.id;
      return {
        ...conn,
        visible: isConnectionToHovered
      };
    });
  }, [hoveredNode, connections]);

  const handleNodeClick = useCallback((node: RadialNode) => {
    // Single click: only select, don't navigate
    onSelectConcept(node.concept);
  }, [onSelectConcept]);

  const handleNodeDoubleClick = useCallback((node: RadialNode) => {
    // Double click: navigate to detail page
    if (onNavigateToConcept) {
      onNavigateToConcept(node.concept);
    }
  }, [onNavigateToConcept]);

  const handleNodeHover = useCallback((node: RadialNode | null) => {
    setHoveredNode(node);
  }, []);

//   // Center view on selected concept
//   useEffect(() => {
//     if (selectedConcept) {
//       const selectedNode = nodes.find(
//         n => (n.concept.id || n.concept.name) === (selectedConcept.id || selectedConcept.name)
//       );
//       if (selectedNode) {
//         const viewportCenterX = containerWidth / 2;
//         const viewportCenterY = containerHeight / 2;
//         const panOffsetX = viewportCenterX - selectedNode.x;
//         const panOffsetY = viewportCenterY - selectedNode.y;
//         setPan({
//           x: panOffsetX,
//           y: panOffsetY
//         });
//       }
//     }
//   }, [selectedConcept, nodes, containerWidth, containerHeight, setPan]);

  return (
    <RadialViewContainer
      containerRef={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      isDragging={isDragging}
    >
      <RadialViewHeader
        zoom={zoom}
        onZoomIn={() => setZoom(Math.min(3, zoom * 1.1))}
        onZoomOut={() => setZoom(Math.max(0.3, zoom * 0.9))}
        onResetView={resetView}
      />

      {concepts.length === 0 ? (
        <EmptyState />
      ) : (
        <RadialViewCanvas
          width={containerWidth}
          height={containerHeight}
          isFocused={isCanvasFocused}
          onFocus={() => setIsCanvasFocused(true)}
          onBlur={() => setIsCanvasFocused(false)}
        >
          {/* Render layer circles first (background) */}
          <RadialViewLayers
            layers={layers}
            centerX={centerX}
            centerY={centerY}
            zoom={zoom}
            pan={pan}
          />
          {/* Render connections */}
          <RadialViewConnections
            connections={visibleConnections}
            zoom={zoom}
            pan={pan}
          />
          {/* Render nodes on top */}
          {nodes.map(node => {
            const isSelected = selectedConcept && 
              (selectedConcept.id || selectedConcept.name) === (node.concept.id || node.concept.name);
            const isHovered = hoveredNode?.id === node.id;
            return (
              <RadialViewNode
                key={node.id}
                node={node}
                isSelected={!!isSelected}
                isHovered={!!isHovered}
                zoom={zoom}
                pan={pan}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onNodeHover={handleNodeHover}
              />
            );
          })}
          {/* Render tooltip */}
          {hoveredNode && (
            <RadialViewTooltip
              x={hoveredNode.x * zoom + pan.x}
              y={hoveredNode.y * zoom + pan.y - RADIAL_VIEW_CONSTANTS.NODE_RADIUS - 20}
              text={hoveredNode.concept.name}
              visible={!!hoveredNode}
            />
          )}
        </RadialViewCanvas>
      )}
    </RadialViewContainer>
  );
};

export default RadialView;

