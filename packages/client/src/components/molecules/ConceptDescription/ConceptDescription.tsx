/**
 * ConceptDescription Molecule Component
 * 
 * Displays and allows editing of concept descriptions.
 * Uses Textarea atom for editing mode.
 */

import React from 'react';
import { Concept } from '../../../features/concepts/types';
import { Textarea } from '../../atoms/Textarea';
import { Typography } from '../../atoms/Typography';

export interface ConceptDescriptionProps {
  /**
   * Concept to display description for
   */
  concept: Concept;
  
  /**
   * Whether in editing mode
   */
  isEditing: boolean;
  
  /**
   * Current edit values
   */
  editValues: { description: string };
  
  /**
   * Callback when description changes
   */
  onDescriptionChange: (value: string) => void;
  
  /**
   * Callback to start editing
   */
  onStartEditing: (concept: Concept, field: 'name' | 'description') => void;
  
  /**
   * Callback to cancel editing
   */
  onCancelEdit: () => void;
  
  /**
   * Keyboard event handler
   */
  onKeyDown: (e: React.KeyboardEvent, concept: Concept) => void;
  
  /**
   * Refs for textarea elements
   */
  descriptionTextareaRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  
  /**
   * Show full content (not truncated)
   * @default false
   */
  showFullContent?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ConceptDescription: React.FC<ConceptDescriptionProps> = ({
  concept,
  isEditing,
  editValues,
  onDescriptionChange,
  onStartEditing,
  onCancelEdit,
  onKeyDown,
  descriptionTextareaRefs,
  showFullContent = false,
  className = '',
}) => {
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    onDescriptionChange(newDescription);
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown(e, concept);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (concept.id) {
      onStartEditing(concept, 'description');
    }
  };

  if (isEditing && concept.id) {
    return (
      <div className={`flex-1 ${className}`} onClick={(e) => e.stopPropagation()}>
        <Textarea
          value={editValues.description}
          onChange={handleDescriptionChange}
          onKeyDown={handleDescriptionKeyDown}
          onBlur={onCancelEdit}
          autoFocus
          ref={(el) => { 
            if (concept.id && el) descriptionTextareaRefs.current[concept.id] = el; 
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Enter concept description..."
          rows={4}
          className="border-2 border-blue-500 dark:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 resize-none"
          style={{ minHeight: '100px' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded cursor-pointer transition-all duration-200 ${className}`}
      style={{ minHeight: '24px' }}
      onClick={handleClick}
      title="Click to edit description"
    >
      <Typography variant="body">
        {!showFullContent 
          ? `${concept.description.substring(0, 100)}${concept.description.length > 100 ? '...' : ''}` 
          : concept.description || 'No description'
        }
      </Typography>
    </div>
  );
};

ConceptDescription.displayName = 'ConceptDescription';
