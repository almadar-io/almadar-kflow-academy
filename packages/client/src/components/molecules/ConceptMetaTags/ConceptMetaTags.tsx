/**
 * ConceptMetaTags Molecule Component
 * 
 * Displays concept metadata tags (layer, seed status, parents).
 * Uses Badge and Button atoms.
 */

import React from 'react';
import { Layers } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';

export interface ConceptMetaTagsProps {
  /**
   * Layer number
   */
  layer?: number;
  
  /**
   * Whether this is a seed concept
   */
  isSeed?: boolean;
  
  /**
   * Parent concept names
   */
  parents: string[];
  
  /**
   * Callback when parent is clicked
   */
  onNavigateToParent: (parent: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ConceptMetaTags: React.FC<ConceptMetaTagsProps> = ({
  layer,
  isSeed,
  parents,
  onNavigateToParent,
  className = '',
}) => (
  <div className={`flex flex-col gap-3 ${className}`}>
    {(layer !== undefined || isSeed) && (
      <div className="flex flex-wrap gap-2">
        {layer !== undefined && (
          <Badge variant="info" icon={Layers} className="inline-flex items-center">
            Level {layer}
          </Badge>
        )}
        {isSeed && (
          <Badge variant="warning" className="inline-flex items-center">
            Seed Concept
          </Badge>
        )}
      </div>
    )}

    {parents.length > 0 && (
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Parents:</span>
        {parents.map(parent => (
          <Button
            key={parent}
            variant="ghost"
            size="sm"
            onClick={() => onNavigateToParent(parent)}
            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50"
          >
            ← {parent}
          </Button>
        ))}
      </div>
    )}
  </div>
);

ConceptMetaTags.displayName = 'ConceptMetaTags';
