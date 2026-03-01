import React from 'react';
import { MindMapContainerProps } from '../types/mindMapTypes';

const MindMapContainer: React.FC<MindMapContainerProps> = ({
  containerRef,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
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
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      {children}
    </div>
  );
};

export default MindMapContainer;
