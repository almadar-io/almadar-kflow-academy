/**
 * Container component for LearnPage
 * Handles data fetching, state management, and passes data to library LearnPage
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAppDispatch } from '../../../app/hooks';
import { useAuthContext } from '../../auth/AuthContext';
import { LearnPage } from '../../../components/pages/LearnPage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useLearningPaths } from '../../knowledge-graph/hooks/useLearningPaths';
import { useGetGraph } from '../../knowledge-graph/hooks/useKnowledgeGraphRest';
import { setCurrentGraphId } from '../../knowledge-graph/knowledgeGraphSlice';
import { useAlert } from '../../../contexts/AlertContext';
import { auth } from '../../../config/firebase';
import { apiClient } from '../../../services/apiClient';
import type { SeedConceptDisplay, GraphDisplay } from '../../../components/pages/LearnPage';

const LearnPageContainer: React.FC = () => {
  // eslint-disable-next-line almadar/no-use-navigate
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthContext();
  const dispatch = useAppDispatch();

  // Data fetching hooks
  const { learningPaths, loading: isLoadingPaths, error: pathsError, refetch: refetchLearningPaths } = useLearningPaths();
  const { loading: isLoadingGraph } = useGetGraph();

  // UI state
  const [showGoalForm, setShowGoalForm] = useState(false);

  // Logout handler
  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Navigation configuration
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  // Convert LearningPathSummary to format expected by LearnPage
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

        return {
          graph,
          seedConcept,
          conceptCount: path.conceptCount,
          levelCount: estimatedLevelCount,
        };
      });
  }, [learningPaths]);

  // Handle goal form completion
  // TODO: Goal form needs reimplementation without mentor components
  const handleGoalFormComplete = useCallback(async (result: { goalId: string; graphId: string }) => {
    dispatch(setCurrentGraphId(result.graphId));
    navigate(`/concepts/${result.graphId}`);
    setShowGoalForm(false);
  }, [dispatch, navigate]);

  // Handle create new path
  const handleCreateNewPath = useCallback(() => {
    setShowGoalForm(true);
  }, []);

  // Handle learning path click
  const handleLearningPathClick = useCallback((graphId: string, _seedConcept: SeedConceptDisplay) => {
    dispatch(setCurrentGraphId(graphId));
    navigate(`/concepts/${graphId}`);
  }, [dispatch, navigate]);

  // Handle delete learning path
  const { showError, showSuccess } = useAlert();
  const [isDeleting, setIsDeleting] = useState(false);
  const handleDeleteLearningPath = useCallback(async (graphId: string) => {
    setIsDeleting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }
      const token = await currentUser.getIdToken();
      await apiClient.fetch(`/api/graphs/${graphId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      showSuccess('Learning path deleted successfully');
      await refetchLearningPaths();
    } catch (error) {
      console.error('Failed to delete learning path:', error);
      showError('Failed to delete learning path. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [refetchLearningPaths, showError, showSuccess]);

  // Handle navigate to graph detail
  const handleNavigateToMentor = useCallback((graphId: string) => {
    navigate(`/concepts/${graphId}`);
  }, [navigate]);

  return (
    <LearnPage
      learningPaths={seedEntries}
      loading={isLoadingPaths || isLoadingGraph}
      error={pathsError}
      showGoalForm={showGoalForm}
      onCreateNewPath={handleCreateNewPath}
      onLearningPathClick={handleLearningPathClick}
      onGoalFormComplete={handleGoalFormComplete}
      onDeleteLearningPath={handleDeleteLearningPath}
      onNavigateToMentor={handleNavigateToMentor}
      user={templateUser}
      navigationItems={navigationItems}
      onLogoClick={() => navigate('/home')}
      onLogout={handleLogout}
      goalFormDialog={null}
      firstLayerLoader={null}
    />
  );
};

LearnPageContainer.displayName = 'LearnPageContainer';

export default LearnPageContainer;
export { LearnPageContainer };
