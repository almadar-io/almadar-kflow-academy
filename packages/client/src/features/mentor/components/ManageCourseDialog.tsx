/**
 * ManageCourseDialog - Container/Presentational Hybrid
 * 
 * Dialog for managing an existing published course. This component
 * fetches its own data using graph-based hooks since it operates
 * independently of the main publishing flow.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../../../components/molecules/Modal';
import { Button } from '../../../components/atoms/Button';
import { Spinner } from '../../../components/atoms/Spinner';
import { Badge } from '../../../components/atoms/Badge';
import { Alert } from '../../../components/molecules/Alert';
import { Card } from '../../../components/molecules/Card';
import { Typography } from '../../../components/atoms/Typography';
import { BookOpen, Settings, Trash2, ExternalLink, Layers, Copy, Check, Eye } from 'lucide-react';
import {
  useCourseSettings,
  useUpdateCourseSettingsInGraph,
  useUnpublishCourseFromGraph,
  usePublishedModules,
  useModuleLessons,
  usePublishModule,
  useUnpublishModule,
  usePublishLesson,
  useUnpublishLesson,
  type CoursePublishSettings,
  type ModuleForPublishing,
} from '../../knowledge-graph/hooks';
import CourseSettingsDialog from './CourseSettingsDialog';
import SelectModulesDialog from './SelectModulesDialog';
import SelectLessonsDialog from './SelectLessonsDialog';
import type { LessonWithPublishState, ModuleInfo } from './SelectLessonsDialog';

interface ManageCourseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string; // This is actually graphId for graph-based publishing
  onUnpublished?: () => void;
  onManageModules?: () => void;
}

const ManageCourseDialog: React.FC<ManageCourseDialogProps> = ({
  isOpen,
  onClose,
  courseId: graphId, // Rename for clarity
  onUnpublished,
}) => {
  // Dialog states
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showModulesDialog, setShowModulesDialog] = useState(false);
  const [showLessonsDialog, setShowLessonsDialog] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Track published states for UI
  const [localPublishedModuleIds, setLocalPublishedModuleIds] = useState<Set<string>>(new Set());
  const [localPublishedLessonIds, setLocalPublishedLessonIds] = useState<Set<string>>(new Set());
  
  // Data fetching hooks
  const { data: courseSettings, isLoading: isLoadingSettings } = useCourseSettings(
    isOpen ? graphId : undefined
  );
  
  const { data: modules = [], isLoading: isLoadingModules } = usePublishedModules(
    isOpen ? graphId : undefined
  );
  
  const { data: selectedModuleLessons = [], isLoading: isLoadingLessons, refetch: refetchLessons } = useModuleLessons(
    showLessonsDialog ? graphId : undefined,
    showLessonsDialog ? selectedModuleId ?? undefined : undefined
  );

  // Sync localPublishedModuleIds from query data
  useEffect(() => {
    if (modules.length > 0 && isOpen) {
      const publishedIds = new Set(modules.filter(m => m.isPublished).map(m => m.id));
      setLocalPublishedModuleIds(publishedIds);
    }
  }, [modules, isOpen]);
  
  // Mutation hooks
  const updateSettingsMutation = useUpdateCourseSettingsInGraph();
  const unpublishCourseMutation = useUnpublishCourseFromGraph();
  const publishModuleMutation = usePublishModule();
  const unpublishModuleMutation = useUnpublishModule();
  const publishLessonMutation = usePublishLesson();
  const unpublishLessonMutation = useUnpublishLesson();

  // Get module info for lessons dialog
  const selectedModuleInfo: ModuleInfo | null = selectedModuleId ? 
    (() => {
      const module = modules.find(m => m.id === selectedModuleId);
      if (!module) return null;
      return {
        id: module.id,
        name: module.name,
        description: module.description,
        layerNumber: module.layerNumber,
      };
    })() : null;

  // Sync localPublishedLessonIds from query data
  useEffect(() => {
    if (selectedModuleLessons.length > 0 && showLessonsDialog) {
      const publishedIds = new Set(selectedModuleLessons.filter(l => l.isPublished).map(l => l.id));
      setLocalPublishedLessonIds(publishedIds);
    }
  }, [selectedModuleLessons, showLessonsDialog]);

  // Convert lessons to format with publish state
  const lessonsWithPublishState: LessonWithPublishState[] = selectedModuleLessons.map(lesson => ({
    ...lesson,
    isPublished: lesson.isPublished || localPublishedLessonIds.has(lesson.id),
  }));

  // Handlers
  const handleUnpublish = async () => {
    if (!window.confirm('Are you sure you want to unpublish this course? This will remove all publishing data.')) {
      return;
    }

    try {
      await unpublishCourseMutation.mutateAsync(graphId);
      onUnpublished?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to unpublish course:', error);
      alert(error.message || 'Failed to unpublish course');
    }
  };

  const handleSettingsUpdated = useCallback(async (settings: Partial<CoursePublishSettings>) => {
    try {
      await updateSettingsMutation.mutateAsync({
        graphId,
        updates: settings,
      });
      setShowSettingsDialog(false);
    } catch (error: any) {
      console.error('Failed to update settings:', error);
      alert(error.message || 'Failed to update settings');
    }
  }, [graphId, updateSettingsMutation]);

  const handlePublishModules = useCallback(async (selectedIds: string[], deselectedIds: string[]) => {
    try {
      // Publish selected modules
      for (const layerId of selectedIds) {
        if (!localPublishedModuleIds.has(layerId)) {
          await publishModuleMutation.mutateAsync({
            graphId,
            layerId,
          });
        }
      }
      
      // Unpublish deselected modules
      for (const layerId of deselectedIds) {
        await unpublishModuleMutation.mutateAsync({
          graphId,
          layerId,
        });
      }
      
      setLocalPublishedModuleIds(new Set(selectedIds));
      setShowModulesDialog(false);
    } catch (error: any) {
      console.error('Failed to update modules:', error);
      alert(error.message || 'Failed to update modules');
    }
  }, [graphId, publishModuleMutation, unpublishModuleMutation, localPublishedModuleIds]);

  const handlePublishLessons = useCallback(async (selectedIds: string[], deselectedIds: string[]) => {
    try {
      // Publish selected lessons
      for (const conceptId of selectedIds) {
        if (!localPublishedLessonIds.has(conceptId)) {
          await publishLessonMutation.mutateAsync({
            graphId,
            conceptId,
            layerId: selectedModuleId || undefined,
          });
        }
      }
      
      // Unpublish deselected lessons
      for (const conceptId of deselectedIds) {
        await unpublishLessonMutation.mutateAsync({
          graphId,
          conceptId,
          layerId: selectedModuleId || undefined,
        });
      }
      
      // Refetch lessons to get updated published state
      await refetchLessons();
      
      setLocalPublishedLessonIds(prev => {
        const newSet = new Set(prev);
        selectedIds.forEach(id => newSet.add(id));
        deselectedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      setShowLessonsDialog(false);
      setSelectedModuleId(null);
    } catch (error: any) {
      console.error('Failed to update lessons:', error);
      alert(error.message || 'Failed to update lessons');
    }
  }, [graphId, selectedModuleId, publishLessonMutation, unpublishLessonMutation, localPublishedLessonIds, refetchLessons]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/courses/${graphId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  if (!isOpen) return null;

  const isLoading = isLoadingSettings;

  const footer = (
    <div className="flex justify-end">
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    </div>
  );

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Manage Course" 
        size="lg"
        footer={isLoading ? undefined : footer}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : courseSettings ? (
          <div className="space-y-6">
            {/* Course Info Header */}
            <Alert variant="info" title={courseSettings.title || 'Untitled Course'}>
              {courseSettings.description || 'No description provided.'}
            </Alert>

            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={courseSettings.visibility === 'public' ? 'success' : 'default'}>
                {courseSettings.visibility === 'public' ? 'Public' : 
                 courseSettings.visibility === 'unlisted' ? 'Unlisted' : 'Private'}
              </Badge>
              {courseSettings.visibility !== 'public' && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={copiedLink ? Check : Copy}
                  onClick={handleCopyLink}
                >
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </Button>
              )}
              {courseSettings.isPublished && (
                <Badge variant="info">Published</Badge>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <Typography variant="small" color="secondary">Modules</Typography>
                <Typography variant="h3">{modules.length}</Typography>
              </Card>
              <Card className="p-4">
                <Typography variant="small" color="secondary">Published At</Typography>
                <Typography variant="body" className="font-medium">
                  {courseSettings.publishedAt ? new Date(courseSettings.publishedAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Card 
                className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  // Open course preview in new tab
                  window.open(`/course/${graphId}`, '_blank');
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <Typography variant="body" className="font-medium">Preview Course</Typography>
                  </div>
                  <ExternalLink size={16} className="text-gray-400" />
                </div>
              </Card>

              <Card 
                className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setShowSettingsDialog(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <Typography variant="body" className="font-medium">Course Settings</Typography>
                  </div>
                  <ExternalLink size={16} className="text-gray-400" />
                </div>
              </Card>

              <Card 
                className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setShowModulesDialog(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <Typography variant="body" className="font-medium">Manage Modules</Typography>
                  </div>
                  <ExternalLink size={16} className="text-gray-400" />
                </div>
              </Card>
            </div>

            {/* Modules List for Lesson Management */}
            {modules.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Typography variant="h6">Manage Lessons by Module</Typography>
                {isLoadingModules ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner size="md" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {modules.map((module) => (
                      <Card
                        key={module.id}
                        className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => {
                          setSelectedModuleId(module.id);
                          setLocalPublishedLessonIds(new Set());
                          setShowLessonsDialog(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" />
                            <div>
                              <Typography variant="body" className="font-medium">
                                {module.name}
                              </Typography>
                              <Typography variant="small" color="secondary">
                                {module.conceptCount} lesson{module.conceptCount !== 1 ? 's' : ''}
                              </Typography>
                            </div>
                          </div>
                          <ExternalLink size={16} className="text-gray-400" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Unpublish Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="danger"
                fullWidth
                icon={Trash2}
                loading={unpublishCourseMutation.isPending}
                onClick={handleUnpublish}
              >
                Unpublish Course
              </Button>
            </div>
          </div>
        ) : (
          <Typography variant="body" color="secondary" className="text-center py-8">
            Course not found
          </Typography>
        )}
      </Modal>

      {/* Settings Dialog */}
      {courseSettings && (
        <CourseSettingsDialog
          isOpen={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
          courseId={graphId}
          initialSettings={{
            title: courseSettings.title,
            description: courseSettings.description,
            visibility: courseSettings.visibility,
            enrollmentEnabled: courseSettings.enrollmentEnabled,
            maxStudents: courseSettings.maxStudents,
          }}
          onUpdated={handleSettingsUpdated}
          isSaving={updateSettingsMutation.isPending}
        />
      )}

      {/* Modules Dialog */}
      <SelectModulesDialog
        isOpen={showModulesDialog}
        onClose={() => setShowModulesDialog(false)}
        modules={modules}
        publishedModuleIds={localPublishedModuleIds}
        isLoading={isLoadingModules}
        isPublishing={publishModuleMutation.isPending || unpublishModuleMutation.isPending}
        onPublish={handlePublishModules}
      />

      {/* Lessons Dialog */}
      {selectedModuleId && (
        <SelectLessonsDialog
          isOpen={showLessonsDialog}
          onClose={() => {
            setShowLessonsDialog(false);
            setSelectedModuleId(null);
          }}
          module={selectedModuleInfo}
          lessons={lessonsWithPublishState}
          publishedLessonIds={localPublishedLessonIds}
          isLoading={isLoadingLessons}
          isPublishing={publishLessonMutation.isPending || unpublishLessonMutation.isPending}
          onPublish={handlePublishLessons}
        />
      )}
    </>
  );
};

export default ManageCourseDialog;
