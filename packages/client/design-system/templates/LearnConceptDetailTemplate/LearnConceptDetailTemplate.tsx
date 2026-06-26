/**
 * LearnConceptDetailTemplate Component
 *
 * Minimalist detail view for a single concept that complements FocusModeTemplate.
 * Ultra-clean design focused on reading and learning content.
 * Uses AppLayoutTemplate for consistent layout structure.
 *
 * Accepts either a flat `LearnConceptDetailTemplateProps` spread (legacy container usage)
 * or a single `entity: ConceptDetailTemplateEntity` prop (page-assembler usage).
 * When `entity` is provided the template emits `UI:PREVIOUS_CONCEPT`,
 * `UI:NEXT_CONCEPT`, and `UI:NAVIGATE` events via `useEventBus`.
 */

import React from 'react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { Badge, Box, Button, Card, HStack, Typography, VStack, useEventBus, useTranslate } from '@almadar/ui';
import type { DisplayStateProps } from '@almadar/ui';
import { ArrowLeft, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Layout-only nav item shape used by this template. */
export interface ConceptDetailNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  active?: boolean;
}

/** Concept summary shape passed to the template. */
export interface TemplateConcept {
  id: string;
  name: string;
  description?: string;
  layer?: number;
  isSeed?: boolean;
}

/** Seed concept call-to-action shape for entity mode. */
export interface SeedConceptCta {
  /** Button label */
  label: string;
  /** ID of the concept to navigate to on click */
  conceptId: string;
  /** Display name (used in aria / title) */
  conceptName: string;
}

/**
 * Typed entity shape for page-assembler usage.
 * All data the template needs to render — no fetching, no callbacks.
 */
export interface ConceptDetailTemplateEntity {
  concept?: TemplateConcept;
  previousConcept?: { id: string; name: string };
  nextConcept?: { id: string; name: string };
  /** CTA shown on seed concepts to start Level 1. */
  seedConceptCta?: SeedConceptCta;
  /** Lesson panel JSX built by the page assembler. */
  lessonPanel?: React.ReactNode;
  backLabel?: string;
  user?: { name: string; email?: string; avatar?: string };
  navigationItems?: ConceptDetailNavItem[];
  logoSrc?: string;
  brandName?: string;
}

/** Props for entity-based (page-assembler) usage. */
export interface LearnConceptDetailEntityProps extends DisplayStateProps {
  entity: ConceptDetailTemplateEntity;
}

export interface LearnConceptDetailTemplateProps {
  concept?: TemplateConcept;
  loading?: boolean;
  error?: string | null;
  onBack?: () => void;
  backLabel?: string;
  lessonPanel?: React.ReactNode;
  previousConcept?: { id: string; name: string };
  nextConcept?: { id: string; name: string };
  onPreviousConceptClick?: (concept: { id: string; name: string }) => void;
  onNextConceptClick?: (concept: { id: string; name: string }) => void;
  seedConceptAction?: { label: string; onClick: () => void };
  user?: { name: string; email?: string; avatar?: string };
  navigationItems?: ConceptDetailNavItem[];
  /** @deprecated Handled by UIEventBridge */
  onLogout?: () => void;
  logo?: React.ReactNode;
  logoSrc?: string;
  brandName?: string;
  /** @deprecated Handled by UIEventBridge */
  onLogoClick?: () => void;
  className?: string;
}

type AllProps = LearnConceptDetailEntityProps | LearnConceptDetailTemplateProps;

function isEntityProps(p: AllProps): p is LearnConceptDetailEntityProps {
  return 'entity' in p && p.entity !== undefined;
}

export const LearnConceptDetailTemplate: React.FC<AllProps> = (props) => {
  const { emit } = useEventBus();
  const { t } = useTranslate();

  const entityMode = isEntityProps(props);
  const flat = entityMode ? undefined : (props as LearnConceptDetailTemplateProps);

  const concept = entityMode ? props.entity.concept : flat?.concept;
  const loading = entityMode ? (props as LearnConceptDetailEntityProps).isLoading ?? false : flat?.loading ?? false;
  const error = entityMode ? ((props as LearnConceptDetailEntityProps).error?.message ?? null) : flat?.error ?? null;
  const backLabel = entityMode ? (props.entity.backLabel ?? 'Back') : (flat?.backLabel ?? 'Back');
  const lessonPanel = entityMode ? props.entity.lessonPanel : flat?.lessonPanel;
  const previousConcept = entityMode ? props.entity.previousConcept : flat?.previousConcept;
  const nextConcept = entityMode ? props.entity.nextConcept : flat?.nextConcept;
  const user = entityMode ? props.entity.user : flat?.user;
  const navigationItems = entityMode ? props.entity.navigationItems : flat?.navigationItems;
  const logo = !entityMode ? flat?.logo : undefined;
  const logoSrc = entityMode ? props.entity.logoSrc : flat?.logoSrc;
  const brandName = entityMode ? props.entity.brandName : flat?.brandName;

  const seedConceptAction = entityMode
    ? (props.entity.seedConceptCta
        ? {
            label: props.entity.seedConceptCta.label,
            onClick: () => emit('UI:NAVIGATE', { url: `/concepts/${props.entity.seedConceptCta?.conceptId}` }),
          }
        : undefined)
    : flat?.seedConceptAction;

  const handleBack = () => {
    if (entityMode) {
      emit('UI:NAVIGATE_BACK', {});
    } else {
      flat?.onBack?.();
    }
  };

  const handlePrevious = (c: { id: string; name: string }) => {
    if (entityMode) {
      emit('UI:PREVIOUS_CONCEPT', { conceptId: c.id, name: c.name });
    } else {
      flat?.onPreviousConceptClick?.(c);
    }
  };

  const handleNext = (c: { id: string; name: string }) => {
    if (entityMode) {
      emit('UI:NEXT_CONCEPT', { conceptId: c.id, name: c.name });
    } else {
      flat?.onNextConceptClick?.(c);
    }
  };

  if (loading) {
    return (
      <AppLayoutTemplate
        navigationItems={navigationItems}
        user={user}
        logo={logo}
        logoSrc={logoSrc}
        brandName={brandName}
        contentClassName="w-full md:max-w-4xl md:mx-auto"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <Typography variant="body" color="muted">{t('learning.loadingConcept')}</Typography>
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
        logo={logo}
        logoSrc={logoSrc}
        brandName={brandName}
        contentClassName="w-full md:max-w-4xl md:mx-auto"
      >
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-4 sm:p-8 text-center">
            <Typography variant="h3" className="mb-4 text-error">
              {t('learning.error')}
            </Typography>
            <Typography variant="body" color="muted" className="mb-6">
              {error}
            </Typography>
            <Button variant="secondary" onClick={handleBack} icon={ArrowLeft}>
              {backLabel}
            </Button>
          </Card>
        </div>
      </AppLayoutTemplate>
    );
  }

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      logo={logo}
      logoSrc={logoSrc}
      brandName={brandName}
      contentClassName="w-full md:max-w-4xl md:mx-auto"
      contentPadding={false}
    >
      <div className="min-h-screen py-2 sm:py-4 md:py-8 px-1 sm:px-2 md:px-4">
        {/* Back Button */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Button
            variant="secondary"
            onClick={handleBack}
            icon={ArrowLeft}
            size="sm"
          >
            {backLabel}
          </Button>
        </div>

        {/* Concept Header */}
        {concept && (
          <div className="text-center mb-4 sm:mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              {concept.isSeed && (
                <Badge variant="primary">
                  {t('concept.seedConcept')}
                </Badge>
              )}
              {concept.layer !== undefined && (
                <Badge variant="default">
                  {t('learning.levelN', { number: String(concept.layer) })}
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
                  className="font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-4 rounded-lg"
                  iconRight={ArrowRight}
                >
                  {seedConceptAction.label}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Lesson Panel */}
        {lessonPanel && (
          <div className="mb-4 sm:mb-6 md:mb-8">
            {lessonPanel}
          </div>
        )}

        {/* Concept Navigation */}
        {(previousConcept || nextConcept) && (
          <HStack justify="between" align="center" gap="md">
            {previousConcept ? (
              <Button
                variant="secondary"
                onClick={() => handlePrevious(previousConcept)}
                icon={ChevronLeft}
                className="h-auto py-3 px-4 gap-3"
              >
                <VStack gap="none" align="start" className="min-w-0 text-left">
                  <Typography variant="caption" color="muted">{t('lesson.previous')}</Typography>
                  <Typography variant="small" weight="medium" className="truncate">{previousConcept.name}</Typography>
                </VStack>
              </Button>
            ) : (
              <Box />
            )}
            {nextConcept ? (
              <Button
                variant="primary"
                onClick={() => handleNext(nextConcept)}
                iconRight={ChevronRight}
                className="h-auto py-3 px-4 gap-3"
              >
                <VStack gap="none" align="end" className="min-w-0 text-right">
                  <Typography variant="caption" className="opacity-80">{t('lesson.next')}</Typography>
                  <Typography variant="small" weight="medium" className="truncate">{nextConcept.name}</Typography>
                </VStack>
              </Button>
            ) : (
              <Box />
            )}
          </HStack>
        )}
      </div>
    </AppLayoutTemplate>
  );
};
