/**
 * ConceptDetailPage Library Component
 * 
 * Concept detail page component using ConceptDetailTemplate.
 * Receives data as props - containers handle data fetching and state management.
 * 
 * Migrated to match MentorConceptDetailPage structure
 */

import React from 'react';
import { ConceptDetailTemplate } from '../templates/ConceptDetailTemplate';
import type { LucideIcon } from 'lucide-react';

export interface ConceptDetailPageProps {
  /**
   * Graph ID
   */
  graphId?: string;
  
  /**
   * Concept information
   */
  concept?: {
    id: string;
    name: string;
    description?: string;
    layer?: number;
    isSeed?: boolean;
  };
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Error state
   */
  error?: string | null;
  
  /**
   * Concept header section
   */
  conceptHeader?: React.ReactNode;
  
  /**
   * Main content section
   */
  content?: React.ReactNode;
  
  /**
   * Lesson panel content
   */
  lessonPanel?: React.ReactNode;
  
  /**
   * Operation panel (side panel for AI operations)
   */
  operationPanel?: React.ReactNode;
  
  /**
   * Whether operation panel is open
   */
  isOperationPanelOpen?: boolean;
  
  /**
   * Operation panel toggle handler
   */
  onOperationPanelToggle?: (open: boolean) => void;
  
  /**
   * Previous concept for navigation
   */
  previousConcept?: {
    id: string;
    name: string;
  };
  
  /**
   * Next concept for navigation
   */
  nextConcept?: {
    id: string;
    name: string;
  };
  
  /**
   * Previous concept click handler
   */
  onPreviousConceptClick?: (concept: { id: string; name: string }) => void;
  
  /**
   * Next concept click handler
   */
  onNextConceptClick?: (concept: { id: string; name: string }) => void;
  
  /**
   * Callbacks
   */
  onBack?: () => void;
  backLabel?: string;
  
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
  
  /**
   * Dialogs (feature components - passed as React nodes)
   */
  promptDisplayModal?: React.ReactNode;
}

export const ConceptDetailPage: React.FC<ConceptDetailPageProps> = ({
  graphId,
  concept,
  loading = false,
  error = null,
  conceptHeader,
  content,
  lessonPanel,
  operationPanel,
  isOperationPanelOpen = false,
  onOperationPanelToggle,
  previousConcept,
  nextConcept,
  onPreviousConceptClick,
  onNextConceptClick,
  onBack,
  backLabel = 'Back',
  user,
  navigationItems,
  logo,
  onLogoClick,
  promptDisplayModal,
}) => {
  return (
    <>
      <ConceptDetailTemplate
        concept={concept}
        loading={loading}
        error={error}
        onBack={onBack}
        backLabel={backLabel}
        conceptHeader={conceptHeader}
        content={content}
        lessonPanel={lessonPanel}
        operationPanel={operationPanel}
        isOperationPanelOpen={isOperationPanelOpen}
        onOperationPanelToggle={onOperationPanelToggle}
        previousConcept={previousConcept}
        nextConcept={nextConcept}
        onPreviousConceptClick={onPreviousConceptClick}
        onNextConceptClick={onNextConceptClick}
      />
      
      {/* Dialogs */}
      {promptDisplayModal}
    </>
  );
};

ConceptDetailPage.displayName = 'ConceptDetailPage';
