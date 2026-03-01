/**
 * ButtonGroup Molecule Component
 * 
 * A component for grouping buttons together with connected styling.
 * Uses Button atoms.
 */

import React from 'react';
import { Button, ButtonProps } from '../../atoms/Button';
import { cn } from '../../../utils/theme';

export type ButtonGroupVariant = 'default' | 'segmented' | 'toggle';

export interface ButtonGroupProps {
  /**
   * Button group content (Button components)
   */
  children: React.ReactNode;
  
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: ButtonGroupVariant;
  
  /**
   * Orientation
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  variant = 'default',
  orientation = 'horizontal',
  className,
}) => {
  const variantClasses = {
    default: 'gap-0',
    segmented: 'gap-0 [&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:first-child)]:border-l-0',
    toggle: 'gap-0 [&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:first-child)]:border-l-0',
  };

  const orientationClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col [&>button:first-child]:rounded-t-lg [&>button:last-child]:rounded-b-lg [&>button:not(:first-child)]:border-t-0 [&>button:not(:first-child)]:border-l',
  };

  return (
    <div
      className={cn(
        'inline-flex',
        variantClasses[variant],
        orientationClasses[orientation],
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';

