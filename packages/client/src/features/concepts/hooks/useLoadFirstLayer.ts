import { useState, useCallback } from 'react';
import { ConceptsAPI } from '../ConceptsAPI';
import { Concept, ConceptGraph } from '../types';
import { graphApi } from '../graphApi';

interface UseLoadFirstLayerOptions {
  projectBased?: boolean;
  onComplete?: (graph: ConceptGraph) => void;
}

interface UseLoadFirstLayerReturn {
  isLoading: boolean;
  streamContent: string;
  seedConcept: Concept | null;
  currentGraph: ConceptGraph | null;
  error: string | null;
  loadFirstLayer: (graphId: string, seedConcept: Concept, graph: ConceptGraph) => Promise<ConceptGraph>;
  reset: () => void;
}

/**
 * Shared hook for loading the first layer of a concept graph
 * Extracted from useCreateConceptAndLoadFirstLayer for reuse
 */
export const useLoadFirstLayer = (
  options: UseLoadFirstLayerOptions = {}
): UseLoadFirstLayerReturn => {
  const { projectBased = true, onComplete } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [seedConcept, setSeedConcept] = useState<Concept | null>(null);
  const [currentGraph, setCurrentGraph] = useState<ConceptGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle streaming for first layer generation
  const handleStreamChunk = useCallback((chunk: string) => {
    setStreamContent(prev => prev + chunk);
  }, []);

  // Load first layer after graph creation
  const loadFirstLayer = useCallback(async (
    graphId: string,
    seedConceptParam: Concept,
    graph: ConceptGraph
  ): Promise<ConceptGraph> => {
    setIsLoading(true);
    setStreamContent('');
    setError(null);
    setSeedConcept(seedConceptParam);
    setCurrentGraph(graph);
    
    try {
      // The onStream callback will be called for each chunk as it arrives
      // The promise resolves after streaming is complete
      const response = await ConceptsAPI.progressiveExpandMultipleFromText({
        concept: seedConceptParam,
        previousLayers: [],
        numConcepts: 10,
        graphId: graphId,
        goalFocused: projectBased,
        stream: true,
      }, handleStreamChunk);

      // Add the new concepts to the graph
      let updatedGraph = graph;
      if (response.concepts && response.concepts.length > 0) {
        const conceptsMap = new Map(graph.concepts);
        response.concepts.forEach(concept => {
          conceptsMap.set(concept.name, concept);
        });
        
        updatedGraph = {
          ...graph,
          concepts: conceptsMap,
          updatedAt: Date.now(),
        };
      }

      // Update the graph on backend with the new concepts
      await graphApi.upsertGraph(updatedGraph);
      
      // Update currentGraph with final graph
      setCurrentGraph(updatedGraph);

      // Keep streamContent visible briefly before clearing
      // This ensures the final content is displayed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsLoading(false);
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete(updatedGraph);
      }
      
      return updatedGraph;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load first layer';
      setError(errorMessage);
      console.error('Failed to load first layer:', err);
      setIsLoading(false);
      // Return the original graph even if layer loading fails
      return graph;
    }
  }, [handleStreamChunk, projectBased, onComplete]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setStreamContent('');
    setSeedConcept(null);
    setCurrentGraph(null);
    setError(null);
  }, []);

  return {
    isLoading,
    streamContent,
    seedConcept,
    currentGraph,
    error,
    loadFirstLayer,
    reset,
  };
};

