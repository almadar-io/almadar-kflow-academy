/**
 * SelectLessonsDialog - Presentational Component
 * 
 * Dialog for selecting which lessons (concepts) to publish within a module.
 * All API interactions are lifted to the container.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/molecules/Modal';
import { Button } from '../../../components/atoms/Button';
import { Alert } from '../../../components/molecules/Alert';
import { ContentSelector, ContentSelectorItem } from '../../../components/organisms/ContentSelector';
import { BookOpen, FileText } from 'lucide-react';
import type { LessonForPublishing } from '../../knowledge-graph/api/publishingApi';

export interface LessonWithPublishState extends LessonForPublishing {
  /**
   * Whether this lesson is published
   */
  isPublished?: boolean;
}

export interface ModuleInfo {
  id: string;
  name: string;
  description?: string;
  layerNumber?: number;
}

export interface SelectLessonsDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Callback when dialog is closed
   */
  onClose: () => void;
  
  /**
   * Module info for display
   */
  module?: ModuleInfo | null;
  
  /**
   * Available lessons to select from
   */
  lessons: LessonWithPublishState[];
  
  /**
   * IDs of lessons that are already published
   */
  publishedLessonIds?: Set<string>;
  
  /**
   * Whether lessons are loading
   */
  isLoading?: boolean;
  
  /**
   * Whether publishing is in progress
   */
  isPublishing?: boolean;
  
  /**
   * Callback when user confirms lesson selection
   * @param selectedIds - IDs of lessons to publish
   * @param deselectedIds - IDs of lessons to unpublish
   */
  onPublish: (selectedIds: string[], deselectedIds: string[]) => void;
  
  /**
   * Optional callback to add/edit assessment for a lesson
   */
  onEditAssessment?: (lessonId: string) => void;
  
  /**
   * Set of lesson IDs that have assessments
   */
  lessonsWithAssessments?: Set<string>;
}

const SelectLessonsDialog: React.FC<SelectLessonsDialogProps> = ({
  isOpen,
  onClose,
  module,
  lessons,
  publishedLessonIds = new Set(),
  isLoading = false,
  isPublishing = false,
  onPublish,
  onEditAssessment,
  lessonsWithAssessments = new Set(),
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selection with published lessons
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(publishedLessonIds));
    }
  }, [isOpen, publishedLessonIds]);

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const handlePublish = () => {
    const selectedArray = Array.from(selectedIds);
    const deselectedArray = lessons
      .map(l => l.id)
      .filter(id => publishedLessonIds.has(id) && !selectedIds.has(id));
    
    onPublish(selectedArray, deselectedArray);
  };

  // Convert lessons to ContentSelectorItem format
  const selectorItems: ContentSelectorItem[] = lessons.map(lesson => {
    const badges: ContentSelectorItem['badges'] = [];
    
    if (lesson.isPublished || publishedLessonIds.has(lesson.id)) {
      badges.push({ label: 'Published', variant: 'success' });
    }
    
    if (lessonsWithAssessments.has(lesson.id)) {
      badges.push({ label: 'Has Assessment', variant: 'info' });
    }

    const hasContent = lesson.hasLessonContent || lesson.hasFlashCards;

    return {
      id: lesson.id,
      label: lesson.name,
      description: lesson.description,
      sequence: lesson.sequence,
      checked: selectedIds.has(lesson.id),
      badges: badges.length > 0 ? badges : undefined,
      metadata: !hasContent ? '⚠️ No content' : undefined,
      action: onEditAssessment && (lesson.isPublished || publishedLessonIds.has(lesson.id)) ? {
        icon: FileText,
        label: lessonsWithAssessments.has(lesson.id) ? 'Edit Assessment' : 'Add Assessment',
        onClick: () => onEditAssessment(lesson.id),
      } : undefined,
    };
  });

  // Module info header
  const moduleHeader = module ? (
    <Alert variant="info" title={module.name || 'Module'}>
      {module.description || 'Select the lessons you want to publish for this module.'}
    </Alert>
  ) : null;

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
          ? 'Continue Without Lessons' 
          : `Publish ${selectedIds.size} Lesson${selectedIds.size !== 1 ? 's' : ''}`}
      </Button>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Select Lessons to Publish" 
      size="lg"
      footer={isLoading ? undefined : footer}
    >
      <ContentSelector
        items={selectorItems}
        onSelectionChange={handleSelectionChange}
        loading={isLoading}
        selectAllLabel="Select All Lessons"
        header={moduleHeader}
        emptyState={{
          icon: BookOpen,
          title: 'No lessons available',
          description: 'This module has no lessons (concepts) to publish yet.',
        }}
        maxHeight="384px"
      />
    </Modal>
  );
};

export default SelectLessonsDialog;
