import React from 'react';
import { RadialViewConnectionsProps } from '../types/radialViewTypes';
import { useTheme } from '../../../contexts/ThemeContext';

const RadialViewConnections: React.FC<RadialViewConnectionsProps> = ({
  connections,
  zoom,
  pan
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const connectionStroke = isDark ? '#60a5fa' : '#3b82f6';
  
  // Filter to only show visible connections
  const visibleConnections = connections.filter(conn => conn.visible);
  
  return (
    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
      {visibleConnections.map((connection, index) => {
        const { source, target } = connection;
        return (
          <line
            key={`${source.id}-${target.id}-${index}`}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke={connectionStroke}
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity={0.6}
            markerEnd="url(#arrowhead)"
          />
        );
      })}
      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill={connectionStroke} />
        </marker>
      </defs>
    </g>
  );
};

export default RadialViewConnections;

