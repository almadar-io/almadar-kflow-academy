import React from 'react';
import { RadialViewCanvasProps } from '../types/radialViewTypes';

const RadialViewCanvas: React.FC<RadialViewCanvasProps> = ({
  width,
  height,
  isFocused,
  onFocus,
  onBlur,
  children
}) => {
  return (
    <div 
      className={`flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg m-4 transition-all duration-200 overflow-hidden ${
        isFocused ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : ''
      }`}
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ minHeight: '600px' }}
    >
      <svg 
        width={width} 
        height={height}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </svg>
    </div>
  );
};

export default RadialViewCanvas;

