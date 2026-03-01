import React from 'react';
import { MindMapConnectionsProps } from '../types/mindMapTypes';

const MindMapConnections: React.FC<MindMapConnectionsProps> = ({
  connections,
  zoom,
  pan
}) => {
  return (
    <>
      {connections.map((conn, index) => {
        const sourceX = conn.source.x * zoom + pan.x;
        const sourceY = conn.source.y * zoom + pan.y;
        const targetX = conn.target.x * zoom + pan.x;
        const targetY = conn.target.y * zoom + pan.y;

        // Draw a straight line for now
        return (
          <line
            key={index}
            x1={sourceX}
            y1={sourceY}
            x2={targetX}
            y2={targetY}
            className="mindmap-link"
            strokeWidth={2 * zoom}
          />
        );
      })}
    </>
  );
};

export default MindMapConnections;
