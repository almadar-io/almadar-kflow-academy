import React from 'react';
import { Edit2, Plus } from 'lucide-react';
import { MindMapContextMenuProps } from '../types/mindMapTypes';

const MindMapContextMenu: React.FC<MindMapContextMenuProps> = ({
  contextMenu,
  onClose,
  onEditContent,
  onAddChild
}) => {
  if (!contextMenu) return null;

  return (
    <div 
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[160px] z-50"
      style={{
        left: Math.max(10, contextMenu.x - 75),
        top: Math.max(10, contextMenu.y - 30),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150" 
        onClick={onEditContent}
      >
        <Edit2 size={14} />
        Edit Content
      </div>
      <div 
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150" 
        onClick={onAddChild}
      >
        <Plus size={14} />
        Add Child
      </div>
    </div>
  );
};

export default MindMapContextMenu;
