/**
 * CourseSettingsForm Organism Component
 * 
 * Form for course settings configuration.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';
import { Checkbox } from '../../atoms/Checkbox';
import { Radio } from '../../atoms/Radio';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

export type CourseVisibility = 'public' | 'private' | 'unlisted';

export interface CourseSettingsFormData {
  title?: string;
  description?: string;
  visibility?: CourseVisibility;
  enrollmentEnabled?: boolean;
  maxStudents?: number;
}

export interface CourseSettingsFormProps {
  /**
   * Initial form values (for edit mode)
   */
  initialSettings?: CourseSettingsFormData;
  
  /**
   * Callback when form is submitted
   */
  onSubmit?: (data: CourseSettingsFormData) => void;
  
  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;
  
  /**
   * Show loading state
   * @default false
   */
  isLoading?: boolean;
  
  /**
   * Form errors
   */
  errors?: Partial<Record<keyof CourseSettingsFormData, string>>;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const CourseSettingsForm: React.FC<CourseSettingsFormProps> = ({
  initialSettings,
  onSubmit,
  onCancel,
  isLoading = false,
  errors = {},
  className,
}) => {
  const [formData, setFormData] = useState<CourseSettingsFormData>({
    title: initialSettings?.title || '',
    description: initialSettings?.description || '',
    visibility: initialSettings?.visibility || 'private',
    enrollmentEnabled: initialSettings?.enrollmentEnabled ?? true,
    maxStudents: initialSettings?.maxStudents,
  });

  useEffect(() => {
    if (initialSettings) {
      setFormData(initialSettings);
    }
  }, [initialSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title) {
      return;
    }
    
    onSubmit?.(formData);
  };

  const handleChange = (field: keyof CourseSettingsFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isEditMode = !!initialSettings;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      <Typography variant="h6" className="mb-4">
        {isEditMode ? 'Course Settings' : 'Create Course'}
      </Typography>

      {/* Title */}
      <Input
        label="Course Title"
        value={formData.title}
        onChange={(e) => handleChange('title', e.target.value)}
        placeholder="Enter course title"
        disabled={isLoading}
        required
        error={errors.title}
      />

      {/* Description */}
      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder="Enter course description"
        rows={4}
        disabled={isLoading}
        error={errors.description}
      />

      {/* Visibility */}
      <div>
        <Typography variant="body" className="mb-2 font-medium">
          Visibility <span className="text-red-500">*</span>
        </Typography>
        <div className="space-y-2">
          <Radio
            id="visibility-public"
            name="visibility"
            value="public"
            checked={formData.visibility === 'public'}
            onChange={(e) => handleChange('visibility', e.target.value)}
            label="Public - Anyone can discover and enroll"
            disabled={isLoading}
          />
          <Radio
            id="visibility-unlisted"
            name="visibility"
            value="unlisted"
            checked={formData.visibility === 'unlisted'}
            onChange={(e) => handleChange('visibility', e.target.value)}
            label="Unlisted - Only accessible with direct link"
            disabled={isLoading}
          />
          <Radio
            id="visibility-private"
            name="visibility"
            value="private"
            checked={formData.visibility === 'private'}
            onChange={(e) => handleChange('visibility', e.target.value)}
            label="Private - Only you can see this course"
            disabled={isLoading}
          />
        </div>
        {errors.visibility && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.visibility}</p>
        )}
      </div>

      {/* Enrollment */}
      <Checkbox
        checked={formData.enrollmentEnabled}
        onChange={(e) => handleChange('enrollmentEnabled', e.target.checked)}
        label="Enable student enrollment"
        disabled={isLoading}
      />

      {/* Max Students */}
      {formData.enrollmentEnabled && (
        <Input
          type="number"
          label="Maximum Students"
          value={formData.maxStudents?.toString() || ''}
          onChange={(e) => handleChange('maxStudents', e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="Leave empty for unlimited"
          min={1}
          disabled={isLoading}
          error={errors.maxStudents}
          helperText="Optional: Set a limit on the number of students who can enroll"
        />
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          disabled={!formData.title}
        >
          {isEditMode ? 'Update Settings' : 'Create Course'}
        </Button>
      </div>
    </form>
  );
};

CourseSettingsForm.displayName = 'CourseSettingsForm';
