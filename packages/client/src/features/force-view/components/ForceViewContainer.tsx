import React from 'react';
import { ForceViewContainerProps } from '../types/forceViewTypes';

const ForceViewContainer: React.FC<ForceViewContainerProps> = ({
  containerRef,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  isDragging,
  children
}) => {
  return (
    <div 
      className="flex-1 flex flex-col overflow-hidden bg-gray-50" 
      ref={containerRef}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {children}
    </div>
  );
};

export default ForceViewContainer;

