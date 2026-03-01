import { Concept } from '../../concepts/types';

export interface ForceNode {
  id: string;
  concept: Concept;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  layer: number;
}

export interface ForceConnection {
  source: ForceNode;
  target: ForceNode;
}

export interface ForceViewProps {
  concepts: Concept[];
  selectedConcept: Concept | null;
  onSelectConcept: (concept: Concept) => void;
  onNavigateToConcept?: (concept: Concept) => void;
}

export interface ForceViewNodeProps {
  node: ForceNode;
  isSelected: boolean;
  zoom: number;
  pan: { x: number; y: number };
  onNodeClick: (node: ForceNode) => void;
}

export interface ForceViewConnectionsProps {
  connections: ForceConnection[];
  zoom: number;
  pan: { x: number; y: number };
}

export interface ForceViewContainerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  isDragging: boolean;
  children: React.ReactNode;
}

export interface ForceViewCanvasProps {
  width: number;
  height: number;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  children: React.ReactNode;
}

export interface ForceViewHeaderProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export interface EmptyStateProps {
  onCreateConcept?: () => void;
}

