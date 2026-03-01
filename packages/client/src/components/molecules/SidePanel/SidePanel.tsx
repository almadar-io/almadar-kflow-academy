/**
 * SidePanel Molecule Component
 * 
 * A side panel that slides in from the right (or left) with header and content.
 * On mobile devices, it renders as a full-screen modal for better usability.
 * Uses Button, Typography atoms and Modal molecule.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Modal } from '../Modal';
import { cn } from '../../../utils/theme';

export interface SidePanelProps {
  /**
   * Panel title
   */
  title: string;
  
  /**
   * Panel content
   */
  children: React.ReactNode;
  
  /**
   * Is panel open
   */
  isOpen: boolean;
  
  /**
   * On close handler
   */
  onClose: () => void;
  
  /**
   * Panel width
   * @default 'w-96'
   */
  width?: string;
  
  /**
   * Panel position
   * @default 'right'
   */
  position?: 'left' | 'right';
  
  /**
   * Show overlay on mobile
   * @default true
   */
  showOverlay?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  title,
  children,
  isOpen,
  onClose,
  width = 'w-96',
  position = 'right',
  showOverlay = true,
  className,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  // On mobile, render as a full-screen modal
  if (isMobile) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="full"
        className="h-full max-h-[100dvh]"
      >
        <div className="flex flex-col h-full -m-6 -mb-6">
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </Modal>
    );
  }

  // On desktop, render as side panel
  return (
    <>
      {/* Overlay */}
      {showOverlay && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Side Panel */}
      <aside
        className={cn(
          'fixed top-16 lg:top-0 bottom-0 z-[60]',
          'bg-white dark:bg-gray-800',
          'border-l border-gray-200 dark:border-gray-700',
          position === 'left' && 'border-l-0 border-r',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          width,
          position === 'right' ? 'right-0' : 'left-0',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <Typography variant="h6">{title}</Typography>
          <Button
            variant="ghost"
            size="sm"
            icon={X}
            onClick={onClose}
            aria-label="Close panel"
          >
            <span className="sr-only">Close</span>
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {children}
        </div>
      </aside>
    </>
  );
};

SidePanel.displayName = 'SidePanel';

