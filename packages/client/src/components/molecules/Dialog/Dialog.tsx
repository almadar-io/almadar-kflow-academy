/**
 * Dialog Molecule Component
 * 
 * A dialog component for confirmations, alerts, and form dialogs.
 * Uses Modal molecule, Icon, Typography, and Button atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Modal, ModalProps } from '../Modal';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { ButtonGroup } from '../ButtonGroup';
import { cn } from '../../../utils/theme';

export type DialogVariant = 'confirm' | 'alert' | 'info' | 'warning' | 'danger';

export interface DialogProps extends Omit<ModalProps, 'title' | 'children' | 'footer'> {
  /**
   * Dialog variant
   * @default 'confirm'
   */
  variant?: DialogVariant;
  
  /**
   * Dialog icon
   */
  icon?: LucideIcon;
  
  /**
   * Dialog title
   */
  title?: string;
  
  /**
   * Dialog message
   */
  message: string;
  
  /**
   * Confirm button label
   * @default 'Confirm'
   */
  confirmLabel?: string;
  
  /**
   * Cancel button label
   * @default 'Cancel'
   */
  cancelLabel?: string;
  
  /**
   * Confirm button variant
   * @default 'primary'
   */
  confirmVariant?: 'primary' | 'danger' | 'success';
  
  /**
   * Show cancel button
   * @default true
   */
  showCancel?: boolean;
  
  /**
   * Confirm button click handler
   */
  onConfirm?: () => void;
  
  /**
   * Cancel button click handler (defaults to onClose)
   */
  onCancel?: () => void;
  
  /**
   * Custom footer content (overrides default buttons)
   */
  customFooter?: React.ReactNode;
}

const variantIcons: Record<DialogVariant, LucideIcon | null> = {
  confirm: null,
  alert: null,
  info: null,
  warning: null,
  danger: null,
};

const variantIconColors: Record<DialogVariant, string> = {
  confirm: 'text-indigo-600 dark:text-indigo-400',
  alert: 'text-blue-600 dark:text-blue-400',
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
};

export const Dialog: React.FC<DialogProps> = ({
  variant = 'confirm',
  icon,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  showCancel = true,
  onConfirm,
  onCancel,
  onClose,
  customFooter,
  size = 'sm',
  ...modalProps
}) => {
  const displayIcon = icon || variantIcons[variant];
  const iconColor = variantIconColors[variant];

  const handleConfirm = () => {
    onConfirm?.();
    if (!onConfirm) {
      onClose();
    }
  };

  const handleCancel = () => {
    onCancel?.() || onClose();
  };

  const defaultFooter = (
    <div className="flex justify-end gap-2">
      {showCancel && (
        <Button variant="secondary" onClick={handleCancel}>
          {cancelLabel}
        </Button>
      )}
      <Button variant={confirmVariant} onClick={handleConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );

  return (
    <Modal
      {...modalProps}
      isOpen={modalProps.isOpen}
      onClose={onClose}
      size={size}
      title={undefined}
      footer={customFooter || defaultFooter}
    >
      <div className="flex items-start gap-4">
        {displayIcon && (
          <div className={cn('flex-shrink-0', iconColor)}>
            <Icon icon={displayIcon} size="lg" />
          </div>
        )}
        
        <div className="flex-1">
          {title && (
            <Typography variant="h5" className="mb-2">
              {title}
            </Typography>
          )}
          <Typography variant="body" color="secondary">
            {message}
          </Typography>
        </div>
      </div>
    </Modal>
  );
};

Dialog.displayName = 'Dialog';

