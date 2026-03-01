import { Note } from '../../notes/types';
import { TreeNode, LayoutResult, Bounds } from '../types/mindMapTypes';
import { MINDMAP_CONSTANTS } from './mindMapConstants';

// Text wrapping and sizing utilities
export const calculateNodeWidth = (title: string): number => {
  const minWidth = MINDMAP_CONSTANTS.MIN_NODE_WIDTH;
  const maxWidth = MINDMAP_CONSTANTS.MAX_NODE_WIDTH;
  const charWidth = MINDMAP_CONSTANTS.CHAR_WIDTH;
  const padding = MINDMAP_CONSTANTS.NODE_PADDING;
  
  const textWidth = title.length * charWidth + padding;
  return Math.max(minWidth, Math.min(maxWidth, textWidth));
};

export const calculateNodeHeight = (title: string, width: number): number => {
  const minHeight = MINDMAP_CONSTANTS.MIN_NODE_HEIGHT;
  const lineHeight = MINDMAP_CONSTANTS.LINE_HEIGHT;
  const padding = MINDMAP_CONSTANTS.NODE_PADDING;
  const lineSpacing = MINDMAP_CONSTANTS.LINE_SPACING;
  
  const wrappedLines = wrapText(title, width);
  const totalLines = wrappedLines.length;
  
  const textHeight = totalLines * lineHeight + (totalLines - 1) * lineSpacing + padding;
  return Math.max(minHeight, textHeight);
};

export const wrapText = (text: string, maxWidth: number): string[] => {
  if (!text || text.trim() === '') return [''];
  
  const words = text.trim().split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  // Handle single word or very short text
  if (words.length === 1) {
    const wordWidth = words[0].length * MINDMAP_CONSTANTS.CHAR_WIDTH;
    if (wordWidth <= maxWidth - MINDMAP_CONSTANTS.NODE_PADDING) {
      return [words[0]];
    } else {
      // Break long single word
      const charsPerLine = Math.floor((maxWidth - MINDMAP_CONSTANTS.NODE_PADDING) / MINDMAP_CONSTANTS.CHAR_WIDTH);
      const brokenLines = [];
      let remainingText = words[0];
      while (remainingText.length > 0) {
        const line = remainingText.substring(0, charsPerLine);
        brokenLines.push(line);
        remainingText = remainingText.substring(charsPerLine);
      }
      return brokenLines;
    }
  }
  
  // Handle multiple words
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = testLine.length * MINDMAP_CONSTANTS.CHAR_WIDTH;
    
    if (testWidth <= maxWidth - MINDMAP_CONSTANTS.NODE_PADDING) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // Check if single word is too long
      if (word.length * MINDMAP_CONSTANTS.CHAR_WIDTH > maxWidth - MINDMAP_CONSTANTS.NODE_PADDING) {
        // Break long word
        const charsPerLine = Math.floor((maxWidth - MINDMAP_CONSTANTS.NODE_PADDING) / MINDMAP_CONSTANTS.CHAR_WIDTH);
        let remainingWord = word;
        while (remainingWord.length > 0) {
          const line = remainingWord.substring(0, charsPerLine);
          lines.push(line);
          remainingWord = remainingWord.substring(charsPerLine);
        }
        currentLine = '';
      } else {
        currentLine = word;
      }
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
};

// Layout utilities
export const layoutTree = (
  node: TreeNode, 
  x: number, 
  y: number, 
  level: number, 
  siblingIndex: number, 
  totalSiblings: number,
  layoutType: 'horizontal' | 'vertical' = 'horizontal'
): LayoutResult => {
  if (layoutType === 'vertical') {
    return layoutTreeVertical(node, x, y, level, siblingIndex, totalSiblings);
  }
  
  const horizontalSpacing = MINDMAP_CONSTANTS.HORIZONTAL_SPACING;
  const verticalSpacing = MINDMAP_CONSTANTS.VERTICAL_SPACING;

  const nodeWidth = calculateNodeWidth(node.title);
  const nodeHeight = calculateNodeHeight(node.title, nodeWidth);

  node.x = x;
  node.y = y;
  node.width = nodeWidth;
  node.height = nodeHeight;
  node.level = level;

  const nodes: TreeNode[] = [node];
  const connections: { source: TreeNode; target: TreeNode }[] = [];
  let totalWidth = nodeWidth;

  if (node.children.length > 0) {
    // First pass: calculate the total width needed for all children
    let totalChildrenWidth = 0;
    const childWidths: number[] = [];
    
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childLayout = layoutTree(child, 0, y + verticalSpacing + nodeHeight, level + 1, i, node.children.length, layoutType);
      childWidths.push(childLayout.totalWidth);
      totalChildrenWidth += childLayout.totalWidth;
    }
    
    // Add spacing between children
    if (node.children.length > 1) {
      totalChildrenWidth += (node.children.length - 1) * horizontalSpacing;
    }
    
    totalWidth = Math.max(nodeWidth, totalChildrenWidth);
    
    // Second pass: position children with proper spacing
    let currentChildX = x - totalChildrenWidth / 2 + childWidths[0] / 2;
    
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childLayout = layoutTree(child, currentChildX, y + verticalSpacing + nodeHeight, level + 1, i, node.children.length, layoutType);
      
      // Update child position to match the calculated position
      childLayout.nodes.forEach(childNode => {
        if (childNode.id === child.id) {
          childNode.x = currentChildX;
        }
      });
      
      nodes.push(...childLayout.nodes);
      connections.push({ source: node, target: child });
      connections.push(...childLayout.connections);
      
      // Move to next child position
      currentChildX += childWidths[i] / 2 + horizontalSpacing + childWidths[i + 1] / 2;
    }
  }

  return { nodes, connections, totalWidth };
};

// Vertical layout function
export const layoutTreeVertical = (
  node: TreeNode, 
  x: number, 
  y: number, 
  level: number, 
  siblingIndex: number, 
  totalSiblings: number
): LayoutResult => {
  const horizontalSpacing = MINDMAP_CONSTANTS.HORIZONTAL_SPACING;
  const verticalSpacing = MINDMAP_CONSTANTS.VERTICAL_SPACING;

  const nodeWidth = calculateNodeWidth(node.title);
  const nodeHeight = calculateNodeHeight(node.title, nodeWidth);

  node.x = x;
  node.y = y;
  node.width = nodeWidth;
  node.height = nodeHeight;
  node.level = level;

  const nodes: TreeNode[] = [node];
  const connections: { source: TreeNode; target: TreeNode }[] = [];
  let totalHeight = nodeHeight;

  if (node.children.length > 0) {
    // First pass: calculate the total height needed for all children
    let totalChildrenHeight = 0;
    const childHeights: number[] = [];
    
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childLayout = layoutTreeVertical(child, x + horizontalSpacing + nodeWidth, 0, level + 1, i, node.children.length);
      childHeights.push(childLayout.totalHeight || childLayout.totalWidth);
      totalChildrenHeight += childLayout.totalHeight || childLayout.totalWidth;
    }
    
    // Add spacing between children
    if (node.children.length > 1) {
      totalChildrenHeight += (node.children.length - 1) * verticalSpacing;
    }
    
    totalHeight = Math.max(nodeHeight, totalChildrenHeight);
    
    // Second pass: position children with proper spacing
    let currentChildY = y - totalChildrenHeight / 2 + childHeights[0] / 2;
    
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childLayout = layoutTreeVertical(child, x + horizontalSpacing + nodeWidth, currentChildY, level + 1, i, node.children.length);
      
      // Update child position to match the calculated position
      childLayout.nodes.forEach(childNode => {
        if (childNode.id === child.id) {
          childNode.y = currentChildY;
        }
      });
      
      nodes.push(...childLayout.nodes);
      connections.push({ source: node, target: child });
      connections.push(...childLayout.connections);
      
      // Move to next child position
      currentChildY += childHeights[i] / 2 + verticalSpacing + childHeights[i + 1] / 2;
    }
  }

  return { nodes, connections, totalWidth: nodeWidth, totalHeight };
};

export const calculateGroupBounds = (nodes: TreeNode[]): Bounds => {
  let minX = Infinity;
  let maxX = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.x - node.width / 2);
    maxX = Math.max(maxX, node.x + node.width / 2);
  });
  
  return { minX, maxX };
};

export const moveGroup = (nodes: TreeNode[], offset: number, allNodes: TreeNode[]): void => {
  const nodeIds = new Set<string>();
  
  // Collect all node IDs in this group and their descendants
  const collectNodeIds = (nodeList: TreeNode[]) => {
    nodeList.forEach(node => {
      nodeIds.add(node.id);
      const children = allNodes.filter(n => n.parentId === node.id);
      if (children.length > 0) {
        collectNodeIds(children);
      }
    });
  };
  
  collectNodeIds(nodes);
  
  // Move all collected nodes
  allNodes.forEach(node => {
    if (nodeIds.has(node.id)) {
      node.x += offset;
    }
  });
};

// Navigation utilities
export const findParentNote = (note: Note, notes: Note[]): Note | null => {
  if (!note.parentId) return null;
  return notes.find(n => n.id === note.parentId) || null;
};

export const findFirstChildNote = (note: Note, notes: Note[], laidOutNodes: TreeNode[]): Note | null => {
  const children = notes.filter(n => n.parentId === note.id);
  if (children.length === 0) return null;
  
  // Sort children by their position in the tree (left to right)
  const sortedChildren = children.sort((a, b) => {
    const aNode = laidOutNodes.find(n => n.id === a.id);
    const bNode = laidOutNodes.find(n => n.id === b.id);
    if (!aNode || !bNode) return 0;
    return aNode.x - bNode.x;
  });
  
  return sortedChildren[0];
};

export const findPreviousSiblingNote = (note: Note, notes: Note[], laidOutNodes: TreeNode[]): Note | null => {
  if (!note.parentId) {
    // For root notes, find previous root note
    const rootNotes = notes.filter(n => !n.parentId);
    const currentIndex = rootNotes.findIndex(n => n.id === note.id);
    if (currentIndex <= 0) return null;
    return rootNotes[currentIndex - 1];
  }
  
  const siblings = notes.filter(n => n.parentId === note.parentId);
  if (siblings.length <= 1) return null;
  
  // Sort siblings by their position in the tree (left to right)
  const sortedSiblings = siblings.sort((a, b) => {
    const aNode = laidOutNodes.find(n => n.id === a.id);
    const bNode = laidOutNodes.find(n => n.id === b.id);
    if (!aNode || !bNode) return 0;
    return aNode.x - bNode.x;
  });
  
  const currentIndex = sortedSiblings.findIndex(n => n.id === note.id);
  if (currentIndex <= 0) return null;
  return sortedSiblings[currentIndex - 1];
};

export const findNextSiblingNote = (note: Note, notes: Note[], laidOutNodes: TreeNode[]): Note | null => {
  if (!note.parentId) {
    // For root notes, find next root note
    const rootNotes = notes.filter(n => !n.parentId);
    const currentIndex = rootNotes.findIndex(n => n.id === note.id);
    if (currentIndex === -1 || currentIndex >= rootNotes.length - 1) return null;
    return rootNotes[currentIndex + 1];
  }
  
  const siblings = notes.filter(n => n.parentId === note.parentId);
  if (siblings.length <= 1) return null;
  
  // Sort siblings by their position in the tree (left to right)
  const sortedSiblings = siblings.sort((a, b) => {
    const aNode = laidOutNodes.find(n => n.id === a.id);
    const bNode = laidOutNodes.find(n => n.id === b.id);
    if (!aNode || !bNode) return 0;
    return aNode.x - bNode.x;
  });
  
  const currentIndex = sortedSiblings.findIndex(n => n.id === note.id);
  if (currentIndex === -1 || currentIndex >= sortedSiblings.length - 1) return null;
  return sortedSiblings[currentIndex + 1];
};

export const findMiddleChildNote = (note: Note, notes: Note[], laidOutNodes: TreeNode[]): Note | null => {
  const children = notes.filter(n => n.parentId === note.id);
  if (children.length === 0) return null;
  
  // Sort children by their position in the tree
  const sortedChildren = children.sort((a, b) => {
    const aNode = laidOutNodes.find(n => n.id === a.id);
    const bNode = laidOutNodes.find(n => n.id === b.id);
    if (!aNode || !bNode) return 0;
    
    // For vertical layout, sort by Y position (top to bottom)
    // For horizontal layout, sort by X position (left to right)
    const aPos = aNode.y;
    const bPos = bNode.y;
    return aPos - bPos;
  });
  
  // Return the middle child (or the first child if there's only one)
  const middleIndex = Math.floor(sortedChildren.length / 2);
  return sortedChildren[middleIndex];
};

// Helper function to check if two nodes overlap horizontally
export const nodesOverlap = (node1: TreeNode, node2: TreeNode): boolean => {
  const node1Left = node1.x - node1.width / 2;
  const node1Right = node1.x + node1.width / 2;
  const node2Left = node2.x - node2.width / 2;
  const node2Right = node2.x + node2.width / 2;
  
  // Check if nodes overlap (with buffer)
  const buffer = 10; // Small buffer to prevent touching
  return !(node1Right + buffer < node2Left || node2Right + buffer < node1Left);
};

// Helper function to calculate minimum horizontal distance between two nodes
export const calculateMinDistance = (node1: TreeNode, node2: TreeNode): number => {
  return (node1.width / 2) + (node2.width / 2) + 10; // Half width of each + buffer
};
