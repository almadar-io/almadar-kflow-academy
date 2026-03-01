import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { ConceptsAPI } from '../ConceptsAPI';
import { Concept, PracticeItem } from '../types';
import { updateLayerData } from '../conceptSlice';

interface UseLayerPracticeOptions {
  concepts: Concept[];
  layerGoal: string;
  layerNumber: number;
  graphId?: string;
  existingExercises?: PracticeItem[];
  isOpen: boolean;
}

interface UseLayerPracticeReturn {
  items: PracticeItem[];
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
  isStreaming: boolean;
  loadPractice: () => Promise<void>;
}

export const useLayerPractice = ({
  concepts,
  layerGoal,
  layerNumber,
  graphId,
  existingExercises,
  isOpen,
}: UseLayerPracticeOptions): UseLayerPracticeReturn => {
  const dispatch = useAppDispatch();
  const [items, setItems] = useState<PracticeItem[]>(existingExercises || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const hasAttemptedLoadRef = useRef(false);

  const loadPractice = useCallback(async () => {
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setStreamingContent('');
    
    try {
      const response = await ConceptsAPI.generateLayerPractice({
        concepts,
        layerGoal,
        layerNumber,
        graphId, // Pass graphId so exercises can be saved to the layer
      }, (chunk: string) => {
        // Stream handler - update content as it arrives
        setStreamingContent(prev => prev + chunk);
      });
      
      const loadedItems = response.items || [];
      setItems(loadedItems);
      
      // Update streaming content with final content
      if (loadedItems.length > 0 && loadedItems[0].question) {
        setStreamingContent(loadedItems[0].question);
      }
      
      // Save practice exercises to Redux store
      if (loadedItems.length > 0) {
        dispatch(updateLayerData({
          layerNumber,
          layerData: {
            practiceExercises: loadedItems,
          },
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [concepts, layerGoal, layerNumber, graphId, dispatch]);

  useEffect(() => {
    // If existing exercises are provided, use them; otherwise load from API
    if (existingExercises && existingExercises.length > 0) {
      setItems(existingExercises);
      setStreamingContent(existingExercises[0]?.question || '');
      hasAttemptedLoadRef.current = false; // Reset when new exercises are provided
    } else if (isOpen && items.length === 0 && !isLoading && !error && !isStreaming && !hasAttemptedLoadRef.current) {
      hasAttemptedLoadRef.current = true;
      loadPractice();
    }
    if (!isOpen) {
      // Reset state when modal closes (but preserve existing exercises if provided)
      if (!existingExercises || existingExercises.length === 0) {
        setItems([]);
        setStreamingContent('');
      }
      setError(null);
      setIsStreaming(false);
      hasAttemptedLoadRef.current = false; // Reset when modal closes
    }
  }, [isOpen, existingExercises, items.length, isLoading, error, isStreaming, loadPractice]);

  return {
    items,
    isLoading,
    error,
    streamingContent,
    isStreaming,
    loadPractice,
  };
};

