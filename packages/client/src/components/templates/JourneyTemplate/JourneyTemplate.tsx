/**
 * JourneyTemplate Component
 * 
 * Hybrid design combining horizontal level progress timeline, continuous scroll with level dividers,
 * and clear "Next Step" highlighting. Uses AppLayoutTemplate for consistent layout structure.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { Card } from '../../molecules/Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { ConceptCard } from '../../organisms/ConceptCard';
import { TreeMap, TreeMapNode } from '../../organisms/TreeMap';
import { Divider } from '../../atoms/Divider';
import { Check, Circle, ArrowRight, GitBranch, List, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../utils/theme';
import type { LearnTemplateProps, LearnConcept } from '../LearnTemplates/types';

export const JourneyTemplate: React.FC<LearnTemplateProps> = ({
  goal,
  seedConcept,
  levels,
  viewMode = 'list',
  onViewModeChange,
  onConceptClick,
  onLevelClick,
  onBack,
  user,
  navigationItems,
  onLogout,
  logo,
  onLogoClick,
  graphNodes = [],
  graphEdges = [],
}) => {
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(
    new Set(levels.filter(l => l.isCurrent).map(l => l.id))
  );
  const [collapsedCompleted, setCollapsedCompleted] = useState(true);
  const levelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Find next step concept
  const nextStep = useMemo(() => {
    for (const level of levels) {
      if (level.isCurrent || !level.completed) {
        const nextConcept = level.concepts.find(c => !c.completed && !c.isCurrent) || 
                           level.concepts.find(c => c.isCurrent);
        if (nextConcept) {
          return { level, concept: nextConcept };
        }
      }
    }
    return null;
  }, [levels]);

  // Calculate progress
  const progressPercentage = goal?.progress || 0;
  const completedLevels = levels.filter(l => l.completed).length;
  const totalLevels = levels.length;
  const completedConcepts = levels.reduce((sum, l) => 
    sum + l.concepts.filter(c => c.completed).length, 0
  );
  const totalConcepts = levels.reduce((sum, l) => sum + l.concepts.length, 0);

  const toggleLevel = (levelId: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(levelId)) {
        next.delete(levelId);
      } else {
        next.add(levelId);
      }
      return next;
    });
  };

  const scrollToLevel = (levelId: string) => {
    const element = levelRefs.current[levelId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Build mindmap tree structure if in mindmap view
  const mindmapData: TreeMapNode | null = useMemo(() => {
    if (viewMode !== 'mindmap' || levels.length === 0) return null;
    
    // Create a root node with levels as children
    const rootNode: TreeMapNode = {
      id: 'root',
      label: goal?.title || 'Learning Path',
      isRoot: true,
      children: levels.map(level => ({
        id: level.id,
        label: level.name,
        children: level.concepts.map(concept => ({
          id: concept.id,
          label: concept.name,
          description: concept.description,
        })),
      })),
    };
    
    return rootNode;
  }, [levels, viewMode, goal]);

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      onLogoClick={onLogoClick}
      contentClassName="w-full md:max-w-6xl md:mx-auto"
    >
      <div className="space-y-4 md:space-y-6">
        {/* Goal Card */}
        {goal && (
          <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Typography variant="h1" className="mb-2">
                  {goal.title}
                </Typography>
                {goal.description && (
                  <Typography variant="body" color="muted" className="mb-4">
                    {goal.description}
                  </Typography>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                    <Badge variant="primary">{progressPercentage}%</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Levels:</span>
                    <Badge variant="default">{completedLevels}/{totalLevels}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Concepts:</span>
                    <Badge variant="default">{completedConcepts}/{totalConcepts}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Seed Concept Card */}
        {seedConcept && (
          <Card className="p-6 border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                  <Target size={24} className="text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="primary" className="bg-purple-500">Seed Concept</Badge>
                </div>
                <Typography variant="h3" className="mb-2">
                  {seedConcept.name}
                </Typography>
                {seedConcept.description && (
                  <Typography variant="body" color="muted" className="mb-4">
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
            </div>
          </Card>
        )}

        {/* Level Progress Timeline */}
        <Card className="p-6">
          <Typography variant="h3" className="mb-4 text-center">
            Your Learning Journey
          </Typography>
          <div className="flex items-center justify-center gap-2 md:gap-4 overflow-x-auto pb-2">
            {levels.map((level, index) => {
              const isCompleted = level.completed;
              const isCurrent = level.isCurrent;
              
              return (
                <React.Fragment key={level.id}>
                  <button
                    onClick={() => {
                      scrollToLevel(level.id);
                      if (!expandedLevels.has(level.id)) {
                        toggleLevel(level.id);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 min-w-[80px] p-3 rounded-lg transition-all",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      isCurrent && "bg-indigo-100 dark:bg-indigo-900/30"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && !isCompleted && "bg-indigo-500 text-white ring-2 ring-indigo-300",
                      !isCompleted && !isCurrent && "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                    )}>
                      {isCompleted ? (
                        <Check size={20} />
                      ) : (
                        level.number
                      )}
                    </div>
                    <Typography variant="small" className="text-xs text-center font-medium">
                      Level {level.number}
                    </Typography>
                    {isCurrent && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        You are here
                      </div>
                    )}
                  </button>
                  
                  {index < levels.length - 1 && (
                    <div className={cn(
                      "flex-shrink-0 w-8 h-0.5 md:w-12",
                      isCompleted ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>

        {/* Next Step Card */}
        {nextStep && (
          <Card className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Target size={24} className="text-white" />
                </div>
              </div>
              <div className="flex-1">
                <Typography variant="h3" className="mb-2">
                  Next: Learn "{nextStep.concept.name}"
                </Typography>
                <Typography variant="body" color="muted" className="mb-4">
                  {nextStep.level.name} • Concept {nextStep.level.concepts.findIndex(c => c.id === nextStep.concept.id) + 1} of {nextStep.level.concepts.length}
                </Typography>
                <Button
                  variant="primary"
                  onClick={() => onConceptClick?.(nextStep.concept.id)}
                  iconRight={ArrowRight}
                >
                  Start Learning
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* View Toggle */}
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-800">
            <button
              onClick={() => onViewModeChange?.('list')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                viewMode === 'list'
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <List size={16} className="inline mr-2" />
              List
            </button>
            <button
              onClick={() => onViewModeChange?.('mindmap')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                viewMode === 'mindmap'
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <GitBranch size={16} className="inline mr-2" />
              Mindmap
            </button>
          </div>
        </div>

        {/* Levels List */}
        {viewMode === 'list' ? (
          <div className="space-y-6">
            {/* Completed Levels Toggle */}
            {levels.some(l => l.completed) && (
              <button
                onClick={() => setCollapsedCompleted(!collapsedCompleted)}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                {collapsedCompleted ? (
                  <>
                    <ChevronDown size={16} />
                    <span>Show Completed Levels ({levels.filter(l => l.completed).length})</span>
                  </>
                ) : (
                  <>
                    <ChevronUp size={16} />
                    <span>Hide Completed Levels</span>
                  </>
                )}
              </button>
            )}

            {/* Level Sections */}
            {levels.map((level) => {
              const isExpanded = expandedLevels.has(level.id);
              const isCompleted = level.completed;
              const isCurrent = level.isCurrent;
              
              // Skip completed levels if collapsed
              if (isCompleted && collapsedCompleted && !isExpanded) {
                return null;
              }

              return (
                <div
                  key={level.id}
                  ref={(el) => {
                    if (el) levelRefs.current[level.id] = el;
                  }}
                >
                  <Card className="p-6">
                    <button
                      onClick={() => toggleLevel(level.id)}
                      className="w-full flex items-center justify-between mb-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                          isCompleted && "bg-green-500 text-white",
                          isCurrent && !isCompleted && "bg-indigo-500 text-white",
                          !isCompleted && !isCurrent && "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                        )}>
                          {isCompleted ? (
                            <Check size={20} />
                          ) : (
                            level.number
                          )}
                        </div>
                        <div className="text-left">
                          <Typography variant="h3" className="mb-1">
                            {level.name}
                          </Typography>
                          {level.description && (
                            <Typography variant="small" color="muted">
                              {level.description}
                            </Typography>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={isCompleted ? "success" : isCurrent ? "primary" : "default"}
                        >
                          {isCompleted ? "Complete" : isCurrent ? "Current" : "Upcoming"}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp size={20} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <>
                        <Divider className="my-4" />
                        {level.concepts.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {level.concepts.map(concept => (
                              <ConceptCard
                                key={concept.id}
                                id={concept.id}
                                name={concept.name}
                                description={concept.description}
                                layer={level.number}
                                prerequisites={concept.prerequisites}
                                parents={concept.parents}
                                progress={concept.completed ? 100 : 0}
                                onClick={() => onConceptClick?.(concept.id)}
                                className={cn(
                                  "cursor-pointer transition-all hover:shadow-md",
                                  concept.isCurrent && "ring-2 ring-indigo-500",
                                  concept.completed && "opacity-75"
                                )}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Typography variant="body">
                              No concepts in this level yet
                            </Typography>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          /* Mindmap View */
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">
              Concept Relationships
            </Typography>
            {mindmapData ? (
              <div className="h-[600px] border border-gray-200 dark:border-gray-700 rounded-lg">
                <TreeMap
                  data={mindmapData}
                  onNodeClick={(nodeId, node) => {
                    // Check if this is a concept node (not a level node)
                    const concept = levels
                      .flatMap(l => l.concepts)
                      .find(c => c.id === nodeId);
                    if (concept) {
                      onConceptClick?.(concept.id);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Typography variant="body">
                  No concepts to display
                </Typography>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppLayoutTemplate>
  );
};

