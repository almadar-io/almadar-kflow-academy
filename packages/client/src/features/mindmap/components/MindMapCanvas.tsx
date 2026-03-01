import React from 'react';
import { MindMapCanvasProps } from '../types/mindMapTypes';

const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
  width,
  height,
  isFocused,
  onFocus,
  onBlur,
  children
}) => {
  return (
    <div 
      className={`flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg m-4 transition-all duration-200 ${
        isFocused ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : ''
      }`}
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <svg width={width} height={height}>
        {children}
      </svg>
    </div>
  );
};

export default MindMapCanvas;
