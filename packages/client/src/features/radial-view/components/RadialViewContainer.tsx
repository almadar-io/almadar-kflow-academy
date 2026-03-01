import React from 'react';
import { RadialViewContainerProps } from '../types/radialViewTypes';

const RadialViewContainer: React.FC<RadialViewContainerProps> = ({
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
      className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900" 
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

export default RadialViewContainer;

