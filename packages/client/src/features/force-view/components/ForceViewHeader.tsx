import React from 'react';
import { ForceViewHeaderProps } from '../types/forceViewTypes';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const ForceViewHeader: React.FC<ForceViewHeaderProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Force View</h3>
        <span className="text-sm text-gray-500">({Math.round(zoom * 100)}%)</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={onZoomIn}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={onResetView}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
          title="Reset View"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};

export default ForceViewHeader;

