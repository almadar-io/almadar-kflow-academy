/**
 * ScheduleSlotForm Molecule Component
 * 
 * Form for creating/editing schedule slots.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../atoms/Button';
import { SelectDropdown, SelectOption } from '../SelectDropdown';
import { DayOfWeekSelector } from '../../atoms/DayOfWeekSelector';
import { ScheduleTimeInput } from '../../atoms/ScheduleTimeInput';
import { Input } from '../../atoms/Input';
import { Checkbox } from '../../atoms/Checkbox';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

export interface ScheduleSlotFormData {
  studentUserId?: string;
  courseSettingsId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  room?: string;
  recurring?: boolean;
}

export interface ScheduleSlotFormProps {
  /**
   * Initial form values (for edit mode)
   */
  initialValues?: ScheduleSlotFormData;
  
  /**
   * List of students to select from
   */
  students: Array<{ userId: string; name: string; email: string }>;
  
  /**
   * List of courses to select from (only shown if courseSettingsId not provided)
   */
  courses?: Array<{ id: string; title: string }>;
  
  /**
   * Course ID (if provided, course dropdown is hidden)
   */
  courseSettingsId?: string;
  
  /**
   * Callback when form is submitted
   */
  onSubmit?: (data: ScheduleSlotFormData) => void;
  
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
  errors?: Partial<Record<keyof ScheduleSlotFormData, string>>;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ScheduleSlotForm: React.FC<ScheduleSlotFormProps> = ({
  initialValues,
  students,
  courses = [],
  courseSettingsId,
  onSubmit,
  onCancel,
  isLoading = false,
  errors = {},
  className,
}) => {
  const [formData, setFormData] = useState<ScheduleSlotFormData>({
    studentUserId: initialValues?.studentUserId || '',
    courseSettingsId: initialValues?.courseSettingsId || courseSettingsId || '',
    dayOfWeek: initialValues?.dayOfWeek || '',
    startTime: initialValues?.startTime || '',
    endTime: initialValues?.endTime || '',
    location: initialValues?.location || '',
    room: initialValues?.room || '',
    recurring: initialValues?.recurring || false,
  });

  useEffect(() => {
    if (initialValues) {
      setFormData({
        ...initialValues,
        courseSettingsId: initialValues.courseSettingsId || courseSettingsId || '',
      });
    }
  }, [initialValues, courseSettingsId]);

  const studentOptions: SelectOption[] = students.map((student) => ({
    value: student.userId,
    label: `${student.name} (${student.email})`,
  }));

  const courseOptions: SelectOption[] = courses.map((course) => ({
    value: course.id,
    label: course.title,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.studentUserId || !formData.courseSettingsId || !formData.dayOfWeek || !formData.startTime || !formData.endTime) {
      return;
    }
    
    onSubmit?.(formData);
  };

  const handleChange = (field: keyof ScheduleSlotFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isEditMode = !!initialValues;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <Typography variant="h6" className="mb-4">
        {isEditMode ? 'Edit Schedule Slot' : 'Add Schedule Slot'}
      </Typography>

      {/* Student Selection */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
          Student <span className="text-red-500">*</span>
        </label>
        <SelectDropdown
          options={studentOptions}
          value={formData.studentUserId}
          onChange={(value) => handleChange('studentUserId', typeof value === 'string' ? value : value[0])}
          placeholder="Select student"
          disabled={isLoading}
          className={errors.studentUserId ? 'border-red-500' : ''}
        />
        {errors.studentUserId && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.studentUserId}</p>
        )}
      </div>

      {/* Course Selection (only if courseSettingsId not provided) */}
      {!courseSettingsId && courses.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
            Course <span className="text-red-500">*</span>
          </label>
          <SelectDropdown
            options={courseOptions}
            value={formData.courseSettingsId}
            onChange={(value) => handleChange('courseSettingsId', typeof value === 'string' ? value : value[0])}
            placeholder="Select course"
            disabled={isLoading}
            className={errors.courseSettingsId ? 'border-red-500' : ''}
          />
          {errors.courseSettingsId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.courseSettingsId}</p>
          )}
        </div>
      )}

      {/* Day of Week */}
      <DayOfWeekSelector
        label="Day of Week"
        value={formData.dayOfWeek as any}
        onChange={(day) => handleChange('dayOfWeek', day)}
        error={errors.dayOfWeek}
        disabled={isLoading}
        required
      />

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <ScheduleTimeInput
          label="Start Time"
          value={formData.startTime}
          onChange={(time) => handleChange('startTime', time)}
          error={errors.startTime}
          disabled={isLoading}
          required
        />
        <ScheduleTimeInput
          label="End Time"
          value={formData.endTime}
          onChange={(time) => handleChange('endTime', time)}
          error={errors.endTime}
          disabled={isLoading}
          required
        />
      </div>

      {/* Location */}
      <Input
        label="Location"
        value={formData.location}
        onChange={(e) => handleChange('location', e.target.value)}
        placeholder="e.g., Main Building"
        disabled={isLoading}
        error={errors.location}
      />

      {/* Room */}
      <Input
        label="Room"
        value={formData.room}
        onChange={(e) => handleChange('room', e.target.value)}
        placeholder="e.g., Room 101"
        disabled={isLoading}
        error={errors.room}
      />

      {/* Recurring */}
      <Checkbox
        checked={formData.recurring}
        onChange={(e) => handleChange('recurring', e.target.checked)}
        label="Recurring weekly"
        disabled={isLoading}
      />

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
          disabled={!formData.studentUserId || !formData.courseSettingsId || !formData.dayOfWeek || !formData.startTime || !formData.endTime}
        >
          {isEditMode ? 'Update Schedule' : 'Add Schedule'}
        </Button>
      </div>
    </form>
  );
};

ScheduleSlotForm.displayName = 'ScheduleSlotForm';
