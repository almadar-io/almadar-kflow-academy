/**
 * Container component for LearnPage
 * Handles data fetching, state management, and passes data to library LearnPage
 * 
 * Migrated to use knowledge-graph hooks (same as MentorPageContainer)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useAuthContext } from '../../auth/AuthContext';
import { LearnPage } from '../../../components/pages/LearnPage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useLearningPaths } from '../../knowledge-graph/hooks/useLearningPaths';
import { useProgressiveExpand } from '../../knowledge-graph/hooks/useProgressiveExpand';
import { useGetGraph } from '../../knowledge-graph/hooks/useKnowledgeGraphRest';
import { setCurrentGraphId, selectGraphById } from '../../knowledge-graph/knowledgeGraphSlice';
import { Modal } from '../../../components';
import { MentorGoalForm } from '../../mentor/components/MentorGoalForm';
import MentorFirstLayerLoader from '../../mentor/components/MentorFirstLayerLoader';
import type { NodeBasedKnowledgeGraph } from '../../knowledge-graph/types';
import { useAlert } from '../../../contexts/AlertContext';
import { auth } from '../../../config/firebase';
import { apiClient } from '../../../services/apiClient';
import type { SeedConceptDisplay, GraphDisplay } from '../../../components/pages/LearnPage';

const LearnPageContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthContext();
  const dispatch = useAppDispatch();
  
  // Data fetching hooks - ONLY from knowledge-graph
  const { learningPaths, loading: isLoadingPaths, error: pathsError, refetch: refetchLearningPaths } = useLearningPaths();
  const { getGraph, loading: isLoadingGraph } = useGetGraph();
  
  // UI state
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showFirstLayerLoader, setShowFirstLayerLoader] = useState(false);
  const [currentGraphId, setCurrentGraphIdState] = useState<string | null>(null);
  const [streamContent, setStreamContent] = useState('');
  
  // Get current graph from Redux if we have a graphId
  const currentGraph = useAppSelector((state) => 
    currentGraphId ? selectGraphById(state, currentGraphId) : null
  );
  
  // Progressive expand hook for first layer generation
  const { expand, isLoading: isExpanding } = useProgressiveExpand(currentGraphId || '');

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
      .filter(path => path.seedConcept !== null) // Filter out paths without seed concepts
      .map(path => {
        // Create minimal graph object
        const graph: GraphDisplay = {
          id: path.id,
          name: path.title,
          seedConceptId: path.seedConcept!.id,
        };
        
        // Create minimal seed concept object
        const seedConcept: SeedConceptDisplay = {
          id: path.seedConcept!.id,
          name: path.seedConcept!.name,
          description: path.seedConcept!.description,
        };
        
        // Estimate level count from concept count (rough approximation)
        // Level 0 = seed concept, then roughly 5-10 concepts per level
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
  const handleGoalFormComplete = useCallback(async (result: { goalId: string; graphId: string }) => {
    try {
      // Set current graph ID
      dispatch(setCurrentGraphId(result.graphId));
      setCurrentGraphIdState(result.graphId);
      
      // Get the graph to check if it has concepts
      const graph = await getGraph(result.graphId, { storeInRedux: true });
      
      if (graph) {
        // Check if graph has concepts (if not, we need to generate first layer)
        const hasConcepts = graph.nodeTypes?.Concept && graph.nodeTypes.Concept.length > 0;
        
        if (!hasConcepts) {
          // Start first layer generation
          setShowFirstLayerLoader(true);
          setStreamContent('');
          
          // Trigger progressive expand to generate first layer
          try {
            await expand(
              { numConcepts: 5 },
              {
                stream: true,
                onChunk: (chunk: string) => {
                  setStreamContent((prev) => prev + chunk);
                },
                onDone: () => {
                  // Progressive expand complete - user can continue
                },
              }
            );
            
            // Refetch learning paths to update the list
            await refetchLearningPaths();
          } catch (error) {
            console.error('Failed to generate first layer:', error);
            // Still navigate even if expansion fails
            navigate(`/concepts/${result.graphId}`);
            setShowFirstLayerLoader(false);
          }
        } else {
          // Graph already has concepts, navigate directly
          navigate(`/concepts/${result.graphId}`);
        }
      } else {
        // Graph not found, navigate anyway
        navigate(`/concepts/${result.graphId}`);
      }
      
      setShowGoalForm(false);
    } catch (error) {
      console.error('Failed to load new graph:', error);
      setShowGoalForm(false);
    }
  }, [dispatch, getGraph, expand, refetchLearningPaths, navigate]);

  // Handle create new path
  const handleCreateNewPath = useCallback(() => {
    setShowGoalForm(true);
  }, []);

  // Handle learning path click
  const handleLearningPathClick = useCallback((graphId: string, seedConcept: SeedConceptDisplay) => {
    dispatch(setCurrentGraphId(graphId));
    navigate(`/concepts/${graphId}`);
  }, [dispatch, navigate]);

  // Handle delete learning path using knowledge-graph API
  const { showError, showSuccess } = useAlert();
  const [isDeleting, setIsDeleting] = useState(false);
  const handleDeleteLearningPath = useCallback(async (graphId: string) => {
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User is not authenticated');
      }
      const token = await user.getIdToken();
      await apiClient.fetch(`/api/graphs/${graphId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      showSuccess('Learning path deleted successfully');
      // Refresh learning paths after deletion to update UI
      await refetchLearningPaths();
    } catch (error) {
      console.error('Failed to delete learning path:', error);
      showError('Failed to delete learning path. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [refetchLearningPaths, showError, showSuccess]);

  // Handle navigate to mentor mode
  const handleNavigateToMentor = useCallback((graphId: string) => {
    navigate(`/mentor/${graphId}`);
  }, [navigate]);

  // Handle first layer loader close
  const handleFirstLayerLoaderClose = useCallback(() => {
    if (currentGraphId) {
      navigate(`/concepts/${currentGraphId}`);
      setShowFirstLayerLoader(false);
      setCurrentGraphIdState(null);
      setStreamContent('');
    }
  }, [currentGraphId, navigate]);

  // Handle first layer loader complete
  const handleFirstLayerLoaderComplete = useCallback(() => {
    if (currentGraphId) {
      navigate(`/concepts/${currentGraphId}`);
      setShowFirstLayerLoader(false);
      setCurrentGraphIdState(null);
      setStreamContent('');
    }
  }, [currentGraphId, navigate]);

  // Render dialogs
  const goalFormDialog = showGoalForm ? (
    <Modal
      isOpen={showGoalForm}
      onClose={() => setShowGoalForm(false)}
      title="Create Your Learning Goal"
      size="extra-large"
    >
      <MentorGoalForm
        onComplete={handleGoalFormComplete}
        onCancel={() => setShowGoalForm(false)}
      />
    </Modal>
  ) : null;

  const firstLayerLoaderDialog = showFirstLayerLoader && currentGraph && currentGraphId ? (
    <MentorFirstLayerLoader
      graphId={currentGraphId}
      graph={currentGraph}
      streamContent={streamContent}
      isLoading={isExpanding}
      onClose={handleFirstLayerLoaderClose}
      onComplete={handleFirstLayerLoaderComplete}
    />
  ) : null;

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
      goalFormDialog={goalFormDialog}
      firstLayerLoader={firstLayerLoaderDialog}
    />
  );
};

LearnPageContainer.displayName = 'LearnPageContainer';

export default LearnPageContainer;
export { LearnPageContainer };
