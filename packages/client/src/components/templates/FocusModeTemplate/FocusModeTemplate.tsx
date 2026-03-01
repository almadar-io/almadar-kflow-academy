/**
 * FocusModeTemplate Component
 * 
 * Ultra-minimalist design that removes all distractions, focusing entirely on the current learning task.
 * Perfect for deep focus sessions. Uses AppLayoutTemplate for consistent layout structure.
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { Card } from '../../molecules/Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Modal } from '../../molecules/Modal';
import { Spinner } from '../../atoms/Spinner';
import { ConceptCard } from '../../organisms/ConceptCard';
import { TreeMap, TreeMapNode } from '../../organisms/TreeMap';
import { LessonPanel } from '../../organisms/LessonPanel';
import { Check, ArrowRight, GitBranch, List, Sparkles, Loader2, BookOpen, GraduationCap, Info, Flag, X } from 'lucide-react';
import { cn } from '../../../utils/theme';
import type { LearnTemplateProps, LearnConcept } from '../LearnTemplates/types';
import ConceptLoader from '../../../features/concepts/components/ConceptLoader';

export const FocusModeTemplate: React.FC<LearnTemplateProps> = ({
  goal,
  seedConcept,
  levels,
  viewMode = 'list',
  onViewModeChange,
  onConceptClick,
  onLevelClick,
  onLoadNextLevel,
  isLoadingNextLevel = false,
  nextLevelStreamContent,
  focusedLevelId,
  onFocusedLevelClear,
  onGenerateLayerPractice,
  isGeneratingLayerPractice = false,
  layerPracticeStreamContent,
  graphId,
  onBack,
  user,
  navigationItems,
  onLogout,
  logo,
  onLogoClick,
  graphNodes = [],
  graphEdges = [],
}) => {
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
    
    // Find the first concept without a lesson
    const firstUnlearned = level.concepts.find(c => !c.hasLesson);
    
    if (firstUnlearned && conceptRefs.current[firstUnlearned.id]) {
      // Small delay to ensure DOM is ready
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
      // Find current level or default to first incomplete level or first level
      const currentLevelFound = levels.find(l => l.isCurrent);
      const firstIncomplete = levels.find(l => !l.completed);
      setSelectedLevelId(currentLevelFound?.id || firstIncomplete?.id || levels[0]?.id || null);
    }
  }, [levels, selectedLevelId]);

  // Track previous levels count to detect when a new level is added
  const prevLevelsCountRef = useRef(levels.length);
  
  // Switch to focused level when it changes (e.g., after generating a new level)
  // This effect watches both focusedLevelId AND levels - when a new level is generated,
  // focusedLevelId is set first, then levels updates after refetch completes.
  // We switch when the focused level becomes available in the levels array.
  useEffect(() => {
    if (focusedLevelId) {
      const levelExists = levels.find(l => l.id === focusedLevelId);
      console.log('[FocusModeTemplate] focusedLevelId:', focusedLevelId, 'levelExists:', !!levelExists, 'levels:', levels.map(l => l.id));
      if (levelExists) {
        console.log('[FocusModeTemplate] Switching to focused level:', focusedLevelId);
        setSelectedLevelId(focusedLevelId);
        // Scroll to top after switching with a small delay to ensure render is complete
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        // Clear the focused level after a delay to ensure state update is processed
        setTimeout(() => {
          onFocusedLevelClear?.();
        }, 200);
      }
    }
  }, [focusedLevelId, levels, onFocusedLevelClear]);

  // Auto-switch to new level when levels count increases (backup mechanism)
  useEffect(() => {
    if (levels.length > prevLevelsCountRef.current) {
      console.log('[FocusModeTemplate] Levels count increased from', prevLevelsCountRef.current, 'to', levels.length);
      // A new level was added, switch to the last one
      const lastLevel = levels[levels.length - 1];
      if (lastLevel && selectedLevelId !== lastLevel.id) {
        console.log('[FocusModeTemplate] Auto-switching to new level:', lastLevel.id);
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
      // Check if this level has any concepts without lessons
      const hasUnlearnedConcepts = selectedLevel.concepts.some(c => !c.hasLesson);
      
      if (hasUnlearnedConcepts) {
        // Small delay to ensure the concepts are rendered
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
    
    // Find the level being selected
    const targetLevel = levels.find(l => l.id === levelId);
    
    if (!targetLevel) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onLevelClick?.(levelId);
      return;
    }
    
    // Check if this level has any concepts without lessons
    const hasUnlearnedConcepts = targetLevel.concepts.some(c => !c.hasLesson);
    
    if (hasUnlearnedConcepts) {
      // Scroll to first unlearned concept after a small delay for render
      setTimeout(() => {
        scrollToFirstUnlearnedConcept(targetLevel);
      }, 150);
    } else {
      // Scroll to top if all concepts have lessons
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Optionally notify parent
    onLevelClick?.(levelId);
  };

  // Find current concept in selected level
  const currentConcept = useMemo(() => {
    if (!selectedLevel) return null;
    return selectedLevel.concepts.find(c => c.isCurrent) || selectedLevel.concepts[0] || null;
  }, [selectedLevel]);

  // Calculate progress based on lessons generated
  const { progressPercentage, lessonsGenerated, totalConcepts } = useMemo(() => {
    // Count all concepts across all levels (excluding seed)
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

  // Build mindmap tree structure if in mindmap view - shows ALL levels
  const mindmapData: TreeMapNode | null = useMemo(() => {
    if (viewMode !== 'mindmap') return null;
    
    // Create root with seed concept and all levels
    const rootNode: TreeMapNode = {
      id: 'root',
      label: goal?.title || 'Learning Path',
      isRoot: true,
      children: [
        // Seed concept as first child
        ...(seedConcept ? [{
          id: seedConcept.id,
          label: seedConcept.name,
          description: seedConcept.description,
          color: '#8b5cf6', // Purple for seed
        }] : []),
        // All levels as children
        ...levels.map((level) => ({
          id: level.id,
          label: level.name,
          color: level.completed ? '#22c55e' : (level.id === selectedLevelId ? '#6366f1' : undefined), // Green for completed, indigo for selected
          children: level.concepts.map(concept => ({
            id: concept.id,
            label: concept.name,
            description: concept.description,
            color: concept.hasLesson ? '#10b981' : undefined, // Emerald for concepts with lessons
          })),
        })),
      ],
    };
    
    return rootNode;
  }, [levels, viewMode, goal, seedConcept, selectedLevelId]);

  return (
    <>
      {/* ConceptLoader for loading next level */}
      {isLoadingNextLevel && (
        <ConceptLoader
          size="lg"
          text="Generating next level concepts..."
          streamContent={nextLevelStreamContent || ''}
          goal={goal?.description}
        />
      )}

      <AppLayoutTemplate
        navigationItems={navigationItems}
        user={user}
        onLogout={onLogout}
        logo={logo}
        onLogoClick={onLogoClick}
        contentClassName="w-full md:max-w-4xl md:mx-auto"
        contentPadding={false}
      >
        <div className="min-h-screen flex flex-col items-center py-2 sm:py-4 md:py-8 px-1 sm:px-2 md:px-4">
        {/* Goal Header - Centered and Minimal */}
        {goal && (
          <div className="text-center mb-3 sm:mb-6 md:mb-8 w-full">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Typography variant="h1" className="text-2xl sm:text-3xl md:text-4xl font-bold">
                {goal.title}
              </Typography>
              <button
                onClick={() => setShowGoalModal(true)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="View goal details"
              >
                <Info size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-wrap">
              {goal.assessedLevel && (
                <>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                    goal.assessedLevel === 'beginner' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    goal.assessedLevel === 'intermediate' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    goal.assessedLevel === 'advanced' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  )}>
                    {goal.assessedLevel}
                  </span>
                  <span className="hidden sm:inline">•</span>
                </>
              )}
              <span>Level {selectedLevelNumber} of {totalLevels}</span>
              <span className="hidden sm:inline">•</span>
              <span>{lessonsGenerated}/{totalConcepts} lessons</span>
              <span className="hidden sm:inline">•</span>
              <span>{progressPercentage}% Complete</span>
            </div>
            <div className="mt-4 w-48 sm:w-64 mx-auto h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Seed Concept Card - Centered */}
        {seedConcept && (
          <Card className="w-full md:max-w-2xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-6 md:mb-8 border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
            <div className="text-center">
              <Typography variant="h2" className="mb-2">
                {seedConcept.name}
              </Typography>
              {seedConcept.description && (
                <Typography variant="body" color="muted" className="mb-6">
                  {seedConcept.description}
                </Typography>
              )}
              <Button
                variant="primary"
                onClick={() => onConceptClick?.(seedConcept.id)}
                iconRight={ArrowRight}
              >
                Explore Concept
              </Button>
            </div>
          </Card>
        )}

        {/* Level Navigation - Cleaner Design */}
        {levels.length > 1 && (
          <div className="w-full mb-4 sm:mb-6 md:mb-8 -mx-1 sm:mx-0">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 px-1 sm:px-2 sm:justify-center scrollbar-hide">
              <div className="flex items-center gap-1 flex-nowrap">
                {levels.map((level, index) => {
                  const isSelected = level.id === selectedLevelId;
                  const isCompleted = level.completed;
                  const isCurrent = level.id === currentLevel?.id; // For progress tracking
                  
                  return (
                    <React.Fragment key={level.id}>
                      <button
                        onClick={() => handleLevelSelect(level.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all min-w-[56px] sm:min-w-[70px] flex-shrink-0",
                          "hover:bg-gray-100 dark:hover:bg-gray-700",
                          isSelected && "bg-indigo-100 dark:bg-indigo-900/30 ring-2 ring-indigo-500 shadow-sm"
                        )}
                        title={level.name}
                      >
                        <div className={cn(
                          "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all",
                          isCompleted && "bg-green-500 text-white shadow-md",
                          isSelected && !isCompleted && "bg-indigo-500 text-white shadow-md",
                          !isSelected && !isCompleted && "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
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
                            isSelected && "text-indigo-600 dark:text-indigo-400",
                            !isSelected && "text-gray-600 dark:text-gray-400"
                          )}>
                            L{level.number}
                          </span>
                          {level.concepts.length > 0 && (
                            <span className={cn(
                              "text-[9px] sm:text-[10px] font-medium hidden sm:block",
                              isSelected ? "text-indigo-500 dark:text-indigo-400" : "text-gray-500 dark:text-gray-500"
                            )}>
                              {level.concepts.length} {level.concepts.length === 1 ? 'concept' : 'concepts'}
                            </span>
                          )}
                        </div>
                      </button>
                      {index < levels.length - 1 && (
                        <div className={cn(
                          "flex-shrink-0 w-3 sm:w-6 h-0.5 transition-colors",
                          isCompleted ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                        )} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Selected Level Section */}
        {selectedLevel && (
          <Card className="w-full md:max-w-2xl p-2 sm:p-4 md:p-6 mb-3 sm:mb-6 md:mb-8">
            {/* Header with View Toggle */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="primary">
                    Level {selectedLevel.number}
                  </Badge>
                  {selectedLevel.completed && (
                    <Badge variant="success" className="bg-green-500">
                      Complete
                    </Badge>
                  )}
                  {selectedLevel.id === currentLevel?.id && !selectedLevel.completed && (
                    <Badge variant="default" className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                      Current
                    </Badge>
                  )}
                </div>
                <Typography variant="h2" className="mb-1">
                  {selectedLevel.name}
                </Typography>
                {/* Milestone for this level */}
                {(() => {
                  const levelMilestone = getMilestoneForLevel(selectedLevel.number);
                  return levelMilestone ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Flag size={14} className="text-indigo-500 flex-shrink-0" />
                      <Typography variant="small" className="text-indigo-600 dark:text-indigo-400 font-medium">
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
              
              {/* View Toggle - Top Right */}
              <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                <button
                  onClick={() => onViewModeChange?.('list')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'list'
                      ? "bg-indigo-600 text-white"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  title="List view"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => onViewModeChange?.('mindmap')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'mindmap'
                      ? "bg-indigo-600 text-white"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  title="Mindmap view"
                >
                  <GitBranch size={18} />
                </button>
              </div>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'list' ? (
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
                          onClick={() => onConceptClick?.(concept.id)}
                          operations={isCurrent && !isLastInLevel1 ? [
                            {
                              label: hasLesson ? 'Continue Learning' : 'Begin Learning Journey',
                              icon: BookOpen,
                              onClick: () => onConceptClick?.(concept.id),
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
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Typography variant="body">
                      No concepts in this level yet
                    </Typography>
                  </div>
                )}
                
                {/* Level Completion Decision Card - Shows at the end of every level */}
                {selectedLevel.concepts.length > 0 && (
                  <Card className="mt-3 sm:mt-6 p-3 sm:p-4 md:p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-800">
                    <div className="text-center mb-4">
                      <Typography variant="h3" className="mb-2 text-indigo-900 dark:text-indigo-100">
                        🎉 Level {selectedLevel.number} Complete!
                          </Typography>
                          <Typography variant="body" color="muted" className="text-base">
                            You've mastered all the foundational concepts. What would you like to do next?
                          </Typography>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                          {nextLevel ? (
                            <Button
                              variant="primary"
                              size="md"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLevelSelect(nextLevel.id);
                              }}
                              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-lg flex-1"
                              iconRight={ArrowRight}
                            >
                              Continue to Level {nextLevel.number}
                            </Button>
                          ) : onLoadNextLevel ? (
                            <Button
                              variant="primary"
                              size="md"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await onLoadNextLevel();
                                  // Scroll to top after loading next level
                                  setTimeout(() => {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }, 500);
                                } catch (error) {
                                  console.error('Failed to load next level:', error);
                                }
                              }}
                              disabled={isLoadingNextLevel}
                              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-lg flex-1"
                              iconRight={ArrowRight}
                            >
                              {isLoadingNextLevel ? (
                                <>
                                  <Loader2 className="animate-spin mr-2" size={18} />
                                  Generating Next Level...
                                </>
                              ) : (
                                'Generate Next Level'
                              )}
                            </Button>
                          ) : null}
                          {(onGenerateLayerPractice || selectedLevel.review) && (
                            <Button
                              variant="secondary"
                              size="md"
                              onClick={async (e) => {
                                e.stopPropagation();
                                // Open the review modal
                                setReviewLevelNumber(selectedLevel.number);
                                setShowReviewModal(true);
                                // Only generate if no existing review
                                if (!selectedLevel.review && onGenerateLayerPractice) {
                                  try {
                                    await onGenerateLayerPractice(selectedLevel.number);
                                  } catch (error) {
                                    console.error('Failed to generate layer practice:', error);
                                  }
                                }
                              }}
                              disabled={isGeneratingLayerPractice}
                              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-lg flex-1"
                              iconRight={GraduationCap}
                            >
                              {isGeneratingLayerPractice ? (
                                <>
                                  <Loader2 className="animate-spin mr-2" size={18} />
                                  Generating Summary...
                                </>
                              ) : (
                                'View Level Summary'
                              )}
                            </Button>
                          )}
                        </div>
                      </Card>
                )}
              </div>
            ) : (
              /* Mindmap View - Focused on Selected Level */
              <div className="h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg">
                {mindmapData ? (
                  <TreeMap
                    data={mindmapData}
                    onNodeClick={(nodeId) => {
                      // Check if it's a level node
                      const level = levels.find(l => l.id === nodeId);
                      if (level) {
                        handleLevelSelect(level.id);
                        return;
                      }
                      // Check if it's the seed concept
                      if (seedConcept && seedConcept.id === nodeId) {
                        onConceptClick?.(seedConcept.id);
                        return;
                      }
                      // Check if it's a concept in any level
                      for (const lvl of levels) {
                        const concept = lvl.concepts.find(c => c.id === nodeId);
                        if (concept) {
                          onConceptClick?.(concept.id);
                          return;
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <Typography variant="body">
                      No concepts to display
                    </Typography>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Load Next Level Button */}
        {selectedLevel && (isSelectedLevelComplete || !nextLevel) && onLoadNextLevel && (
          <Card className="w-full md:max-w-2xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
            <div className="text-center">
              {isSelectedLevelComplete ? (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500 mb-4">
                    <Check size={24} className="text-white" />
                  </div>
                  <Typography variant="h3" className="mb-2">
                    Level {selectedLevel.number} Complete!
                  </Typography>
                  <Typography variant="body" color="muted" className="mb-6">
                    {nextLevel 
                      ? `Ready to move on to ${nextLevel.name}?`
                      : 'Ready to explore more concepts?'
                    }
                  </Typography>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500 mb-4">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <Typography variant="h3" className="mb-2">
                    Explore More Concepts
                  </Typography>
                  <Typography variant="body" color="muted" className="mb-6">
                    Generate the next level of concepts to continue your learning journey.
                  </Typography>
                </>
              )}
              <Button
                variant="primary"
                onClick={onLoadNextLevel}
                disabled={isLoadingNextLevel}
                iconRight={isLoadingNextLevel ? Loader2 : ArrowRight}
                className={cn(
                  "min-w-[200px]",
                  isLoadingNextLevel && "opacity-75 cursor-not-allowed"
                )}
              >
                {isLoadingNextLevel ? (
                  <>
                    <Loader2 size={16} className="inline mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    {nextLevel ? `Continue to ${nextLevel.name}` : 'Load Next Level'}
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

      </div>
    </AppLayoutTemplate>

    {/* Goal & Milestone Details Modal */}
    <Modal
      isOpen={showGoalModal}
      onClose={() => setShowGoalModal(false)}
      title="Learning Goal"
      size="md"
    >
      <div className="space-y-6">
        {/* Goal Section */}
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

        {/* Progress Summary */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <Typography variant="h4" className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
            Progress
          </Typography>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {lessonsGenerated}/{totalConcepts}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Lessons Generated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {progressPercentage}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Milestones Section */}
        {goal?.milestones && goal.milestones.length > 0 && (
          <div>
            <Typography variant="h4" className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
              Milestones
            </Typography>
            <div className="space-y-3">
              {goal.milestones.map((milestone, index) => {
                const isCurrentMilestone = milestone.levelNumber === selectedLevelNumber;
                const isPastMilestone = milestone.levelNumber < selectedLevelNumber;
                
                return (
                  <div 
                    key={milestone.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      isCurrentMilestone && "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20",
                      isPastMilestone && "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 opacity-75",
                      !isCurrentMilestone && !isPastMilestone && "border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      isCurrentMilestone && "bg-indigo-500 text-white",
                      isPastMilestone && "bg-green-500 text-white",
                      !isCurrentMilestone && !isPastMilestone && "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
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
                            Current
                          </Badge>
                        )}
                        {isPastMilestone && (
                          <Badge variant="success" size="sm" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Done
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

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGoalModal(false)}
          >
            Close
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
      title={`Level ${reviewLevelNumber} Summary`}
      size="lg"
    >
      {(() => {
        // Get the level and milestone for the review
        const reviewLevel = levels.find(l => l.number === reviewLevelNumber);
        const reviewMilestone = reviewLevelNumber ? getMilestoneForLevel(reviewLevelNumber) : null;
        
        return (
          <div className="space-y-4">
            {/* Header with milestone info */}
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                  <GraduationCap size={20} className="text-white" />
                </div>
                <div>
                  <Typography variant="h4" className="font-semibold">
                    Level {reviewLevelNumber} Summary
                  </Typography>
                  <Typography variant="small" color="muted">
                    See how the concepts you learned achieve the milestone
                  </Typography>
                </div>
              </div>
              
              {/* Milestone for this level */}
              {reviewMilestone && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Flag size={14} className="text-indigo-500" />
                    <Typography variant="small" className="font-semibold text-indigo-700 dark:text-indigo-300">
                      Milestone
                    </Typography>
                  </div>
                  <Typography variant="body" className="text-indigo-900 dark:text-indigo-100">
                    {reviewMilestone.title}
                  </Typography>
                  {reviewMilestone.description && (
                    <Typography variant="small" color="muted" className="mt-1">
                      {reviewMilestone.description}
                    </Typography>
                  )}
                </div>
              )}
              
              {/* Concepts in this level */}
              {reviewLevel && reviewLevel.concepts.length > 0 && (
                <div className="mt-3">
                  <Typography variant="small" className="font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Concepts Covered ({reviewLevel.concepts.length})
                  </Typography>
                  <div className="flex flex-wrap gap-2">
                    {reviewLevel.concepts.map((concept) => (
                      <Badge 
                        key={concept.id} 
                        variant={concept.hasLesson ? "success" : "default"}
                        size="sm"
                        className={concept.hasLesson 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }
                      >
                        {concept.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Content - Loading, Streaming, Existing Review, or Empty */}
            <div className="min-h-[300px] max-h-[60vh] overflow-y-auto">
              {isGeneratingLayerPractice && !layerPracticeStreamContent ? (
                // Initial loading state (generating new review)
                <div className="flex flex-col items-center justify-center py-12">
                  <Spinner size="lg" className="mb-4" />
                  <Typography variant="body" color="muted">
                    Generating your level summary...
                  </Typography>
                  <Typography variant="small" color="muted" className="mt-2 text-center max-w-sm">
                    Creating a summary of concepts learned and how they help achieve the milestone
                  </Typography>
                </div>
              ) : layerPracticeStreamContent ? (
                // Streaming content (new review being generated)
                <div className="prose dark:prose-invert max-w-none">
                  <LessonPanel
                    renderedLesson={layerPracticeStreamContent}
                    conceptHasLesson={true}
                    isGenerating={isGeneratingLayerPractice}
                  />
                </div>
              ) : reviewLevel?.review ? (
                // Existing review - show saved content
                <div className="prose dark:prose-invert max-w-none">
                  <LessonPanel
                    renderedLesson={reviewLevel.review}
                    conceptHasLesson={true}
                    isGenerating={false}
                  />
                </div>
              ) : (
                // No content yet - offer to generate
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <GraduationCap size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                  <Typography variant="body" color="muted" className="max-w-sm mb-4">
                    Generate a summary to see how the concepts you learned work together to achieve the milestone
                  </Typography>
                  {onGenerateLayerPractice && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={async () => {
                        try {
                          await onGenerateLayerPractice(reviewLevelNumber!);
                        } catch (error) {
                          console.error('Failed to generate layer practice:', error);
                        }
                      }}
                      disabled={isGeneratingLayerPractice}
                      iconRight={GraduationCap}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      Generate Summary
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {/* Regenerate button - only show if review exists and not currently generating */}
              <div>
                {reviewLevel?.review && onGenerateLayerPractice && !isGeneratingLayerPractice && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await onGenerateLayerPractice(reviewLevelNumber!);
                      } catch (error) {
                        console.error('Failed to regenerate summary:', error);
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Regenerate
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
                Close
              </Button>
            </div>
          </div>
        );
      })()}
    </Modal>
    </>
  );
};

