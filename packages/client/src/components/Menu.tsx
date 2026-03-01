import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface MenuOption {
  id: string;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface MenuProps {
  trigger: React.ReactNode;
  options: MenuOption[];
  children?: React.ReactNode;
  className?: string;
  menuClassName?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export const Menu: React.FC<MenuProps> = ({
  trigger,
  options,
  children,
  className = '',
  menuClassName = '',
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current && 
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Update dropdown position after a brief delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        updateDropdownPosition();
      }, 0);
      
      // Update position on scroll/resize
      const handleUpdatePosition = () => {
        updateDropdownPosition();
      };
      window.addEventListener('scroll', handleUpdatePosition, true);
      window.addEventListener('resize', handleUpdatePosition);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleUpdatePosition, true);
        window.removeEventListener('resize', handleUpdatePosition);
        clearTimeout(timeoutId);
      };
    }
  }, [isOpen]);

  // Reposition when the menu alignment changes while open
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [position, isOpen]);

  const updateDropdownPosition = () => {
    if (!triggerRef.current || !dropdownRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdown = dropdownRef.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8; // Padding from viewport edges
    
    // First, position the dropdown to get its dimensions
    let top = 0;
    let left = 0;
    let transformX = '';
    let transformY = '';
    
    switch (position) {
      case 'bottom-left':
        top = triggerRect.bottom + 4;
        left = triggerRect.left;
        transformX = 'translateX(0)';
        break;
      case 'bottom-right':
        top = triggerRect.bottom + 4;
        left = triggerRect.right;
        transformX = 'translateX(-100%)';
        break;
      case 'top-left':
        top = triggerRect.top;
        left = triggerRect.left;
        transformX = 'translateX(0)';
        transformY = 'translateY(-100%)';
        break;
      case 'top-right':
        top = triggerRect.top;
        left = triggerRect.right;
        transformX = 'translateX(-100%)';
        transformY = 'translateY(-100%)';
        break;
    }
    
    // Set initial position to get dropdown dimensions
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.transform = `${transformX} ${transformY}`.trim();
    
    // Now get the actual dimensions after positioning
    const dropdownRect = dropdown.getBoundingClientRect();
    
    // Adjust for viewport boundaries (especially important on mobile)
    // Check horizontal overflow
    if (position === 'bottom-right' || position === 'top-right') {
      // Right-aligned: check if dropdown goes off left edge
      const dropdownLeft = dropdownRect.left;
      if (dropdownLeft < padding) {
        // If dropdown goes off left edge, try to flip to left-aligned if there's space
        if (triggerRect.left + dropdownRect.width <= viewportWidth - padding) {
          // Flip to left-aligned - align to left edge of trigger
          left = triggerRect.left;
          transformX = 'translateX(0)';
        } else {
          // Not enough space to flip, keep right-aligned but constrain to viewport
          left = Math.max(padding, viewportWidth - dropdownRect.width - padding);
          transformX = 'translateX(-100%)';
        }
      }
    } else {
      // Left-aligned: check if dropdown goes off right edge
      const dropdownRight = dropdownRect.right;
      if (dropdownRight > viewportWidth - padding) {
        // If dropdown goes off right edge, try to flip to right-aligned if there's space
        if (triggerRect.right - dropdownRect.width >= padding) {
          // Flip to right-aligned - align to right edge of trigger
          left = triggerRect.right;
          transformX = 'translateX(-100%)';
        } else {
          // Not enough space to flip, keep left-aligned but constrain to viewport
          left = Math.max(padding, viewportWidth - dropdownRect.width - padding);
          transformX = 'translateX(0)';
        }
      }
    }
    
    // Check vertical overflow
    if (position === 'top-left' || position === 'top-right') {
      // Top-aligned: check if dropdown goes off top edge
      const dropdownTop = dropdownRect.top;
      if (dropdownTop < padding) {
        // If not enough space above, show below instead
        top = triggerRect.bottom + 4;
        transformY = '';
      }
    } else {
      // Bottom-aligned: check if dropdown goes off bottom edge
      const dropdownBottom = dropdownRect.bottom;
      if (dropdownBottom > viewportHeight - padding) {
        // If not enough space below, show above instead
        top = triggerRect.top;
        transformY = 'translateY(-100%)';
      }
    }
    
    // Apply final position
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.transform = `${transformX} ${transformY}`.trim();
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: MenuOption) => {
    if (!option.disabled) {
      option.onClick();
      setIsOpen(false);
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'top-full left-0 mt-1';
      case 'bottom-right':
        return 'top-full right-0 mt-1';
      case 'top-left':
        return 'bottom-full left-0 mb-1';
      case 'top-right':
        return 'bottom-full right-0 mb-1';
      default:
        return 'top-full right-0 mt-1';
    }
  };

  return (
    <>
      <div className={`relative inline-block ${className}`} ref={menuRef}>
        {/* Trigger */}
        <div ref={triggerRef} onClick={handleToggle} className="cursor-pointer">
          {trigger}
        </div>
      </div>

      {/* Menu Dropdown - Rendered via Portal to avoid z-index and overflow issues */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed z-[9999] min-w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 ${menuClassName}`}
          style={{
            top: 0,
            left: 0,
          }}
        >
          {/* Children content */}
          {children && (
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              {children}
            </div>
          )}

          {/* Options */}
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                disabled={option.disabled}
                className={`
                  w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2 transition-colors duration-150
                  ${option.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
