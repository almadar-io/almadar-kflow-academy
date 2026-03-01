/**
 * Shared types for Learn templates
 */

import type { LucideIcon } from 'lucide-react';

export interface LearnLevel {
  id: string;
  number: number;
  name: string;
  description?: string;
  concepts: LearnConcept[];
  completed?: boolean;
  isCurrent?: boolean;
  goal?: string;
  review?: string; // Generated level summary/review content
  reviewGeneratedAt?: number; // Timestamp when review was generated
}

export interface LearnConcept {
  id: string;
  name: string;
  description?: string;
  completed?: boolean;
  isCurrent?: boolean;
  prerequisites?: string[];
  parents?: string[];
  hasLesson?: boolean; // Whether a lesson has been generated for this concept
}

export interface LearnMilestone {
  id: string;
  title: string;
  description?: string;
  levelNumber: number; // Which level this milestone corresponds to
  completed?: boolean;
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LearnGoal {
  id: string;
  title: string;
  description?: string;
  progress?: number; // 0-100
  totalLevels?: number;
  completedLevels?: number;
  totalConcepts?: number;
  completedConcepts?: number;
  milestones?: LearnMilestone[];
  assessedLevel?: ExperienceLevel; // User's selected experience level
}

export interface LearnTemplateProps {
  // Goal information
  goal?: LearnGoal;
  
  // Seed concept (displayed separately at top)
  seedConcept?: LearnConcept;
  
  // Levels/Layers (excluding seed concept layer 0)
  levels: LearnLevel[];
  
  // View mode
  viewMode?: 'list' | 'mindmap';
  onViewModeChange?: (mode: 'list' | 'mindmap') => void;
  
  // Concept interactions
  onConceptClick?: (conceptId: string) => void;
  onLevelClick?: (levelId: string) => void;
  
  // Load next level
  onLoadNextLevel?: () => Promise<void>;
  isLoadingNextLevel?: boolean;
  nextLevelStreamContent?: string;
  
  // Focused level - when set, template will switch to this level (e.g., after generating a new level)
  focusedLevelId?: string;
  onFocusedLevelClear?: () => void;
  
  // Generate layer practice (for final review)
  onGenerateLayerPractice?: (layerNumber: number) => Promise<void>;
  isGeneratingLayerPractice?: boolean;
  layerPracticeStreamContent?: string;
  
  // Graph ID (for layer practice generation)
  graphId?: string;
  
  // Navigation
  onBack?: () => void;
  
  // AppLayout props
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
  onLogout?: () => void;
  logo?: React.ReactNode;
  onLogoClick?: () => void;
  
  // Graph data for mindmap view
  graphNodes?: Array<{
    id: string;
    label: string;
    layer: number;
  }>;
  graphEdges?: Array<{
    source: string;
    target: string;
  }>;
}

