import { useMemo } from 'react';
import { Note } from '../../notes/types';
import { TreeNode } from '../types/mindMapTypes';
import { 
  layoutTree, 
  calculateNodeWidth, 
  calculateNodeHeight, 
  wrapText,
  calculateGroupBounds,
  moveGroup,
  nodesOverlap,
  calculateMinDistance
} from '../utils/mindMapUtils';
import { MINDMAP_CONSTANTS } from '../utils/mindMapConstants';

interface UseMindMapLayoutProps {
  notes: Note[];
  containerWidth: number;
  layoutType?: 'horizontal' | 'vertical';
}

interface UseMindMapLayoutReturn {
  treeData: TreeNode | null;
  laidOutNodes: TreeNode[];
  laidOutConnections: { source: TreeNode; target: TreeNode }[];
  calculateNodeWidth: (title: string) => number;
  calculateNodeHeight: (title: string, width: number) => number;
  wrapText: (text: string, maxWidth: number) => string[];
}

export const useMindMapLayout = ({ notes, containerWidth, layoutType = 'horizontal' }: UseMindMapLayoutProps): UseMindMapLayoutReturn => {
  // Prepare tree data from notes
  const treeData = useMemo(() => {
    const nodesMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create all nodes
    notes.forEach(note => {
      const calculatedWidth = calculateNodeWidth(note.title);
      const calculatedHeight = calculateNodeHeight(note.title, calculatedWidth);
      nodesMap.set(note.id, {
        id: note.id,
        title: note.title,
        x: 0, y: 0, width: calculatedWidth, height: calculatedHeight,
        level: note.level,
        children: [],
        parentId: note.parentId
      });
    });

    // Build hierarchy - only include children of expanded notes
    nodesMap.forEach(node => {
      if (node.parentId) {
        const parent = nodesMap.get(node.parentId);
        if (parent) {
          // Check if parent is expanded before adding children
          const parentNote = notes.find(n => n.id === node.parentId);
          if (parentNote && parentNote.isExpanded) {
            parent.children.push(node);
          }
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Reorder children to match the order specified in each parent note's children array
    // This ensures visual order matches the data order without affecting layout calculations
    notes.forEach(note => {
      if (!note.children || !note.children.length || !note.isExpanded) return;
      
      const parentNode = nodesMap.get(note.id);
      if (!parentNode || parentNode.children.length === 0) return;

      // Create a map of child nodes by ID for quick lookup
      const childMap = new Map<string, TreeNode>();
      parentNode.children.forEach(child => {
        childMap.set(child.id, child);
      });

      // Reorder children array to match note.children order
      const orderedChildren: TreeNode[] = [];
      note.children.forEach(childId => {
        const childNode = childMap.get(childId);
        if (childNode) {
          orderedChildren.push(childNode);
        }
      });
      
      // Add any children that weren't in the ordered list (safety check for data consistency)
      parentNode.children.forEach(childNode => {
        if (!orderedChildren.some(ordered => ordered.id === childNode.id)) {
          orderedChildren.push(childNode);
        }
      });
      
      // Update parent's children array with ordered version
      parentNode.children = orderedChildren;
    });

    // Create a virtual root if there are multiple actual root nodes
    if (rootNodes.length > 1) {
      return {
        id: 'virtual-root',
        title: 'All Notes',
        x: 0, y: 0, width: 0, height: 0,
        level: -1, // Virtual root has no level
        children: rootNodes,
        parentId: undefined
      };
    } else if (rootNodes.length === 1) {
      return rootNodes[0];
    }
    return null;
  }, [notes]);

  // Enhanced tree layout with collision detection and prevention
  const { nodes: laidOutNodes, connections: laidOutConnections } = useMemo(() => {
    if (!treeData) return { nodes: [], connections: [] };

    // Phase 1: Calculate initial layout and get total widths
    const { nodes, connections, totalWidth } = layoutTree(treeData, 0, 0, 0, 0, 1, layoutType);
    
    // Phase 2: Detect and resolve overlapping between different parent groups
    const resolvedNodes = [...nodes];
    const resolvedConnections = [...connections];
    
    // Group nodes by their parent and level
    const nodesByLevel = new Map<number, TreeNode[]>();
    nodes.forEach(node => {
      if (!nodesByLevel.has(node.level)) {
        nodesByLevel.set(node.level, []);
      }
      nodesByLevel.get(node.level)!.push(node);
    });
    
    // For each level, check for overlapping between different parent groups
    const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
    for (let level = 1; level <= Math.max(...levels); level++) {
      const levelNodes = nodesByLevel.get(level) || [];
      const parentGroups = new Map<string, TreeNode[]>();
      
      // Group nodes by their parent
      levelNodes.forEach(node => {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) {
          if (!parentGroups.has(parent.id)) {
            parentGroups.set(parent.id, []);
          }
          parentGroups.get(parent.id)!.push(node);
        }
      });
      
      // Sort parent groups by their leftmost position
      const sortedParentGroups = Array.from(parentGroups.entries()).sort(([, group1], [, group2]) => {
        const bounds1 = calculateGroupBounds(group1);
        const bounds2 = calculateGroupBounds(group2);
        return bounds1.minX - bounds2.minX;
      });
      
      // Check for overlapping between adjacent parent groups
      for (let i = 0; i < sortedParentGroups.length - 1; i++) {
        const [, group1] = sortedParentGroups[i];
        const [, group2] = sortedParentGroups[i + 1];
        
        // Calculate bounds for each group
        const group1Bounds = calculateGroupBounds(group1);
        const group2Bounds = calculateGroupBounds(group2);
        
        // Check if groups overlap (with some buffer)
        const buffer = MINDMAP_CONSTANTS.COLLISION_BUFFER;
        if (group1Bounds.maxX + buffer >= group2Bounds.minX) {
          // Groups overlap, need to separate them
          const overlap = group1Bounds.maxX + buffer - group2Bounds.minX;
          const separation = overlap + MINDMAP_CONSTANTS.COLLISION_SEPARATION;
          
          // Move group2 and all groups to its right
          for (let j = i + 1; j < sortedParentGroups.length; j++) {
            const [, groupToMove] = sortedParentGroups[j];
            moveGroup(groupToMove, separation, resolvedNodes);
          }
        }
      }
    }
    
    // Phase 3: Enforce maximum horizontal distance between parent and children
    const maxDistance = MINDMAP_CONSTANTS.MAX_PARENT_CHILD_DISTANCE;
    
    // Rebuild nodesByLevel with resolvedNodes
    const resolvedNodesByLevel = new Map<number, TreeNode[]>();
    resolvedNodes.forEach(node => {
      if (!resolvedNodesByLevel.has(node.level)) {
        resolvedNodesByLevel.set(node.level, []);
      }
      resolvedNodesByLevel.get(node.level)!.push(node);
    });
    
    const resolvedLevels = Array.from(resolvedNodesByLevel.keys()).sort((a, b) => a - b);
    for (let level = 1; level <= Math.max(...resolvedLevels); level++) {
      const levelNodes = resolvedNodesByLevel.get(level) || [];
      
      levelNodes.forEach(childNode => {
        const parent = resolvedNodes.find(n => n.id === childNode.parentId);
        if (parent) {
          const horizontalDistance = Math.abs(childNode.x - parent.x);
          
          if (horizontalDistance > maxDistance) {
            // Child is too far from parent horizontally, move it closer
            const direction = childNode.x > parent.x ? 1 : -1;
            const newX = parent.x + (direction * maxDistance);
            const offset = newX - childNode.x;
            
            // Move the child and all its descendants
            const childGroup = [childNode];
            const collectDescendants = (node: TreeNode) => {
              const descendants = resolvedNodes.filter(n => n.parentId === node.id);
              childGroup.push(...descendants);
              descendants.forEach(desc => collectDescendants(desc));
            };
            collectDescendants(childNode);
            
            // Apply offset to all nodes in the group
            childGroup.forEach(node => {
              const nodeIndex = resolvedNodes.findIndex(n => n.id === node.id);
              if (nodeIndex !== -1) {
                resolvedNodes[nodeIndex].x += offset;
              }
            });
          }
        }
      });
    }
    
    // Phase 4: Prevent overlap between parent and child nodes
    // Check each child against its parent and ensure no overlap
    const resolvedLevelsAfterDistance = Array.from(resolvedNodesByLevel.keys()).sort((a, b) => a - b);
    for (let level = 1; level <= Math.max(...resolvedLevelsAfterDistance); level++) {
      const levelNodes = resolvedNodesByLevel.get(level) || [];
      
      levelNodes.forEach(childNode => {
        const parent = resolvedNodes.find(n => n.id === childNode.parentId);
        if (parent) {
          // Check if child overlaps with parent horizontally
          if (nodesOverlap(parent, childNode)) {
            // Calculate minimum distance needed to prevent overlap
            const minDistance = calculateMinDistance(parent, childNode);
            const currentDistance = Math.abs(childNode.x - parent.x);
            
            if (currentDistance < minDistance) {
              // Child is too close to parent, need to move it away
              const direction = childNode.x > parent.x ? 1 : (childNode.x < parent.x ? -1 : 1);
              const newX = parent.x + (direction * minDistance);
              const offset = newX - childNode.x;
              
              // Move the child and all its descendants
              const childGroup = [childNode];
              const collectDescendants = (node: TreeNode) => {
                const descendants = resolvedNodes.filter(n => n.parentId === node.id);
                childGroup.push(...descendants);
                descendants.forEach(desc => collectDescendants(desc));
              };
              collectDescendants(childNode);
              
              // Apply offset to all nodes in the group
              childGroup.forEach(node => {
                const nodeIndex = resolvedNodes.findIndex(n => n.id === node.id);
                if (nodeIndex !== -1) {
                  resolvedNodes[nodeIndex].x += offset;
                }
              });
            }
          }
        }
      });
    }
    
    // Find min/max X to center the tree
    let minX = Infinity;
    let maxX = -Infinity;
    resolvedNodes.forEach(node => {
      minX = Math.min(minX, node.x - node.width / 2);
      maxX = Math.max(maxX, node.x + node.width / 2);
    });

    const treeWidth = maxX - minX;
    const offsetX = (containerWidth / 2) - (minX + treeWidth / 2);

    // Apply offset to all nodes
    resolvedNodes.forEach(node => {
      node.x += offsetX;
    });

    return { nodes: resolvedNodes, connections: resolvedConnections };
  }, [treeData, containerWidth, layoutType]);

  return {
    treeData,
    laidOutNodes,
    laidOutConnections,
    calculateNodeWidth,
    calculateNodeHeight,
    wrapText
  };
};
