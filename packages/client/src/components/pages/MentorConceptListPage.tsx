/**
 * MentorConceptListPage Library Component
 * 
 * Mentor concept list page component using KnowledgeGraphTemplate.
 * Receives data as props - containers handle data fetching and state management.
 */

import React from 'react';
import { KnowledgeGraphTemplate, type ConceptLayer, type GraphNode, type GraphEdge, type ExtendedMilestone } from '../templates/KnowledgeGraphTemplate';
import type { Operation } from '../organisms/OperationPanel';
import type { LucideIcon } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface MentorConceptListPageProps {
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
    description?: string;
    milestones?: ExtendedMilestone[];
  };
  
  /**
   * Current difficulty level
   */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  
  /**
   * Callback when goal is updated
   */
  onGoalUpdate?: (updates: { text?: string; description?: string }) => Promise<void>;
  
  /**
   * Callback when milestone is updated
   */
  onMilestoneUpdate?: (milestoneId: string, updates: { title?: string; completed?: boolean }) => Promise<void>;
  
  /**
   * Callback when difficulty is changed
   */
  onDifficultyChange?: (difficulty: 'beginner' | 'intermediate' | 'advanced') => Promise<void>;
  
  /**
   * Callback when a new milestone is added
   */
  onAddMilestone?: (title: string) => Promise<void>;
  
  /**
   * Callback to expand the graph
   */
  onExpand?: () => Promise<void>;
  
  /**
   * Whether expand operation is running
   */
  isExpanding?: boolean;
  
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
   * AI Assistant props
   */
  onLLMMessageSend?: (message: string) => void;
  llmMessages?: ChatMessage[];
  isLLMLoading?: boolean;
  
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
  publishCourseDialog?: React.ReactNode;
  manageCourseDialog?: React.ReactNode;
  selectModulesDialog?: React.ReactNode;
  selectLessonsDialog?: React.ReactNode;
}

export const MentorConceptListPage: React.FC<MentorConceptListPageProps> = ({
  graphId,
  goal,
  difficulty,
  onGoalUpdate,
  onMilestoneUpdate,
  onDifficultyChange,
  onAddMilestone,
  onExpand,
  isExpanding = false,
  layers = [],
  graphNodes = [],
  graphEdges = [],
  operations = [],
  isOperationRunning = false,
  selectedConceptId,
  loading = false,
  error = null,
  onOperationExecute,
  onConceptClick,
  onConceptSelect,
  onAddConcept,
  onGoalSave,
  onLLMMessageSend,
  llmMessages = [],
  isLLMLoading = false,
  user,
  navigationItems,
  logo,
  onLogoClick,
  publishCourseDialog,
  manageCourseDialog,
  selectModulesDialog,
  selectLessonsDialog,
}) => {
  return (
    <>
      <KnowledgeGraphTemplate
        goal={goal}
        difficulty={difficulty}
        onGoalUpdate={onGoalUpdate}
        onMilestoneUpdate={onMilestoneUpdate}
        onDifficultyChange={onDifficultyChange}
        onAddMilestone={onAddMilestone}
        onExpand={onExpand}
        isExpanding={isExpanding}
        layers={layers}
        graphNodes={graphNodes}
        graphEdges={graphEdges}
        operations={operations}
        onOperationExecute={onOperationExecute}
        isOperationRunning={isOperationRunning}
        selectedConceptId={selectedConceptId}
        onConceptSelect={onConceptSelect ? (conceptId) => onConceptSelect(conceptId || '') : undefined}
        onConceptClick={onConceptClick}
        onAddConcept={onAddConcept}
        onGoalSave={onGoalSave}
        onLLMMessageSend={onLLMMessageSend}
        llmMessages={llmMessages}
        isLLMLoading={isLLMLoading}
        user={user}
        navigationItems={navigationItems}
        logo={logo}
        onLogoClick={onLogoClick}
      />
      
      {/* Dialogs */}
      {publishCourseDialog}
      {manageCourseDialog}
      {selectModulesDialog}
      {selectLessonsDialog}
    </>
  );
};

MentorConceptListPage.displayName = 'MentorConceptListPage';
