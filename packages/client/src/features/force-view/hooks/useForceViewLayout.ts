import { useEffect, useState, useMemo } from 'react';
import { Concept } from '../../concepts/types';
import { ForceNode, ForceConnection } from '../types/forceViewTypes';
import { FORCE_VIEW_CONSTANTS } from '../utils/forceViewConstants';

interface UseForceViewLayoutProps {
  concepts: Concept[];
  containerWidth: number;
  containerHeight: number;
}

interface UseForceViewLayoutReturn {
  nodes: ForceNode[];
  connections: ForceConnection[];
}

export const useForceViewLayout = ({
  concepts,
  containerWidth,
  containerHeight
}: UseForceViewLayoutProps): UseForceViewLayoutReturn => {
  const [nodes, setNodes] = useState<ForceNode[]>([]);
  const [connections, setConnections] = useState<ForceConnection[]>([]);

  // Group concepts by layer
  const conceptsByLayer = useMemo(() => {
    const grouped: Record<number, Concept[]> = {};
    concepts.forEach(concept => {
      const layer = concept.layer ?? 0;
      if (!grouped[layer]) {
        grouped[layer] = [];
      }
      grouped[layer].push(concept);
    });
    return grouped;
  }, [concepts]);

  // Create name to concept map for quick lookup
  const nameToConceptMap = useMemo(() => {
    const map = new Map<string, Concept>();
    concepts.forEach(c => map.set(c.name, c));
    return map;
  }, [concepts]);

  // Initialize nodes with radial positions
  useEffect(() => {
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const newNodes: ForceNode[] = [];

    // Process each layer
    Object.keys(conceptsByLayer).forEach(layerStr => {
      const layer = parseInt(layerStr);
      const layerConcepts = conceptsByLayer[layer];
      const layerRadius = layer * FORCE_VIEW_CONSTANTS.LAYER_SPACING;
      const angleStep = (2 * Math.PI) / layerConcepts.length;

      layerConcepts.forEach((concept, index) => {
        const angle = index * angleStep;
        const x = centerX + layerRadius * Math.cos(angle);
        const y = centerY + layerRadius * Math.sin(angle);

        newNodes.push({
          id: concept.id || concept.name,
          concept,
          x,
          y,
          vx: 0,
          vy: 0,
          radius: FORCE_VIEW_CONSTANTS.NODE_RADIUS,
          layer,
        });
      });
    });

    // Create connections based on parent relationships
    const newConnections: ForceConnection[] = [];
    newNodes.forEach(node => {
      node.concept.parents.forEach(parentName => {
        const parentConcept = nameToConceptMap.get(parentName);
        if (parentConcept) {
          const parentNode = newNodes.find(
            n => (n.concept.id || n.concept.name) === (parentConcept.id || parentConcept.name)
          );
          if (parentNode) {
            newConnections.push({
              source: parentNode,
              target: node,
            });
          }
        }
      });
    });

    // Apply force simulation for better positioning
    const simulation = simulateForces(newNodes, newConnections, centerX, centerY);
    setNodes(simulation.nodes);
    setConnections(newConnections);
  }, [conceptsByLayer, nameToConceptMap, containerWidth, containerHeight]);

  return { nodes, connections };
};

// Simple force simulation for better node positioning
function simulateForces(
  nodes: ForceNode[],
  connections: ForceConnection[],
  centerX: number,
  centerY: number
): { nodes: ForceNode[] } {
  const iterations = FORCE_VIEW_CONSTANTS.SIMULATION_ITERATIONS;
  const alpha = FORCE_VIEW_CONSTANTS.FORCE_ALPHA;
  const alphaDecay = FORCE_VIEW_CONSTANTS.FORCE_ALPHA_DECAY;
  const chargeStrength = FORCE_VIEW_CONSTANTS.CHARGE_STRENGTH;
  const linkDistance = FORCE_VIEW_CONSTANTS.LINK_DISTANCE;
  const linkStrength = FORCE_VIEW_CONSTANTS.LINK_STRENGTH;

  let currentAlpha = alpha;

  for (let i = 0; i < iterations; i++) {
    // Reset velocities
    nodes.forEach(node => {
      node.vx = 0;
      node.vy = 0;
    });

    // Apply charge force (repulsion between nodes)
    for (let j = 0; j < nodes.length; j++) {
      for (let k = j + 1; k < nodes.length; k++) {
        const nodeA = nodes[j];
        const nodeB = nodes[k];
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = chargeStrength / (distance * distance);

        nodeA.vx -= (dx / distance) * force * currentAlpha;
        nodeA.vy -= (dy / distance) * force * currentAlpha;
        nodeB.vx += (dx / distance) * force * currentAlpha;
        nodeB.vy += (dy / distance) * force * currentAlpha;
      }
    }

    // Apply link force (attraction between connected nodes)
    connections.forEach(link => {
      const source = link.source;
      const target = link.target;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (distance - linkDistance) * linkStrength * currentAlpha;

      source.vx += (dx / distance) * force;
      source.vy += (dy / distance) * force;
      target.vx -= (dx / distance) * force;
      target.vy -= (dy / distance) * force;
    });

    // Apply layer constraint (keep nodes near their layer radius)
    nodes.forEach(node => {
      const layerRadius = node.layer * FORCE_VIEW_CONSTANTS.LAYER_SPACING;
      const dx = node.x - centerX;
      const dy = node.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDistance = layerRadius;
      const force = (distance - targetDistance) * 0.1 * currentAlpha;

      node.vx -= (dx / distance) * force;
      node.vy -= (dy / distance) * force;
    });

    // Update positions
    nodes.forEach(node => {
      node.x += node.vx;
      node.y += node.vy;
    });

    currentAlpha *= 1 - alphaDecay;
    if (currentAlpha < FORCE_VIEW_CONSTANTS.FORCE_ALPHA_MIN) break;
  }

  return { nodes };
}

