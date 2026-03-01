/**
 * ConceptDetailTemplate Component
 * 
 * Focused detail view for a single concept with editable content, 
 * lesson management, flashcards, and AI operations.
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Spinner } from '../../atoms/Spinner';
import { Tabs } from '../../molecules/Tabs';
import { Card } from '../../molecules/Card';
import { SidePanel } from '../../molecules/SidePanel';
import { ConceptNavigation } from '../../molecules/ConceptNavigation';
import { cn } from '../../../utils/theme';

export interface ConceptDetailTemplateProps {
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
   * Concept header section (ConceptDetailPanel)
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
   * Current active tab
   */
  activeTab?: string;

  /**
   * Tab change handler
   */
  onTabChange?: (tab: string) => void;

  /**
   * Custom tabs configuration
   */
  tabs?: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
    badge?: string | number;
  }>;

  /**
   * Additional header actions
   */
  headerActions?: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Children content (alternative to tabs)
   */
  children?: React.ReactNode;
}

export const ConceptDetailTemplate: React.FC<ConceptDetailTemplateProps> = ({
  concept,
  loading = false,
  error,
  onBack,
  backLabel = 'Back',
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
  activeTab = 'content',
  onTabChange,
  tabs,
  headerActions,
  className,
  children,
}) => {
  const [internalTab, setInternalTab] = useState(activeTab);
  const [isMobile, setIsMobile] = useState(false);
  const [showOperationPanel, setShowOperationPanel] = useState(isOperationPanelOpen);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external state
  useEffect(() => {
    setInternalTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    setShowOperationPanel(isOperationPanelOpen);
  }, [isOperationPanelOpen]);

  const handleTabChange = (tab: string) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const handleOperationPanelToggle = () => {
    const newState = !showOperationPanel;
    setShowOperationPanel(newState);
    onOperationPanelToggle?.(newState);
  };

  // Build default content - no tabs, just display everything directly
  const defaultContent = tabs ? null : (
    <div className="space-y-6">
      {content}
      {lessonPanel && (
        <div className="mt-6">
          {lessonPanel}
        </div>
      )}
      
      {/* Next/Previous Concept Navigation */}
      {(previousConcept || nextConcept) && (
        <ConceptNavigation
          previousConcept={previousConcept}
          nextConcept={nextConcept}
          onPreviousClick={onPreviousConceptClick}
          onNextClick={onNextConceptClick}
        />
      )}
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <Typography variant="body" color="secondary">
              Loading concept...
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
        <div className="flex items-center justify-center h-screen">
          <Card className="p-6 max-w-md">
            <Typography variant="h5" className="text-red-600 mb-2">
              Error Loading Concept
            </Typography>
            <Typography variant="body" color="secondary">
              {error}
            </Typography>
            {onBack && (
              <Button variant="secondary" onClick={onBack} className="mt-4">
                Go Back
              </Button>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: Back button and title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={onBack}
                className="shrink-0"
              >
                <span className="hidden sm:inline">{backLabel}</span>
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Typography variant="h6" className="truncate">
                  {concept?.name || 'Concept Detail'}
                </Typography>
                {concept?.layer !== undefined && (
                  <Badge variant="default" size="sm">
                    Layer {concept.layer}
                  </Badge>
                )}
                {concept?.isSeed && (
                  <Badge variant="info" size="sm">
                    Seed
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            {operationPanel && (
              <Button
                variant={showOperationPanel ? 'primary' : 'ghost'}
                size="sm"
                icon={Sparkles}
                onClick={handleOperationPanelToggle}
                className="shrink-0"
              >
                <span className="hidden sm:inline">
                  {showOperationPanel ? 'Hide' : 'AI'} Operations
                </span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content area with optional side panel */}
      <div className="flex">
        {/* Main content */}
        <main className={cn(
          'flex-1 min-w-0 transition-all duration-300',
          showOperationPanel && !isMobile ? 'lg:mr-80' : ''
        )}>
          {/* Concept Header */}
          {conceptHeader && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                {conceptHeader}
              </div>
            </div>
          )}

          {/* Content - no tabs, display directly */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            {children ? (
              children
            ) : tabs ? (
              <Tabs
                items={tabs.map(tab => ({
                  id: tab.id,
                  label: tab.label,
                  content: tab.content,
                  badge: tab.badge,
                }))}
                activeTab={internalTab}
                onTabChange={handleTabChange}
              />
            ) : (
              defaultContent
            )}
          </div>
        </main>

        {/* Operation Panel - automatically converts to modal on mobile */}
        {operationPanel && (
          <SidePanel
            title="AI Operations"
            isOpen={showOperationPanel}
            onClose={handleOperationPanelToggle}
            width="w-80"
          >
            {operationPanel}
          </SidePanel>
        )}
      </div>
    </div>
  );
};

ConceptDetailTemplate.displayName = 'ConceptDetailTemplate';
