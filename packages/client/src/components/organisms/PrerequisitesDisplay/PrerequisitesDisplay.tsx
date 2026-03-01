/**
 * PrerequisitesDisplay Organism Component
 * 
 * Displays concept prerequisites with expand/collapse functionality.
 * Uses PrerequisiteList molecule and Button atoms.
 */

import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Concept, ConceptGraph } from '../../../features/concepts/types';
import { PrerequisiteList } from '../PrerequisiteList';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';

export interface PrerequisitesDisplayProps {
  /**
   * Concept to display prerequisites for
   */
  concept: Concept;
  
  /**
   * Concept graph for checking prerequisite existence
   */
  graph: ConceptGraph;
  
  /**
   * Callback when viewing a prerequisite
   */
  onViewPrerequisite?: (prerequisiteName: string) => void;
  
  /**
   * Callback when adding a prerequisite
   */
  onAddPrerequisite?: (prerequisiteName: string) => void;
  
  /**
   * Callback when removing a prerequisite
   */
  onRemovePrerequisite?: (prerequisiteName: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const PrerequisitesDisplay: React.FC<PrerequisitesDisplayProps> = ({
  concept,
  graph,
  onViewPrerequisite,
  onAddPrerequisite,
  onRemovePrerequisite,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!concept.prerequisites || concept.prerequisites.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg shadow-sm overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-orange-700 dark:text-orange-300" />
          ) : (
            <ChevronRight className="h-4 w-4 text-orange-700 dark:text-orange-300" />
          )}
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <Typography variant="small" className="font-semibold text-orange-900 dark:text-orange-200">
              Suggested Prerequisites
            </Typography>
            <Badge variant="warning" size="sm">
              {concept.prerequisites.length}
            </Badge>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <PrerequisiteList
            concept={concept}
            variant="detail"
            graph={graph}
            onViewPrerequisite={onViewPrerequisite}
            onAddPrerequisite={onAddPrerequisite}
            onRemovePrerequisite={onRemovePrerequisite}
          />
        </div>
      )}
    </div>
  );
};

PrerequisitesDisplay.displayName = 'PrerequisitesDisplay';
