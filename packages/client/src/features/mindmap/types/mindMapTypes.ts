import { Note } from '../../notes/types';

export interface TreeNode {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  children: TreeNode[];
  parentId?: string;
}

export interface EditingState {
  noteId: string;
  field: 'title' | 'content';
}

export interface LayoutResult {
  nodes: TreeNode[];
  connections: { source: TreeNode; target: TreeNode }[];
  totalWidth: number;
  totalHeight?: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
}

export interface MindMapProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onEditNote: (note: Note) => void;
  onCreateNote: () => void;
  onAddChildNote: (parentNote: Note) => void;
  onNavigateToNote: (note: Note) => void;
  scrollTargetNote?: Note;
  onSetScrollTargetNote: (note: Note | undefined) => void;
  onAIGenerateChildren?: (parentNote: Note) => Promise<void>;
}

export interface MindMapNodeProps {
  node: TreeNode;
  note: Note | undefined;
  isSelected: boolean;
  isEditing: boolean;
  editValues: { title: string; content: string };
  zoom: number;
  pan: { x: number; y: number };
  onNodeClick: (node: TreeNode) => void;
  onNodeDoubleClick?: (node: TreeNode) => void;
  onNodeRightClick: (e: React.MouseEvent, node: TreeNode) => void;
  onStartEditing: (note: Note, field: 'title' | 'content') => void;
  onSaveEdit: (note: Note) => void;
  onCancelEdit: () => void;
  onOpenContentEditor: (note: Note) => void;
  onEditNote: (note: Note) => void;
  onAIGenerateChildren: (note: Note) => Promise<void>;
  onEditValuesChange: (values: { title: string; content: string }) => void;
}

export interface MindMapConnectionsProps {
  connections: { source: TreeNode; target: TreeNode }[];
  zoom: number;
  pan: { x: number; y: number };
}

export interface MindMapContextMenuProps {
  contextMenu: { x: number; y: number; note: Note } | null;
  onClose: () => void;
  onEditContent: () => void;
  onAddChild: () => void;
}

export interface MindMapHeaderProps {
  zoom: number;
  layoutType: 'horizontal' | 'vertical';
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleLayout: () => void;
}

export interface MindMapCanvasProps {
  width: number;
  height: number;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  children: React.ReactNode;
}

export interface MindMapContainerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  isDragging: boolean;
  children: React.ReactNode;
}

export interface EmptyStateProps {
  onCreateNote: () => void;
}

export interface NoteContentModalProps {
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
  onSave: (note: Note) => void;
}
