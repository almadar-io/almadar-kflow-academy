/**
 * ConceptListPage Library Component
 * 
 * Concept list page component using KnowledgeGraphTemplate.
 * Receives data as props - containers handle data fetching and state management.
 * 
 * Migrated to match MentorConceptListPage structure
 */

import React from 'react';
import { KnowledgeGraphTemplate, type ConceptLayer, type GraphNode, type GraphEdge } from '../templates/KnowledgeGraphTemplate';
import type { Operation } from '../organisms/OperationPanel';
import type { LucideIcon } from 'lucide-react';

export interface ConceptListPageProps {
  /**
   * Graph ID
   */
  graphId?: string;
  
  /**
   * Goal data
   */
  goal?: {
    id: string;
    text: string;
    milestones?: Array<{
      id: string;
      text: string;
      completed?: boolean;
    }>;
  };
  
  /**
   * Concept layers
   */
  layers?: ConceptLayer[];
  
  /**
   * Graph nodes
   */
  graphNodes?: GraphNode[];
  
  /**
   * Graph edges
   */
  graphEdges?: GraphEdge[];
  
  /**
   * Operations
   */
  operations?: Operation[];
  
  /**
   * Is operation running
   */
  isOperationRunning?: boolean;
  
  /**
   * Selected concept ID
   */
  selectedConceptId?: string;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Error state
   */
  error?: string | null;
  
  /**
   * Callbacks
   */
  onOperationExecute?: (operationId: string) => void;
  onConceptClick?: (conceptId: string) => void;
  onConceptSelect?: (conceptId: string) => void;
  onAddConcept?: (layerId: string) => void;
  onGoalSave?: (goalText: string) => void;
  
  /**
   * Template props
   */
  user?: { name: string; email?: string; avatar?: string };
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  logo?: React.ReactNode;
  onLogoClick?: () => void;
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ConceptListPage: React.FC<ConceptListPageProps> = ({
  graphId,
  goal,
  layers = [],
  graphNodes = [],
  graphEdges = [],
  operations = [],
  onOperationExecute,
  isOperationRunning = false,
  selectedConceptId,
  onConceptClick,
  onConceptSelect,
  onAddConcept,
  onGoalSave,
  loading = false,
  error = null,
  user,
  navigationItems = [],
  logo,
  onLogoClick,
  onLogout,
  className,
}) => {
  return (
    <KnowledgeGraphTemplate
      goal={goal}
      onGoalSave={onGoalSave}
      layers={layers}
      graphNodes={graphNodes}
      graphEdges={graphEdges}
      operations={operations}
      onOperationExecute={onOperationExecute}
      isOperationRunning={isOperationRunning}
      selectedConceptId={selectedConceptId}
      onConceptClick={onConceptClick}
      onConceptSelect={onConceptSelect ? (conceptId: string | null) => { if (conceptId) onConceptSelect(conceptId); } : undefined}
      onAddConcept={onAddConcept}
      graphId={graphId}
      user={user}
      navigationItems={navigationItems}
      logo={logo}
      onLogoClick={onLogoClick}
      onLogout={onLogout}
      className={className}
    />
  );
};

ConceptListPage.displayName = 'ConceptListPage';
