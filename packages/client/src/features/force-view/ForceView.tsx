import React, { useCallback, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Concept } from '../concepts/types';
import { ForceViewProps } from './types/forceViewTypes';
import { useForceViewGraphData } from './hooks/useForceViewGraphData';
import ForceViewContainer from './components/ForceViewContainer';
import ForceViewHeader from './components/ForceViewHeader';
import EmptyState from './components/EmptyState';
import { FORCE_VIEW_CONSTANTS } from './utils/forceViewConstants';

const ForceView: React.FC<ForceViewProps> = ({
  concepts,
  selectedConcept,
  onSelectConcept,
  onNavigateToConcept
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(1);
  const graphRef = useRef<any>(null);

  // Get container dimensions
  const [containerWidth, setContainerWidth] = React.useState(800);
  const [containerHeight, setContainerHeight] = React.useState(600);

  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
        setContainerHeight(containerRef.current.offsetHeight);
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const { nodes, links } = useForceViewGraphData({
    concepts
  });

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  const handleNodeClick = useCallback((node: any) => {
    const concept = node.concept as Concept;
    if (concept) {
      onSelectConcept(concept);
      if (onNavigateToConcept) {
        onNavigateToConcept(concept);
      }
    }
  }, [onSelectConcept, onNavigateToConcept]);

  const handleZoomIn = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoom(1.2);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoom(0.8);
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
      graphRef.current.centerAt(containerWidth / 2, containerHeight / 2);
    }
  }, [containerWidth, containerHeight]);

  // Center view on selected concept
  React.useEffect(() => {
    if (selectedConcept && graphRef.current) {
      const selectedNode = nodes.find(
        n => (n.concept.id || n.concept.name) === (selectedConcept.id || selectedConcept.name)
      );
      if (selectedNode && selectedNode.x !== undefined && selectedNode.y !== undefined) {
        graphRef.current.centerAt(selectedNode.x, selectedNode.y);
      }
    }
  }, [selectedConcept, nodes]);

  // Custom node rendering to show concept names on nodes
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const nodeSize = node.__size || 20;
    
    // Calculate font size to fit within the circle - smaller and more conservative
    // Use a percentage of node size to ensure text fits comfortably within the circle
    // For a circle with radius nodeSize, we want text to fit within ~80% of diameter
    const maxTextWidth = nodeSize * 1.6; // Maximum text width (slightly less than diameter)
    const baseFontSize = Math.max(6, Math.min(9, nodeSize * 0.3));
    let fontSize = baseFontSize / Math.max(1, globalScale);
    
    // Draw node circle background
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    ctx.fillStyle = node.__color || '#6366f1';
    ctx.fill();
    
    // Draw node circle border
    ctx.strokeStyle = selectedConcept && 
      (selectedConcept.id || selectedConcept.name) === (node.concept?.id || node.concept?.name)
      ? '#1e40af' 
      : '#4f46e5';
    ctx.lineWidth = selectedConcept && 
      (selectedConcept.id || selectedConcept.name) === (node.concept?.id || node.concept?.name)
      ? 3 
      : 2;
    ctx.stroke();
    
    // Draw label text - fit text within circle
    // Try different font sizes until text fits
    let displayLabel = label;
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    
    let metrics = ctx.measureText(displayLabel);
    
    // If text is too wide, reduce font size first
    if (metrics.width > maxTextWidth) {
      // Reduce font size until it fits
      while (fontSize > 5 && metrics.width > maxTextWidth) {
        fontSize = Math.max(5, fontSize - 0.5);
        ctx.font = `${fontSize}px Sans-Serif`;
        metrics = ctx.measureText(displayLabel);
      }
      
      // If still too wide after reducing font, truncate
      if (metrics.width > maxTextWidth) {
        displayLabel = label;
        while (displayLabel.length > 0 && ctx.measureText(displayLabel + '...').width > maxTextWidth) {
          displayLabel = displayLabel.slice(0, -1);
        }
        ctx.fillText(displayLabel + '...', node.x, node.y);
      } else {
        ctx.fillText(displayLabel, node.x, node.y);
      }
    } else {
      ctx.fillText(displayLabel, node.x, node.y);
    }
  }, [selectedConcept]);

  return (
    <ForceViewContainer
      containerRef={containerRef}
      onWheel={() => {}}
      onMouseDown={() => {}}
      onMouseMove={() => {}}
      onMouseUp={() => {}}
      onMouseLeave={() => {}}
      isDragging={false}
    >
      <ForceViewHeader
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      {concepts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg m-4" style={{ minHeight: '600px' }}>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeId="id"
            nodeVal="val"
            nodeColor={(node: any) => {
              const isSelected = selectedConcept && 
                (selectedConcept.id || selectedConcept.name) === (node.concept?.id || node.concept?.name);
              return isSelected ? '#3b82f6' : node.color || '#6366f1';
            }}
            nodeLabel={(node: any) => {
              const concept = node.concept as Concept;
              return `${concept.name}\n${concept.description || ''}\nLayer: ${concept.layer ?? 0}`;
            }}
            linkColor={(link: any) => link.color || '#94a3b8'}
            linkWidth={2}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowColor="#94a3b8"
            linkCurvature={0.1}
            onNodeClick={handleNodeClick}
            onNodeHover={(node: any) => {
              if (node && containerRef.current) {
                containerRef.current.style.cursor = 'pointer';
              } else if (containerRef.current) {
                containerRef.current.style.cursor = 'default';
              }
            }}
            onBackgroundClick={() => {
              // Deselect when clicking background
            }}
            nodeCanvasObject={nodeCanvasObject}
            // Use DAG radial mode - parents in inner circle, children in outer circles
            dagMode="radialout"
            dagLevelDistance={FORCE_VIEW_CONSTANTS.LAYER_SPACING}
            width={containerWidth}
            height={containerHeight}
          />
        </div>
      )}
    </ForceViewContainer>
  );
};

export default ForceView;
