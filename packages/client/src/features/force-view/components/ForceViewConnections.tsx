import React from 'react';
import { ForceViewConnectionsProps } from '../types/forceViewTypes';

const ForceViewConnections: React.FC<ForceViewConnectionsProps> = ({
  connections,
  zoom,
  pan
}) => {
  return (
    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
      {connections.map((connection, index) => {
        const { source, target } = connection;
        return (
          <line
            key={`${source.id}-${target.id}-${index}`}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity={0.6}
          />
        );
      })}
    </g>
  );
};

export default ForceViewConnections;

