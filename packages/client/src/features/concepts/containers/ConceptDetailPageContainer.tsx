import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useConceptDetail } from '../../knowledge-graph/hooks/useConceptDetail';
import { useGetGraph, useLessonAnnotations } from '../../knowledge-graph/hooks';
import { setCurrentGraphId, selectGraphById } from '../../knowledge-graph/knowledgeGraphSlice';
import { useExplainConcept } from '../../knowledge-graph/hooks/useExplainConcept';
import { MarkdownContent } from '../components/MarkdownRenderer';
import { useAnswerQuestion } from '../../knowledge-graph/hooks/useAnswerQuestion';
import { useCustomOperation } from '../../knowledge-graph/hooks/useCustomOperation';
import { useUserProgress } from '../hooks/useUserProgress';
import type { Concept, BloomLevel } from '../types';
import type { ConceptDisplay } from '../../knowledge-graph/api/types';
import type { QuestionAnswerItem, NoteItem, AnnotationType } from '../../knowledge-graph/types';
import { LearnConceptDetailTemplate } from '@design-system/templates/LearnConceptDetailTemplate';

// Component Library elements
import { LessonPanel } from '@design-system/organisms/LessonPanel';
import { AnnotatedLessonContent, SelectionInfo } from '@design-system/organisms/AnnotatedLessonContent';
import { QuestionWidget, QuestionAnswerDisplay } from '@design-system/organisms/QuestionWidget';
import { NotesWidget } from '@design-system/organisms/NotesWidget';
import { ConceptDescription } from '@design-system/molecules/ConceptDescription';
import { ConceptMetaTags } from '@design-system/molecules/ConceptMetaTags';

import { Button, Modal, Typography, useEventBus } from '@almadar/ui';
import { useNavigateEvent } from '../../../hooks/useNavigateEvent';
import { useConceptsByLayer } from '../../knowledge-graph/hooks/useConceptsByLayer';
import { useAuthContext } from '../../auth/AuthContext';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { cn } from '../../../utils/theme';

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
 * Container component for ConceptDetailPage
 * Uses ConceptDetailTemplate for focused detail view layout
 * 
 * Migrated to use knowledge-graph hooks (same as MentorConceptDetailPageContainer)
 */
const ConceptDetailPageContainer: React.FC = () => {
  const { graphId, conceptId } = useParams<{ graphId: string; conceptId: string }>();
  const navigate = useNavigateEvent();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAuthContext();
  const { on, emit } = useEventBus();

  // Navigation configuration
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

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

  // Get the Lesson node ID and its annotations from the graph
  const { lessonNodeId, lessonQuestions, lessonNotes } = useMemo(() => {
    if (!graph || !conceptId) {
      return { lessonNodeId: undefined, lessonQuestions: [], lessonNotes: [] };
    }
    
    // Find the Lesson node for this concept
    const lessonIds = graph.nodeTypes?.Lesson || [];
    
    // Find relationships from concept to lesson
    const conceptLessonRel = graph.relationships?.find(
      rel => rel.source === conceptId && rel.type === 'hasLesson'
    );
    
    let lessonId = conceptLessonRel?.target;
    
    // Fallback: search all lesson nodes for one that might belong to this concept
    if (!lessonId && lessonIds.length > 0) {
      // Check if any lesson node references this concept
      for (const lid of lessonIds) {
        const lessonNode = graph.nodes?.[lid];
        if (lessonNode) {
          // Check if there's a relationship pointing to this lesson from the concept
          const rel = graph.relationships?.find(
            r => r.target === lid && r.source === conceptId
          );
          if (rel) {
            lessonId = lid;
            break;
          }
        }
      }
    }
    
    if (!lessonId) {
      return { lessonNodeId: undefined, lessonQuestions: [], lessonNotes: [] };
    }
    
    const lessonNode = graph.nodes?.[lessonId];
    const questions = (lessonNode?.properties?.questions as QuestionAnswerItem[]) || [];
    const notes = (lessonNode?.properties?.notes as NoteItem[]) || [];
    
    return { lessonNodeId: lessonId, lessonQuestions: questions, lessonNotes: notes };
  }, [graph, conceptId]);

  // Lesson annotations management hook
  const annotationsHook = useLessonAnnotations(graphId || '', lessonQuestions, lessonNotes);
  const { 
    addQuestion, 
    deleteQuestion, 
    addNote, 
    deleteNote, 
    loading: annotationsLoading 
  } = annotationsHook;

  // Knowledge-graph operation hooks
  const { explain, isLoading: isExplaining } = useExplainConcept(graphId || '');
  const { answer, isLoading: isAnswering } = useAnswerQuestion(graphId || '');
  const { execute: customOp, isLoading: isCustomOp } = useCustomOperation(graphId || '');

  // User progress hook — wires save* methods called by bus listeners below
  const { saveActivationResponse, saveReflectionNote, markBloomQuestionAnswered } = useUserProgress({
    dispatch,
    concept: concept ?? undefined,
    graphId,
  });

  // Local UI state
  const [streamingLessonContent, setStreamingLessonContent] = useState('');
  const [localLessonLoading, setLocalLessonLoading] = useState(false);
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [customOperationLoading, setCustomOperationLoading] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);

  // Question widget state (managed by container for proper streaming)
  const [showQuestionWidget, setShowQuestionWidget] = useState(false);
  const [questionSelection, setQuestionSelection] = useState<SelectionInfo | null>(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [questionComplete, setQuestionComplete] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Note widget state (managed by container)
  const [showNoteWidget, setShowNoteWidget] = useState(false);
  const [noteSelection, setNoteSelection] = useState<SelectionInfo | null>(null);

  // Annotation view modal state
  const [viewAnnotation, setViewAnnotation] = useState<{
    type: AnnotationType;
    annotation: QuestionAnswerItem | NoteItem;
  } | null>(null);

  // Clear streaming content when concept changes
  useEffect(() => {
    setStreamingLessonContent('');
  }, [conceptId]);

  // Redirect logic - only after loading completes
  useEffect(() => {
    if (!conceptDetail.loading && !isLoadingGraph && !concept && !conceptDetail.conceptDetail && conceptId) {
      navigate(`/concepts/${graphId}`);
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
          { 
            targetNodeId: conceptId,
            simple: simple ?? false, // Pass simple flag (false = detailed lesson with learning science tags)
            minimal: false // Always false to ensure learning science tags are included
          },
          {
            stream: true,
            onChunk: (chunk: string) => {
              setStreamingLessonContent((prev) => prev + chunk);
            },
          }
        );
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
        navigate(`/concepts/${graphId}/concept/${encodeURIComponent(parent.id)}`);
      }
    },
    [graphId, conceptDetail.conceptDetail, navigate]
  );

  const handleNavigateToChild = useCallback(
    (childName: string) => {
      const child = conceptDetail.conceptDetail?.relationships?.children?.find((c) => c.name === childName);
      if (child && graphId) {
        navigate(`/concepts/${graphId}/concept/${encodeURIComponent(child.id)}`);
      }
    },
    [graphId, conceptDetail.conceptDetail, navigate]
  );

  const handleNavigateToPrerequisite = useCallback(
    (prereqName: string) => {
      const prereq = conceptDetail.conceptDetail?.relationships?.prerequisites?.find((p) => p.name === prereqName);
      if (prereq && graphId) {
        navigate(`/concepts/${graphId}/concept/${encodeURIComponent(prereq.id)}`);
      }
    },
    [graphId, conceptDetail.conceptDetail, navigate]
  );

  const handleBack = useCallback(() => {
    if (graphId) {
      navigate(`/concepts/${graphId}`);
    } else {
      navigate('/home');
    }
  }, [graphId, navigate]);

  const handleSaveLesson = useCallback((lesson: string) => {
    setIsEditingLesson(false);
    setStreamingLessonContent('');
    conceptDetail.refetch();
  }, [conceptDetail]);

  // ========== ANNOTATION HANDLERS (Container manages all state) ==========

  // Handler when user selects text for a question
  const handleSelectForQuestion = useCallback((selection: SelectionInfo) => {
    setQuestionSelection(selection);
    setStreamingAnswer('');
    setQuestionComplete(false);
    setQuestionError(null);
    setShowQuestionWidget(true);
  }, []);

  // Handler when user selects text for a note
  const handleSelectForNote = useCallback((selection: SelectionInfo) => {
    setNoteSelection(selection);
    setShowNoteWidget(true);
  }, []);

  // Handler when user clicks on a highlighted annotation
  const handleAnnotationClick = useCallback((type: AnnotationType, annotation: QuestionAnswerItem | NoteItem) => {
    setViewAnnotation({ type, annotation });
  }, []);

  // Submit question with streaming (called by QuestionWidget)
  const handleSubmitQuestion = useCallback(async (questionText: string) => {
    if (!questionText.trim() || !conceptId || !graphId) return;
    
    setIsAskingQuestion(true);
    setStreamingAnswer('');
    setQuestionError(null);
    
    try {
      // Call the answerQuestion API with streaming
      let fullAnswer = '';
      const context = questionSelection?.text || '';
      await answer(
        { 
          targetNodeId: conceptId, 
          question: context ? `Context: "${context}"\n\nQuestion: ${questionText}` : questionText
        },
        {
          stream: true,
          onChunk: (chunk: string) => {
            fullAnswer += chunk;
            setStreamingAnswer(prev => prev + chunk);
          },
        }
      );
      
      setQuestionComplete(true);
      
      // Save the Q&A to the lesson node if available
      if (lessonNodeId && fullAnswer) {
        try {
          await addQuestion(lessonNodeId, {
            question: questionText,
            answer: fullAnswer,
            selectedText: questionSelection?.text,
            selectedTextChunks: questionSelection?.textChunks,
          });
          conceptDetail.refetch().catch(console.error);
        } catch (saveError) {
          console.error('Failed to save question to lesson:', saveError);
        }
      }
    } catch (error) {
      console.error('Failed to answer question:', error);
      setQuestionError(error instanceof Error ? error.message : 'Failed to get answer');
      setQuestionComplete(true);
    } finally {
      setIsAskingQuestion(false);
    }
  }, [questionSelection, conceptId, graphId, answer, lessonNodeId, addQuestion, conceptDetail]);

  // Close question widget
  const handleCloseQuestionWidget = useCallback(() => {
    setShowQuestionWidget(false);
    setStreamingAnswer('');
    setQuestionComplete(false);
    setQuestionSelection(null);
    setQuestionError(null);
  }, []);

  // Reset question widget for another question
  const handleResetQuestion = useCallback(() => {
    setStreamingAnswer('');
    setQuestionComplete(false);
    setQuestionError(null);
  }, []);

  // Add note (called by NotesWidget)
  const handleAddNote = useCallback(async (text: string, selectedText?: string, selectedTextChunks?: string[]) => {
    if (!lessonNodeId) {
      alert('Note cannot be saved: the lesson needs to be generated first.');
      return;
    }
    
    try {
      await addNote(lessonNodeId, {
        text,
        selectedText: selectedText || noteSelection?.text,
        selectedTextChunks: selectedTextChunks || noteSelection?.textChunks,
      });
      conceptDetail.refetch().catch(console.error);
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('Failed to save note. Please try again.');
    }
  }, [lessonNodeId, noteSelection, addNote, conceptDetail]);

  // Close note widget
  const handleCloseNoteWidget = useCallback(() => {
    setShowNoteWidget(false);
    setNoteSelection(null);
  }, []);

  // Handler for deleting a question
  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    if (!lessonNodeId) return;
    
    try {
      await deleteQuestion(lessonNodeId, questionId);
      setViewAnnotation(null);
      await conceptDetail.refetch();
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  }, [lessonNodeId, deleteQuestion, conceptDetail]);

  // Handler for deleting a note
  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!lessonNodeId) return;
    
    try {
      await deleteNote(lessonNodeId, noteId);
      setViewAnnotation(null);
      await conceptDetail.refetch();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }, [lessonNodeId, deleteNote, conceptDetail]);

  // Derived data
  const renderedLesson = streamingLessonContent || conceptDetail.conceptDetail?.lesson?.content || concept?.lesson || '';
  const hasLesson = Boolean(renderedLesson && renderedLesson.trim().length > 0);
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
        navigate(`/concepts/${graphId}/concept/${encodeURIComponent(navConcept.id)}`);
      }
    },
    [graphId, navigate]
  );
  
  const handleNavigateToNext = useCallback(
    (navConcept: { id: string; name: string }) => {
      if (graphId) {
        navigate(`/concepts/${graphId}/concept/${encodeURIComponent(navConcept.id)}`);
      }
    },
    [graphId, navigate]
  );

  // Seed concept action: navigate to first concept in next level (Level 1)
  const seedConceptAction = useMemo(() => {
    if (!concept?.isSeed || !conceptsData.groupedByLayer) {
      return undefined;
    }
    
    // Find Level 1 concepts
    const level1Concepts = conceptsData.groupedByLayer[1] || [];
    const firstLevel1Concept = level1Concepts[0];
    
    if (!firstLevel1Concept) {
      return undefined;
    }
    
    return {
      label: `Start Learning Level 1: ${firstLevel1Concept.name}`,
      onClick: () => {
        if (graphId) {
          navigate(`/concepts/${graphId}/concept/${encodeURIComponent(firstLevel1Concept.id)}`);
        }
      },
    };
  }, [concept?.isSeed, conceptsData.groupedByLayer, graphId, navigate]);

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

  // Bus listeners for concept-detail interactions
  useEffect(() => {
    const unsubGenerate = on('UI:GENERATE_LESSON', (event) => {
      const payload = event.payload as { simple?: boolean } | undefined;
      handleGenerateLesson(payload?.simple ?? false);
    });
    const unsubEdit = on('UI:EDIT_LESSON', () => {
      setIsEditingLesson(true);
    });
    const unsubCancelEdit = on('UI:CANCEL_EDIT', () => {
      setIsEditingLesson(false);
    });
    const unsubSave = on('UI:SAVE_LESSON', (event) => {
      const payload = event.payload as { lesson?: string } | undefined;
      if (payload?.lesson !== undefined) handleSaveLesson(payload.lesson);
    });
    const unsubViewPrereq = on('UI:VIEW_PREREQUISITE', (event) => {
      const payload = event.payload as { prerequisiteName?: string } | undefined;
      if (payload?.prerequisiteName) handleNavigateToPrerequisite(payload.prerequisiteName);
    });
    const unsubSelectQ = on('UI:SELECT_FOR_QUESTION', (event) => {
      const payload = event.payload as { selectionText?: string; selectionTextChunks?: string[]; posTop?: number; posLeft?: number } | undefined;
      if (payload?.selectionText) handleSelectForQuestion({ text: payload.selectionText, textChunks: payload.selectionTextChunks ?? [], position: { top: payload.posTop ?? 0, left: payload.posLeft ?? 0 } });
    });
    const unsubSelectN = on('UI:SELECT_FOR_NOTE', (event) => {
      const payload = event.payload as { selectionText?: string; selectionTextChunks?: string[]; posTop?: number; posLeft?: number } | undefined;
      if (payload?.selectionText) handleSelectForNote({ text: payload.selectionText, textChunks: payload.selectionTextChunks ?? [], position: { top: payload.posTop ?? 0, left: payload.posLeft ?? 0 } });
    });
    const unsubAnnotation = on('UI:ANNOTATION_CLICK', (event) => {
      const payload = event.payload as { type?: AnnotationType; annotationId?: string } | undefined;
      if (!payload?.type || !payload?.annotationId) return;
      const annotation = payload.type === 'question'
        ? lessonQuestions.find(q => q.id === payload.annotationId)
        : lessonNotes.find(n => n.id === payload.annotationId);
      if (annotation) handleAnnotationClick(payload.type, annotation);
    });
    const unsubPrev = on('UI:PREVIOUS_CONCEPT', (event) => {
      const payload = event.payload as { conceptId?: string; name?: string } | undefined;
      if (payload?.conceptId && payload?.name) handleNavigateToPrevious({ id: payload.conceptId, name: payload.name });
    });
    const unsubNext = on('UI:NEXT_CONCEPT', (event) => {
      const payload = event.payload as { conceptId?: string; name?: string } | undefined;
      if (payload?.conceptId && payload?.name) handleNavigateToNext({ id: payload.conceptId, name: payload.name });
    });
    const unsubAddNote = on('UI:ADD_NOTE', (event) => {
      const payload = event.payload as { text?: string; selectedText?: string; selectedTextChunks?: string[] } | undefined;
      if (payload?.text) handleAddNote(payload.text, payload.selectedText, payload.selectedTextChunks);
    });
    const unsubDeleteNote = on('UI:DELETE_NOTE', (event) => {
      const payload = event.payload as { noteId?: string } | undefined;
      if (payload?.noteId) handleDeleteNote(payload.noteId);
    });
    const unsubSubmitQ = on('UI:SUBMIT_QUESTION', (event) => {
      const payload = event.payload as { questionText?: string } | undefined;
      if (payload?.questionText) handleSubmitQuestion(payload.questionText);
    });
    const unsubDeleteQ = on('UI:ASK_QUESTION', () => {
      // open question widget if not already open
      if (!showQuestionWidget) setShowQuestionWidget(true);
    });
    const unsubSaveActivation = on('UI:SAVE_ACTIVATION', (event) => {
      const payload = event.payload as { response?: string } | undefined;
      if (payload?.response !== undefined) saveActivationResponse(payload.response);
    });
    const unsubSaveReflection = on('UI:SAVE_REFLECTION', (event) => {
      const payload = event.payload as { index?: number; note?: string } | undefined;
      if (payload?.index !== undefined && payload?.note !== undefined) saveReflectionNote(payload.index, payload.note);
    });
    const unsubAnswerBloom = on('UI:ANSWER_BLOOM', (event) => {
      const payload = event.payload as { index?: number; level?: BloomLevel } | undefined;
      if (payload?.index !== undefined && payload?.level) markBloomQuestionAnswered(payload.index, payload.level);
    });
    return () => {
      unsubGenerate();
      unsubEdit();
      unsubCancelEdit();
      unsubSave();
      unsubViewPrereq();
      unsubSelectQ();
      unsubSelectN();
      unsubAnnotation();
      unsubPrev();
      unsubNext();
      unsubAddNote();
      unsubDeleteNote();
      unsubSubmitQ();
      unsubDeleteQ();
      unsubSaveActivation();
      unsubSaveReflection();
      unsubAnswerBloom();
    };
  }, [
    on,
    handleGenerateLesson,
    handleSaveLesson,
    handleNavigateToPrerequisite,
    handleSelectForQuestion,
    handleSelectForNote,
    handleAnnotationClick,
    handleNavigateToPrevious,
    handleNavigateToNext,
    handleAddNote,
    handleDeleteNote,
    handleSubmitQuestion,
    lessonQuestions,
    lessonNotes,
    showQuestionWidget,
    saveActivationResponse,
    saveReflectionNote,
    markBloomQuestionAnswered,
  ]);

  // Prerequisites for the lesson panel (from relationships)
  const lessonPrerequisites = useMemo(() => {
    const prereqs = conceptDetail.conceptDetail?.relationships?.prerequisites || [];
    return prereqs.map(p => ({ id: p.id, name: p.name }));
  }, [conceptDetail.conceptDetail?.relationships?.prerequisites]);

  // Annotated lesson content (if lesson exists) - Dumb component, container handles modals
  const annotatedLessonContent = hasLesson ? (
    <AnnotatedLessonContent
      content={renderedLesson}
      questions={lessonQuestions}
      notes={lessonNotes}
      onSelectForQuestion={(sel) => emit('UI:SELECT_FOR_QUESTION', { selectionText: sel.text, selectionTextChunks: sel.textChunks, posTop: sel.position.top, posLeft: sel.position.left })}
      onSelectForNote={(sel) => emit('UI:SELECT_FOR_NOTE', { selectionText: sel.text, selectionTextChunks: sel.textChunks, posTop: sel.position.top, posLeft: sel.position.left })}
      onAnnotationClick={(type, annotation) => emit('UI:ANNOTATION_CLICK', { type, annotationId: annotation.id })}
      disabled={localLessonLoading || isExplaining || isAnswering}
    />
  ) : null;

  // Lesson Panel content - Uses component library LessonPanel
  const lessonPanel = concept && graphId ? (
    <LessonPanel
      renderedLesson={renderedLesson}
      conceptHasLesson={hasLesson}
      onGenerateLesson={(simple) => emit('UI:GENERATE_LESSON', { conceptId: conceptId || '', graphId: graphId || '', simple: simple ?? false })}
      isGenerating={localLessonLoading || isExplaining || annotationsLoading}
      prerequisites={lessonPrerequisites}
      onViewPrerequisite={(name) => emit('UI:VIEW_PREREQUISITE', { prerequisiteName: name, graphId: graphId || '' })}
      showGenerationButtons={true}
      isEditing={isEditingLesson}
      onEdit={() => emit('UI:EDIT_LESSON', { conceptId: conceptId || '' })}
      onCancelEdit={() => emit('UI:CANCEL_EDIT', { conceptId: conceptId || '' })}
      onSaveLesson={(lesson) => emit('UI:SAVE_LESSON', { conceptId: conceptId || '', lesson })}
      lessonContent={annotatedLessonContent}
    />
  ) : null;

  const operationPanel = null;
  const promptDisplayModal = null;

  // Convert lessonQuestions to QuestionAnswerDisplay format for QuestionWidget
  const questionDisplays: QuestionAnswerDisplay[] = useMemo(() => {
    return lessonQuestions.map(q => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      selectedText: q.selectedText,
      timestamp: q.timestamp,
    }));
  }, [lessonQuestions]);

  // Convert lessonNotes to format expected by NotesWidget
  const noteDisplays = useMemo(() => {
    return lessonNotes.map(n => ({
      id: n.id,
      text: n.text,
      selectedText: n.selectedText,
      selectedTextChunks: n.selectedTextChunks,
      timestamp: n.timestamp,
    }));
  }, [lessonNotes]);

  return (
    <>
      {promptDisplayModal}
      
      {/* Question Widget - Component library element, container manages streaming */}
      <QuestionWidget
        isOpen={showQuestionWidget}
        onClose={handleCloseQuestionWidget}
        onSubmitQuestion={handleSubmitQuestion}
        selectedText={questionSelection?.text}
        questions={questionDisplays}
        streamingAnswer={streamingAnswer}
        isLoading={isAskingQuestion}
        isComplete={questionComplete}
        error={questionError || undefined}
        onReset={handleResetQuestion}
      />

      {/* Notes Widget - Component library element */}
      <NotesWidget
        notes={noteDisplays}
        onAddNote={handleAddNote}
        onDeleteNote={(id) => handleDeleteNote(id)}
        selectedText={noteSelection?.text}
        selectedTextChunks={noteSelection?.textChunks}
        isOpen={showNoteWidget}
        onClose={handleCloseNoteWidget}
        showFloatingButton={false}
      />

      {/* View Annotation Modal */}
      <Modal
        isOpen={viewAnnotation !== null}
        onClose={() => setViewAnnotation(null)}
        title={viewAnnotation?.type === 'question' ? 'Question & Answer' : 'Note'}
        size="lg"
      >
        {viewAnnotation && (
          <div className="space-y-4">
            {/* Selected text context */}
            {viewAnnotation.annotation.selectedText && (
              <div className={cn(
                "border-l-4 p-3 rounded-r-md",
                viewAnnotation.type === 'question'
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                  : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500"
              )}>
                <Typography variant="small" color="muted" className="text-xs mb-1">
                  Context:
                </Typography>
                <Typography variant="body" className="text-sm italic">
                  "{viewAnnotation.annotation.selectedText}"
                </Typography>
              </div>
            )}

            {/* Content */}
            {viewAnnotation.type === 'question' && 'question' in viewAnnotation.annotation ? (
              <div className="space-y-4">
                <div>
                  <Typography variant="small" className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    Question:
                  </Typography>
                  <Typography variant="body">
                    {(viewAnnotation.annotation as QuestionAnswerItem).question}
                  </Typography>
                </div>
                <div>
                  <Typography variant="small" className="font-semibold text-green-600 dark:text-green-400 mb-1">
                    Answer:
                  </Typography>
                  <div className="prose dark:prose-invert max-w-none">
                    <MarkdownContent content={(viewAnnotation.annotation as QuestionAnswerItem).answer} />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Typography variant="body">
                  {(viewAnnotation.annotation as NoteItem).text}
                </Typography>
              </div>
            )}

            {/* Timestamp and Delete */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <Typography variant="small" color="muted" className="text-xs">
                Created: {new Date(viewAnnotation.annotation.timestamp).toLocaleString()}
              </Typography>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (viewAnnotation.type === 'question') {
                    handleDeleteQuestion(viewAnnotation.annotation.id);
                  } else {
                    handleDeleteNote(viewAnnotation.annotation.id);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <LearnConceptDetailTemplate
        concept={templateConcept}
        loading={conceptDetail.loading || isLoadingGraph}
        error={conceptDetail.error}
        onBack={handleBack}
        backLabel="Back to Concepts"
        lessonPanel={lessonPanel}
        previousConcept={previousConcept}
        nextConcept={nextConcept}
        onPreviousConceptClick={(c) => emit('UI:PREVIOUS_CONCEPT', { conceptId: c.id, name: c.name })}
        onNextConceptClick={(c) => emit('UI:NEXT_CONCEPT', { conceptId: c.id, name: c.name })}
        seedConceptAction={seedConceptAction}
        user={templateUser}
        navigationItems={navigationItems}
      />
    </>
  );
};

ConceptDetailPageContainer.displayName = 'ConceptDetailPageContainer';

export default ConceptDetailPageContainer;
export { ConceptDetailPageContainer };
