/**
 * Container component for LearnPage
 * Handles data fetching, state management, and passes data to library LearnPage
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import { useAppDispatch } from '../../../app/hooks';
import { useAuthContext } from '../../auth/AuthContext';
import { useEventBus } from '@almadar/ui';
import { LearnPage } from '../../../components/pages/LearnPage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useLearningPaths } from '../../knowledge-graph/hooks/useLearningPaths';
import { useGetGraph } from '../../knowledge-graph/hooks/useKnowledgeGraphRest';
import { setCurrentGraphId } from '../../knowledge-graph/knowledgeGraphSlice';
import type { UiNotifyPayload } from '../../../app/uiEvents';
import { auth } from '../../../config/firebase';
import { apiClient } from '../../../services/apiClient';
import { graphOperationsStreamingApi } from '../../knowledge-graph/api/streaming';
import { GoalForm } from '../components/GoalForm';
import { useNavigateEvent } from '../../../hooks/useNavigateEvent';
import type { SeedConceptDisplay, GraphDisplay } from '../../../components/pages/LearnPage';

const LearnPageContainer: React.FC = () => {
  const navigate = useNavigateEvent();
  const location = useLocation();
  const { user } = useAuthContext();
  const dispatch = useAppDispatch();
  const { on, emit } = useEventBus();

  const { learningPaths, loading: isLoadingPaths, error: pathsError, refetch: refetchLearningPaths } = useLearningPaths();
  const { loading: isLoadingGraph } = useGetGraph();

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandingContent, setExpandingContent] = useState('');
  const [parsedConcepts, setParsedConcepts] = useState<Array<{ name: string; description: string }>>([]);
  const [parsedLevelName, setParsedLevelName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const contentAccRef = useRef('');

  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  const seedEntries = useMemo<Array<{
    graph: GraphDisplay;
    seedConcept: SeedConceptDisplay;
    conceptCount: number;
    levelCount: number;
  }>>(() => {
    return learningPaths
      .filter(path => path.seedConcept !== null)
      .map(path => {
        const graph: GraphDisplay = {
          id: path.id,
          name: path.title,
          seedConceptId: path.seedConcept!.id,
        };
        const seedConcept: SeedConceptDisplay = {
          id: path.seedConcept!.id,
          name: path.seedConcept!.name,
          description: path.seedConcept!.description,
        };
        const estimatedLevelCount = Math.max(1, Math.ceil(path.conceptCount / 7));
        return { graph, seedConcept, conceptCount: path.conceptCount, levelCount: estimatedLevelCount };
      });
  }, [learningPaths]);

  const handleGoalFormComplete = useCallback(async (result: { goalId: string; graphId: string }) => {
    dispatch(setCurrentGraphId(result.graphId));
    setIsExpanding(true);
    setExpandingContent('');
    setParsedConcepts([]);
    setParsedLevelName('');
    contentAccRef.current = '';

    try {
      await graphOperationsStreamingApi.progressiveExpand(
        result.graphId,
        { numConcepts: 10 },
        {
          onChunk: (chunk: string) => {
            contentAccRef.current += chunk;
            setExpandingContent(contentAccRef.current);
            const levelMatch = contentAccRef.current.match(/<level-name>(.*?)<\/level-name>/i);
            if (levelMatch) setParsedLevelName(levelMatch[1].trim());
            const conceptMatches = [...contentAccRef.current.matchAll(/<concept>(.*?)<\/concept>\s*<description>(.*?)<\/description>/gis)];
            setParsedConcepts(conceptMatches.map(m => ({ name: m[1].trim(), description: m[2].trim() })));
          },
          onError: (error: string) => {
            console.error('Expansion stream error:', error);
          },
        }
      );
    } catch (err) {
      console.error('Initial expansion failed (will expand on concept page):', err);
    }

    setIsExpanding(false);
    setExpandingContent('');
    setParsedConcepts([]);
    setParsedLevelName('');
    contentAccRef.current = '';
    setShowGoalForm(false);
    navigate(`/concepts/${result.graphId}`);
    refetchLearningPaths();
  }, [dispatch, navigate, refetchLearningPaths]);

  const handleDeleteLearningPath = useCallback(async (graphId: string) => {
    setIsDeleting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User is not authenticated');
      const token = await currentUser.getIdToken();
      await apiClient.fetch(`/api/graphs/${graphId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      emit('UI:NOTIFY', { severity: 'success', message: 'Learning path deleted successfully' } satisfies UiNotifyPayload);
      await refetchLearningPaths();
    } catch (error) {
      console.error('Failed to delete learning path:', error);
      emit('UI:NOTIFY', { severity: 'error', message: 'Failed to delete learning path. Please try again.' } satisfies UiNotifyPayload);
    } finally {
      setIsDeleting(false);
    }
  }, [refetchLearningPaths, emit]);

  // Bus listeners — all LearnPage interaction events
  useEffect(() => {
    const unsubCreate = on('UI:CREATE_NEW_PATH', () => {
      setShowGoalForm(true);
    });
    const unsubPath = on('UI:LEARNING_PATH_CLICK', (event) => {
      const payload = event.payload as { graphId?: string } | undefined;
      if (payload?.graphId) {
        dispatch(setCurrentGraphId(payload.graphId));
        navigate(`/concepts/${payload.graphId}`);
      }
    });
    const unsubGoal = on('UI:GOAL_FORM_COMPLETE', (event) => {
      const payload = event.payload as { goalId?: string; graphId?: string } | undefined;
      if (payload?.goalId && payload?.graphId) {
        handleGoalFormComplete({ goalId: payload.goalId, graphId: payload.graphId });
      }
    });
    const unsubDelete = on('UI:DELETE_LEARNING_PATH', (event) => {
      const payload = event.payload as { graphId?: string } | undefined;
      if (payload?.graphId) handleDeleteLearningPath(payload.graphId);
    });
    const unsubMentor = on('UI:NAVIGATE_TO_MENTOR', (event) => {
      const payload = event.payload as { graphId?: string } | undefined;
      if (payload?.graphId) navigate(`/concepts/${payload.graphId}`);
    });
    return () => {
      unsubCreate();
      unsubPath();
      unsubGoal();
      unsubDelete();
      unsubMentor();
    };
  }, [on, dispatch, navigate, handleGoalFormComplete, handleDeleteLearningPath]);

  return (
    <LearnPage
      learningPaths={seedEntries}
      loading={isLoadingPaths || isLoadingGraph}
      error={pathsError}
      showGoalForm={showGoalForm}
      onCreateNewPath={() => emit('UI:CREATE_NEW_PATH', {})}
      onLearningPathClick={(graphId, seedConcept) => emit('UI:LEARNING_PATH_CLICK', { graphId, seedConceptId: seedConcept.id })}
      onGoalFormComplete={(result) => emit('UI:GOAL_FORM_COMPLETE', result)}
      onDeleteLearningPath={(graphId) => { emit('UI:DELETE_LEARNING_PATH', { graphId }); return Promise.resolve(); }}
      onNavigateToMentor={(graphId) => emit('UI:NAVIGATE_TO_MENTOR', { graphId })}
      user={templateUser}
      navigationItems={navigationItems}
      goalFormDialog={(showGoalForm || isExpanding) ? (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            {isExpanding ? (
              <div className="flex flex-col items-center py-8">
                <div className="relative mb-6">
                  <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 rounded-full animate-spin border-t-indigo-600 dark:border-t-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Building Your Learning Path
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
                  {parsedConcepts.length > 0
                    ? `Generated ${parsedConcepts.length} concept${parsedConcepts.length === 1 ? '' : 's'}...`
                    : 'Creating concepts and organizing them into layers...'}
                </p>
                {(parsedLevelName || parsedConcepts.length > 0) && (
                  <div className="w-full mt-2 space-y-3 max-h-72 overflow-y-auto">
                    {parsedLevelName && (
                      <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                          Layer: {parsedLevelName}
                        </p>
                      </div>
                    )}
                    {parsedConcepts.map((concept, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 animate-[fadeIn_0.3s_ease-in]"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{concept.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{concept.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <GoalForm
                onComplete={(result) => handleGoalFormComplete(result)}
                onCancel={() => setShowGoalForm(false)}
              />
            )}
          </div>
        </div>
      ) : null}
      firstLayerLoader={null}
    />
  );
};

LearnPageContainer.displayName = 'LearnPageContainer';

export default LearnPageContainer;
export { LearnPageContainer };
