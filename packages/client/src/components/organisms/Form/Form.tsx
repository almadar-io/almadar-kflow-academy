/**
 * Form Organism Component
 * 
 * A form component with multiple FormFields, button group, validation, and error summary.
 * Uses FormField, ButtonGroup, Alert, ProgressCard, Card molecules and Button, Typography, Divider, ProgressBar atoms.
 */

import React, { useState } from 'react';
import { FormField, FormFieldProps } from '../../molecules/FormField';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Alert } from '../../molecules/Alert';
import { ProgressCard } from '../../molecules/ProgressCard';
import { Card } from '../../molecules/Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Divider } from '../../atoms/Divider';
import { ProgressBar } from '../../atoms/ProgressBar';
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

  const renderFields = () => {
    if (isMultiStep && currentStepData) {
      return currentStepData.fields.map((field, index) => {
        const fieldId = field.inputProps?.id || `field-${index}`;
        const error = errors[fieldId];
        return (
          <FormField
            key={fieldId}
            type={field.type}
            label={field.label}
            helperText={field.helperText}
            required={field.required}
            error={error}
            inputProps={{
              ...field.inputProps,
              id: fieldId,
              value: formData[fieldId] || '',
              onChange: (e: any) => {
                const value = field.type === 'checkbox' ? e.target.checked : e.target.value;
                handleFieldChange(fieldId, value);
                field.inputProps?.onChange?.(e);
              },
            } as any}
          />
        );
      });
    }

    if (fields) {
      return fields.map((field, index) => {
        const fieldId = field.inputProps?.id || `field-${index}`;
        const error = errors[fieldId];
        return (
          <FormField
            key={fieldId}
            type={field.type}
            label={field.label}
            helperText={field.helperText}
            required={field.required}
            error={error}
            inputProps={{
              ...field.inputProps,
              id: fieldId,
              value: formData[fieldId] || '',
              onChange: (e: any) => {
                const value = field.type === 'checkbox' ? e.target.checked : e.target.value;
                handleFieldChange(fieldId, value);
                field.inputProps?.onChange?.(e);
              },
            } as any}
          />
        );
      });
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
              loading={loading}
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
