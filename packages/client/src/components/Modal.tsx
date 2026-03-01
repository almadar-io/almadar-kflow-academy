/**
 * @deprecated This component is deprecated. Use `import { Modal } from './molecules/Modal'` instead.
 * This file now re-exports the library Modal with a compatibility layer for legacy size prop.
 * 
 * Migration guide:
 * - Change import from `import Modal from '../../../components/Modal'`
 *   to `import { Modal } from '../../../components/molecules/Modal'`
 * - Update size prop: 'small' -> 'sm', 'medium' -> 'md', 'large' -> 'lg', 'extra-large' -> 'xl'
 * - The new Modal supports a `footer` prop for footer content
 */

import React from 'react';
import { Modal as LibraryModal, ModalSize } from './molecules/Modal';

// Legacy size type
type LegacySize = 'small' | 'medium' | 'large' | 'extra-large';

// Map legacy sizes to library sizes
const sizeMap: Record<LegacySize, ModalSize> = {
  'small': 'sm',
  'medium': 'md',
  'large': 'lg',
  'extra-large': 'xl',
};

interface LegacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: LegacySize;
}

let deprecationWarned = false;

/**
 * @deprecated Use `import { Modal } from './molecules/Modal'` instead.
 */
const Modal: React.FC<LegacyModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium'
}) => {
  // Log deprecation warning once
  if (!deprecationWarned && process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] Legacy Modal component is deprecated. ' +
      'Please use `import { Modal } from "./molecules/Modal"` instead. ' +
      'Size mappings: small->sm, medium->md, large->lg, extra-large->xl'
    );
    deprecationWarned = true;
  }

  const mappedSize = sizeMap[size] || 'md';

  return (
    <LibraryModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={mappedSize}
    >
      {children}
    </LibraryModal>
  );
};

export default Modal;

// Also export named for new imports
export { Modal };
