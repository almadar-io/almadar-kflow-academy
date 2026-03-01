/**
 * CourseSettingsDialog - Presentational Component
 * 
 * Dialog for editing course settings. Receives initial settings and
 * calls onUpdated callback with new settings.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/molecules/Modal';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Textarea } from '../../../components/atoms/Textarea';
import { Checkbox } from '../../../components/atoms/Checkbox';
import { Alert } from '../../../components/molecules/Alert';
import type { CoursePublishSettings } from '../../knowledge-graph/api/publishingApi';

export interface CourseSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
  initialSettings?: Partial<CoursePublishSettings> & {
    isPublic?: boolean; // Legacy support
  };
  onUpdated?: (settings: Partial<CoursePublishSettings>) => void;
  isSaving?: boolean;
}

const CourseSettingsDialog: React.FC<CourseSettingsDialogProps> = ({
  isOpen,
  onClose,
  initialSettings,
  onUpdated,
  isSaving = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [enrollmentEnabled, setEnrollmentEnabled] = useState(true);
  const [maxStudents, setMaxStudents] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (isOpen && initialSettings) {
      setTitle(initialSettings.title || '');
      setDescription(initialSettings.description || '');
      // Handle both new visibility and legacy isPublic
      if (initialSettings.visibility) {
        setVisibility(initialSettings.visibility);
      } else if (initialSettings.isPublic !== undefined) {
        setVisibility(initialSettings.isPublic ? 'public' : 'private');
      } else {
        setVisibility('public');
      }
      setEnrollmentEnabled(initialSettings.enrollmentEnabled ?? true);
      setMaxStudents(initialSettings.maxStudents);
    }
  }, [isOpen, initialSettings]);

  const handleSave = () => {
    const settings: Partial<CoursePublishSettings> = {
      title: title.trim(),
      description: description.trim(),
      visibility,
      enrollmentEnabled,
      maxStudents,
    };
    onUpdated?.(settings);
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={isSaving || !title.trim()}
        loading={isSaving}
      >
        Save Settings
      </Button>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Course Settings" 
      size="lg"
      footer={footer}
    >
      <div className="space-y-6">
        <Alert variant="info">
          Update your course settings. Changes will apply to all modules and lessons.
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

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Visibility
          </label>
          <div className="space-y-2">
            <Checkbox
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
              label="Public - Anyone can discover and enroll"
            />
            <Checkbox
              checked={visibility === 'unlisted'}
              onChange={() => setVisibility('unlisted')}
              label="Unlisted - Only accessible with direct link"
            />
            <Checkbox
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
              label="Private - Only you can see this course"
            />
          </div>
        </div>

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
    </Modal>
  );
};

export default CourseSettingsDialog;
