/**
 * FocusModeTemplate Component
 *
 * Ultra-minimalist design that removes all distractions, focusing entirely on the current learning task.
 * Perfect for deep focus sessions. Uses AppLayoutTemplate for consistent layout structure.
 *
 * Accepts either a flat `LearnTemplateProps` spread (legacy container usage)
 * or a single `entity: FocusModeEntity` prop (page-assembler usage).
 * When `entity` is provided the template uses `useEventBus` internally for
 * all outbound interactions.
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { CompanionBell } from '../../organisms/CompanionBell/CompanionBell';
import { Badge, Box, Button, Card, GraphCanvas, Modal, Spinner, Typography, useEventBus, useTranslate } from '@almadar/ui';
import type { DisplayStateProps } from '@almadar/ui';
import { ConceptCard } from '../../organisms/ConceptCard';
import { GraphHeroTemplate } from '../GraphHeroTemplate';
import { ConnectButton } from '../../molecules/ConnectButton';
import { LessonPanel } from '../../organisms/LessonPanel';
import { Check, ArrowRight, Loader2, BookOpen, GraduationCap, Info, Flag } from 'lucide-react';
import { cn } from '@utils/theme';
import type { LearnTemplateProps, LearnConcept, LearnGoal, LearnLevel, LearnMilestone } from '../LearnTemplates/types';
import ConceptLoader from '../../organisms/ConceptLoader';
import type { LucideIcon } from 'lucide-react';

/** Layout-only nav item shape used by templates. */
export interface FocusModeNavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  active?: boolean;
}

/**
 * Typed entity shape for page-assembler usage.
 * All data the template needs to render — no fetching, no callbacks.
 */
export interface FocusModeEntity {
  goal?: LearnGoal;
  seedConcept?: LearnConcept;
  levels: LearnLevel[];
  viewMode?: 'list' | 'mindmap';
  isLoadingNextLevel?: boolean;
  nextLevelStreamContent?: string;
  focusedLevelId?: string;
  isGeneratingLayerPractice?: boolean;
  layerPracticeStreamContent?: string;
  graphId?: string;
  logoSrc?: string;
  brandName?: string;
  user?: { name: string; email?: string; avatar?: string };
  navigationItems?: FocusModeNavItem[];
  graphNodes?: Array<{ id: string; label: string; layer: number }>;
  graphEdges?: Array<{ source: string; target: string }>;
}

/** Props for entity-based (page-assembler) usage. */
export interface FocusModeTemplateEntityProps extends DisplayStateProps {
  entity: FocusModeEntity;
}

type FocusModeTemplateProps = FocusModeTemplateEntityProps | LearnTemplateProps;

function isEntityProps(props: FocusModeTemplateProps): props is FocusModeTemplateEntityProps {
  return 'entity' in props && props.entity !== undefined;
}

// Stable empty similarity so the GraphCanvas layout effect's dependency list
// doesn't get a fresh array reference every render (which loops setState).
const NO_SIMILARITY: readonly never[] = [];

export const FocusModeTemplate: React.FC<FocusModeTemplateProps> = (props) => {
  const { emit } = useEventBus();
  const { t } = useTranslate();

  // Resolve data from either entity or flat props
  const entityMode = isEntityProps(props);
  const data: FocusModeEntity = entityMode
    ? props.entity
    : {
        goal: (props as LearnTemplateProps).goal,
        seedConcept: (props as LearnTemplateProps).seedConcept,
        levels: (props as LearnTemplateProps).levels,
        viewMode: (props as LearnTemplateProps).viewMode,
        isLoadingNextLevel: (props as LearnTemplateProps).isLoadingNextLevel,
        nextLevelStreamContent: (props as LearnTemplateProps).nextLevelStreamContent,
        focusedLevelId: (props as LearnTemplateProps).focusedLevelId,
        isGeneratingLayerPractice: (props as LearnTemplateProps).isGeneratingLayerPractice,
        layerPracticeStreamContent: (props as LearnTemplateProps).layerPracticeStreamContent,
        graphId: (props as LearnTemplateProps).graphId,
        user: (props as LearnTemplateProps).user,
        navigationItems: (props as LearnTemplateProps).navigationItems,
        logoSrc: (props as LearnTemplateProps).logoSrc,
        brandName: (props as LearnTemplateProps).brandName,
        graphNodes: (props as LearnTemplateProps).graphNodes,
        graphEdges: (props as LearnTemplateProps).graphEdges,
      };

  const flatProps = entityMode ? undefined : (props as LearnTemplateProps);

  const {
    goal,
    seedConcept,
    levels,
    viewMode = 'list',
    isLoadingNextLevel = false,
    nextLevelStreamContent,
    focusedLevelId,
    isGeneratingLayerPractice = false,
    layerPracticeStreamContent,
    user,
    navigationItems,
    logoSrc,
    brandName,
    graphNodes = [],
    graphEdges = [],
  } = data;

  // Interaction handlers — entity mode: emit; legacy mode: call passed callbacks
  const handleConceptClick = useCallback((conceptId: string) => {
    if (entityMode) {
      emit('UI:CONCEPT_CLICK', { conceptId });
    } else {
      flatProps?.onConceptClick?.(conceptId);
    }
  }, [entityMode, emit, flatProps]);

  const handleLoadNextLevel = useCallback(async () => {
    if (entityMode) {
      emit('UI:LOAD_NEXT_LEVEL', {});
    } else {
      await flatProps?.onLoadNextLevel?.();
    }
  }, [entityMode, emit, flatProps]);

  const handleGenerateLayerPractice = useCallback(async (layerNumber: number) => {
    if (entityMode) {
      emit('UI:GENERATE_LAYER_PRACTICE', { layerNumber });
    } else {
      await flatProps?.onGenerateLayerPractice?.(layerNumber);
    }
  }, [entityMode, emit, flatProps]);

  const handleFocusedLevelClear = useCallback(() => {
    if (!entityMode) {
      flatProps?.onFocusedLevelClear?.();
    }
    // entity mode: no-op (page controls focusedLevelId via state)
  }, [entityMode, flatProps]);

  // Track selected level (local state for switching between levels)
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);

  // Modal state for goal/milestone details
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Modal state for level review
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewLevelNumber, setReviewLevelNumber] = useState<number | null>(null);

  // Refs for concept cards to enable scroll-to functionality
  const conceptRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Find selected level (the one being displayed)
  const selectedLevel = useMemo(() => {
    return levels.find(l => l.id === selectedLevelId) || levels[0] || null;
  }, [levels, selectedLevelId]);

  // Find current level (for progress tracking)
  const currentLevel = useMemo(() => {
    return levels.find(l => l.isCurrent) || levels[0] || null;
  }, [levels]);

  // Find next level (if exists) - based on selected level
  const nextLevel = useMemo(() => {
    if (!selectedLevel) return null;
    const selectedIndex = levels.findIndex(l => l.id === selectedLevel.id);
    return selectedIndex >= 0 && selectedIndex < levels.length - 1 ? levels[selectedIndex + 1] : null;
  }, [levels, selectedLevel]);

  // Check if selected level is complete
  const isSelectedLevelComplete = useMemo(() => {
    if (!selectedLevel) return false;
    return selectedLevel.concepts.every(c => c.completed);
  }, [selectedLevel]);

  // Scroll to the first concept without a lesson
  const scrollToFirstUnlearnedConcept = useCallback((level: typeof selectedLevel) => {
    if (!level) return;
    const firstUnlearned = level.concepts.find(c => !c.hasLesson);
    if (firstUnlearned && conceptRefs.current[firstUnlearned.id]) {
      setTimeout(() => {
        conceptRefs.current[firstUnlearned.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, []);

  // Initialize selected level on mount or when levels change
  useEffect(() => {
    if (!selectedLevelId && levels.length > 0) {
      const currentLevelFound = levels.find(l => l.isCurrent);
      const firstIncomplete = levels.find(l => !l.completed);
      setSelectedLevelId(currentLevelFound?.id || firstIncomplete?.id || levels[0]?.id || null);
    }
  }, [levels, selectedLevelId]);

  // Track previous levels count to detect when a new level is added
  const prevLevelsCountRef = useRef(levels.length);

  // Switch to focused level when it changes (e.g., after generating a new level)
  useEffect(() => {
    if (focusedLevelId) {
      const levelExists = levels.find(l => l.id === focusedLevelId);
      if (levelExists) {
        setSelectedLevelId(focusedLevelId);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        setTimeout(() => {
          handleFocusedLevelClear();
        }, 200);
      }
    }
  }, [focusedLevelId, levels, handleFocusedLevelClear]);

  // Auto-switch to new level when levels count increases (backup mechanism)
  useEffect(() => {
    if (levels.length > prevLevelsCountRef.current) {
      const lastLevel = levels[levels.length - 1];
      if (lastLevel && selectedLevelId !== lastLevel.id) {
        setSelectedLevelId(lastLevel.id);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    }
    prevLevelsCountRef.current = levels.length;
  }, [levels, selectedLevelId]);

  // Scroll to first unlearned concept when selected level changes
  useEffect(() => {
    if (selectedLevel && viewMode === 'list') {
      const hasUnlearnedConcepts = selectedLevel.concepts.some(c => !c.hasLesson);
      if (hasUnlearnedConcepts) {
        const timeoutId = setTimeout(() => {
          scrollToFirstUnlearnedConcept(selectedLevel);
        }, 200);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [selectedLevelId, viewMode, scrollToFirstUnlearnedConcept, selectedLevel]);

  // Handle level selection (switch displayed level)
  const handleLevelSelect = (levelId: string) => {
    setSelectedLevelId(levelId);
    const targetLevel = levels.find(l => l.id === levelId);
    if (!targetLevel) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (!entityMode) flatProps?.onLevelClick?.(levelId);
      return;
    }
    const hasUnlearnedConcepts = targetLevel.concepts.some(c => !c.hasLesson);
    if (hasUnlearnedConcepts) {
      setTimeout(() => {
        scrollToFirstUnlearnedConcept(targetLevel);
      }, 150);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (!entityMode) flatProps?.onLevelClick?.(levelId);
  };

  // Find current concept in selected level
  const currentConcept = useMemo(() => {
    if (!selectedLevel) return null;
    return selectedLevel.concepts.find(c => c.isCurrent) || selectedLevel.concepts[0] || null;
  }, [selectedLevel]);

  // Calculate progress based on lessons generated
  const { progressPercentage, lessonsGenerated, totalConcepts } = useMemo(() => {
    const allConcepts = levels.flatMap(l => l.concepts);
    const total = allConcepts.length;
    const withLessons = allConcepts.filter(c => c.hasLesson).length;
    const percentage = total > 0 ? Math.round((withLessons / total) * 100) : 0;
    return { progressPercentage: percentage, lessonsGenerated: withLessons, totalConcepts: total };
  }, [levels]);

  const selectedLevelNumber = selectedLevel?.number || 0;
  const totalLevels = levels.length;

  // Helper to get milestone for a specific level number
  const getMilestoneForLevel = useCallback((levelNumber: number) => {
    if (!goal?.milestones) return null;
    return goal.milestones.find(m => m.levelNumber === levelNumber) || null;
  }, [goal?.milestones]);

  return (
    <>
      {isLoadingNextLevel && (
        <ConceptLoader
          size="lg"
          text={t('learning.generatingNextLevelConcepts')}
          streamContent={nextLevelStreamContent || ''}
          goal={goal?.description}
        />
      )}

      <AppLayoutTemplate
        navigationItems={navigationItems}
        user={user}
        logo={!entityMode ? (props as LearnTemplateProps).logo : undefined}
        logoSrc={logoSrc}
        brandName={brandName}
        contentClassName="w-full"
        contentPadding={false}
        actionsSlot={<CompanionBell />}
      >
        <GraphHeroTemplate
          className="py-2 sm:py-4 md:py-8 px-1 sm:px-2 md:px-4"
          heroSlot={goal ? (
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Typography variant="h1" className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  {goal.title}
                </Typography>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="p-1.5 rounded-full hover:bg-surface-hover transition-colors"
                  title={t('learning.viewGoalDetails')}
                >
                  <Info size={20} className="text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                {goal.assessedLevel && (
                  <>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                      goal.assessedLevel === 'beginner' && "bg-surface text-success",
                      goal.assessedLevel === 'intermediate' && "bg-surface text-primary",
                      goal.assessedLevel === 'advanced' && "bg-surface text-accent"
                    )}>
                      {goal.assessedLevel}
                    </span>
                    <span className="hidden sm:inline">•</span>
                  </>
                )}
                <span>{t('learning.levelOf', { number: String(selectedLevelNumber), total: String(totalLevels) })}</span>
                <span className="hidden sm:inline">•</span>
                <span>{t('learning.lessonsCount', { generated: String(lessonsGenerated), total: String(totalConcepts) })}</span>
                <span className="hidden sm:inline">•</span>
                <span>{t('learning.percentComplete', { percent: String(progressPercentage) })}</span>
              </div>
              <div className="mt-4 w-48 sm:w-64 mx-auto h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-slow"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          ) : undefined}

          canvasSlot={(graphNodes.length > 0 || seedConcept) ? (
            <Card className={cn(
              'relative w-full overflow-hidden animate-slide-up',
              seedConcept?.hasLesson ? 'border-s-4 border-s-success bg-surface' : 'border border-border bg-surface',
            )}>
            {seedConcept && (
              <Box className="flex items-center gap-2 px-4 pt-4">
                <Typography variant="h2" className="flex-1 truncate cursor-pointer" >
                  {seedConcept.name}
                </Typography>
                <ConnectButton
                  iconOnly
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => emit('UI:PEER_CONNECT_OPEN', {
                    nodeKey: `concept:${seedConcept.name}`,
                    context: goal?.description ? `subject: ${goal.description}; seed concept` : 'seed concept',
                  })}
                />
              </Box>
            )}
            {seedConcept?.description && (
              <Box className="px-4 pb-2">
                <Typography variant="small" color="muted" className="line-clamp-2">
                  {seedConcept.description}
                </Typography>
              </Box>
            )}
            {graphNodes.length > 0 && (
              <Box className="mt-1">
                <GraphCanvas
                  nodes={graphNodes}
                  edges={graphEdges}
                  similarity={NO_SIMILARITY}
                  height={340}
                  showLabels
                  interactive
                  draggable
                  repulsion={500}
                  linkDistance={120}
                  nodeSpacing={40}
                  onNodeClick={(node) => handleConceptClick(node.id)}
                  onNodeDoubleClick={(node) => handleConceptClick(node.id)}
                  className="w-full"
                />
              </Box>
            )}
          </Card>
          ) : undefined}

          toolbarSlot={levels.length > 1 ? (
            <div className="w-full -mx-1 sm:mx-0">
              <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-2 px-1 sm:px-2 sm:justify-center scrollbar-hide">
                <div className="flex items-center gap-1 flex-nowrap">
                  {levels.map((level, index) => {
                    const isSelected = level.id === selectedLevelId;
                    const isCompleted = level.completed;
                    return (
                      <React.Fragment key={level.id}>
                        <button
                          onClick={() => handleLevelSelect(level.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all min-w-[56px] sm:min-w-[70px] flex-shrink-0",
                            "hover:bg-surface-hover",
                            isSelected && "bg-surface ring-2 ring-primary shadow-sm"
                          )}
                          title={level.name}
                        >
                          <div className={cn(
                            "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all",
                            isCompleted && "bg-success text-white shadow-md",
                            isSelected && !isCompleted && "bg-primary text-primary-foreground shadow-md",
                            !isSelected && !isCompleted && "bg-muted text-muted-foreground"
                          )}>
                            {isCompleted ? (
                              <Check size={14} className="sm:w-[18px] sm:h-[18px]" />
                            ) : (
                              level.number
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn(
                              "text-[10px] sm:text-xs font-semibold whitespace-nowrap",
                              isSelected && "text-primary",
                              !isSelected && "text-muted-foreground"
                            )}>
                              {t('learning.levelN', { number: String(level.number) })}
                            </span>
                            {level.concepts.length > 0 && (
                              <span className={cn(
                                "text-[9px] sm:text-[10px] font-medium hidden sm:block",
                                isSelected ? "text-primary" : "text-muted-foreground"
                              )}>
                                {t('learning.conceptCount', { count: String(level.concepts.length) })}
                              </span>
                            )}
                          </div>
                        </button>
                        {index < levels.length - 1 && (
                          <div className={cn(
                            "flex-shrink-0 w-3 sm:w-6 h-0.5 transition-colors",
                            isCompleted ? "bg-success" : "bg-border"
                          )} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : undefined}

          listSlot={selectedLevel ? (
            <Card className="w-full p-2 sm:p-4 md:p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">

                  <Typography variant="h2" className="mb-1">
                    {selectedLevel.name}
                  </Typography>
                  {(() => {
                    const levelMilestone = getMilestoneForLevel(selectedLevel.number);
                    return levelMilestone ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Flag size={14} className="text-primary flex-shrink-0" />
                        <Typography variant="small" className="text-primary font-medium">
                          {levelMilestone.title}
                        </Typography>
                      </div>
                    ) : null;
                  })()}
                  {selectedLevel.description && (
                    <Typography variant="body" color="muted" className="mt-2">
                      {selectedLevel.description}
                    </Typography>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                  {selectedLevel.concepts.length > 0 ? (
                    selectedLevel.concepts.map((concept, index) => {
                      const isCurrent = concept.isCurrent || (index === 0 && !currentConcept);
                      const isCompleted = concept.completed;
                      const hasLesson = concept.hasLesson;
                      const isLastConcept = index === selectedLevel.concepts.length - 1;
                      const isLevel1 = selectedLevel.number === 1;
                      const isLastInLevel1 = isLevel1 && isLastConcept;
                      return (
                        <div
                          key={concept.id}
                          ref={(el) => { conceptRefs.current[concept.id] = el; }}
                        >
                          <ConceptCard
                            id={concept.id}
                            name={concept.name}
                            description={concept.description}
                            hasLesson={hasLesson}
                            highlighted={hasLesson}
                            isCurrent={isCurrent}
                            isCompleted={isCompleted}
                            hideLessonBadge={true}
                            prerequisites={concept.prerequisites}
                            parents={concept.parents}
                            onClick={() => handleConceptClick(concept.id)}
                            onConnect={() => emit('UI:PEER_CONNECT_OPEN', {
                              nodeKey: `concept:${concept.name}`,
                              context: goal?.description
                                ? `subject: ${goal.description}; level ${selectedLevel.number}`
                                : `level ${selectedLevel.number}`,
                            })}
                            operations={isCurrent && !isLastInLevel1 ? [
                              {
                                label: hasLesson ? t('learning.continueLearning') : t('learning.beginLearningJourney'),
                                icon: BookOpen,
                                onClick: () => handleConceptClick(concept.id),
                                variant: 'primary'
                              }
                            ] : undefined}
                            className={cn(
                              "cursor-pointer",
                              !isCurrent && !isCompleted && "hover:shadow-md"
                            )}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Typography variant="body">
                        {t('learning.noConceptsInLevel')}
                      </Typography>
                    </div>
                  )}

                  {/* Inline level progression (G4/G5): one lightweight card —
                      preserves continue-to-next / generate-next + level summary. */}
                  {selectedLevel.concepts.length > 0 && (
                    <Card className={cn(
                      'mt-4 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3 animate-slide-up',
                      isSelectedLevelComplete ? 'border-2 border-success bg-surface' : 'border border-border bg-surface',
                    )}>
                      {isSelectedLevelComplete && (
                        <div className="flex items-center gap-2 text-success flex-shrink-0">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-success text-white">
                            <Check size={18} />
                          </span>
                          <Typography variant="small" weight="medium" className="text-success">
                            {t('learning.levelComplete', { number: String(selectedLevel.number) })}
                          </Typography>
                        </div>
                      )}
                      <div className="flex flex-1 flex-wrap items-center justify-end gap-2 w-full">
                        {/* TEMPORARILY HIDDEN: "View Level Summary" button — re-enable by
                            removing the `false &&` guard below. Kept in source so the
                            review-modal wiring (reviewLevelNumber / handleGenerateLayerPractice)
                            stays intact for when it returns. */}
                        {false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={GraduationCap}
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewLevelNumber(selectedLevel.number);
                            setShowReviewModal(true);
                            if (!selectedLevel.review) {
                              handleGenerateLayerPractice(selectedLevel.number).catch((error) => {
                                console.error('Failed to generate layer practice:', error);
                              });
                            }
                          }}
                          disabled={isGeneratingLayerPractice}
                          className="text-muted-foreground"
                        >
                          {isGeneratingLayerPractice ? t('learning.generatingSummary') : t('learning.viewLevelSummary')}
                        </Button>
                        )}
                        {nextLevel ? (
                          <Button
                            variant="primary"
                            size="sm"
                            iconRight={ArrowRight}
                            onClick={(e) => { e.stopPropagation(); handleLevelSelect(nextLevel.id); }}
                          >
                            {t('learning.continueToLevel', { number: String(nextLevel.number) })}
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            iconRight={isLoadingNextLevel ? Loader2 : ArrowRight}
                            disabled={isLoadingNextLevel}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await handleLoadNextLevel();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } catch (error) {
                                console.error('Failed to load next level:', error);
                              }
                            }}
                          >
                            {isLoadingNextLevel ? t('learning.generatingNextLevel') : t('learning.generateNextLevel')}
                          </Button>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
            </Card>
          ) : undefined}
        />
      </AppLayoutTemplate>

      {/* Goal & Milestone Details Modal */}
      <Modal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title={t('knowledge.learningGoal')}
        size="md"
      >
        <div className="space-y-6">
          {goal && (
            <div>
              <Typography variant="h3" className="mb-2 text-lg font-semibold">
                {goal.title}
              </Typography>
              {goal.description && (
                <Typography variant="body" color="muted" className="text-sm leading-relaxed">
                  {goal.description}
                </Typography>
              )}
            </div>
          )}
          <div className="bg-muted rounded-lg p-4">
            <Typography variant="h4" className="text-sm font-semibold mb-3 text-foreground">
              {t('concept.progress')}
            </Typography>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {lessonsGenerated}/{totalConcepts}
                </div>
                <div className="text-xs text-muted-foreground">{t('learning.lessonsGenerated')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {progressPercentage}%
                </div>
                <div className="text-xs text-muted-foreground">{t('learning.done')}</div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-slow"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          {goal?.milestones && goal.milestones.length > 0 && (
            <div>
              <Typography variant="h4" className="text-sm font-semibold mb-3 text-foreground">
                {t('learning.milestones')}
              </Typography>
              <div className="space-y-3">
                {goal.milestones.map((milestone) => {
                  const isCurrentMilestone = milestone.levelNumber === selectedLevelNumber;
                  const isPastMilestone = milestone.levelNumber < selectedLevelNumber;
                  return (
                    <div
                      key={milestone.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        isCurrentMilestone && "border-primary bg-surface",
                        isPastMilestone && "border-border bg-surface opacity-75",
                        !isCurrentMilestone && !isPastMilestone && "border-border"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        isCurrentMilestone && "bg-primary text-primary-foreground",
                        isPastMilestone && "bg-success text-white",
                        !isCurrentMilestone && !isPastMilestone && "bg-muted text-muted-foreground"
                      )}>
                        {isPastMilestone ? <Check size={16} /> : milestone.levelNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Typography variant="h5" className="text-sm font-medium">
                            {milestone.title}
                          </Typography>
                          {isCurrentMilestone && (
                            <Badge variant="primary" size="sm" className="text-xs">
                              {t('learning.current')}
                            </Badge>
                          )}
                          {isPastMilestone && (
                            <Badge variant="success" size="sm" className="text-xs">
                              {t('learning.done')}
                            </Badge>
                          )}
                        </div>
                        {milestone.description && (
                          <Typography variant="small" color="muted" className="mt-1 text-xs">
                            {milestone.description}
                          </Typography>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowGoalModal(false)}
            >
              {t('learning.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Level Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewLevelNumber(null);
        }}
        title={t('learning.levelSummary', { number: String(reviewLevelNumber ?? '') })}
        size="lg"
      >
        {(() => {
          const reviewLevel = levels.find(l => l.number === reviewLevelNumber);
          const reviewMilestone = reviewLevelNumber ? getMilestoneForLevel(reviewLevelNumber) : null;
          return (
            <div className="space-y-4">
              <div className="pb-4 border-b border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                    <GraduationCap size={20} className="text-white" />
                  </div>
                  <div>
                    <Typography variant="h4" className="font-semibold">
                      {t('learning.levelSummary', { number: String(reviewLevelNumber ?? '') })}
                    </Typography>
                    <Typography variant="small" color="muted">
                      {t('learning.levelSummarySubtitle')}
                    </Typography>
                  </div>
                </div>
                {reviewMilestone && (
                  <div className="bg-surface rounded-lg p-3 mt-3 border border-primary">
                    <div className="flex items-center gap-2 mb-1">
                      <Flag size={14} className="text-primary" />
                      <Typography variant="small" className="font-semibold text-primary">
                        Milestone
                      </Typography>
                    </div>
                    <Typography variant="body" className="text-foreground">
                      {reviewMilestone.title}
                    </Typography>
                    {reviewMilestone.description && (
                      <Typography variant="small" color="muted" className="mt-1">
                        {reviewMilestone.description}
                      </Typography>
                    )}
                  </div>
                )}
                {reviewLevel && reviewLevel.concepts.length > 0 && (
                  <div className="mt-3">
                    <Typography variant="small" className="font-semibold text-muted-foreground mb-2">
                      {t('learning.conceptsCovered', { count: String(reviewLevel.concepts.length) })}
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {reviewLevel.concepts.map((concept) => (
                        <Badge
                          key={concept.id}
                          variant={concept.hasLesson ? "success" : "default"}
                          size="sm"
                          className={concept.hasLesson
                            ? "bg-surface text-success border-border"
                            : "bg-muted text-muted-foreground"
                          }
                        >
                          {concept.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="min-h-[300px] max-h-[60vh] overflow-y-auto">
                {isGeneratingLayerPractice && !layerPracticeStreamContent ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Spinner size="lg" className="mb-4" />
                    <Typography variant="body" color="muted">
                      {t('learning.generatingLevelSummary')}
                    </Typography>
                    <Typography variant="small" color="muted" className="mt-2 text-center max-w-sm">
                      {t('learning.generatingSummaryDesc')}
                    </Typography>
                  </div>
                ) : layerPracticeStreamContent ? (
                  <div className="prose max-w-none">
                    <LessonPanel
                      renderedLesson={layerPracticeStreamContent}
                      conceptHasLesson={true}
                      isGenerating={isGeneratingLayerPractice}
                    />
                  </div>
                ) : reviewLevel?.review ? (
                  <div className="prose max-w-none">
                    <LessonPanel
                      renderedLesson={reviewLevel.review}
                      conceptHasLesson={true}
                      isGenerating={false}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <GraduationCap size={48} className="text-muted-foreground mb-4" />
                    <Typography variant="body" color="muted" className="max-w-sm mb-4">
                      {t('learning.generateSummaryPrompt')}
                    </Typography>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={async () => {
                        if (reviewLevelNumber !== null) {
                          try {
                            await handleGenerateLayerPractice(reviewLevelNumber);
                          } catch (error) {
                            console.error('Failed to generate layer practice:', error);
                          }
                        }
                      }}
                      disabled={isGeneratingLayerPractice}
                      iconRight={GraduationCap}
                      className=""
                    >
                      {t('learning.generateSummary')}
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center gap-3 pt-4 border-t border-border">
                <div>
                  {reviewLevel?.review && !isGeneratingLayerPractice && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (reviewLevelNumber !== null) {
                          try {
                            await handleGenerateLayerPractice(reviewLevelNumber);
                          } catch (error) {
                            console.error('Failed to regenerate summary:', error);
                          }
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {t('learning.regenerate')}
                    </Button>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewLevelNumber(null);
                  }}
                >
                  {t('learning.close')}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
};
