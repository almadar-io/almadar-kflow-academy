/**
 * PathExplorerTemplate Component
 * 
 * Visual journey map interface where users see their entire learning path as a journey.
 * Levels shown as connected nodes/path segments with interactive exploration.
 * Uses AppLayoutTemplate for consistent layout structure.
 */

import React, { useState, useMemo } from 'react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { Card } from '../../molecules/Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { ConceptCard } from '../../organisms/ConceptCard';
import { TreeMap, TreeMapNode } from '../../organisms/TreeMap';
import { Check, Circle, ArrowRight, GitBranch, List, Target } from 'lucide-react';
import { cn } from '../../../utils/theme';
import type { LearnTemplateProps, LearnConcept } from '../LearnTemplates/types';

export const PathExplorerTemplate: React.FC<LearnTemplateProps> = ({
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
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(
    levels.find(l => l.isCurrent)?.id || levels[0]?.id || null
  );

  const selectedLevel = useMemo(() => {
    return levels.find(l => l.id === selectedLevelId) || null;
  }, [levels, selectedLevelId]);

  const handleLevelClick = (levelId: string) => {
    setSelectedLevelId(levelId);
    onLevelClick?.(levelId);
  };

  // Calculate progress
  const progressPercentage = goal?.progress || 0;
  const completedLevels = levels.filter(l => l.completed).length;
  const totalLevels = levels.length;

  // Build mindmap tree structure if in mindmap view
  const mindmapData: TreeMapNode | null = useMemo(() => {
    if (viewMode !== 'mindmap') return null;
    
    // Create a root node with seed concept and levels as children
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
        // Levels as subsequent children
        ...levels.map(level => ({
          id: level.id,
          label: level.name,
          children: level.concepts.map(concept => ({
            id: concept.id,
            label: concept.name,
            description: concept.description,
          })),
        })),
      ],
    };
    
    return rootNode;
  }, [levels, viewMode, goal, seedConcept]);

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      onLogoClick={onLogoClick}
      contentClassName="w-full md:max-w-7xl md:mx-auto"
    >
      <div className="space-y-4 md:space-y-6">
        {/* Goal Header */}
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
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                    <Badge variant="primary">{progressPercentage}%</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Levels:</span>
                    <Badge variant="default">{completedLevels}/{totalLevels}</Badge>
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

        {/* Journey Map View */}
        {viewMode === 'list' ? (
          <div className="space-y-6">
            {/* Visual Journey Map */}
            <Card className="p-6">
              <Typography variant="h3" className="mb-6">
                Your Learning Journey
              </Typography>
              
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                {levels.map((level, index) => {
                  const isCompleted = level.completed;
                  const isCurrent = level.isCurrent;
                  const isSelected = selectedLevelId === level.id;
                  
                  return (
                    <React.Fragment key={level.id}>
                      <button
                        onClick={() => handleLevelClick(level.id)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-4 rounded-lg transition-all",
                          "hover:scale-105 hover:shadow-md",
                          isSelected && "ring-2 ring-indigo-500 ring-offset-2",
                          isCompleted && "bg-green-50 dark:bg-green-900/20 border-2 border-green-500",
                          isCurrent && !isCompleted && "bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-500",
                          !isCompleted && !isCurrent && "bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
                          isCompleted && "bg-green-500 text-white",
                          isCurrent && !isCompleted && "bg-indigo-500 text-white",
                          !isCompleted && !isCurrent && "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                        )}>
                          {isCompleted ? (
                            <Check size={24} />
                          ) : (
                            level.number
                          )}
                        </div>
                        <Typography variant="small" className="font-medium text-center max-w-[100px]">
                          {level.name}
                        </Typography>
                        <Typography variant="small" color="muted" className="text-xs">
                          {level.concepts.length} concepts
                        </Typography>
                      </button>
                      
                      {index < levels.length - 1 && (
                        <ArrowRight 
                          size={24} 
                          className={cn(
                            "text-gray-400 dark:text-gray-600",
                            isCompleted && "text-green-500"
                          )} 
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </Card>

            {/* Selected Level Concepts */}
            {selectedLevel && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Typography variant="h3" className="mb-1">
                      {selectedLevel.name}
                    </Typography>
                    {selectedLevel.description && (
                      <Typography variant="body" color="muted">
                        {selectedLevel.description}
                      </Typography>
                    )}
                  </div>
                  <Badge 
                    variant={selectedLevel.completed ? "success" : selectedLevel.isCurrent ? "primary" : "default"}
                  >
                    {selectedLevel.completed ? "Complete" : selectedLevel.isCurrent ? "Current" : "Upcoming"}
                  </Badge>
                </div>
                
                {selectedLevel.concepts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedLevel.concepts.map(concept => (
                      <ConceptCard
                        key={concept.id}
                        id={concept.id}
                        name={concept.name}
                        description={concept.description}
                        layer={selectedLevel.number}
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
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Typography variant="body">
                      No concepts in this level yet
                    </Typography>
                  </div>
                )}
              </Card>
            )}
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

