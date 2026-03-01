/**
 * PublishCourseDialog - Presentational Component
 * 
 * Dialog for publishing a course from a knowledge graph.
 * All API interactions are lifted to the container - this component
 * only handles UI and user input.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/molecules/Modal';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Textarea } from '../../../components/atoms/Textarea';
import { Checkbox } from '../../../components/atoms/Checkbox';
import { Spinner } from '../../../components/atoms/Spinner';
import { Alert } from '../../../components/molecules/Alert';
import { SelectDropdown } from '../../../components/molecules/SelectDropdown';
import { Settings } from 'lucide-react';
import type { Concept } from '../types';
import type { CoursePublishSettings, CourseSettingsResponse } from '../../knowledge-graph/api/publishingApi';
import CourseSettingsDialog from './CourseSettingsDialog';

export interface PublishCourseDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Callback when dialog is closed
   */
  onClose: () => void;
  
  /**
   * The knowledge graph ID being published
   */
  graphId: string;
  
  /**
   * The seed concept for the course
   */
  seedConcept: Concept | null;
  
  /**
   * Existing course settings (if editing)
   */
  existingSettings?: CourseSettingsResponse | null;
  
  /**
   * Whether settings are loading
   */
  isLoadingSettings?: boolean;
  
  /**
   * Whether publishing is in progress
   */
  isPublishing?: boolean;
  
  /**
   * Callback to publish the course
   */
  onPublish: (settings: CoursePublishSettings) => void;
}

const PublishCourseDialog: React.FC<PublishCourseDialogProps> = ({
  isOpen,
  onClose,
  graphId,
  seedConcept,
  existingSettings,
  isLoadingSettings = false,
  isPublishing = false,
  onPublish,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Advanced settings (managed via CourseSettingsDialog)
  const [enrollmentEnabled, setEnrollmentEnabled] = useState(true);
  const [maxStudents, setMaxStudents] = useState<number | undefined>(undefined);

  // Initialize form with seed concept or existing settings
  useEffect(() => {
    if (isOpen) {
      if (existingSettings) {
        setTitle(existingSettings.title || seedConcept?.name || '');
        setDescription(existingSettings.description || seedConcept?.description || '');
        setIsPublic(existingSettings.visibility === 'public');
        setEnrollmentEnabled(existingSettings.enrollmentEnabled ?? true);
        setMaxStudents(existingSettings.maxStudents);
      } else {
        // New course - use seed concept defaults
        setTitle(seedConcept?.name || '');
        setDescription(seedConcept?.description || '');
        setIsPublic(true);
        setEnrollmentEnabled(true);
        setMaxStudents(undefined);
      }
    }
  }, [isOpen, existingSettings, seedConcept]);

  const handlePublish = () => {
    const settings: CoursePublishSettings = {
      title: title.trim(),
      description: description.trim(),
      visibility: isPublic ? 'public' : 'private',
      enrollmentEnabled,
      maxStudents,
    };
    onPublish(settings);
  };

  const handleSettingsUpdated = (updatedSettings: Partial<CoursePublishSettings>) => {
    if (updatedSettings.title !== undefined) setTitle(updatedSettings.title);
    if (updatedSettings.description !== undefined) setDescription(updatedSettings.description);
    if (updatedSettings.visibility !== undefined) setIsPublic(updatedSettings.visibility === 'public');
    if (updatedSettings.enrollmentEnabled !== undefined) setEnrollmentEnabled(updatedSettings.enrollmentEnabled);
    if (updatedSettings.maxStudents !== undefined) setMaxStudents(updatedSettings.maxStudents);
    setShowSettings(false);
  };

  if (!seedConcept) {
    return null;
  }

  const isEditing = !!existingSettings?.isPublished;

  const footer = (
    <div className="flex justify-between items-center">
      <Button
        variant="ghost"
        icon={Settings}
        onClick={() => setShowSettings(true)}
      >
        Advanced Settings
      </Button>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isPublishing}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handlePublish}
          disabled={isPublishing || !title.trim()}
          loading={isPublishing}
        >
          {isEditing ? 'Update Course' : 'Publish Course'}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={isEditing ? "Update Course" : "Publish Course"} 
        size="lg"
        footer={isLoadingSettings ? undefined : footer}
      >
        {isLoadingSettings ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            <Alert variant="info">
              {isEditing 
                ? "Update your course settings. After saving, you can manage which modules and lessons are published."
                : "Publishing this course will create a structure with all modules (layers in your graph). You can then select which modules and lessons to publish."
              }
            </Alert>

            <Input
              label="Course Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter course title"
            />

            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Enter course description"
            />

            <Checkbox
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              label="Make course public (accessible to anyone)"
            />

            <Checkbox
              checked={enrollmentEnabled}
              onChange={(e) => setEnrollmentEnabled(e.target.checked)}
              label="Enable student enrollment"
            />

            {enrollmentEnabled && (
              <Input
                label="Maximum Students (optional)"
                type="number"
                value={maxStudents?.toString() || ''}
                onChange={(e) => setMaxStudents(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="Leave empty for unlimited"
              />
            )}
          </div>
        )}
      </Modal>
      
      {showSettings && (
        <CourseSettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          courseId={graphId}
          initialSettings={{
            title,
            description,
            isPublic,
            enrollmentEnabled,
            maxStudents,
          }}
          onUpdated={handleSettingsUpdated}
        />
      )}
    </>
  );
};

export default PublishCourseDialog;
