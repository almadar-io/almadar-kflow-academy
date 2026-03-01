import React, { useRef, useMemo } from 'react';
import { Loader2, BookOpen, CheckCircle2, X } from 'lucide-react';
import { Concept, PracticeItem } from '../types';
import { useLayerPractice } from '../hooks/useLayerPractice';
import { parseMarkdownWithCodeBlocks, SegmentRenderer, Segment } from './MarkdownRenderer';

interface LayerPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  concepts: Concept[];
  layerGoal: string;
  layerNumber: number;
  existingExercises?: PracticeItem[]; // Existing exercises from layer data
  graphId?: string; // Graph ID to save exercises to layer
}

const LayerPracticeModal: React.FC<LayerPracticeModalProps> = ({
  isOpen,
  onClose,
  concepts,
  layerGoal,
  layerNumber,
  existingExercises,
  graphId,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  const {
    items,
    isLoading,
    error,
    streamingContent,
    isStreaming,
    loadPractice,
  } = useLayerPractice({
    concepts,
    layerGoal,
    layerNumber,
    graphId,
    existingExercises,
    isOpen,
  });

  const displayContent = streamingContent || (items.length > 0 ? items[0]?.question : '');
  
  // Parse content into segments (markdown and code blocks)
  const contentSegments = useMemo((): Segment[] => {
    if (!displayContent) return [];
    return parseMarkdownWithCodeBlocks(displayContent);
  }, [displayContent]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end transition-all duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-gray-800 w-full h-full rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Level {layerNumber} Final Review</h3>
          <button 
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-80px)] overflow-y-auto p-6 bg-white dark:bg-gray-800">
          <div className="w-full space-y-6">
            {/* Learning Goal */}
            {layerGoal && (
              <div className="p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                      <CheckCircle2 size={16} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Learning Goal</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{layerGoal}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !streamingContent && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                <span className="ml-3 text-gray-600 dark:text-gray-300">Generating review...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                <button
                  onClick={loadPractice}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Review Content */}
            {contentSegments.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-6">
                  <SegmentRenderer 
                    segments={contentSegments}
                    containerClassName="lesson-markdown"
                  />
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && !displayContent && (
              <div className="text-center py-12">
                <BookOpen size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-300">No review available for this level.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayerPracticeModal;

