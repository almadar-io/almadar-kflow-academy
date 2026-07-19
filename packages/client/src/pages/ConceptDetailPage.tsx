import { createLogger } from '@almadar/logger';
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useParams, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { useConceptDetail } from '../features/knowledge-graph/hooks/useConceptDetail';
import { useGetGraph, useLessonAnnotations } from '../features/knowledge-graph/hooks';
import { setCurrentGraphId, selectGraphById } from '../features/knowledge-graph/knowledgeGraphSlice';
import { useExplainConcept } from '../features/knowledge-graph/hooks/useExplainConcept';
import { useAnswerQuestion } from '../features/knowledge-graph/hooks/useAnswerQuestion';
import { useCustomOperation } from '../features/knowledge-graph/hooks/useCustomOperation';
import { useUserProgress } from '../features/concepts/hooks/useUserProgress';
import { useTouchNodeActivity } from '../features/connections/hooks/useConnections';
import { useLearningPaths } from '../features/knowledge-graph/hooks/useLearningPaths';
import type { NodeKey } from '@kflow-academy/shared';
import { useServerEvents } from '../features/learning/hooks/useServerEvents';
import { useConceptsByLayer } from '../features/knowledge-graph/hooks/useConceptsByLayer';
import { useAuthContext } from '../features/auth/AuthContext';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../config/navigation';
import type { Concept, BloomLevel } from '../features/concepts/types';
import type { QuestionAnswerItem, NoteItem, AnnotationType } from '../features/knowledge-graph/types';
import type { JsonValue } from '@almadar-io/knowledge';
import { convertConceptDisplayToConcept } from '../features/concepts/utils/convertConceptDisplay';
import { Box, Button, useEventBus, useTranslate } from '@almadar/ui';
import { LearnConceptDetailTemplate } from '@design-system/templates/LearnConceptDetailTemplate';
import type { ConceptDetailTemplateEntity } from '@design-system/templates/LearnConceptDetailTemplate';
import kflowLogo from '../assets/kflow-logo.svg';
import { LessonPanel } from '@design-system/organisms/LessonPanel';
import { AnnotatedLessonContent } from '@design-system/organisms/AnnotatedLessonContent';
import type { SelectionInfo } from '@design-system/organisms/AnnotatedLessonContent';
import { QuestionWidget } from '@design-system/organisms/QuestionWidget';
import type { QuestionAnswerDisplay } from '@design-system/organisms/QuestionWidget';
import { NotesWidget } from '@design-system/organisms/NotesWidget';
import { AnnotationViewModal } from '@design-system/organisms/AnnotationViewModal';
import type { AnnotationEntity } from '@design-system/organisms/AnnotationViewModal';

const log = createLogger('kflow:client:pages:ConceptDetailPage');

export const ConceptDetailPage: React.FC = () => {
  const { graphId, conceptId } = useParams<{ graphId: string; conceptId: string }>();
  const navigate = useNavigateEvent();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAuthContext();
  const { on, emit } = useEventBus();
  const { t } = useTranslate();
  const { sendEvent } = useServerEvents();

  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  useEffect(() => {
    if (graphId) dispatch(setCurrentGraphId(graphId));
  }, [graphId, dispatch]);

  const conceptDetail = useConceptDetail(graphId || '', conceptId || '');

  // Presence: touching lastSeenOnNode on mount makes this viewer appear in the peer
  // pool for this concept (recency, not a heartbeat).
  const conceptName = conceptDetail.conceptDetail?.concept?.name;
  const conceptNodeKey = (graphId && conceptId && conceptName ? (`concept:${conceptName}` as NodeKey) : null);
  useTouchNodeActivity(conceptNodeKey);
  const { learningPaths: allPaths } = useLearningPaths();
  const pathForGraph = useMemo(
    () => allPaths.find(p => p.id === graphId),
    [allPaths, graphId],
  );
  const graph = useAppSelector((state) => selectGraphById(state, graphId || ''));
  const { getGraph, loading: isLoadingGraph } = useGetGraph();
  const conceptsData = useConceptsByLayer(graphId || '', {
    includeRelationships: false,
    groupByLayer: true,
  });

  useEffect(() => {
    if (graphId && !graph && !isLoadingGraph) {
      getGraph(graphId, { storeInRedux: true }).catch((err) => {
        log.error('Failed to load graph', { error: err instanceof Error ? err.message : String(err) });
      });
    }
  }, [graphId, graph, isLoadingGraph, getGraph]);

  const concept = useMemo((): Concept | null => {
    if (!conceptDetail.conceptDetail?.concept) return null;
    return convertConceptDisplayToConcept(conceptDetail.conceptDetail.concept);
  }, [conceptDetail.conceptDetail]);

  const { lessonNodeId, lessonQuestions, lessonNotes } = useMemo(() => {
    if (!graph || !conceptId) return { lessonNodeId: undefined, lessonQuestions: [], lessonNotes: [] };
    const lessonIds = graph.nodeTypes?.Lesson || [];
    const conceptLessonRel = graph.relationships?.find(
      rel => rel.source === conceptId && rel.type === 'hasLesson'
    );
    let lessonId = conceptLessonRel?.target;
    if (!lessonId && lessonIds.length > 0) {
      for (const lid of lessonIds) {
        const rel = graph.relationships?.find(r => r.target === lid && r.source === conceptId);
        if (rel) { lessonId = lid; break; }
      }
    }
    if (!lessonId) return { lessonNodeId: undefined, lessonQuestions: [], lessonNotes: [] };
    const lessonNode = graph.nodes?.[lessonId];
    const rawQ = lessonNode?.properties?.questions;
    const rawN = lessonNode?.properties?.notes;
    return {
      lessonNodeId: lessonId,
      lessonQuestions: Array.isArray(rawQ) ? (rawQ as (JsonValue & QuestionAnswerItem)[]) : [],
      lessonNotes: Array.isArray(rawN) ? (rawN as (JsonValue & NoteItem)[]) : [],
    };
  }, [graph, conceptId]);

  const annotationsHook = useLessonAnnotations(graphId || '', lessonQuestions, lessonNotes);
  const { addQuestion, deleteQuestion, addNote, deleteNote, loading: annotationsLoading } = annotationsHook;

  const { explain, isLoading: isExplaining } = useExplainConcept(graphId || '');
  const { answer, isLoading: isAnswering } = useAnswerQuestion(graphId || '');
  const { execute: customOp, isLoading: isCustomOp } = useCustomOperation(graphId || '');

  const { saveActivationResponse, saveReflectionNote, markBloomQuestionAnswered } = useUserProgress({
    dispatch,
    concept: concept ?? undefined,
    graphId,
  });

  // Local UI state
  const [streamingLessonContent, setStreamingLessonContent] = useState('');
  const [localLessonLoading, setLocalLessonLoading] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);

  // Question widget state
  const [showQuestionWidget, setShowQuestionWidget] = useState(false);
  const [questionSelection, setQuestionSelection] = useState<SelectionInfo | null>(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [questionComplete, setQuestionComplete] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [currentRelatedConcepts, setCurrentRelatedConcepts] = useState<Array<{ graphId: string; nodeId: string; name?: string }>>([]);

  // Note widget state
  const [showNoteWidget, setShowNoteWidget] = useState(false);
  const [noteSelection, setNoteSelection] = useState<SelectionInfo | null>(null);

  // Annotation view modal state
  const [viewAnnotation, setViewAnnotation] = useState<{
    type: AnnotationType;
    annotation: QuestionAnswerItem | NoteItem;
  } | null>(null);

  useEffect(() => {
    setStreamingLessonContent('');
  }, [conceptId]);

  // Redirect if concept not found after loading
  useEffect(() => {
    if (!conceptDetail.loading && !isLoadingGraph && !concept && !conceptDetail.conceptDetail && conceptId) {
      navigate(`/concepts/${graphId}`);
    }
  }, [conceptDetail.loading, isLoadingGraph, concept, conceptDetail.conceptDetail, conceptId, graphId, navigate]);

  const handleGenerateLesson = useCallback(async (simple?: boolean) => {
    if (!conceptId || !graphId) return;
    try {
      setLocalLessonLoading(true);
      setStreamingLessonContent('');
      await explain(
        { targetNodeId: conceptId, simple: simple ?? false, minimal: false },
        {
          stream: true,
          onChunk: (chunk: string) => { setStreamingLessonContent(prev => prev + chunk); },
        }
      );
      await conceptDetail.refetch();
    } catch (err) {
      log.error('Failed to generate lesson', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLocalLessonLoading(false);
    }
  }, [conceptId, graphId, explain, conceptDetail]);

  const handleSaveLesson = useCallback((_lesson: string) => {
    setIsEditingLesson(false);
    setStreamingLessonContent('');
    conceptDetail.refetch();
  }, [conceptDetail]);

  const handleNavigateToParent = useCallback((parentName: string) => {
    const parent = conceptDetail.conceptDetail?.relationships?.parents?.find(p => p.name === parentName);
    if (parent && graphId) navigate(`/concepts/${graphId}/concept/${encodeURIComponent(parent.id)}`);
  }, [graphId, conceptDetail.conceptDetail, navigate]);

  const handleNavigateToPrerequisite = useCallback((prereqName: string) => {
    const prereq = conceptDetail.conceptDetail?.relationships?.prerequisites?.find(p => p.name === prereqName);
    if (prereq && graphId) navigate(`/concepts/${graphId}/concept/${encodeURIComponent(prereq.id)}`);
  }, [graphId, conceptDetail.conceptDetail, navigate]);

  const handleBack = useCallback(() => {
    if (graphId) navigate(`/concepts/${graphId}`);
    else navigate('/home');
  }, [graphId, navigate]);

  const handleSelectForQuestion = useCallback((selection: SelectionInfo) => {
    setQuestionSelection(selection);
    setStreamingAnswer('');
    setQuestionComplete(false);
    setQuestionError(null);
    setShowQuestionWidget(true);
  }, []);

  const handleSelectForNote = useCallback((selection: SelectionInfo) => {
    setNoteSelection(selection);
    setShowNoteWidget(true);
  }, []);

  const handleAnnotationClick = useCallback((type: AnnotationType, annotation: QuestionAnswerItem | NoteItem) => {
    setViewAnnotation({ type, annotation });
  }, []);

  const handleSubmitQuestion = useCallback(async (questionText: string) => {
    if (!questionText.trim() || !conceptId || !graphId) return;
    setIsAskingQuestion(true);
    setStreamingAnswer('');
    setQuestionError(null);
    try {
      let fullAnswer = '';
      const context = questionSelection?.text || '';
      const resp = await answer(
        { targetNodeId: conceptId, question: context ? `Context: "${context}"\n\nQuestion: ${questionText}` : questionText },
        { 
          stream: true, 
          onChunk: (chunk: string) => { fullAnswer += chunk; setStreamingAnswer(prev => prev + chunk); },
          onDone: (finalResult: any) => {
            const rels = finalResult?.content?.relatedConcepts;
            if (Array.isArray(rels) && rels.length) setCurrentRelatedConcepts(rels);
          }
        }
      );
      setQuestionComplete(true);
      if (lessonNodeId && fullAnswer) {
        try {
          await addQuestion(lessonNodeId, {
            question: questionText,
            answer: fullAnswer,
            selectedText: questionSelection?.text,
            selectedTextChunks: questionSelection?.textChunks,
          });
          conceptDetail.refetch().catch((err) => {
            log.error('Failed to refetch after save question', { error: err instanceof Error ? err.message : String(err) });
          });
        } catch (saveErr) {
          log.error('Failed to save question', { error: saveErr instanceof Error ? saveErr.message : String(saveErr) });
        }
      }
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Failed to get answer');
      setQuestionComplete(true);
    } finally {
      setIsAskingQuestion(false);
    }
  }, [questionSelection, conceptId, graphId, answer, lessonNodeId, addQuestion, conceptDetail]);

  const handleCloseQuestionWidget = useCallback(() => {
    setShowQuestionWidget(false);
    setStreamingAnswer('');
    setQuestionComplete(false);
    setQuestionSelection(null);
    setQuestionError(null);
    setCurrentRelatedConcepts([]);
  }, []);

  const handleResetQuestion = useCallback(() => {
    setStreamingAnswer('');
    setQuestionComplete(false);
    setQuestionError(null);
    setCurrentRelatedConcepts([]);
  }, []);

  const handleAddNote = useCallback(async (text: string, selectedText?: string, selectedTextChunks?: string[]) => {
    if (!lessonNodeId) return;
    try {
      await addNote(lessonNodeId, {
        text,
        selectedText: selectedText || noteSelection?.text,
        selectedTextChunks: selectedTextChunks || noteSelection?.textChunks,
      });
      conceptDetail.refetch().catch((err) => {
        log.error('Failed to refetch after add note', { error: err instanceof Error ? err.message : String(err) });
      });
    } catch (err) {
      log.error('Failed to add note', { error: err instanceof Error ? err.message : String(err) });
    }
  }, [lessonNodeId, noteSelection, addNote, conceptDetail]);

  const handleCloseNoteWidget = useCallback(() => {
    setShowNoteWidget(false);
    setNoteSelection(null);
  }, []);

  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    if (!lessonNodeId) return;
    try {
      await deleteQuestion(lessonNodeId, questionId);
      setViewAnnotation(null);
      await conceptDetail.refetch();
    } catch (err) {
      log.error('Failed to delete question', { error: err instanceof Error ? err.message : String(err) });
    }
  }, [lessonNodeId, deleteQuestion, conceptDetail]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!lessonNodeId) return;
    try {
      await deleteNote(lessonNodeId, noteId);
      setViewAnnotation(null);
      await conceptDetail.refetch();
    } catch (err) {
      log.error('Failed to delete note', { error: err instanceof Error ? err.message : String(err) });
    }
  }, [lessonNodeId, deleteNote, conceptDetail]);

  // Derived data
  const renderedLesson = streamingLessonContent || conceptDetail.conceptDetail?.lesson?.content || concept?.lesson || '';
  const hasLesson = Boolean(renderedLesson && renderedLesson.trim().length > 0);
  const parentNames = conceptDetail.conceptDetail?.relationships?.parents?.map(p => p.name) || concept?.parents || [];

  const { previousConcept, nextConcept } = useMemo(() => {
    if (!concept || !conceptsData.groupedByLayer || concept.layer === undefined) {
      return { previousConcept: undefined, nextConcept: undefined };
    }
    const layerConcepts = conceptsData.groupedByLayer[concept.layer] || [];
    const currentIndex = layerConcepts.findIndex(c => c.id === concept.id);
    if (currentIndex === -1) return { previousConcept: undefined, nextConcept: undefined };
    const previous = currentIndex > 0 ? layerConcepts[currentIndex - 1] : undefined;
    const next = currentIndex < layerConcepts.length - 1 ? layerConcepts[currentIndex + 1] : undefined;
    return {
      previousConcept: previous ? { id: previous.id, name: previous.name } : undefined,
      nextConcept: next ? { id: next.id, name: next.name } : undefined,
    };
  }, [concept, conceptsData.groupedByLayer]);

  const handleNavigateToPrevious = useCallback((navConcept: { id: string; name: string }) => {
    if (graphId) navigate(`/concepts/${graphId}/concept/${encodeURIComponent(navConcept.id)}`);
  }, [graphId, navigate]);

  const handleNavigateToNext = useCallback((navConcept: { id: string; name: string }) => {
    if (graphId) navigate(`/concepts/${graphId}/concept/${encodeURIComponent(navConcept.id)}`);
  }, [graphId, navigate]);

  // Bus listeners
  useEffect(() => {
    const unsubGenerate = on('UI:GENERATE_LESSON', (event) => {
      const payload = event.payload as { simple?: boolean } | undefined;
      handleGenerateLesson(payload?.simple ?? false);
    });
    const unsubEdit = on('UI:EDIT_LESSON', () => { setIsEditingLesson(true); });
    const unsubCancelEdit = on('UI:CANCEL_EDIT', () => { setIsEditingLesson(false); });
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
      if (payload?.selectionText) {
        handleSelectForQuestion({
          text: payload.selectionText,
          textChunks: payload.selectionTextChunks ?? [],
          position: { top: payload.posTop ?? 0, left: payload.posLeft ?? 0 },
        });
      }
    });
    const unsubSelectN = on('UI:SELECT_FOR_NOTE', (event) => {
      const payload = event.payload as { selectionText?: string; selectionTextChunks?: string[]; posTop?: number; posLeft?: number } | undefined;
      if (payload?.selectionText) {
        handleSelectForNote({
          text: payload.selectionText,
          textChunks: payload.selectionTextChunks ?? [],
          position: { top: payload.posTop ?? 0, left: payload.posLeft ?? 0 },
        });
      }
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
      const payload = event.payload as { questionText?: string; context?: string } | undefined;
      if (!payload?.questionText) return;
      handleSubmitQuestion(payload.questionText);
      sendEvent('UI:SUBMIT_QUESTION', {
        orbital: 'concept-detail',
        question: payload.questionText,
        context: payload.context ?? null,
      });
    });
    const unsubAsk = on('UI:ASK_QUESTION', () => {
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
    const unsubNavigateBack = on('UI:NAVIGATE_BACK', () => { handleBack(); });
    const unsubAnnotationDelete = on('UI:ANNOTATION_DELETE', (event) => {
      const payload = event.payload as { annotationId?: string; type?: AnnotationType } | undefined;
      if (!payload?.annotationId || !payload?.type) return;
      if (payload.type === 'question') handleDeleteQuestion(payload.annotationId);
      else handleDeleteNote(payload.annotationId);
    });
    const unsubAnnotationClose = on('UI:ANNOTATION_CLOSE', () => { setViewAnnotation(null); });
    return () => {
      unsubGenerate(); unsubEdit(); unsubCancelEdit(); unsubSave(); unsubViewPrereq();
      unsubSelectQ(); unsubSelectN(); unsubAnnotation(); unsubPrev(); unsubNext();
      unsubAddNote(); unsubDeleteNote(); unsubSubmitQ(); unsubAsk();
      unsubSaveActivation(); unsubSaveReflection(); unsubAnswerBloom(); unsubNavigateBack();
      unsubAnnotationDelete(); unsubAnnotationClose();
    };
  }, [
    on, handleGenerateLesson, handleSaveLesson, handleNavigateToPrerequisite,
    handleSelectForQuestion, handleSelectForNote, handleAnnotationClick,
    handleNavigateToPrevious, handleNavigateToNext, handleAddNote, handleDeleteNote,
    handleSubmitQuestion, sendEvent, lessonQuestions, lessonNotes, showQuestionWidget,
    saveActivationResponse, saveReflectionNote, markBloomQuestionAnswered, handleBack,
    handleDeleteQuestion,
  ]);

  const lessonPrerequisites = useMemo(() => {
    return (conceptDetail.conceptDetail?.relationships?.prerequisites || []).map(p => ({ id: p.id, name: p.name }));
  }, [conceptDetail.conceptDetail?.relationships?.prerequisites]);

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

  const questionDisplays: QuestionAnswerDisplay[] = useMemo(() => {
    return lessonQuestions.map(q => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      selectedText: q.selectedText,
      timestamp: q.timestamp,
    }));
  }, [lessonQuestions]);

  const noteDisplays = useMemo(() => {
    return lessonNotes.map(n => ({
      id: n.id,
      text: n.text,
      selectedText: n.selectedText,
      selectedTextChunks: n.selectedTextChunks,
      timestamp: n.timestamp,
    }));
  }, [lessonNotes]);

  const handleConnect = useCallback(() => {
    if (!conceptNodeKey) return;
    const parts: string[] = [];
    if (concept?.layer != null) parts.push(`learning level ${concept.layer}`);
    if (pathForGraph?.description) parts.push(`subject: ${pathForGraph.description}`);
    else if (pathForGraph?.title) parts.push(`subject: ${pathForGraph.title}`);
    if (pathForGraph?.seedConcept?.name) parts.push(`seed concept: ${pathForGraph.seedConcept.name}`);
    const parents = conceptDetail.conceptDetail?.relationships?.parents?.map(p => p.name).filter(Boolean);
    if (parents?.length) parts.push(`related concepts: ${parents.slice(0, 6).join(', ')}`);
    emit('UI:PEER_CONNECT_OPEN', { nodeKey: conceptNodeKey, context: parts.join('; ') || undefined });
  }, [conceptNodeKey, concept, pathForGraph, conceptDetail.conceptDetail, emit]);

  const entity: ConceptDetailTemplateEntity = {
    concept: concept
      ? { id: concept.id, name: concept.name, description: concept.description, layer: concept.layer, isSeed: concept.isSeed }
      : undefined,
    previousConcept,
    nextConcept,
    onConnect: conceptNodeKey ? handleConnect : undefined,
    lessonPanel,
    backLabel: t('concept.backToConcepts'),
    user: templateUser,
    navigationItems,
    logoSrc: kflowLogo,
    brandName: 'KFlow',
  };

  return (
    <>
      {/* Question Widget */}
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
        relatedConcepts={currentRelatedConcepts}
        onNavigateRelated={(rel) => {
          // Cross-graph navigation using the graphId from the hit.
          navigate(`/concepts/${rel.graphId}/concept/${encodeURIComponent(rel.nodeId)}`);
        }}
      />

      {/* Notes Widget */}
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
      <AnnotationViewModal
        entity={viewAnnotation ? ({ ...viewAnnotation, isOpen: true } satisfies AnnotationEntity) : null}
      />

      <LearnConceptDetailTemplate
        entity={entity}
        isLoading={conceptDetail.loading || isLoadingGraph}
        error={conceptDetail.error ? { message: conceptDetail.error } : null}
      />

      {/* Connect affordance is now inline in the concept header (ConnectButton). */}
    </>
  );
};

ConceptDetailPage.displayName = 'ConceptDetailPage';
