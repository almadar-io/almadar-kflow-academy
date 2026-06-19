import React from 'react';
import { Concept } from '../types';

interface ConceptNameProps {
  concept: Concept;
  isEditing: boolean;
  editValues: { name: string };
  onNameChange: (value: string) => void;
  onStartEditing: (concept: Concept, field: 'name' | 'description') => void;
  onCancelEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent, concept: Concept) => void;
  nameInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  className?: string;
  onTitleClick?: (concept: Concept) => void;
}

const ConceptName: React.FC<ConceptNameProps> = ({
  concept,
  isEditing,
  editValues,
  onNameChange,
  onStartEditing,
  onCancelEdit,
  onKeyDown,
  nameInputRefs,
  className = '',
  onTitleClick,
}) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    onNameChange(newName);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown(e, concept);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTitleClick) {
      onTitleClick(concept);
      return;
    }
    if (concept.id) {
      onStartEditing(concept, 'name');
    }
  };

  if (isEditing && concept.id) {
    return (
      <div className={`flex-1 ${className}`} onClick={(e) => e.stopPropagation()}>
        <input
          ref={(el) => { if (concept.id) nameInputRefs.current[concept.id] = el; }}
          type="text"
          className="w-full px-3 py-2 border-2 border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 bg-background text-foreground"
          value={editValues.name}
          onChange={handleNameChange}
          onBlur={onCancelEdit}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          placeholder="Enter concept name..."
          onKeyDown={handleNameKeyDown}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <h4 
        className="flex-1 text-lg font-semibold text-primary hover:text-primary underline underline-offset-4 decoration-transparent hover:decoration-primary px-2 py-1 rounded cursor-pointer transition-all duration-200"
        onClick={handleClick}
        title="View concept details"
        role="button"
      >
        {concept.name}
      </h4>
    </div>
  );
};

export default ConceptName;

