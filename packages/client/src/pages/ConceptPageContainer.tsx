import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectConcept, setCurrentGraph } from '../features/concepts/conceptSlice';
import { Concept } from '../features/concepts/types';
import { getConceptRouteId } from '../features/concepts/utils/graphHelpers';
import { ConceptListPage, ConceptDetailPage } from '../components/pages';
import type { LucideIcon } from 'lucide-react';
import ConceptViewHeader, {
  ConceptViewMode,
  ConceptViewOption,
} from '../features/concepts/components/ConceptViewHeader';
import { MindMap } from '../features/mindmap';
import { RadialView } from '../features/radial-view';
import { UserProfile } from '../features/auth';
import ThemeToggle from '../components/ThemeToggle';
import ConceptLoader from '../features/concepts/components/ConceptLoader';
import { GraduationCap } from 'lucide-react';
import { Note } from '../features/notes/types';
import { useConceptGraphContext } from '../features/concepts/hooks/useConceptGraphContext';
import { useConceptGraphRelations } from '../features/concepts/hooks/useConceptGraphRelations';
import { useConceptLoaderProgress } from '../features/concepts/hooks/useConceptLoaderProgress';
import { useConceptViewState } from '../features/concepts/hooks/useConceptViewState';
import { useConceptActions } from '../features/concepts/hooks/useConceptActions';
import { useConceptLevelNeighbors } from '../features/concepts/hooks/useConceptLevelNeighbors';
import usePrerequisiteRoute from '../features/concepts/hooks/usePrerequisiteRoute';
import { useUserProgress } from '../features/concepts/hooks/useUserProgress';
import { useNotes } from '../features/concepts/hooks/useNotes';

const noop = () => { };

interface ConceptPageContainerProps {
  // Template props (passed from wrapper)
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  logo?: React.ReactNode;
  onLogoClick?: () => void;
  onLogout?: () => void;
}

const ConceptPageContainer: React.FC<ConceptPageContainerProps> = ({
  user,
  navigationItems = [],
  logo,
  onLogoClick,
  onLogout,
}) => {
  const { graphId, conceptId, prereqId } = useParams<{ graphId: string; conceptId?: string; prereqId?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { graphs, currentGraphId, selectedConcept, isLoading } = useAppSelector(state => state.concepts);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const {
    currentGraph,
    conceptMap,
    conceptsArray,
    seedConcept,
    detailConcept,
    decodedConceptId,
  } = useConceptGraphContext({
    graphs,
    graphId,
    conceptId,
    selectedConcept,
  });

  useEffect(() => {
    if (currentGraph && currentGraph.id !== currentGraphId) {
      dispatch(setCurrentGraph(currentGraph.id));
    }
  }, [currentGraph, currentGraphId, dispatch]);

  const isDetailRoute = Boolean(decodedConceptId && detailConcept);
  const isPrerequisiteRoute = Boolean(prereqId);

  const {
    relatedConcepts,
    lessonPreviews,
    notesForMindMap,
    selectedNoteForMindMap,
  } = useConceptGraphRelations({
    seedConcept,
    conceptsArray,
    conceptMap,
    selectedConcept,
  });

  const {
    viewMode,
    setViewMode,
    expandedLevels,
    handleToggleLevel,
    isDetailExpanding,
    setIsDetailExpanding,
    isGeneratingLesson,
    setIsGeneratingLesson,
    hasDetailCandidate,
  } = useConceptViewState(conceptId, detailConcept, selectedConcept, seedConcept, graphId, relatedConcepts, currentGraph);

  const isMindMapView = viewMode === 'mindmap';

  useEffect(() => {
    if (conceptId) {
      if (viewMode === 'list') {
        setViewMode('detail');
      }
    } else if (viewMode === 'detail') {
      setViewMode('list');
    }
  }, [conceptId, viewMode, setViewMode]);

  // Resolve prerequisite concept and sync selection via hook
  const { prereqConcept } = usePrerequisiteRoute({
    isPrerequisiteRoute,
    prereqId,
    conceptMap,
    detailConcept,
    selectedConcept,
    dispatch,
  });

  const loaderProgress = useConceptLoaderProgress(isLoading);
  const [streamContent, setStreamContent] = useState('');

  // Handle streaming for load more levels
  const handleStreamChunk = useCallback((chunk: string) => {
    setStreamContent(prev => prev + chunk);
  }, []);

  // Reset stream content when loading starts/stops
  useEffect(() => {
    if (!isLoading) {
      setStreamContent('');
    }
  }, [isLoading]);

  const {
    handleSelectConcept,
    handleNavigateToParent,
    handleNavigateToChild,
    handleLoadMoreLevels: originalHandleLoadMoreLevels,
    handleSummarizeLevel,
    handleExplainConceptForConcept,
    handleExpandConcept,
    handleGenerateNextConceptForConcept,
    handleUpdateConcept,
    handleAddPrerequisite,
    handleAddAllMissingPrerequisites,
    handleRemovePrerequisite,
  } = useConceptActions({
    dispatch,
    navigate,
    seedConcept,
    conceptsArray,
    relatedConcepts,
    conceptMap,
    graphId: graphId ?? '',
    currentGraph,
  });

  const navigateToPrerequisite = useCallback((parent: Concept, prereqName: string) => {
    if (!graphId) return;
    const parentId = getConceptRouteId(parent);
    const prereq = conceptMap?.get(prereqName);
    const encoded = prereq ? getConceptRouteId(prereq) : encodeURIComponent(prereqName);
    navigate(`/concepts/${graphId}/concept/${parentId}/prerequisite/${encoded}`);
    setViewMode('detail');
  }, [graphId, conceptMap, navigate, setViewMode]);

  // Wrap handleLoadMoreLevels to include streaming and navigation
  const handleLoadMoreLevels = useCallback(async () => {
    setStreamContent(''); // Reset stream content
    try {
      await originalHandleLoadMoreLevels(handleStreamChunk);
      // After loading is complete, navigate to list view if we were in detail view
      if (isDetailRoute && graphId) {
        navigate(`/concepts/${graphId}`);
        setViewMode('list');
      }
    } catch (error) {
      // Error is already handled by the hook, but we still want to navigate on error
      if (isDetailRoute && graphId) {
        navigate(`/concepts/${graphId}`);
        setViewMode('list');
      }
    }
  }, [originalHandleLoadMoreLevels, handleStreamChunk, isDetailRoute, graphId, navigate, setViewMode]);

  const handleViewModeChange = (mode: ConceptViewMode) => {
    if (!graphId) return;
    switch (mode) {
      case 'list':
        navigate(`/concepts/${graphId}`);
        setViewMode('list');
        break;
      case 'mindmap':
        setViewMode('mindmap');
        break;
      case 'radial':
        setViewMode('radial');
        break;
      case 'detail': {
        const targetConcept = detailConcept || selectedConcept || seedConcept;
        if (targetConcept) {
          navigate(`/concepts/${graphId}/concept/${getConceptRouteId(targetConcept)}`);
          setViewMode('detail');
        }
        break;
      }
      default:
        setViewMode(mode);
    }
  };

  const handleBack = () => {
    if (!conceptId) {
      navigate('/learn');
      return;
    }
    // If on prerequisite page, ensure parent is selected before going back
    if (isPrerequisiteRoute && detailConcept) {
      if (!selectedConcept || selectedConcept.name !== detailConcept.name) {
        dispatch(selectConcept(detailConcept));
      }
    }
    // If this is the first concept in its layer (no previous concept in same layer),
    // navigate to list view instead of browser back
    if (isDetailRoute && !previousConcept && graphId) {
      navigate(`/concepts/${graphId}`);
      setViewMode('list');
      return;
    }
    return navigate(-1);
  };

  const resolveConceptFromNote = (note: Note): Concept | undefined => {
    return (
      conceptMap?.get(note.title) ||
      conceptsArray.find(
        concept => (concept.id || concept.name) === note.id || concept.name === note.title,
      )
    );
  };

  const handleDetailExpand = async () => {
    if (!detailConcept) return;

    try {
      setIsDetailExpanding(true);
      await handleExpandConcept(detailConcept);
    } finally {
      setIsDetailExpanding(false);
    }
  };

  const handleDetailGenerateNext = async () => {
    if (!detailConcept) return;
    await handleGenerateNextConceptForConcept(detailConcept);
  };

  const handleExplainConcept = async (conceptToExplain: Concept, simple?: boolean) => {
    setIsGeneratingLesson(true);
    try {
      await handleExplainConceptForConcept(conceptToExplain, simple);
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  const handleMindMapGenerateNext = async (note: Note) => {
    const concept = resolveConceptFromNote(note);
    if (!concept) return;
    await handleGenerateNextConceptForConcept(concept);
  };

  const handleMindMapSelectNote = (note: Note) => {
    const concept = resolveConceptFromNote(note);
    if (concept) {
      // Only select non-prerequisite concepts
      if (!concept.isPrerequisite) {
        dispatch(selectConcept(concept));
      }
    }
  };

  const handleMindMapNavigateNote = (note: Note) => {
    const concept = resolveConceptFromNote(note);
    if (concept) {
      // Navigate to detail page on double click
      handleSelectConcept(concept);
    }
  };

  const handleMindMapSetScrollTarget = (note?: Note) => {
    if (!note) return;
    const concept = resolveConceptFromNote(note);
    if (concept) {
      dispatch(selectConcept(concept));
    }
  };

  const handleMindMapEditNote = (note: Note) => {
    const concept = resolveConceptFromNote(note);
    if (concept && concept.isExpanded !== note.isExpanded) {
      handleUpdateConcept({ ...concept, isExpanded: note.isExpanded });
    }
  };

  const mindMapBaseProps = {
    notes: notesForMindMap,
    onSelectNote: handleMindMapSelectNote,
    onDeleteNote: noop,
    onEditNote: handleMindMapEditNote,
    onCreateNote: noop,
    onAddChildNote: noop,
    onNavigateToNote: handleMindMapNavigateNote,
    onSetScrollTargetNote: handleMindMapSetScrollTarget,
    onAIGenerateChildren: handleMindMapGenerateNext,
  };

  const mindMapProps = {
    ...mindMapBaseProps,
    selectedNote: selectedNoteForMindMap ?? null,
  };

  const { previousConcept, nextConcept } = useConceptLevelNeighbors(
    detailConcept ?? undefined,
    relatedConcepts,
  );

  // Create an ID-to-concept map for efficient lookups (O(1) instead of O(n))
  const conceptByIdMap = useMemo(() => {
    const map = new Map<string, Concept>();
    if (conceptMap) {
      Array.from(conceptMap.values()).forEach(c => {
        if (c.id) map.set(c.id, c);
      });
    }
    relatedConcepts.forEach(c => {
      if (c.id && !map.has(c.id)) {
        map.set(c.id, c);
      }
    });
    return map;
  }, [conceptMap, relatedConcepts]);

  // Extract layer goals from currentGraph
  const layerGoals = useMemo(() => {
    if (!currentGraph?.layers) return {};
    const goals: Record<string, string> = {};
    currentGraph.layers.forEach((layerData, layerNumber) => {
      if (layerData.goal) {
        goals[`L${layerNumber}`] = layerData.goal;
      }
    });
    return goals;
  }, [currentGraph]);

  // Handle layer goal updates
  const handleLayerGoalUpdate = useCallback(async (layerId: string, goal: string) => {
    if (!graphId || !currentGraph) return;
    const layerNumber = parseInt(layerId.replace('L', ''), 10);
    if (isNaN(layerNumber)) return;
    
    // Update layer goal in graph
    const updatedLayers = new Map(currentGraph.layers || new Map());
    const layerData = updatedLayers.get(layerNumber);
    if (layerData) {
      updatedLayers.set(layerNumber, { ...layerData, goal });
      // TODO: Save to backend via API
      // await updateLayerGoal(graphId, layerNumber, goal);
    }
  }, [graphId, currentGraph]);

  const availableOptions: ConceptViewOption[] = useMemo(
    () => {
      const allOptions: ConceptViewOption[] = [
        {
          mode: 'list',
          label: 'List View'
        },
        {
          mode: 'detail',
          label: 'Detail View',
          disabled: !hasDetailCandidate,
        },
        {
          mode: 'mindmap',
          label: 'Mind Map',
        },
        {
          mode: 'radial',
          label: 'Radial View'
        },
      ];
      
      // Always remove detail and radial options from all views
      return allOptions.filter(option => option.mode !== 'detail' && option.mode !== 'radial');
    },
    [seedConcept, hasDetailCandidate, conceptId, viewMode]
  );

  // User progress tracking (handled in container) - call hook at component level
  const viewedConcept = isDetailRoute && detailConcept 
    ? ((isPrerequisiteRoute && prereqConcept) ? prereqConcept : detailConcept)
    : undefined;
  
  const {
    userProgress,
    saveActivationResponse,
    saveReflectionNote,
    markBloomQuestionAnswered,
  } = useUserProgress({
    dispatch,
    concept: viewedConcept,
    graphId,
  });

  // Wrap callbacks to match expected signature (void return)
  const handleSaveActivation = async (response: string) => {
    await saveActivationResponse(response);
  };

  const handleSaveReflection = async (index: number, note: string) => {
    await saveReflectionNote(index, note);
  };

  const handleAnswerBloom = async (questionIndex: number, level: import('../features/concepts/types').BloomLevel) => {
    await markBloomQuestionAnswered(questionIndex, level);
  };

  // Notes management (handled in container)
  const { notes, addNote, updateNote, deleteNote } = useNotes({ concept: viewedConcept });

  const renderContent = () => {
    if (isMindMapView) {
      return <MindMap {...mindMapProps} />;
    }

    if (viewMode === 'radial') {
      return (
        <RadialView
          concepts={relatedConcepts}
          selectedConcept={selectedConcept || seedConcept}
          onSelectConcept={(concept) => {
            // Single click: only select non-prerequisite concepts
            if (!concept.isPrerequisite) {
              dispatch(selectConcept(concept));
            }
          }}
          onNavigateToConcept={handleSelectConcept}
        />
      );
    }

    if (isDetailRoute && detailConcept && viewedConcept) {
      // Note: This old ConceptPageContainer is deprecated.
      // Use ConceptDetailPageContainer from features/concepts/containers instead.
      // This code is kept for backward compatibility but should be removed.
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              This page has been migrated
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please use the new ConceptDetailPageContainer instead.
            </p>
          </div>
        </div>
      );
    }

    // Note: This old ConceptPageContainer is deprecated.
    // Use ConceptListPageContainer from features/concepts/containers instead.
    // This code is kept for backward compatibility but should be removed.
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            This page has been migrated
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please use the new ConceptListPageContainer instead.
          </p>
        </div>
      </div>
    );
  };

  if (!graphId || !currentGraph || !seedConcept) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Concept Graph Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // For mindmap and radial views, keep custom layout
  // For list and detail views, library pages handle their own layout via KnowledgeGraphTemplate
  if (isMindMapView || viewMode === 'radial') {
    // Use prerequisite name if on prerequisite route, otherwise use detail concept or seed concept
    const headerTitle = isPrerequisiteRoute && prereqConcept
      ? prereqConcept.name
      : (decodedConceptId && detailConcept ? detailConcept.name : seedConcept.name);

    return (
      <div
        className={`concept-page-container min-h-screen bg-gray-50 dark:bg-gray-900 ${isDetailRoute ? 'concept-page-container--detail' : ''
          }`}
      >
        {isLoading && !isGeneratingLesson && (
          <ConceptLoader
            size="lg"
            text="Gathering fresh insights for your learning path…"
            progress={loaderProgress}
            lessons={lessonPreviews}
            streamContent={streamContent}
          />
        )}
        <ConceptViewHeader
          title={headerTitle}
          model={currentGraph.model}
          currentMode={viewMode}
          options={availableOptions}
          onModeChange={handleViewModeChange}
          onBack={handleBack}
          rightContent={
            <div className="flex items-center gap-3">
              {graphId && (
                <Link
                  to={`/mentor/${graphId}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 rounded-md transition-colors duration-200"
                  title="Open in Mentor Mode"
                >
                  <GraduationCap size={16} />
                  Mentor Mode
                </Link>
              )}
            </div>
          }
        />

        <main className="max-w-full mx-auto px-0 sm:px-6 lg:px-8 py-8 mt-8">
          {renderContent()}
        </main>
      </div>
    );
  }

  // For list and detail views, library pages handle layout
  // Show loader overlay if loading
  return (
    <>
      {isLoading && !isGeneratingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <ConceptLoader
            size="lg"
            text="Gathering fresh insights for your learning path…"
            progress={loaderProgress}
            lessons={lessonPreviews}
            streamContent={streamContent}
          />
        </div>
      )}
      {renderContent()}
    </>
  );
};

export default ConceptPageContainer;
