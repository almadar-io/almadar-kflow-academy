/**
 * Container component for MentorPage
 * Handles data fetching, state management, and passes data to library MentorPage
 * 
 * Uses React Query hooks for data fetching and caching.
 * All API interactions are centralized here following the Container pattern.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../../../app/hooks';
import { useLearningPaths } from '../../knowledge-graph/hooks/useLearningPaths';
import { setCurrentGraphId } from '../../knowledge-graph/knowledgeGraphSlice';
import { 
  publishingKeys,
  useMentorPublishedCourses,
  useUnpublishCourseFromGraph,
  usePublishCourseToGraph,
  usePublishedModules,
  usePublishModule,
  useUnpublishModule,
  useModuleLessons,
  usePublishLesson,
  useUnpublishLesson,
  useCourseSettings,
  type CoursePublishSettings,
  type ModuleForPublishing,
  type LessonForPublishing,
} from '../../knowledge-graph/hooks';
import { MentorPage } from '../../../components/pages/MentorPage';
import type { MentorDashboardStats } from '../../../components/pages/MentorPage';
import type { Concept } from '../../concepts/types';
import type { LearningPathSummary } from '../../knowledge-graph/api/types';
import { useAuthContext } from '../../auth/AuthContext';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { MentorGoalForm } from '../components/MentorGoalForm';
import { Modal } from '../../../components/molecules/Modal';
import { SelectLearningPathsDialog, PublishCourseDialog, ManageCourseDialog, SelectModulesDialog, SelectLessonsDialog } from '../components';
import type { LessonWithPublishState, ModuleInfo } from '../components/SelectLessonsDialog';
import ConfirmationDialog from '../../../components/ConfirmationDialog';
import { useDeleteGraph } from '../../concepts/hooks/useDeleteGraph';

/**
 * Convert LearningPathSummary to format expected by SelectLearningPathsDialog
 */
const convertToPublishingFormat = (path: LearningPathSummary) => ({
  graph: { id: path.id },
  seedConcept: path.seedConcept ? {
    id: path.seedConcept.id,
    name: path.seedConcept.name,
    description: path.seedConcept.description,
    parents: [],
    children: [],
  } as Concept : null,
  conceptCount: path.conceptCount,
  levelCount: 0, // Not available in LearningPathSummary
});

const MentorPageContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuthContext();
  
  // ===========================================================================
  // Data Fetching Hooks - Graph-Based Publishing
  // ===========================================================================
  
  const { learningPaths, loading: isLoadingPaths, error: pathsError, refetch: refetchLearningPaths } = useLearningPaths();
  const { data: courses = [], isLoading: isLoadingCourses } = useMentorPublishedCourses();
  
  // Publishing mutation hooks
  const unpublishCourseMutation = useUnpublishCourseFromGraph();
  const publishCourseMutation = usePublishCourseToGraph();
  const publishModuleMutation = usePublishModule();
  const unpublishModuleMutation = useUnpublishModule();
  const publishLessonMutation = usePublishLesson();
  const unpublishLessonMutation = useUnpublishLesson();
  
  // ===========================================================================
  // Publishing Flow State
  // ===========================================================================
  
  const [showLearningPathsDialog, setShowLearningPathsDialog] = useState(false);
  const [showPublishCourseDialog, setShowPublishCourseDialog] = useState(false);
  const [showModulesDialog, setShowModulesDialog] = useState(false);
  const [showLessonsDialog, setShowLessonsDialog] = useState(false);
  
  // Current graph being published
  const [selectedGraphIds, setSelectedGraphIds] = useState<string[]>([]);
  const [currentPublishingIndex, setCurrentPublishingIndex] = useState(0);
  
  // Current module being processed for lessons
  const [pendingModuleIds, setPendingModuleIds] = useState<string[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  
  // Track published state for UI
  const [publishedModuleIds, setPublishedModuleIds] = useState<Set<string>>(new Set());
  const [publishedLessonIds, setPublishedLessonIds] = useState<Set<string>>(new Set());
  
  // Get current graph ID from flow
  const currentGraphId = useMemo(() => {
    if (selectedGraphIds.length === 0 || currentPublishingIndex >= selectedGraphIds.length) {
      return null;
    }
    return selectedGraphIds[currentPublishingIndex];
  }, [selectedGraphIds, currentPublishingIndex]);
  
  // Fetch course settings for current graph
  const { data: currentCourseSettings, isLoading: isLoadingCourseSettings } = useCourseSettings(
    showPublishCourseDialog ? currentGraphId ?? undefined : undefined
  );
  
  // Fetch modules for current graph (when modules dialog is open)
  const { data: modulesData = [], isLoading: isLoadingModules, refetch: refetchModules } = usePublishedModules(
    showModulesDialog ? currentGraphId ?? undefined : undefined
  );
  
  // Fetch lessons for selected module (when lessons dialog is open)
  const { data: lessonsData = [], isLoading: isLoadingLessons, refetch: refetchLessons } = useModuleLessons(
    showLessonsDialog ? currentGraphId ?? undefined : undefined,
    showLessonsDialog ? selectedModuleId ?? undefined : undefined
  );
  
  // Get current learning path being published
  const currentLearningPath = useMemo(() => {
    if (!currentGraphId) return null;
    const path = learningPaths.find(p => p.id === currentGraphId);
    if (!path?.seedConcept) return null;
    return {
      graphId: path.id,
      seedConcept: {
        id: path.seedConcept.id,
        name: path.seedConcept.name,
        description: path.seedConcept.description,
        parents: [],
        children: [],
      } as Concept,
    };
  }, [currentGraphId, learningPaths]);
  
  // Get current module info for lessons dialog
  const currentModuleInfo: ModuleInfo | null = useMemo(() => {
    if (!selectedModuleId || !modulesData.length) return null;
    const module = modulesData.find(m => m.id === selectedModuleId);
    if (!module) return null;
    return {
      id: module.id,
      name: module.name,
      description: module.description,
      layerNumber: module.layerNumber,
    };
  }, [selectedModuleId, modulesData]);
  
  // Update publishedModuleIds from query data
  useEffect(() => {
    if (modulesData.length > 0 && showModulesDialog) {
      const publishedIds = new Set(modulesData.filter(m => m.isPublished).map(m => m.id));
      setPublishedModuleIds(publishedIds);
    }
  }, [modulesData, showModulesDialog]);

  // Convert lessons to format with publish state
  const lessonsWithPublishState: LessonWithPublishState[] = useMemo(() => {
    return lessonsData.map(lesson => ({
      ...lesson,
      isPublished: lesson.isPublished || publishedLessonIds.has(lesson.id),
    }));
  }, [lessonsData, publishedLessonIds]);

  // Update publishedLessonIds from query data
  useEffect(() => {
    if (lessonsData.length > 0 && showLessonsDialog) {
      const publishedIds = new Set(lessonsData.filter(l => l.isPublished).map(l => l.id));
      setPublishedLessonIds(publishedIds);
    }
  }, [lessonsData, showLessonsDialog]);
  
  // ===========================================================================
  // Dashboard Stats
  // ===========================================================================
  
  const stats: MentorDashboardStats = useMemo(() => {
    const publishedCourses = courses.filter(c => c.isPublished);
    const totalStudents = publishedCourses.reduce((sum, c) => sum + (c.enrollmentCount ?? 0), 0);
    const avgCompletionRate = 0; // Would come from analytics
    
    return {
      totalCourses: publishedCourses.length,
      totalStudents,
      avgCompletionRate,
    };
  }, [courses]);
  
  // ===========================================================================
  // Navigation
  // ===========================================================================
  
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  
  const templateUser = getUserForTemplate(user);
  
  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);
  
  // ===========================================================================
  // UI State
  // ===========================================================================
  
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [courseToUpdate, setCourseToUpdate] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  
  // ===========================================================================
  // Publishing Flow Handlers
  // ===========================================================================
  
  const refreshCourses = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: publishingKeys.courses() });
  }, [queryClient]);
  
  const resetPublishingFlow = useCallback(() => {
    setSelectedGraphIds([]);
    setCurrentPublishingIndex(0);
    setPendingModuleIds([]);
    setSelectedModuleId(null);
    setPublishedModuleIds(new Set());
    setPublishedLessonIds(new Set());
  }, []);
  
  const moveToNextGraph = useCallback(() => {
    if (currentPublishingIndex < selectedGraphIds.length - 1) {
      setCurrentPublishingIndex(prev => prev + 1);
      setPublishedModuleIds(new Set());
      setPublishedLessonIds(new Set());
      setShowPublishCourseDialog(true);
    } else {
      // All done
      resetPublishingFlow();
      refreshCourses();
    }
  }, [currentPublishingIndex, selectedGraphIds.length, resetPublishingFlow, refreshCourses]);
  
  // Handle learning paths selection
  const handleLearningPathsSelected = useCallback((graphIds: string[]) => {
    setSelectedGraphIds(graphIds);
    setCurrentPublishingIndex(0);
    setShowLearningPathsDialog(false);
    if (graphIds.length > 0) {
      setShowPublishCourseDialog(true);
    }
  }, []);
  
  // Handle course publish
  const handlePublishCourse = useCallback(async (settings: CoursePublishSettings) => {
    if (!currentGraphId) return;
    
    try {
      await publishCourseMutation.mutateAsync({
        graphId: currentGraphId,
        settings,
      });
      setShowPublishCourseDialog(false);
      setShowModulesDialog(true);
    } catch (error: any) {
      console.error('Failed to publish course:', error);
      alert(error.message || 'Failed to publish course');
    }
  }, [currentGraphId, publishCourseMutation]);
  
  const handlePublishCourseDialogClose = useCallback(() => {
    setShowPublishCourseDialog(false);
    moveToNextGraph();
  }, [moveToNextGraph]);
  
  // Handle modules publish
  const handlePublishModules = useCallback(async (selectedIds: string[], deselectedIds: string[]) => {
    if (!currentGraphId) return;
    
    try {
      // Publish selected modules
      for (const layerId of selectedIds) {
        if (!publishedModuleIds.has(layerId)) {
          await publishModuleMutation.mutateAsync({
            graphId: currentGraphId,
            layerId,
          });
        }
      }
      
      // Unpublish deselected modules
      for (const layerId of deselectedIds) {
        await unpublishModuleMutation.mutateAsync({
          graphId: currentGraphId,
          layerId,
        });
      }
      
      // Refetch modules to get updated published state
      await refetchModules();
      
      // Update local state based on selection (will be synced with query data)
      setPublishedModuleIds(new Set(selectedIds));
      
      setShowModulesDialog(false);
      
      if (selectedIds.length > 0) {
        // Move to lessons dialog for first module
        setPendingModuleIds(selectedIds);
        setSelectedModuleId(selectedIds[0]);
        setPublishedLessonIds(new Set());
        setShowLessonsDialog(true);
      } else {
        // No modules selected, move to next graph
        moveToNextGraph();
      }
    } catch (error: any) {
      console.error('Failed to publish modules:', error);
      alert(error.message || 'Failed to publish modules');
    }
  }, [currentGraphId, publishModuleMutation, unpublishModuleMutation, publishedModuleIds, moveToNextGraph, refetchModules]);
  
  const handleModulesDialogClose = useCallback(() => {
    setShowModulesDialog(false);
    moveToNextGraph();
  }, [moveToNextGraph]);
  
  // Handle lessons publish
  const handlePublishLessons = useCallback(async (selectedIds: string[], deselectedIds: string[]) => {
    if (!currentGraphId || !selectedModuleId) return;
    
    try {
      // Publish selected lessons
      for (const conceptId of selectedIds) {
        if (!publishedLessonIds.has(conceptId)) {
          await publishLessonMutation.mutateAsync({
            graphId: currentGraphId,
            conceptId,
            layerId: selectedModuleId, // Pass layerId for proper query invalidation
          });
        }
      }
      
      // Unpublish deselected lessons
      for (const conceptId of deselectedIds) {
        await unpublishLessonMutation.mutateAsync({
          graphId: currentGraphId,
          conceptId,
          layerId: selectedModuleId, // Pass layerId for proper query invalidation
        });
      }
      
      // Refetch lessons to get updated published state
      await refetchLessons();
      
      // Update local state based on selection (will be synced with query data)
      setPublishedLessonIds(prev => {
        const newSet = new Set(prev);
        selectedIds.forEach(id => newSet.add(id));
        deselectedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      // Move to next module or next graph
      if (pendingModuleIds.length > 1) {
        const remainingModules = pendingModuleIds.slice(1);
        setPendingModuleIds(remainingModules);
        setSelectedModuleId(remainingModules[0]);
        setPublishedLessonIds(new Set());
      } else {
        setShowLessonsDialog(false);
        setSelectedModuleId(null);
        setPendingModuleIds([]);
        moveToNextGraph();
      }
    } catch (error: any) {
      console.error('Failed to publish lessons:', error);
      alert(error.message || 'Failed to publish lessons');
    }
  }, [currentGraphId, selectedModuleId, publishLessonMutation, unpublishLessonMutation, publishedLessonIds, pendingModuleIds, moveToNextGraph, refetchLessons]);
  
  const handleLessonsDialogClose = useCallback(() => {
    if (pendingModuleIds.length > 1) {
      const remainingModules = pendingModuleIds.slice(1);
      setPendingModuleIds(remainingModules);
      setSelectedModuleId(remainingModules[0]);
      setPublishedLessonIds(new Set());
    } else {
      setShowLessonsDialog(false);
      setSelectedModuleId(null);
      setPendingModuleIds([]);
      moveToNextGraph();
    }
  }, [pendingModuleIds, moveToNextGraph]);
  
  // ===========================================================================
  // Other Handlers
  // ===========================================================================
  
  const handleGoalFormComplete = (result: { goalId: string; graphId: string }) => {
    dispatch(setCurrentGraphId(result.graphId));
    navigate(`/mentor/${result.graphId}`);
    setShowGoalForm(false);
  };

  const handleCreateNewPath = () => {
    setShowGoalForm(true);
  };

  const handleLearningPathClick = (graphId: string) => {
    dispatch(setCurrentGraphId(graphId));
    navigate(`/mentor/${graphId}`);
  };

  const { deleteGraph, isDeleting: isDeletingPath } = useDeleteGraph();
  const handleDeleteLearningPath = async (graphId: string) => {
    try {
      await deleteGraph(graphId);
      await refetchLearningPaths();
    } catch (error) {
      console.error('Failed to delete learning path:', error);
    }
  };

  const handleNavigateToMentor = (graphId: string) => {
    navigate(`/mentor/${graphId}`);
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    
    try {
      await unpublishCourseMutation.mutateAsync(courseToDelete);
      setCourseToDelete(null);
    } catch (error: any) {
      console.error('Failed to unpublish course:', error);
      alert(error.message || 'Failed to unpublish course');
    }
  };
  
  // ===========================================================================
  // Learning Paths for Selection
  // ===========================================================================
  
  const seedEntries = useMemo(() => {
    return learningPaths
      .filter(path => path.seedConcept)
      .map(convertToPublishingFormat)
      .filter(entry => entry.seedConcept !== null) as Array<{
        graph: { id: string };
        seedConcept: Concept;
        conceptCount: number;
        levelCount: number;
      }>;
  }, [learningPaths]);
  
  // ===========================================================================
  // Render Dialogs
  // ===========================================================================

  const goalFormDialog = showGoalForm ? (
    <Modal
      isOpen={showGoalForm}
      onClose={() => setShowGoalForm(false)}
      title="Create Your Learning Goal"
      size="xl"
    >
      <MentorGoalForm
        onComplete={handleGoalFormComplete}
        onCancel={() => setShowGoalForm(false)}
      />
    </Modal>
  ) : null;

  const selectLearningPathsDialog = seedEntries.length > 0 ? (
    <SelectLearningPathsDialog
      isOpen={showLearningPathsDialog}
      onClose={() => setShowLearningPathsDialog(false)}
      learningPaths={seedEntries}
      onSelected={handleLearningPathsSelected}
    />
  ) : null;

  const publishCourseDialog = currentLearningPath ? (
    <PublishCourseDialog
      isOpen={showPublishCourseDialog}
      onClose={handlePublishCourseDialogClose}
      graphId={currentLearningPath.graphId}
      seedConcept={currentLearningPath.seedConcept}
      existingSettings={currentCourseSettings}
      isLoadingSettings={isLoadingCourseSettings}
      isPublishing={publishCourseMutation.isPending}
      onPublish={handlePublishCourse}
    />
  ) : null;

  const manageCourseDialog = courseToUpdate ? (
    <ManageCourseDialog
      isOpen={!!courseToUpdate}
      onClose={() => setCourseToUpdate(null)}
      courseId={courseToUpdate}
      onUnpublished={() => {
        refreshCourses();
        setCourseToUpdate(null);
      }}
      onManageModules={() => {
        // Set up for module management
        setSelectedGraphIds([courseToUpdate]);
        setCurrentPublishingIndex(0);
        setCourseToUpdate(null);
        setShowModulesDialog(true);
      }}
    />
  ) : null;

  const selectModulesDialog = currentGraphId ? (
    <SelectModulesDialog
      isOpen={showModulesDialog}
      onClose={handleModulesDialogClose}
      modules={modulesData}
      publishedModuleIds={publishedModuleIds}
      isLoading={isLoadingModules}
      isPublishing={publishModuleMutation.isPending || unpublishModuleMutation.isPending}
      onPublish={handlePublishModules}
    />
  ) : null;

  const selectLessonsDialog = currentGraphId && selectedModuleId ? (
    <SelectLessonsDialog
      isOpen={showLessonsDialog}
      onClose={handleLessonsDialogClose}
      module={currentModuleInfo}
      lessons={lessonsWithPublishState}
      publishedLessonIds={publishedLessonIds}
      isLoading={isLoadingLessons}
      isPublishing={publishLessonMutation.isPending || unpublishLessonMutation.isPending}
      onPublish={handlePublishLessons}
    />
  ) : null;

  const confirmationDialog = courseToDelete ? (
    <ConfirmationDialog
      isOpen={!!courseToDelete}
      onClose={() => setCourseToDelete(null)}
      onConfirm={handleDeleteCourse}
      title="Delete Course"
      message="Are you sure you want to delete this course? This action cannot be undone."
      confirmText="Delete"
      confirmButtonClassName="bg-red-600 hover:bg-red-700 text-white"
      isLoading={unpublishCourseMutation.isPending}
    />
  ) : null;

  return (
    <MentorPage
      learningPaths={learningPaths}
      loading={isLoadingPaths || isLoadingCourses}
      error={pathsError}
      courses={courses}
      stats={stats}
      onRefreshCourses={refreshCourses}
      onGoalFormComplete={handleGoalFormComplete}
      onCreateNewPath={handleCreateNewPath}
      onLearningPathClick={handleLearningPathClick}
      onDeleteCourse={handleDeleteCourse}
      onDeleteLearningPath={handleDeleteLearningPath}
      onNavigateToMentor={handleNavigateToMentor}
      onPublishLearningPath={(graphId) => handleLearningPathsSelected([graphId])}
      courseToDelete={courseToDelete}
      setCourseToDelete={setCourseToDelete}
      isDeleting={unpublishCourseMutation.isPending}
      courseToUpdate={courseToUpdate}
      setCourseToUpdate={setCourseToUpdate}
      copiedLink={copiedLink}
      setCopiedLink={setCopiedLink}
      showGoalForm={showGoalForm}
      setShowGoalForm={setShowGoalForm}
      showLearningPathsDialog={showLearningPathsDialog}
      showPublishCourseDialog={showPublishCourseDialog}
      showModulesDialog={showModulesDialog}
      showLessonsDialog={showLessonsDialog}
      currentLearningPath={currentLearningPath}
      publishedCourseId={currentGraphId}
      selectedModuleId={selectedModuleId}
      setShowLearningPathsDialog={setShowLearningPathsDialog}
      setShowPublishCourseDialog={setShowPublishCourseDialog}
      setShowModulesDialog={setShowModulesDialog}
      setShowLessonsDialog={setShowLessonsDialog}
      handleLearningPathsSelected={handleLearningPathsSelected}
      handleCoursePublished={() => {
        setShowPublishCourseDialog(false);
        setShowModulesDialog(true);
      }}
      handleModulesPublished={(moduleIds) => {
        setShowModulesDialog(false);
        if (moduleIds.length > 0) {
          setPendingModuleIds(moduleIds);
          setSelectedModuleId(moduleIds[0]);
          setShowLessonsDialog(true);
        } else {
          moveToNextGraph();
        }
      }}
      handleLessonsPublished={handleLessonsDialogClose}
      handlePublishCourseDialogClose={handlePublishCourseDialogClose}
      handleModulesDialogClose={handleModulesDialogClose}
      handleLessonsDialogClose={handleLessonsDialogClose}
      seedEntries={seedEntries}
      user={templateUser}
      navigationItems={navigationItems}
      onLogoClick={() => navigate('/home')}
      onLogout={handleLogout}
      goalFormDialog={goalFormDialog}
      selectLearningPathsDialog={selectLearningPathsDialog}
      publishCourseDialog={publishCourseDialog}
      manageCourseDialog={manageCourseDialog}
      selectModulesDialog={selectModulesDialog}
      selectLessonsDialog={selectLessonsDialog}
      confirmationDialog={confirmationDialog}
    />
  );
};

MentorPageContainer.displayName = 'MentorPageContainer';

export default MentorPageContainer;
export { MentorPageContainer };
