/**
 * StudentForm Molecule Component
 * 
 * Form for creating/editing students.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

export interface StudentFormData {
  name?: string;
  email?: string;
  phone?: string;
}

export interface StudentFormProps {
  /**
   * Initial form values (for edit mode)
   */
  initialValues?: StudentFormData;
  
  /**
   * Callback when form is submitted
   */
  onSubmit?: (data: StudentFormData) => void;
  
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
  errors?: Partial<Record<keyof StudentFormData, string>>;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  errors = {},
  className,
}) => {
  const [formData, setFormData] = useState<StudentFormData>({
    name: initialValues?.name || '',
    email: initialValues?.email || '',
    phone: initialValues?.phone || '',
  });

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues);
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.email) {
      return;
    }
    
    onSubmit?.(formData);
  };

  const handleChange = (field: keyof StudentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isEditMode = !!initialValues;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <Typography variant="h6" className="mb-4">
        {isEditMode ? 'Edit Student' : 'Add Student'}
      </Typography>

      {/* Name */}
      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="Enter student name"
        disabled={isLoading}
        required
        error={errors.name}
      />

      {/* Email */}
      <Input
        type="email"
        label="Email"
        value={formData.email}
        onChange={(e) => handleChange('email', e.target.value)}
        placeholder="Enter email address"
        disabled={isLoading}
        required
        error={errors.email}
      />

      {/* Phone */}
      <Input
        type="tel"
        label="Phone"
        value={formData.phone}
        onChange={(e) => handleChange('phone', e.target.value)}
        placeholder="Enter phone number (optional)"
        disabled={isLoading}
        error={errors.phone}
        helperText="Optional phone number"
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
          disabled={!formData.name || !formData.email}
        >
          {isEditMode ? 'Update Student' : 'Add Student'}
        </Button>
      </div>
    </form>
  );
};

StudentForm.displayName = 'StudentForm';
