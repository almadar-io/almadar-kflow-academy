import React from 'react';
import { ForceViewCanvasProps } from '../types/forceViewTypes';

const ForceViewCanvas: React.FC<ForceViewCanvasProps> = ({
  width,
  height,
  isFocused,
  onFocus,
  onBlur,
  children
}) => {
  return (
    <div 
      className={`flex-1 bg-gray-50 border border-gray-200 rounded-lg m-4 transition-all duration-200 ${
        isFocused ? 'border-blue-500 ring-2 ring-blue-200' : ''
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

export default ForceViewCanvas;

