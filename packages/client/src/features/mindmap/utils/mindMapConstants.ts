export const MINDMAP_CONSTANTS = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 3,
  ZOOM_SPEED: 0.001,
  SCROLL_SPEED: 0.5,
  HORIZONTAL_SPACING: 80, // Reduced from 200 to minimize gaps between siblings
  VERTICAL_SPACING: 40, // Reduced from 50 to minimize gaps between parent and children
  MAX_PARENT_CHILD_DISTANCE: 150, // Maximum horizontal distance between parent and children
  MIN_NODE_WIDTH: 120,
  MAX_NODE_WIDTH: 300,
  MIN_NODE_HEIGHT: 60,
  CHAR_WIDTH: 8,
  LINE_HEIGHT: 18,
  NODE_PADDING: 40,
  LINE_SPACING: 4,
  COLLISION_BUFFER: 30, // Reduced from 50 to minimize gaps when checking for collisions
  COLLISION_SEPARATION: 80, // Reduced from 100 to minimize gaps when resolving collisions
} as const;

export const LAYOUT_TYPES = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
} as const;

export type LayoutType = typeof LAYOUT_TYPES[keyof typeof LAYOUT_TYPES];
