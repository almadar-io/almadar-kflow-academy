import { useMemo } from 'react';
import { Concept } from '../../concepts/types';

export interface GraphNode {
  id: string;
  name: string;
  concept: Concept;
  val?: number; // Node size/radius
  color?: string;
  // Runtime properties added by react-force-graph
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  color?: string;
}

interface UseForceViewGraphDataProps {
  concepts: Concept[];
}

interface UseForceViewGraphDataReturn {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const useForceViewGraphData = ({
  concepts
}: UseForceViewGraphDataProps): UseForceViewGraphDataReturn => {
  const { nodes, links } = useMemo(() => {
    // Create name to concept map for quick lookup
    const nameToConceptMap = new Map<string, Concept>();
    concepts.forEach(c => nameToConceptMap.set(c.name, c));

    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];

    // Create nodes - simple setup, let the library handle positioning
    concepts.forEach(concept => {
      const nodeId = concept.id || concept.name;
      const isSeed = concept.isSeed || false;

      graphNodes.push({
        id: nodeId,
        name: concept.name,
        concept,
        val: 25, // Larger node size to create more space between nodes
        color: isSeed ? '#fbbf24' : '#6366f1',
      });
    });

    // Create links based on parent-child relationships
    // Parent -> Child (parent in inner circle, child in outer circle)
    concepts.forEach(concept => {
      const conceptId = concept.id || concept.name;
      concept.parents.forEach(parentName => {
        const parentConcept = nameToConceptMap.get(parentName);
        if (parentConcept) {
          const parentId = parentConcept.id || parentConcept.name;
          graphLinks.push({
            source: parentId,
            target: conceptId,
            color: '#94a3b8',
          });
        }
      });
    });

    return { nodes: graphNodes, links: graphLinks };
  }, [concepts]);

  return { nodes, links };
};


