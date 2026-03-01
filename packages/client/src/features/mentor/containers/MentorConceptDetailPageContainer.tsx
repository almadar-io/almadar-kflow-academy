import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useConceptDetail } from '../../knowledge-graph/hooks/useConceptDetail';
import { useGetGraph } from '../../knowledge-graph/hooks';
import { setCurrentGraphId, selectGraphById } from '../../knowledge-graph/knowledgeGraphSlice';
import { useExplainConcept } from '../../knowledge-graph/hooks/useExplainConcept';
import { useAnswerQuestion } from '../../knowledge-graph/hooks/useAnswerQuestion';
import { useCustomOperation } from '../../knowledge-graph/hooks/useCustomOperation';
import type { Concept } from '../../concepts/types';
import type { ConceptDisplay } from '../../knowledge-graph/api/types';
import { MentorConceptDetailPage } from '../../../components/pages/MentorConceptDetailPage';

// Feature components for content slots
import { ConceptDescription } from '../../../components/molecules/ConceptDescription';
import { ConceptMetaTags } from '../../../components/molecules/ConceptMetaTags';
import { LessonPanel } from '../../../components/organisms/LessonPanel';
import { useNotes } from '../../concepts/hooks/useNotes';
import CustomOperationSidePanel from '../components/CustomOperationSidePanel';
import PromptDisplayModal from '../components/PromptDisplayModal';
import { useConceptsByLayer } from '../../knowledge-graph/hooks/useConceptsByLayer';

// Helper to convert ConceptDisplay to Concept for compatibility
const convertConceptDisplayToConceptForDetail = (display: ConceptDisplay): Concept => {
  return {
    id: display.id,
    name: display.name,
    description: display.description,
    layer: display.layer,
    isSeed: display.isSeed,
    sequence: display.sequence,
    parents: display.parents,
    children: display.children,
    prerequisites: display.prerequisites,
    lesson: display.properties?.lesson,
    goal: display.properties?.goal,
    difficulty: display.properties?.difficulty,
    focus: display.properties?.focus,
    flash: display.properties?.flash,
    questions: display.properties?.questions,
    notes: display.properties?.notes,
    userProgress: display.properties?.userProgress,
  };
};

const noop = () => {};

/**
 * Container component for MentorConceptDetailPage
 * Uses ConceptDetailTemplate for focused detail view layout
 * 
 * Phase 5B: Full template integration with slot-based content
 */
const MentorConceptDetailPageContainer: React.FC = () => {
  const { graphId, conceptId } = useParams<{ graphId: string; conceptId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Single useEffect for initialization
  useEffect(() => {
    if (graphId) {
      dispatch(setCurrentGraphId(graphId));
    }
  }, [graphId, dispatch]);

  // All data fetching - ONLY from knowledge-graph
  const conceptDetail = useConceptDetail(graphId || '', conceptId || '');
  const graph = useAppSelector((state) => selectGraphById(state, graphId || ''));
  const { getGraph, loading: isLoadingGraph } = useGetGraph();
  
  // Get all concepts grouped by layer for navigation
  const conceptsData = useConceptsByLayer(graphId || '', {
    includeRelationships: false,
    groupByLayer: true,
  });

  // Load graph if not in Redux
  useEffect(() => {
    if (graphId && !graph && !isLoadingGraph) {
      getGraph(graphId, { storeInRedux: true }).catch((error) => {
        console.error('Failed to load graph:', error);
      });
    }
  }, [graphId, graph, isLoadingGraph, getGraph]);

  // Convert ConceptDisplay to Concept for compatibility
  const concept = useMemo((): Concept | null => {
    if (!conceptDetail.conceptDetail?.concept) return null;
    return convertConceptDisplayToConceptForDetail(conceptDetail.conceptDetail.concept);
  }, [conceptDetail.conceptDetail]);

  // Notes management (handled in container)
  const { notes, addNote, updateNote, deleteNote } = useNotes({ concept });

  // Knowledge-graph operation hooks
  const { explain, isLoading: isExplaining } = useExplainConcept(graphId || '');
  const { answer, isLoading: isAnswering } = useAnswerQuestion(graphId || '');
  const { execute: customOp, isLoading: isCustomOp } = useCustomOperation(graphId || '');

  // Local UI state
  const [streamingLessonContent, setStreamingLessonContent] = useState('');
  const [localLessonLoading, setLocalLessonLoading] = useState(false);
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [customOperationLoading, setCustomOperationLoading] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [operationPrompt, setOperationPrompt] = useState<string | undefined>();
  const [operationName, setOperationName] = useState<string>('');

  // Clear streaming content when concept changes
  useEffect(() => {
    setStreamingLessonContent('');
  }, [conceptId]);

  // Redirect logic - only after loading completes
  useEffect(() => {
    if (!conceptDetail.loading && !isLoadingGraph && !concept && !conceptDetail.conceptDetail && conceptId) {
      navigate(`/mentor/${graphId}`);
    }
  }, [conceptDetail.loading, isLoadingGraph, concept, conceptDetail.conceptDetail, conceptId, graphId, navigate]);

  // Operation handlers
  const handleGenerateLesson = useCallback(
    async (simple?: boolean) => {
      if (!conceptId || !graphId) return;
      try {
        setLocalLessonLoading(true);
        setStreamingLessonContent('');
        const result = await explain(
          { targetNodeId: conceptId },
          {
            stream: true,
            onChunk: (chunk: string) => {
              setStreamingLessonContent((prev) => prev + chunk);
            },
          }
        );
        if ((result as any).prompt) {
          setOperationPrompt((result as any).prompt);
          setOperationName('explain');
          setShowPromptModal(true);
        }
        await conceptDetail.refetch();
      } catch (error) {
        console.error('Failed to generate lesson:', error);
        alert(`Failed to generate lesson: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLocalLessonLoading(false);
      }
    },
    [conceptId, graphId, explain, conceptDetail]
  );

  const handleCustomOperation = useCallback(
    async (prompt: string, onStream?: (chunk: string) => void) => {
      if (!conceptId || !graphId) return;
      try {
        setCustomOperationLoading(true);
        const result = await customOp(
          { targetNodeIds: [conceptId], userPrompt: prompt },
          { stream: true, onChunk: onStream }
        );
        if ((result as any).prompt) {
          setOperationPrompt((result as any).prompt);
          setOperationName('custom');
          setShowPromptModal(true);
        }
        await conceptDetail.refetch();
      } catch (error) {
        console.error('Error executing custom operation:', error);
      } finally {
        setCustomOperationLoading(false);
      }
    },
    [conceptId, graphId, customOp, conceptDetail]
  );

  const handleNavigateToParent = useCallback(
    (parentName: string) => {
      const parent = conceptDetail.conceptDetail?.relationships?.parents?.find((p) => p.name === parentName);
      if (parent && graphId) {
        navigate(`/mentor/${graphId}/concept/${encodeURIComponent(parent.id)}`);
      }
    },
    [graphId, conceptDetail.conceptDetail, navigate]
  );

  const handleNavigateToChild = useCallback(
    (childName: string) => {
      const child = conceptDetail.conceptDetail?.relationships?.children?.find((c) => c.name === childName);
      if (child && graphId) {
        navigate(`/mentor/${graphId}/concept/${encodeURIComponent(child.id)}`);
      }
    },
    [graphId, conceptDetail.conceptDetail, navigate]
  );

  const handleNavigateToPrerequisite = useCallback(
    (prereqName: string) => {
      const prereq = conceptDetail.conceptDetail?.relationships?.prerequisites?.find((p) => p.name === prereqName);
      if (prereq && graphId) {
        navigate(`/mentor/${graphId}/concept/${encodeURIComponent(prereq.id)}`);
      }
    },
    [graphId, conceptDetail.conceptDetail, navigate]
  );

  const handleBack = useCallback(() => {
    if (graphId) {
      navigate(`/mentor/${graphId}`);
    } else {
      navigate('/mentor');
    }
  }, [graphId, navigate]);

  const handleSaveLesson = useCallback((lesson: string) => {
    setIsEditingLesson(false);
    setStreamingLessonContent('');
    conceptDetail.refetch();
  }, [conceptDetail]);


  // Derived data
  const renderedLesson = streamingLessonContent || conceptDetail.conceptDetail?.lesson?.content || concept?.lesson || '';
  const parentNames = conceptDetail.conceptDetail?.relationships?.parents?.map((p) => p.name) || concept?.parents || [];
  
  // Get previous/next concepts in the same layer
  const { previousConcept, nextConcept } = useMemo(() => {
    if (!concept || !conceptsData.groupedByLayer || concept.layer === undefined) {
      return { previousConcept: undefined, nextConcept: undefined };
    }
    
    const layerConcepts = conceptsData.groupedByLayer[concept.layer] || [];
    const currentIndex = layerConcepts.findIndex(c => c.id === concept.id);
    
    if (currentIndex === -1) {
      return { previousConcept: undefined, nextConcept: undefined };
    }
    
    const previous = currentIndex > 0 ? layerConcepts[currentIndex - 1] : undefined;
    const next = currentIndex < layerConcepts.length - 1 ? layerConcepts[currentIndex + 1] : undefined;
    
    return {
      previousConcept: previous ? { id: previous.id, name: previous.name } : undefined,
      nextConcept: next ? { id: next.id, name: next.name } : undefined,
    };
  }, [concept, conceptsData.groupedByLayer]);
  
  const handleNavigateToPrevious = useCallback(
    (navConcept: { id: string; name: string }) => {
      if (graphId) {
        navigate(`/mentor/${graphId}/concept/${encodeURIComponent(navConcept.id)}`);
      }
    },
    [graphId, navigate]
  );
  
  const handleNavigateToNext = useCallback(
    (navConcept: { id: string; name: string }) => {
      if (graphId) {
        navigate(`/mentor/${graphId}/concept/${encodeURIComponent(navConcept.id)}`);
      }
    },
    [graphId, navigate]
  );

  // Template concept data
  const templateConcept = useMemo(() => {
    if (!concept) return undefined;
    return {
      id: concept.id,
      name: concept.name,
      description: concept.description,
      layer: concept.layer,
      isSeed: concept.isSeed,
    };
  }, [concept]);

  // Concept Header content (description + meta tags)
  const conceptHeader = concept ? (
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
  ) : null;

  // Lesson Panel content - uses LessonPanel from component library
  // Note: Questions and notes are now managed at container level separately
  const lessonPanel = concept && graphId ? (
    <LessonPanel
      renderedLesson={renderedLesson}
      conceptHasLesson={Boolean(renderedLesson)}
      onGenerateLesson={handleGenerateLesson}
      isGenerating={localLessonLoading || isExplaining}
      showGenerationButtons={true}
      isEditing={isEditingLesson}
      onEdit={() => setIsEditingLesson(true)}
      onCancelEdit={() => setIsEditingLesson(false)}
      onSaveLesson={handleSaveLesson}
    />
  ) : null;


  // Operation Panel content
  const operationPanel = concept ? (
    <CustomOperationSidePanel
      concept={concept}
      concepts={[concept]}
      isOpen={true}
      onClose={() => setShowCustomPanel(false)}
      onExecute={handleCustomOperation}
      diff={null}
      isLoading={customOperationLoading || isCustomOp}
    />
  ) : null;

  const promptDisplayModal = (
    <PromptDisplayModal
      isOpen={showPromptModal}
      onClose={() => setShowPromptModal(false)}
      prompt={operationPrompt}
      operationName={operationName}
    />
  );

  return (
    <MentorConceptDetailPage
      graphId={graphId}
      concept={templateConcept}
      loading={conceptDetail.loading || isLoadingGraph}
      error={conceptDetail.error}
      onBack={handleBack}
      backLabel="Back to Concepts"
      conceptHeader={conceptHeader}
      content={null}
      lessonPanel={lessonPanel}
      operationPanel={operationPanel}
      isOperationPanelOpen={showCustomPanel}
      onOperationPanelToggle={setShowCustomPanel}
      previousConcept={previousConcept}
      nextConcept={nextConcept}
      onPreviousConceptClick={handleNavigateToPrevious}
      onNextConceptClick={handleNavigateToNext}
      promptDisplayModal={promptDisplayModal}
    />
  );
};

MentorConceptDetailPageContainer.displayName = 'MentorConceptDetailPageContainer';

export default MentorConceptDetailPageContainer;
export { MentorConceptDetailPageContainer };