/**
 * PrerequisiteList Organism Component
 * 
 * Displays a list of prerequisites (existing and missing).
 * Uses PrerequisiteItem molecules.
 */

import React, { useMemo } from 'react';
import { Concept, ConceptGraph } from '../../../features/concepts/types';
import { checkPrerequisitesExist } from '../../../features/concepts/utils/prerequisites';
import { PrerequisiteItem } from '../../molecules/PrerequisiteItem';

export interface PrerequisiteListProps {
  /**
   * Concept to display prerequisites for
   */
  concept: Concept;
  
  /**
   * Display variant
   * @default 'detail'
   */
  variant?: 'list' | 'detail';
  
  /**
   * Concept map for checking prerequisite existence
   */
  conceptMap?: Map<string, Concept>;
  
  /**
   * Concept graph for checking prerequisite existence
   */
  graph?: ConceptGraph;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Callback when viewing a prerequisite
   */
  onViewPrerequisite?: (name: string) => void;
  
  /**
   * Callback when adding a prerequisite
   */
  onAddPrerequisite?: (name: string) => void;
  
  /**
   * Callback when removing a prerequisite
   */
  onRemovePrerequisite?: (name: string) => void;
}

export const PrerequisiteList: React.FC<PrerequisiteListProps> = ({
  concept,
  variant = 'detail',
  conceptMap,
  graph,
  className = '',
  onViewPrerequisite,
  onAddPrerequisite,
  onRemovePrerequisite,
}) => {
  const { existing, missing } = useMemo(() => {
    const prereqs = concept.prerequisites || [];
    if (!prereqs.length) return { existing: [] as string[], missing: [] as string[] };

    if (graph) {
      return checkPrerequisitesExist(prereqs, graph);
    }

    if (conceptMap) {
      const existingNames: string[] = [];
      const missingNames: string[] = [];
      prereqs.forEach(name => {
        if (conceptMap.has(name)) existingNames.push(name);
        else missingNames.push(name);
      });
      return { existing: existingNames, missing: missingNames };
    }

    // Fallback: treat all as missing if no graph or map
    return { existing: [] as string[], missing: prereqs.slice() };
  }, [concept.prerequisites, conceptMap, graph]);

  if ((!existing.length && !missing.length)) return null;

  return (
    <div className={className}>
      <div className="space-y-2">
        {existing.map(name => (
          <PrerequisiteItem
            key={`existing_${name}`}
            name={name}
            variant={variant}
            isMissing={false}
            onView={onViewPrerequisite}
          />
        ))}
        {missing.map(name => (
          <PrerequisiteItem
            key={`missing_${name}`}
            name={name}
            variant={variant}
            isMissing
            onView={onViewPrerequisite}
            onAdd={onAddPrerequisite}
            onRemove={onRemovePrerequisite}
          />
        ))}
      </div>
    </div>
  );
};

PrerequisiteList.displayName = 'PrerequisiteList';
