import { useCallback, useState } from 'react';
import { Note } from '../../notes/types';
import { TreeNode } from '../types/mindMapTypes';

interface UseMindMapContextMenuProps {
  notes: Note[];
  onAddChildNote: (note: Note) => void;
  openContentEditor: (note: Note) => void;
}

interface UseMindMapContextMenuReturn {
  contextMenu: { x: number; y: number; note: Note } | null;
  handleNodeRightClick: (e: React.MouseEvent, node: TreeNode) => void;
  closeContextMenu: () => void;
}

export const useMindMapContextMenu = ({ 
  notes, 
  onAddChildNote, 
  openContentEditor 
}: UseMindMapContextMenuProps): UseMindMapContextMenuReturn => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; note: Note } | null>(null);

  const handleNodeRightClick = useCallback((e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.id === 'virtual-root') return;
    
    const note = notes.find(n => n.id === node.id);
    if (note) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        note
      });
    }
  }, [notes]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    handleNodeRightClick,
    closeContextMenu
  };
};
