/**
 * FormField Molecule Component
 * 
 * A composite component that combines label, input/textarea/select, helper text, and error message.
 */

import React from 'react';
import { Input, InputProps } from '../../atoms/Input';
import { Textarea, TextareaProps } from '../../atoms/Textarea';
import { Checkbox, CheckboxProps } from '../../atoms/Checkbox';
import { Radio, RadioProps } from '../../atoms/Radio';
import { cn } from '../../../utils/theme';

export type FormFieldInputType = 'input' | 'textarea' | 'checkbox' | 'radio';

export interface BaseFormFieldProps {
  /**
   * Label text
   */
  label?: string;
  
  /**
   * Helper text displayed below the field
   */
  helperText?: string;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Whether the field is required
   * @default false
   */
  required?: boolean;
  
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

export interface FormFieldInputProps extends BaseFormFieldProps {
  type: 'input';
  inputProps: InputProps;
}

export interface FormFieldTextareaProps extends BaseFormFieldProps {
  type: 'textarea';
  inputProps: TextareaProps;
}

export interface FormFieldCheckboxProps extends BaseFormFieldProps {
  type: 'checkbox';
  inputProps: CheckboxProps;
}

export interface FormFieldRadioProps extends BaseFormFieldProps {
  type: 'radio';
  inputProps: RadioProps;
}

export type FormFieldProps =
  | FormFieldInputProps
  | FormFieldTextareaProps
  | FormFieldCheckboxProps
  | FormFieldRadioProps;

export const FormField: React.FC<FormFieldProps> = ({
  type,
  label,
  helperText,
  error,
  required = false,
  className,
  inputProps,
}) => {
  const hasError = !!error;
  const fieldId = inputProps.id || `field-${Math.random().toString(36).substr(2, 9)}`;

  const renderField = () => {
    switch (type) {
      case 'input':
        return (
          <Input
            {...(inputProps as InputProps)}
            id={fieldId}
            label={label}
            helperText={helperText}
            error={error}
          />
        );
      case 'textarea':
        return (
          <Textarea
            {...(inputProps as TextareaProps)}
            id={fieldId}
            label={label}
            helperText={helperText}
            error={error}
          />
        );
      case 'checkbox':
        return (
          <Checkbox
            {...(inputProps as CheckboxProps)}
            id={fieldId}
            label={label}
            helperText={helperText}
            error={error}
          />
        );
      case 'radio':
        return (
          <Radio
            {...(inputProps as RadioProps)}
            id={fieldId}
            label={label}
            helperText={helperText}
            error={error}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {type === 'input' || type === 'textarea' ? (
        // Input and Textarea already handle their own labels
        renderField()
      ) : (
        // For checkbox and radio, we need to handle the label differently
        <div>
          {label && type !== 'checkbox' && type !== 'radio' && (
            <label
              htmlFor={fieldId}
              className={cn(
                'block text-sm font-medium mb-1.5',
                hasError
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-700 dark:text-gray-300'
              )}
            >
              {label}
              {required && (
                <span className="text-red-500 ml-1" aria-label="required">
                  *
                </span>
              )}
            </label>
          )}
          {renderField()}
        </div>
      )}
    </div>
  );
};

FormField.displayName = 'FormField';

