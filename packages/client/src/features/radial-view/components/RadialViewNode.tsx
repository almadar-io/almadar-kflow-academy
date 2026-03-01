import React from 'react';
import { RadialViewNodeProps } from '../types/radialViewTypes';
import { RADIAL_VIEW_CONSTANTS } from '../utils/radialViewConstants';
import { useTheme } from '../../../contexts/ThemeContext';

const RadialViewNode: React.FC<RadialViewNodeProps> = ({
  node,
  isSelected,
  isHovered,
  zoom,
  pan,
  onNodeClick,
  onNodeDoubleClick,
  onNodeHover
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const { concept, x, y, layer } = node;
  const isSeed = concept.isSeed || layer === 0;
  const nodeRadius = isSeed 
    ? RADIAL_VIEW_CONSTANTS.CENTER_NODE_RADIUS 
    : RADIAL_VIEW_CONSTANTS.NODE_RADIUS;
  
  // Calculate font size dynamically based on text length and circle size
  // Estimate: each character is roughly 0.6x font size wide
  // We want text to fit within ~80% of circle diameter
  const maxTextWidth = nodeRadius * 1.6; // 80% of diameter
  const estimatedCharWidth = 0.6;
  const optimalFontSize = Math.min(
    (maxTextWidth / (concept.name.length * estimatedCharWidth)),
    14 // Max font size
  );
  const fontSize = Math.max(8, Math.min(optimalFontSize, 12 / zoom));
  
  // Determine if we need to truncate text
  const textToDisplay = concept.name;
  const needsTruncation = textToDisplay.length > 20; // Only truncate very long names
  
  // Dark mode colors
  const seedFill = isDark ? '#f59e0b' : '#fbbf24';
  const selectedFill = isDark ? '#60a5fa' : '#3b82f6';
  const defaultFill = isDark ? '#818cf8' : '#6366f1';
  const selectedStroke = isDark ? '#3b82f6' : '#1e40af';
  const hoveredStroke = isDark ? '#60a5fa' : '#2563eb';
  const defaultStroke = isDark ? '#818cf8' : '#4f46e5';
  const layerBadgeFill = isDark ? '#94a3b8' : '#64748b';
  
  return (
    <g 
      transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
      onClick={() => onNodeClick(node)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onNodeDoubleClick) {
          onNodeDoubleClick(node);
        }
      }}
      onMouseEnter={() => onNodeHover(node)}
      onMouseLeave={() => onNodeHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Node circle */}
      <circle
        cx={x}
        cy={y}
        r={nodeRadius}
        fill={isSeed ? seedFill : isSelected ? selectedFill : defaultFill}
        stroke={isSelected ? selectedStroke : isHovered ? hoveredStroke : defaultStroke}
        strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
        opacity={isHovered ? 0.9 : 1}
      />
      
      {/* Concept name text */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={fontSize}
        fontWeight="bold"
        pointerEvents="none"
        style={{ userSelect: 'none' }}
      >
        {needsTruncation
          ? textToDisplay.substring(0, 20) + '...'
          : textToDisplay}
      </text>
      
      {/* Layer indicator */}
      {layer !== undefined && (
        <circle
          cx={x + nodeRadius - 8}
          cy={y - nodeRadius + 8}
          r={10}
          fill={layerBadgeFill}
          opacity={0.8}
        />
      )}
      {layer !== undefined && (
        <text
          x={x + nodeRadius - 8}
          y={y - nodeRadius + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="9"
          fontWeight="bold"
          pointerEvents="none"
        >
          {layer}
        </text>
      )}
    </g>
  );
};

export default RadialViewNode;

