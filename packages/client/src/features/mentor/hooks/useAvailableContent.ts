/**
 * React Query hooks for fetching available modules and lessons from the knowledge graph
 * 
 * Module = Layer in the graph structure
 * Lesson = Concept within a layer
 * 
 * These represent content that can be published (before it's actually published)
 */

import { useQuery } from '@tanstack/react-query';
import { knowledgeGraphRestApi } from '../../knowledge-graph/api/restApi';
import { publishingKeys } from '../../knowledge-graph/hooks/queryKeys';

export interface AvailableModule {
  id: string;
  name: string;
  description: string;
  layerNumber: number;
  goal?: string;
  conceptCount: number;
}

export interface AvailableLesson {
  id: string;
  name: string;
  description: string;
  sequence?: number;
  hasLessonContent: boolean;
  hasFlashCards: boolean;
}

export interface UseAvailableContentOptions {
  enabled?: boolean;
}

/**
 * Fetch available modules from the knowledge graph (layers)
 * Modules = Layers in the graph structure
 */
export function useAvailableModules(graphId: string, options?: UseAvailableContentOptions) {
  return useQuery({
    queryKey: publishingKeys.availableModules(graphId),
    queryFn: async () => {
      const graph = await knowledgeGraphRestApi.getGraph(graphId);
      
      // Get all Layer nodes as modules
      const layerNodeIds = graph.nodeTypes?.Layer || [];
      const modules: AvailableModule[] = [];

      for (const layerId of layerNodeIds) {
        const layerNode = graph.nodes[layerId];
        if (!layerNode || layerNode.type !== 'Layer') continue;
        
        const layerNumber = layerNode.properties?.layerNumber ?? layerNode.properties?.number ?? 0;
        
        // Count concepts in this layer
        const conceptIds = graph.nodeTypes?.Concept || [];
        const conceptCount = conceptIds.filter(conceptId => {
          const conceptNode = graph.nodes[conceptId];
          return conceptNode?.properties?.layer === layerNumber;
        }).length;

        modules.push({
          id: layerId,
          name: layerNode.properties?.name || layerNode.properties?.title || `Layer ${layerNumber}`,
          description: layerNode.properties?.description || layerNode.properties?.goal || '',
          layerNumber,
          goal: layerNode.properties?.goal,
          conceptCount,
        });
      }

      // Sort by layer number
      modules.sort((a, b) => a.layerNumber - b.layerNumber);
      
      return modules;
    },
    enabled: !!graphId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch available lessons from a layer (concepts in that layer)
 * Lessons = Concepts within the layer
 * @param moduleId - The layer node ID
 */
export function useAvailableLessons(
  graphId: string,
  moduleId: string,
  options?: UseAvailableContentOptions
) {
  return useQuery({
    queryKey: publishingKeys.availableLessons(graphId, moduleId),
    queryFn: async () => {
      const graph = await knowledgeGraphRestApi.getGraph(graphId);
      
      const layerNode = graph.nodes[moduleId];
      if (!layerNode || layerNode.type !== 'Layer') {
        return [];
      }

      const layerNumber = layerNode.properties?.layerNumber ?? layerNode.properties?.number ?? 0;
      
      // Find all concepts in this layer
      const conceptIds = graph.nodeTypes?.Concept || [];
      const lessons: AvailableLesson[] = [];

      for (const conceptId of conceptIds) {
        const conceptNode = graph.nodes[conceptId];
        if (!conceptNode || conceptNode.properties?.layer !== layerNumber) continue;
        
        // Check for lesson content
        const hasLessonContent = graph.relationships.some(
          r => r.source === conceptId && r.type === 'hasLesson'
        );
        
        // Check for flashcards
        const hasFlashCards = graph.relationships.some(
          r => r.source === conceptId && r.type === 'hasFlashCard'
        );
        
        lessons.push({
          id: conceptId,
          name: conceptNode.properties?.name || conceptId,
          description: conceptNode.properties?.description || '',
          sequence: conceptNode.properties?.sequence,
          hasLessonContent,
          hasFlashCards,
        });
      }
      
      // Sort by sequence
      lessons.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
      
      return lessons;
    },
    enabled: !!graphId && !!moduleId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch lesson content from the knowledge graph
 */
export function useLessonContent(
  graphId: string,
  conceptId: string,
  options?: UseAvailableContentOptions
) {
  return useQuery({
    queryKey: [...publishingKeys.availableLessons(graphId, conceptId), 'content'] as const,
    queryFn: async () => {
      const graph = await knowledgeGraphRestApi.getGraph(graphId);
      
      const conceptNode = graph.nodes[conceptId];
      if (!conceptNode) return null;
      
      // Find lesson content via hasLesson relationship
      const lessonRel = graph.relationships.find(
        r => r.source === conceptId && r.type === 'hasLesson'
      );
      
      let content: string | undefined;
      if (lessonRel) {
        const lessonNode = graph.nodes[lessonRel.target];
        content = lessonNode?.properties?.content;
      }
      
      // Find flashcards via hasFlashCard relationships
      const flashCardRels = graph.relationships.filter(
        r => r.source === conceptId && r.type === 'hasFlashCard'
      );
      
      const flashCards = flashCardRels
        .map(r => {
          const flashNode = graph.nodes[r.target];
          if (!flashNode) return null;
          return {
            front: flashNode.properties?.front || '',
            back: flashNode.properties?.back || '',
          };
        })
        .filter((f): f is { front: string; back: string } => f !== null);
      
      return {
        content,
        flashCards: flashCards.length > 0 ? flashCards : undefined,
      };
    },
    enabled: !!graphId && !!conceptId && options?.enabled !== false,
  });
}
