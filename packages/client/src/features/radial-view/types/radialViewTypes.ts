import { Concept } from '../../concepts/types';

export interface RadialNode {
  id: string;
  concept: Concept;
  x: number;
  y: number;
  layer: number;
  angle: number; // Angle in radians for positioning
  radius: number; // Distance from center
}

export interface RadialConnection {
  source: RadialNode;
  target: RadialNode;
  visible: boolean; // Whether connection is visible (on hover)
}

export interface RadialViewLayersProps {
  layers: { layer: number; radius: number }[];
  centerX: number;
  centerY: number;
  zoom: number;
  pan: { x: number; y: number };
}

export interface RadialViewProps {
  concepts: Concept[];
  selectedConcept: Concept | null;
  onSelectConcept: (concept: Concept) => void;
  onNavigateToConcept?: (concept: Concept) => void;
}

export interface RadialViewNodeProps {
  node: RadialNode;
  isSelected: boolean;
  isHovered: boolean;
  zoom: number;
  pan: { x: number; y: number };
  onNodeClick: (node: RadialNode) => void;
  onNodeDoubleClick?: (node: RadialNode) => void;
  onNodeHover: (node: RadialNode | null) => void;
}

export interface RadialViewConnectionsProps {
  connections: RadialConnection[];
  zoom: number;
  pan: { x: number; y: number };
}

export interface RadialViewContainerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  isDragging: boolean;
  children: React.ReactNode;
}

export interface RadialViewCanvasProps {
  width: number;
  height: number;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  children: React.ReactNode;
}

export interface RadialViewHeaderProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export interface EmptyStateProps {
  onCreateConcept?: () => void;
}

