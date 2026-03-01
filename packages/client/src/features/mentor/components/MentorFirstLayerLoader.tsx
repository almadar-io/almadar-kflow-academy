import React, { useEffect, useState, useRef } from 'react';
import { useExplainConcept } from '../../knowledge-graph/hooks/useExplainConcept';
import { ArrowRight } from 'lucide-react';
import type { NodeBasedKnowledgeGraph, GraphNode } from '../../knowledge-graph/types';
import { StreamingConceptsDisplay } from '../../../components/organisms/StreamingConceptsDisplay';
import { Button } from '../../../components/atoms/Button';
import { Typography } from '../../../components/atoms/Typography';
import { Modal } from '../../../components/molecules/Modal';
import { LessonPanel } from '../../../components/organisms/LessonPanel';

interface MentorFirstLayerLoaderProps {
  graphId: string;
  graph: NodeBasedKnowledgeGraph;
  streamContent: string;
  isLoading: boolean;
  onClose?: () => void;
  onComplete?: () => void;
}

/**
 * Component that displays loading UI for the first layer generation in mentor flow
 * Similar to FirstLayerLoader but uses knowledge-graph hooks
 */
const MentorFirstLayerLoader: React.FC<MentorFirstLayerLoaderProps> = ({
  graphId,
  graph,
  streamContent,
  isLoading,
  onClose,
  onComplete,
}) => {
  const { explain, isLoading: isGeneratingLesson } = useExplainConcept(graphId);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [seedConcept, setSeedConcept] = useState<GraphNode | null>(null);
  const [lesson, setLesson] = useState<string>('');
  const hasGeneratedLessonRef = useRef(false);

  // Find seed concept from graph
  useEffect(() => {
    if (graph && graph.seedConceptId) {
      const seed = graph.nodes[graph.seedConceptId];
      if (seed) {
        setSeedConcept(seed);
      }
    } else if (graph?.nodeTypes?.Concept?.length > 0) {
      // Fallback: use first concept if seedConceptId not set
      const firstConceptId = graph.nodeTypes.Concept[0];
      const firstConcept = graph.nodes[firstConceptId];
      if (firstConcept) {
        setSeedConcept(firstConcept);
      }
    }
  }, [graph]);

  // Generate detailed lesson when seed concept is available
  useEffect(() => {
    if (seedConcept && graphId && !hasGeneratedLessonRef.current) {
      hasGeneratedLessonRef.current = true;
      
      // Generate lesson using explainConcept hook
      const generateLesson = async () => {
        try {
          await explain(
            { targetNodeId: seedConcept.id },
            {
              stream: true,
              onChunk: (chunk: string) => {
                setLesson((prev) => prev + chunk);
              },
              onDone: () => {
                // Lesson generation complete
              },
            }
          );
        } catch (err) {
          console.error('Failed to generate lesson:', err);
        }
      };
      
      generateLesson();
    }
  }, [seedConcept, graphId, explain]);

  // Show continue button when progressiveExpand is complete (don't wait for lesson generation)
  useEffect(() => {
    if (!isLoading && streamContent) {
      // Show button when progressiveExpand is done, lesson can continue in background
      // Don't automatically redirect - wait for user to click the button
      setShowCloseButton(true);
    } else if (isLoading) {
      // Hide button while progressiveExpand is still loading
      setShowCloseButton(false);
    }
  }, [isLoading, streamContent]);

  const handleClose = () => {
    onClose?.();
  };

  // Handle continue to learning path - navigates to concept list page
  const handleContinue = () => {
    onComplete?.();
  };

  // Get seed concept name for display
  const seedConceptName = seedConcept
    ? seedConcept.properties.name || seedConcept.id
    : null;

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title="Creating Your Learning Path"
      size="xl"
      className="max-h-[90vh]"
      footer={
        showCloseButton ? (
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleContinue}
              iconRight={ArrowRight}
              size="lg"
            >
              Continue to Learning Path
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6 pb-24">
        {/* Lesson Panel for Seed Concept - show as it streams */}
        {lesson && seedConceptName && (
          <div className="mb-6">
            <Typography variant="h3" className="mb-4">
              Introduction to {seedConceptName}
            </Typography>
            <LessonPanel
              renderedLesson={lesson}
              conceptHasLesson={!!lesson}
              isGenerating={isGeneratingLesson}
              showGenerationButtons={false}
            />
          </div>
        )}

        {/* Streaming concepts display */}
        {streamContent && (
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <StreamingConceptsDisplay
              streamContent={streamContent}
              isLoading={isLoading}
              maxHeight="24rem"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MentorFirstLayerLoader;

