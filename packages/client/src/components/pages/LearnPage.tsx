/**
 * LearnPage Library Component
 * 
 * Learning paths page component using DashboardTemplate.
 * Displays user's learning paths and allows creating new ones.
 * 
 * Receives data as props - containers handle data fetching and state management.
 */

import React from 'react';
import { DashboardTemplate } from '../templates/DashboardTemplate';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { Typography } from '../atoms/Typography';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { Alert } from '../molecules/Alert';
import { ConceptCard } from '../../features/concepts/components';
import { Lightbulb, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Simplified seed concept interface (minimal data needed for display)
 */
export interface SeedConceptDisplay {
  id: string;
  name: string;
  description: string;
}

/**
 * Simplified graph interface (minimal data needed for display)
 */
export interface GraphDisplay {
  id: string;
  name: string;
  seedConceptId: string;
}

export interface LearnPageProps {
  /**
   * Learning paths (graphs with seed concepts)
   */
  learningPaths?: Array<{
    graph: GraphDisplay;
    seedConcept: SeedConceptDisplay;
    conceptCount: number;
    levelCount: number;
  }>;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Error state
   */
  error?: string | null;
  
  /**
   * Show goal form
   */
  showGoalForm?: boolean;
  
  /**
   * Callbacks
   */
  onCreateNewPath?: () => void;
  onLearningPathClick?: (graphId: string, seedConcept: SeedConceptDisplay) => void;
  onGoalFormComplete?: (result: { goalId: string; graphId: string }) => void;
  onDeleteLearningPath?: (graphId: string) => Promise<void>;
  onNavigateToMentor?: (graphId: string) => void;
  
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
   * Dialogs (feature components - passed as React nodes)
   */
  goalFormDialog?: React.ReactNode;
  firstLayerLoader?: React.ReactNode;
}

export const LearnPage: React.FC<LearnPageProps> = ({
  learningPaths = [],
  loading = false,
  error = null,
  showGoalForm = false,
  onCreateNewPath,
  onLearningPathClick,
  onGoalFormComplete,
  onDeleteLearningPath,
  onNavigateToMentor,
  user,
  navigationItems,
  logo,
  onLogoClick,
  onLogout,
  goalFormDialog,
  firstLayerLoader,
}) => {
  return (
    <DashboardTemplate
      variant="student"
      user={user}
      navigationItems={navigationItems}
      logo={logo}
      onLogoClick={onLogoClick}
      onLogout={onLogout}
    >
      {loading && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <Typography variant="body" className="mt-4" color="secondary">
              Loading learning paths...
            </Typography>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="error" className="mb-6">
          Failed to load learning paths: {error}
        </Alert>
      )}

      {/* Welcome Section */}
      <div className="mb-8">
        <Typography variant="h1" className="mb-2">
          Learning Paths
        </Typography>
        <Typography variant="body" color="secondary">
          Manage your learning journeys and create new paths.
        </Typography>
      </div>

      {/* Learning Paths Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6">
          <Button
            variant="primary"
            onClick={onCreateNewPath}
            icon={Plus}
            className="sm:order-2"
          >
            Create New Path
          </Button>
          <div className="flex items-center gap-3 sm:order-1">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Lightbulb size={20} />
            </div>
            <Typography variant="h3">Your Learning Paths</Typography>
            {learningPaths.length > 0 && (
              <Badge>{learningPaths.length}</Badge>
            )}
          </div>
        </div>

        {learningPaths.length === 0 ? (
          <Card className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Lightbulb size={32} />
            </div>
            <Typography variant="h4" className="mb-2">No learning paths yet</Typography>
            <Typography variant="body" color="secondary" className="mb-6 max-w-sm mx-auto">
              Start your journey by creating a new learning path for any topic you want to master.
            </Typography>
            <Button variant="primary" onClick={onCreateNewPath} icon={Plus}>
              Create First Path
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {learningPaths.map(({ graph, seedConcept, conceptCount, levelCount }) => {
              // Convert SeedConceptDisplay to Concept-like object for ConceptCard compatibility
              // ConceptCard only uses name and description, so we create a minimal object
              const conceptForCard = {
                id: seedConcept.id,
                name: seedConcept.name,
                description: seedConcept.description,
                layer: 0,
                isSeed: true,
                sequence: 1,
                parents: [],
                children: [],
                prerequisites: [],
              };
              
              return (
                <ConceptCard
                  key={graph.id}
                  concept={conceptForCard}
                  onClick={() => onLearningPathClick?.(graph.id, seedConcept)}
                  conceptCount={conceptCount}
                  levelCount={levelCount}
                  graphId={graph.id}
                  onDelete={onDeleteLearningPath}
                  onNavigateToMentor={onNavigateToMentor}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {goalFormDialog}
      {firstLayerLoader}
    </DashboardTemplate>
  );
};

LearnPage.displayName = 'LearnPage';
