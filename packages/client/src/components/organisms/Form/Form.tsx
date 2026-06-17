/**
 * Form Organism Component
 * 
 * A form component with multiple FormFields, button group, validation, and error summary.
 * Uses FormField, ButtonGroup, Alert, ProgressCard, Card molecules and Button, Typography, Divider, ProgressBar atoms.
 */

import React, { useState } from 'react';
import {
  FormField,
  type FormFieldProps,
  type FormFieldInputProps,
  type FormFieldTextareaProps,
  type FormFieldCheckboxProps,
  type FormFieldRadioProps,
} from '../../molecules/FormField';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Alert } from '../../molecules/Alert';
import { ProgressCard } from '../../molecules/ProgressCard';
import { Card } from '../../molecules/Card';
import { Button, Typography, Divider, ProgressBar } from '@almadar/ui';
import { cn } from '../../../utils/theme';

export interface FormStep {
  /**
   * Step ID
   */
  id: string;
  
  /**
   * Step title
   */
  title: string;
  
  /**
   * Step description
   */
  description?: string;
  
  /**
   * Form fields in this step
   */
  fields: FormFieldProps[];
}

export interface FormProps {
  /**
   * Form title
   */
  title?: string;
  
  /**
   * Form description
   */
  description?: string;
  
  /**
   * Form fields (for single-step form)
   */
  fields?: FormFieldProps[];
  
  /**
   * Form steps (for multi-step form)
   */
  steps?: FormStep[];
  
  /**
   * Submit button label
   * @default 'Submit'
   */
  submitLabel?: string;
  
  /**
   * Cancel button label
   */
  cancelLabel?: string;
  
  /**
   * Show cancel button
   * @default false
   */
  showCancel?: boolean;
  
  /**
   * Form submission handler
   */
  onSubmit?: (data: Record<string, any>) => void;
  
  /**
   * Cancel handler
   */
  onCancel?: () => void;
  
  /**
   * Form validation errors
   */
  errors?: Record<string, string>;
  
  /**
   * General form error message
   */
  errorMessage?: string;
  
  /**
   * Loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Form: React.FC<FormProps> = ({
  title,
  description,
  fields,
  steps,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  showCancel = false,
  onSubmit,
  onCancel,
  errors = {},
  errorMessage,
  loading = false,
  className,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const isMultiStep = !!steps && steps.length > 0;
  const currentStepData = isMultiStep ? steps[currentStep] : null;
  const totalSteps = steps?.length || 1;
  const progress = isMultiStep ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const handleNext = () => {
    if (isMultiStep && currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (isMultiStep && currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFieldInputChange = (
    field: FormFieldProps,
    fieldId: string,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = field.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    handleFieldChange(fieldId, value);
    if (typeof field.inputProps?.onChange === 'function') { field.inputProps.onChange(e as never); }
  };

  const renderFormField = (field: FormFieldProps, index: number) => {
    const fieldId = field.inputProps?.id || `field-${index}`;
    const error = errors[fieldId];
    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleFieldInputChange(field, fieldId, e);

    switch (field.type) {
      case 'input': {
        const inputField = field as FormFieldInputProps;
        return (
          <FormField
            key={fieldId}
            type="input"
            label={inputField.label}
            helperText={inputField.helperText}
            required={inputField.required}
            error={error}
            inputProps={{
              ...inputField.inputProps,
              id: fieldId,
              value: formData[fieldId] || '',
              onChange,
            }}
          />
        );
      }
      case 'textarea': {
        const textareaField = field as FormFieldTextareaProps;
        return (
          <FormField
            key={fieldId}
            type="textarea"
            label={textareaField.label}
            helperText={textareaField.helperText}
            required={textareaField.required}
            error={error}
            inputProps={{
              ...textareaField.inputProps,
              id: fieldId,
              value: formData[fieldId] || '',
              onChange,
            }}
          />
        );
      }
      case 'checkbox': {
        const checkboxField = field as FormFieldCheckboxProps;
        return (
          <FormField
            key={fieldId}
            type="checkbox"
            label={checkboxField.label}
            helperText={checkboxField.helperText}
            required={checkboxField.required}
            error={error}
            inputProps={{
              ...checkboxField.inputProps,
              id: fieldId,
              checked: !!formData[fieldId],
              onChange,
            }}
          />
        );
      }
      case 'radio': {
        const radioField = field as FormFieldRadioProps;
        return (
          <FormField
            key={fieldId}
            type="radio"
            label={radioField.label}
            helperText={radioField.helperText}
            required={radioField.required}
            error={error}
            inputProps={{
              ...radioField.inputProps,
              id: fieldId,
              value: formData[fieldId] || '',
              onChange,
            }}
          />
        );
      }
      default:
        return null;
    }
  };

  const renderFields = () => {
    if (isMultiStep && currentStepData) {
      return currentStepData.fields.map(renderFormField);
    }

    if (fields) {
      return fields.map(renderFormField);
    }

    return null;
  };

  return (
    <Card className={cn('', className)}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        {(title || description) && (
          <>
            {title && (
              <Typography variant="h4" className="mb-2">
                {title}
              </Typography>
            )}
            {description && (
              <Typography variant="body" color="secondary" className="mb-4">
                {description}
              </Typography>
            )}
            <Divider />
          </>
        )}

        {/* Progress Indicator */}
        {isMultiStep && (
          <div className="mb-6">
            <ProgressCard
              title={`Step ${currentStep + 1} of ${totalSteps}`}
              progress={progress}
              icon={undefined}
            />
            {currentStepData && (
              <div className="mt-4">
                <Typography variant="h6" className="mb-1">
                  {currentStepData.title}
                </Typography>
                {currentStepData.description && (
                  <Typography variant="small" color="secondary">
                    {currentStepData.description}
                  </Typography>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Summary */}
        {errorMessage && (
          <Alert variant="error" title="Form Error">
            {errorMessage}
          </Alert>
        )}

        {/* Fields */}
        <div className="space-y-4">
          {renderFields()}
        </div>

        {/* Actions */}
        <Divider />
        <div className="flex justify-end gap-2">
          {showCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
          )}
          {isMultiStep && currentStep > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrevious}
              disabled={loading}
            >
              Previous
            </Button>
          )}
          {isMultiStep && currentStep < totalSteps - 1 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={loading}
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
            >
              {submitLabel}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

Form.displayName = 'Form';
