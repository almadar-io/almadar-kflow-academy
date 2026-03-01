/**
 * Modal Molecule Component
 * 
 * A modal dialog component with overlay, header, content, and footer.
 * Uses Button, Icon, Typography, and Divider atoms.
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /**
   * Whether modal is open
   */
  isOpen: boolean;
  
  /**
   * Callback when modal should close
   */
  onClose: () => void;
  
  /**
   * Modal title
   */
  title?: string;
  
  /**
   * Modal content
   */
  children: React.ReactNode;
  
  /**
   * Footer content (buttons, etc.)
   */
  footer?: React.ReactNode;
  
  /**
   * Modal size
   * @default 'md'
   */
  size?: ModalSize;
  
  /**
   * Show close button
   * @default true
   */
  showCloseButton?: boolean;
  
  /**
   * Close on overlay click
   * @default true
   */
  closeOnOverlayClick?: boolean;
  
  /**
   * Close on escape key
   * @default true
   */
  closeOnEscape?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full sm:mx-4 mx-0 sm:rounded-lg rounded-none',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus trap
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements?.[0] as HTMLElement;
      firstElement?.focus();
    } else {
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const isFullSize = size === 'full';

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        isFullSize ? "p-0 sm:p-4" : "p-4"
      )}
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-white dark:bg-gray-800 shadow-xl',
          isFullSize ? 'w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-lg rounded-none' : 'w-full max-h-[90vh] rounded-lg',
          'flex flex-col',
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        {...(title && { 'aria-labelledby': 'modal-title' })}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              {title && (
                <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'flex-shrink-0 rounded-md p-1 transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                  aria-label="Close modal"
                >
                  <Icon icon={X} size="md" className="text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          </>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <>
            <Divider />
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              {footer}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';
