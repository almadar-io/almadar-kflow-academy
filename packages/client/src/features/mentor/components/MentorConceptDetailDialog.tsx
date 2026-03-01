import React, { useState, useMemo } from 'react';
import { Concept, ConceptGraph } from '../types';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { ConceptDescription } from '../../../components/molecules/ConceptDescription';
import { ConceptMetaTags } from '../../../components/molecules/ConceptMetaTags';
import FlashCardsDisplay from '../../concepts/components/FlashCardsDisplay';
import CustomOperationSidePanel from './CustomOperationSidePanel';
import { useConceptDetailRelations } from '../../concepts/hooks/useConceptDetailRelations';
import { useNotes } from '../../concepts/hooks/useNotes';
import { OperationType, OperationResult } from '../hooks/useMentorOperations';
import { useAppSelector } from '../../../app/hooks';
import { selectLastDiff } from '../../concepts/conceptSlice';
import { LessonPanel } from '../../../components/organisms/LessonPanel';

interface MentorConceptDetailDialogProps {
  concept: Concept;
  conceptMap?: Map<string, Concept>;
  graph?: ConceptGraph;
  graphId?: string;
  onClose: () => void;
  onOperation: (operation: OperationType, concept: Concept | Concept[], ...args: any[]) => Promise<OperationResult>;
  onNavigateToParent?: (parentName: string) => void;
}

const noop = () => {};

const MentorConceptDetailDialog: React.FC<MentorConceptDetailDialogProps> = ({
  concept: initialConcept,
  conceptMap,
  graph,
  graphId,
  onClose,
  onOperation,
  onNavigateToParent = noop,
}) => {
  const [localLessonLoading, setLocalLessonLoading] = useState(false);
  const [localFlashCardsLoading, setLocalFlashCardsLoading] = useState(false);
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [customOperationLoading, setCustomOperationLoading] = useState(false);
  const [streamingLessonContent, setStreamingLessonContent] = useState('');
  
  // Get updated concept from Redux state (in case it was updated by operations)
  const { graphs, currentGraphId } = useAppSelector(state => state.concepts);
  const diff = useAppSelector(selectLastDiff);
  const updatedConcept = useMemo(() => {
    if (!currentGraphId || !conceptMap) return initialConcept;
    // Get the latest version from conceptMap (which is synced with Redux)
    return conceptMap.get(initialConcept.name) || initialConcept;
  }, [initialConcept, conceptMap, currentGraphId, graphs]);
  
  const concept = updatedConcept;
  const renderedLesson = concept.lesson || '';
  const { parentNames } = useConceptDetailRelations({ concept, conceptMap });
  
  // Notes management (handled in component)
  const { notes, addNote, updateNote, deleteNote } = useNotes({ concept });

  const handleGenerateLesson = async (simple?: boolean) => {
    try {
      setLocalLessonLoading(true);
      setStreamingLessonContent('');
      await onOperation('explain', concept, simple, (chunk: string) => {
        // Update streaming content in real-time
        setStreamingLessonContent(prev => prev + chunk);
      });
    } finally {
      setLocalLessonLoading(false);
    }
  };

  const handleGenerateFlashCards = async () => {
    try {
      setLocalFlashCardsLoading(true);
      await onOperation('generateFlashCards', concept);
    } finally {
      setLocalFlashCardsLoading(false);
    }
  };

  const handleNavigateToParent = (parentName: string) => {
    if (onNavigateToParent) {
      onNavigateToParent(parentName);
    }
  };

  const handleCustomOperation = async (prompt: string, onStream?: (chunk: string) => void) => {
    try {
      setCustomOperationLoading(true);
      await onOperation('custom', concept, prompt, onStream);
      // Keep panel open to show diff
    } catch (error) {
      console.error('Error executing custom operation:', error);
      alert(`Failed to execute custom operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCustomOperationLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 overflow-y-auto">
      <div className="min-h-screen w-full bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {concept.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close dialog"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1 min-w-0">
                <ConceptDescription
                  concept={concept}
                  isEditing={false}
                  editValues={{ description: concept.description }}
                  onDescriptionChange={noop}
                  onStartEditing={noop}
                  onCancelEdit={noop}
                  onKeyDown={noop}
                  descriptionTextareaRefs={{ current: {} }}
                  showFullContent={true}
                />
              </div>
              <ConceptMetaTags
                layer={concept.layer}
                isSeed={concept.isSeed}
                parents={parentNames}
                onNavigateToParent={handleNavigateToParent}
              />
            </div>

            <LessonPanel
              renderedLesson={streamingLessonContent || renderedLesson}
              conceptHasLesson={Boolean(concept.lesson || streamingLessonContent)}
              onGenerateLesson={handleGenerateLesson}
              isGenerating={localLessonLoading}
              onGenerateFlashCards={handleGenerateFlashCards}
              isGeneratingFlashCards={localFlashCardsLoading}
              showGenerationButtons={true}
            />

            {concept.flash && concept.flash.length > 0 && (
              <FlashCardsDisplay flashCards={concept.flash} />
            )}
          </div>
        </div>
      </div>

      {/* Floating Custom Operation Button - positioned to the left of question button */}
      {graphId && concept && (
        <button
          onClick={() => setShowCustomPanel(true)}
          disabled={customOperationLoading}
          className="fixed bottom-6 right-28 z-50 p-4 bg-purple-600 dark:bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Custom operation"
          title="Custom operation - Generate lessons, flash cards, or modify concepts"
        >
          {customOperationLoading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <Sparkles size={24} />
          )}
        </button>
      )}

      {/* Custom Operation Side Panel */}
      <CustomOperationSidePanel
        concept={concept}
        concepts={[concept]}
        isOpen={showCustomPanel}
        onClose={() => setShowCustomPanel(false)}
        onExecute={handleCustomOperation}
        diff={diff}
        isLoading={customOperationLoading}
      />
    </div>
  );
};

export default MentorConceptDetailDialog;

