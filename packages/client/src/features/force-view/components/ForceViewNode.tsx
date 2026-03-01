import React from 'react';
import { ForceViewNodeProps } from '../types/forceViewTypes';

const ForceViewNode: React.FC<ForceViewNodeProps> = ({
  node,
  isSelected,
  zoom,
  pan,
  onNodeClick
}) => {
  const { concept, x, y, radius, layer } = node;
  const isSeed = concept.isSeed || false;

  return (
    <g 
      transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
      onClick={() => onNodeClick(node)}
      style={{ cursor: 'pointer' }}
    >
      {/* Connection line preview (optional - can be removed) */}
      
      {/* Node circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={isSeed ? '#fbbf24' : isSelected ? '#3b82f6' : '#6366f1'}
        stroke={isSelected ? '#1e40af' : '#4f46e5'}
        strokeWidth={isSelected ? 3 : 2}
        opacity={isSelected ? 1 : 0.9}
      />
      
      {/* Layer indicator ring */}
      {layer > 0 && (
        <circle
          cx={x}
          cy={y}
          r={radius + 5}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity={0.5}
        />
      )}

      {/* Concept name text */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={Math.max(10, radius * 0.4)}
        fontWeight={isSelected ? 'bold' : 'normal'}
        pointerEvents="none"
        style={{ userSelect: 'none' }}
      >
        {concept.name.length > 15 
          ? concept.name.substring(0, 15) + '...' 
          : concept.name}
      </text>

      {/* Layer number badge */}
      {layer !== undefined && (
        <circle
          cx={x + radius - 8}
          cy={y - radius + 8}
          r={12}
          fill="#64748b"
          opacity={0.8}
        />
      )}
      {layer !== undefined && (
        <text
          x={x + radius - 8}
          y={y - radius + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="10"
          fontWeight="bold"
          pointerEvents="none"
        >
          {layer}
        </text>
      )}
    </g>
  );
};

export default ForceViewNode;

