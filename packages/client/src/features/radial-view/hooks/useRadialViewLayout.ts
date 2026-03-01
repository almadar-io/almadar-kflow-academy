import { useMemo } from 'react';
import { Concept } from '../../concepts/types';
import { RadialNode, RadialConnection } from '../types/radialViewTypes';
import { RADIAL_VIEW_CONSTANTS } from '../utils/radialViewConstants';

interface UseRadialViewLayoutProps {
  concepts: Concept[];
  containerWidth: number;
  containerHeight: number;
}

interface UseRadialViewLayoutReturn {
  nodes: RadialNode[];
  connections: RadialConnection[];
  layers: { layer: number; radius: number }[];
  centerX: number;
  centerY: number;
}

export const useRadialViewLayout = ({
  concepts,
  containerWidth,
  containerHeight
}: UseRadialViewLayoutProps): UseRadialViewLayoutReturn => {
  const { nodes, connections, layers, centerX, centerY } = useMemo(() => {
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    // Group concepts by layer
    const conceptsByLayer: Record<number, Concept[]> = {};
    concepts.forEach(concept => {
      // Seed concepts should always be layer 0
      const layer = concept.isSeed ? 0 : (concept.layer ?? 0);
      if (!conceptsByLayer[layer]) {
        conceptsByLayer[layer] = [];
      }
      conceptsByLayer[layer].push(concept);
    });
    
    // Sort layers
    const sortedLayers = Object.keys(conceptsByLayer)
      .map(Number)
      .sort((a, b) => a - b);
    
    const radialNodes: RadialNode[] = [];
    const radialConnections: RadialConnection[] = [];
    const layerRadii: { layer: number; radius: number }[] = [];
    
    // Create name to concept map for quick lookup
    const nameToConceptMap = new Map<string, Concept>();
    concepts.forEach(c => nameToConceptMap.set(c.name, c));
    
    // Process each layer - first pass: evenly distribute
    sortedLayers.forEach(layer => {
      const layerConcepts = conceptsByLayer[layer];
      const layerRadius = layer === 0 
        ? RADIAL_VIEW_CONSTANTS.START_RADIUS 
        : RADIAL_VIEW_CONSTANTS.LAYER_SPACING * layer;
      
      // Store layer radius info
      layerRadii.push({ layer, radius: layerRadius });
      
      // For layer 0 (seed), there should be only one concept at the center
      if (layer === 0 && layerConcepts.length > 0) {
        const seedConcept = layerConcepts[0]; // Use first seed concept
        radialNodes.push({
          id: seedConcept.id || seedConcept.name,
          concept: seedConcept,
          x: centerX,
          y: centerY,
          layer: 0,
          angle: 0,
          radius: 0,
        });
      } else {
        // Calculate angle step for even distribution around circle
        const angleStep = layerConcepts.length > 0 
          ? (2 * Math.PI) / layerConcepts.length 
          : 0;
        
        layerConcepts.forEach((concept, index) => {
          const angle = index * angleStep;
          const x = centerX + layerRadius * Math.cos(angle);
          const y = centerY + layerRadius * Math.sin(angle);
          
          radialNodes.push({
            id: concept.id || concept.name,
            concept,
            x,
            y,
            layer,
            angle,
            radius: layerRadius,
          });
        });
      }
    });
    
    // Second pass: adjust parent positions to be closer to their children
    // Process layers from inner to outer (parent layers before child layers)
    sortedLayers.forEach(layer => {
      const layerConcepts = conceptsByLayer[layer];
      const layerRadius = layer === 0 
        ? RADIAL_VIEW_CONSTANTS.START_RADIUS 
        : RADIAL_VIEW_CONSTANTS.LAYER_SPACING * layer;
      
      // Skip layer 0 (seed)
      if (layer === 0) return;
      
      layerConcepts.forEach(concept => {
        // Find children of this concept (they should be in the next layer)
        const children = radialNodes.filter(node => 
          node.concept.parents.includes(concept.name) && 
          node.layer === layer + 1
        );
        
        if (children.length > 0) {
          // Calculate average angle of children
          const childAngles = children.map(child => {
            const dx = child.x - centerX;
            const dy = child.y - centerY;
            return Math.atan2(dy, dx);
          });
          
          // Normalize angles to [0, 2π]
          const normalizedAngles = childAngles.map(angle => 
            angle < 0 ? angle + 2 * Math.PI : angle
          );
          
          // Calculate average angle
          let avgAngle = 0;
          if (normalizedAngles.length > 0) {
            // Handle angle wrapping (e.g., angles near 0 and 2π)
            const sortedAngles = [...normalizedAngles].sort((a, b) => a - b);
            const gaps = sortedAngles.map((angle, i) => {
              const next = sortedAngles[(i + 1) % sortedAngles.length];
              return next - angle < 0 ? next - angle + 2 * Math.PI : next - angle;
            });
            const maxGapIndex = gaps.indexOf(Math.max(...gaps));
            const startAngle = sortedAngles[(maxGapIndex + 1) % sortedAngles.length];
            
            const adjustedAngles = normalizedAngles.map(angle => {
              let adjusted = angle - startAngle;
              if (adjusted < 0) adjusted += 2 * Math.PI;
              return adjusted;
            });
            
            avgAngle = (adjustedAngles.reduce((a, b) => a + b, 0) / adjustedAngles.length + startAngle) % (2 * Math.PI);
          }
          
          // Find the node for this concept and update its position
          const nodeIndex = radialNodes.findIndex(
            n => (n.concept.id || n.concept.name) === (concept.id || concept.name)
          );
          
          if (nodeIndex !== -1) {
            // Update position to be closer to children
            const x = centerX + layerRadius * Math.cos(avgAngle);
            const y = centerY + layerRadius * Math.sin(avgAngle);
            
            radialNodes[nodeIndex] = {
              ...radialNodes[nodeIndex],
              x,
              y,
              angle: avgAngle,
            };
          }
        }
      });
    });
    
    // Third pass: resolve overlaps within each layer
    sortedLayers.forEach(layer => {
      const layerConcepts = conceptsByLayer[layer];
      const layerRadius = layer === 0 
        ? RADIAL_VIEW_CONSTANTS.START_RADIUS 
        : RADIAL_VIEW_CONSTANTS.LAYER_SPACING * layer;
      
      // Skip layer 0 (seed) - only one node
      if (layer === 0 || layerConcepts.length <= 1) return;
      
      // Minimum distance between node centers (2 * node radius + padding)
      const minDistance = (RADIAL_VIEW_CONSTANTS.NODE_RADIUS * 2) + 10; // 10px padding
      
      // Resolve overlaps iteratively
      const maxIterations = 50;
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        // Refresh layer nodes array to get latest positions
        const layerNodes = radialNodes.filter(node => node.layer === layer);
        let hasOverlap = false;
        
        for (let i = 0; i < layerNodes.length; i++) {
          const node1 = layerNodes[i];
          
          for (let j = i + 1; j < layerNodes.length; j++) {
            const node2 = layerNodes[j];
            
            // Calculate distance between nodes
            const dx = node2.x - node1.x;
            const dy = node2.y - node1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
              hasOverlap = true;
              
              // Move nodes apart along the circle
              const node1Angle = Math.atan2(node1.y - centerY, node1.x - centerX);
              const node2Angle = Math.atan2(node2.y - centerY, node2.x - centerX);
              
              // Calculate angular separation needed
              const angularSeparation = minDistance / layerRadius;
              
              // Calculate current angular separation
              let currentAngularSep = Math.abs(node2Angle - node1Angle);
              if (currentAngularSep > Math.PI) {
                currentAngularSep = 2 * Math.PI - currentAngularSep;
              }
              
              // Move nodes apart
              let newAngle1 = node1Angle;
              let newAngle2 = node2Angle;
              
              if (currentAngularSep < angularSeparation) {
                const adjustment = (angularSeparation - currentAngularSep) / 2;
                
                // Determine direction to move (clockwise/counter-clockwise)
                let angleDiff = node2Angle - node1Angle;
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                if (angleDiff > 0) {
                  // node2 is counter-clockwise from node1
                  newAngle1 = node1Angle - adjustment;
                  newAngle2 = node2Angle + adjustment;
                } else {
                  // node2 is clockwise from node1
                  newAngle1 = node1Angle + adjustment;
                  newAngle2 = node2Angle - adjustment;
                }
              }
              
              // Normalize angles to [0, 2π]
              newAngle1 = newAngle1 < 0 ? newAngle1 + 2 * Math.PI : newAngle1;
              newAngle2 = newAngle2 < 0 ? newAngle2 + 2 * Math.PI : newAngle2;
              newAngle1 = newAngle1 >= 2 * Math.PI ? newAngle1 - 2 * Math.PI : newAngle1;
              newAngle2 = newAngle2 >= 2 * Math.PI ? newAngle2 - 2 * Math.PI : newAngle2;
              
              // Update positions in radialNodes
              const node1Index = radialNodes.findIndex(
                n => (n.concept.id || n.concept.name) === (node1.concept.id || node1.concept.name)
              );
              const node2Index = radialNodes.findIndex(
                n => (n.concept.id || n.concept.name) === (node2.concept.id || node2.concept.name)
              );
              
              if (node1Index !== -1) {
                radialNodes[node1Index] = {
                  ...radialNodes[node1Index],
                  x: centerX + layerRadius * Math.cos(newAngle1),
                  y: centerY + layerRadius * Math.sin(newAngle1),
                  angle: newAngle1,
                };
              }
              
              if (node2Index !== -1) {
                radialNodes[node2Index] = {
                  ...radialNodes[node2Index],
                  x: centerX + layerRadius * Math.cos(newAngle2),
                  y: centerY + layerRadius * Math.sin(newAngle2),
                  angle: newAngle2,
                };
              }
            }
          }
        }
        
        // If no overlaps found, break early
        if (!hasOverlap) break;
      }
    });
    
    // Create connections based on parent relationships
    // Connect each concept to its parents in the previous layer
    radialNodes.forEach(node => {
      node.concept.parents.forEach(parentName => {
        const parentConcept = nameToConceptMap.get(parentName);
        if (parentConcept) {
          const parentNode = radialNodes.find(
            n => (n.concept.id || n.concept.name) === (parentConcept.id || parentConcept.name)
          );
          if (parentNode) {
            // Connection is hidden by default, shown on hover
            radialConnections.push({
              source: parentNode,
              target: node,
              visible: false,
            });
          }
        }
      });
    });
    
    return { nodes: radialNodes, connections: radialConnections, layers: layerRadii, centerX, centerY };
  }, [concepts, containerWidth, containerHeight]);
  
  return { nodes, connections, layers, centerX, centerY };
};

