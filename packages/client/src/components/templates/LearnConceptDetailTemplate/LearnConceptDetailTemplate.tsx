/**
 * LearnConceptDetailTemplate Component
 * 
 * Minimalist detail view for a single concept that complements FocusModeTemplate.
 * Ultra-clean design focused on reading and learning content.
 * Uses AppLayoutTemplate for consistent layout structure.
 */

import React from 'react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { Card } from '../../molecules/Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { ConceptNavigation } from '../../molecules/ConceptNavigation';
import { ArrowLeft, ChevronLeft, ChevronRight, ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface LearnConceptDetailTemplateProps {
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
   * Error message
   */
  error?: string | null;

  /**
   * Back button handler
   */
  onBack?: () => void;

  /**
   * Custom back button label
   */
  backLabel?: string;

  /**
   * Lesson panel content (uses ConceptLessonPanel with segment renderers)
   */
  lessonPanel?: React.ReactNode;

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
   * Action button for seed concept (e.g., "Go to First Concept in Next Level")
   */
  seedConceptAction?: {
    label: string;
    onClick: () => void;
  };

  /**
   * AppLayout props
   */
  user?: { name: string; email?: string; avatar?: string };
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: any;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  onLogout?: () => void;
  logo?: React.ReactNode;
  onLogoClick?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const LearnConceptDetailTemplate: React.FC<LearnConceptDetailTemplateProps> = ({
  concept,
  loading = false,
  error,
  onBack,
  backLabel = 'Back',
  lessonPanel,
  previousConcept,
  nextConcept,
  onPreviousConceptClick,
  onNextConceptClick,
  seedConceptAction,
  user,
  navigationItems,
  onLogout,
  logo,
  onLogoClick,
  className,
}) => {
  if (loading) {
    return (
      <AppLayoutTemplate
        navigationItems={navigationItems}
        user={user}
        onLogout={onLogout}
        logo={logo}
        onLogoClick={onLogoClick}
        contentClassName="w-full md:max-w-4xl md:mx-auto"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <Typography variant="body" color="muted">Loading concept...</Typography>
          </div>
        </div>
      </AppLayoutTemplate>
    );
  }

  if (error) {
    return (
      <AppLayoutTemplate
        navigationItems={navigationItems}
        user={user}
        onLogout={onLogout}
        logo={logo}
        onLogoClick={onLogoClick}
        contentClassName="w-full md:max-w-4xl md:mx-auto"
      >
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-4 sm:p-8 text-center">
            <Typography variant="h3" className="mb-4 text-red-600 dark:text-red-400">
              Error
            </Typography>
            <Typography variant="body" color="muted" className="mb-6">
              {error}
            </Typography>
            {onBack && (
              <Button variant="secondary" onClick={onBack} icon={ArrowLeft}>
                {backLabel}
              </Button>
            )}
          </Card>
        </div>
      </AppLayoutTemplate>
    );
  }

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      onLogoClick={onLogoClick}
      contentClassName="w-full md:max-w-4xl md:mx-auto"
      contentPadding={false}
    >
      <div className="min-h-screen py-2 sm:py-4 md:py-8 px-1 sm:px-2 md:px-4">
        {/* Back Button */}
        {onBack && (
          <div className="mb-4 sm:mb-6 md:mb-8">
            <Button
              variant="secondary"
              onClick={onBack}
              icon={ArrowLeft}
              size="sm"
            >
              {backLabel}
            </Button>
          </div>
        )}

        {/* Concept Header */}
        {concept && (
          <div className="text-center mb-4 sm:mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              {concept.isSeed && (
                <Badge variant="primary" className="bg-purple-500">
                  Seed Concept
                </Badge>
              )}
              {concept.layer !== undefined && (
                <Badge variant="default">
                  Level {concept.layer}
                </Badge>
              )}
            </div>
            <Typography variant="h1" className="mb-4 text-4xl font-bold">
              {concept.name}
            </Typography>
            {concept.description && (
              <Typography variant="body" color="muted" className="max-w-2xl mx-auto text-lg leading-relaxed">
                {concept.description}
              </Typography>
            )}
            {concept.isSeed && seedConceptAction && (
              <div className="mt-6">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={seedConceptAction.onClick}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-4 rounded-lg"
                  iconRight={ArrowRight}
                >
                  {seedConceptAction.label}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Lesson Panel - Uses ConceptLessonPanel with segment renderers */}
        {lessonPanel && (
          <div className="mb-4 sm:mb-6 md:mb-8">
            {lessonPanel}
          </div>
        )}

        {/* Concept Navigation */}
        {(previousConcept || nextConcept) && (
          <div className="flex items-center justify-between gap-4">
            {previousConcept ? (
              <Button
                variant="secondary"
                onClick={() => onPreviousConceptClick?.(previousConcept)}
                icon={ChevronLeft}
                className="flex-1"
              >
                <div className="text-left">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Previous</div>
                  <div className="font-medium">{previousConcept.name}</div>
                </div>
              </Button>
            ) : (
              <div className="flex-1" />
            )}
            
            {nextConcept ? (
              <Button
                variant="primary"
                onClick={() => onNextConceptClick?.(nextConcept)}
                iconRight={ChevronRight}
                className="flex-1"
              >
                <div className="text-left">
                  <div className="text-xs text-white/80 mb-1">Next</div>
                  <div className="font-medium">{nextConcept.name}</div>
                </div>
              </Button>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        )}
      </div>
    </AppLayoutTemplate>
  );
};

