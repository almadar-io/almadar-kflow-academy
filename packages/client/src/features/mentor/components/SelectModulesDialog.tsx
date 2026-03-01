/**
 * SelectModulesDialog - Presentational Component
 * 
 * Dialog for selecting which modules (layers) to publish.
 * All API interactions are lifted to the container.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/molecules/Modal';
import { Button } from '../../../components/atoms/Button';
import { ContentSelector, ContentSelectorItem } from '../../../components/organisms/ContentSelector';
import { BookOpen } from 'lucide-react';
import type { ModuleForPublishing } from '../../knowledge-graph/api/publishingApi';

export interface SelectModulesDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Callback when dialog is closed
   */
  onClose: () => void;
  
  /**
   * Available modules to select from
   */
  modules: ModuleForPublishing[];
  
  /**
   * IDs of modules that are already published
   */
  publishedModuleIds?: Set<string>;
  
  /**
   * Whether modules are loading
   */
  isLoading?: boolean;
  
  /**
   * Whether publishing is in progress
   */
  isPublishing?: boolean;
  
  /**
   * Callback when user confirms module selection
   * @param selectedIds - IDs of modules to publish
   * @param deselectedIds - IDs of modules to unpublish
   */
  onPublish: (selectedIds: string[], deselectedIds: string[]) => void;
}

const SelectModulesDialog: React.FC<SelectModulesDialogProps> = ({
  isOpen,
  onClose,
  modules,
  publishedModuleIds = new Set(),
  isLoading = false,
  isPublishing = false,
  onPublish,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selection with published modules
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(publishedModuleIds));
    }
  }, [isOpen, publishedModuleIds]);

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const handlePublish = () => {
    const selectedArray = Array.from(selectedIds);
    const deselectedArray = modules
      .map(m => m.id)
      .filter(id => publishedModuleIds.has(id) && !selectedIds.has(id));
    
    onPublish(selectedArray, deselectedArray);
  };

  // Convert modules to ContentSelectorItem format
  const selectorItems: ContentSelectorItem[] = modules.map(module => ({
    id: module.id,
    label: module.name,
    description: module.description,
    sequence: module.layerNumber,
    checked: selectedIds.has(module.id),
    badges: (module.isPublished || publishedModuleIds.has(module.id))
      ? [{ label: 'Published', variant: 'success' as const }]
      : undefined,
    metadata: module.conceptCount > 0 
      ? `${module.conceptCount} lesson${module.conceptCount !== 1 ? 's' : ''}`
      : undefined,
  }));

  const footer = (
    <div className="flex justify-end gap-3">
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isPublishing}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handlePublish}
        disabled={isPublishing}
        loading={isPublishing}
      >
        {selectedIds.size === 0 
          ? 'Continue Without Modules' 
          : `Publish ${selectedIds.size} Module${selectedIds.size !== 1 ? 's' : ''}`}
      </Button>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Select Modules to Publish" 
      size="lg"
      footer={isLoading ? undefined : footer}
    >
      <ContentSelector
        items={selectorItems}
        onSelectionChange={handleSelectionChange}
        loading={isLoading}
        selectAllLabel="Select All Modules"
        emptyState={{
          icon: BookOpen,
          title: 'No modules available',
          description: 'This course has no modules (layers) to publish yet. Add content to your knowledge graph first.',
        }}
        maxHeight="384px"
      />
    </Modal>
  );
};

export default SelectModulesDialog;
