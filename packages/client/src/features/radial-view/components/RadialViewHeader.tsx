import React from 'react';
import { RadialViewHeaderProps } from '../types/radialViewTypes';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const RadialViewHeader: React.FC<RadialViewHeaderProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Radial View</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">({Math.round(zoom * 100)}%)</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={onZoomIn}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={onResetView}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title="Reset View"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};

export default RadialViewHeader;

