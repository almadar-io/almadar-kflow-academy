import React, { useEffect, useState, useRef } from 'react';
import { Concept, ConceptGraph } from '../types';
import { parseStreamingConcepts, ParsedConcept } from '../utils/streamParser';
import { useSimpleLessonGeneration } from '../hooks/useSimpleLessonGeneration';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { LessonPanel } from '../../../components/organisms/LessonPanel';

interface FirstLayerLoaderProps {
  seedConcept: Concept;
  graphId: string;
  graph?: ConceptGraph;
  streamContent: string;
  isLoading: boolean;
  onClose?: () => void;
  onComplete?: (updatedSeedConcept: Concept) => void;
}

/**
 * Component that displays ConceptLoader for the first layer generation
 * Only used for the first layer generation (when no top-level concepts exist)
 * Generates a detailed lesson for the seed concept
 */
const FirstLayerLoader: React.FC<FirstLayerLoaderProps> = ({
  seedConcept,
  graphId,
  graph,
  streamContent,
  isLoading,
  onClose,
  onComplete,
}) => {
  const { lesson, isGenerating, generateSimpleLesson, clearLesson } = useSimpleLessonGeneration();
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [parsedConcepts, setParsedConcepts] = useState<ParsedConcept[]>([]);
  const [extractedGoal, setExtractedGoal] = useState<string | undefined>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasGeneratedLessonRef = useRef(false);

  // Generate detailed lesson when component mounts (only once)
  useEffect(() => {
    if (seedConcept && graphId && !hasGeneratedLessonRef.current) {
      hasGeneratedLessonRef.current = true;
      generateSimpleLesson(seedConcept, graphId);
    }
  }, [seedConcept, graphId, generateSimpleLesson]);

  // Show close button when concepts generation is complete AND lesson generation is complete
  useEffect(() => {
    if (!isLoading && !isGenerating && streamContent && parsedConcepts.length > 0 && lesson) {
      // Show button when both concepts and lesson are done
      setShowCloseButton(true);
      // Update seedConcept with lesson and call onComplete
      const updatedSeedConcept: Concept = {
        ...seedConcept,
        lesson: lesson.trim(),
      };
      onComplete?.(updatedSeedConcept);
    } else if (isLoading || isGenerating) {
      // Hide button while concepts or lesson are still loading
      setShowCloseButton(false);
    }
  }, [isLoading, isGenerating, streamContent, parsedConcepts.length, lesson, seedConcept, onComplete]);

  // Parse stream content for concepts
  useEffect(() => {
    if (streamContent) {
      const concepts = parseStreamingConcepts(streamContent);
      setParsedConcepts(concepts);
      
      // Extract goal from stream content
      const goalMatch = streamContent.match(/<goal>([\s\S]*?)<\/goal>/i);
      if (goalMatch) {
        setExtractedGoal(goalMatch[1].trim());
      }
    }
  }, [streamContent]);

  // Clear lesson when component unmounts
  useEffect(() => {
    return () => {
      clearLesson();
    };
  }, [clearLesson]);

  const handleClose = () => {
    clearLesson();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-br from-indigo-950/80 via-purple-900/70 to-slate-900/80 dark:from-indigo-950/90 dark:via-purple-950/90 dark:to-slate-950/90 backdrop-blur">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-xl border border-indigo-100 dark:border-indigo-800 max-h-[90vh] flex flex-col mx-4 relative">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Creating Your Learning Path
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content area with scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          {/* Lesson Panel for Seed Concept - show as it streams */}
          {lesson && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Introduction to {seedConcept.name}
              </h3>
              <LessonPanel
                renderedLesson={lesson}
                conceptHasLesson={!!lesson}
                isGenerating={isGenerating}
                showGenerationButtons={false}
              />
            </div>
          )}

          {/* Streaming concepts display */}
          {streamContent && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Concepts Being Generated
                </h3>
                {isLoading && (
                  <Loader2 size={20} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              
              {/* Learning Goal Section */}
              {extractedGoal && (
                <div className="mb-4 p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <span className="text-white text-xs font-semibold">🎯</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Learning Goal</h4>
                        <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Level Target</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{extractedGoal}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Concepts list */}
              {parsedConcepts.length > 0 ? (
                <div
                  ref={scrollContainerRef}
                  className="max-h-96 overflow-y-auto overflow-x-hidden pr-2 space-y-3 custom-scrollbar"
                >
                  {parsedConcepts.map((concept, index) => (
                    <div
                      key={`${concept.name}-${index}`}
                      className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 dark:bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                            {concept.name}
                          </h4>
                          {concept.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                              {concept.description}
                            </p>
                          )}
                          {concept.parents.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Prerequisites:</span>
                              {concept.parents.map((parent, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium"
                                >
                                  {parent}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />
                  <p className="text-sm">Generating concepts...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed button at bottom right when ready */}
        {showCloseButton && (
          <div className="absolute bottom-6 right-6">
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              View Your Learning Path
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirstLayerLoader;

