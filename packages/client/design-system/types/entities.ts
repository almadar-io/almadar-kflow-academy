/**
 * Learner entity slices passed from `src/pages/` assemblers into
 * `design-system/templates/*`. Per the assembler contract, pages derive these
 * from feature hooks and hand them to templates/organisms via a typed `entity`
 * prop (organisms also extend `DisplayStateProps` from `@almadar/ui`).
 *
 * Compose canonical types (`@almadar/core` + the local `knowledge` domain types)
 * — never re-declare a shape they already own. Wave 2 refines field shapes to
 * each template's exact needs.
 */
import type { OrbitalSchema } from '@almadar/core';
import type {
  KnowledgeNode,
  KnowledgeSubject,
  LearningProgress,
  NextSuggestion,
  StorySummary,
  SeriesSummary,
  Series,
  UserStoryProgress,
  SeriesProgress,
} from './knowledge';

export interface ConceptBrowseEntity {
  concepts: KnowledgeNode[];
  searchQuery?: string;
}

export interface ConceptDetailEntity {
  concept: KnowledgeNode;
  prerequisites?: KnowledgeNode[];
  progress?: LearningProgress;
}

export interface LessonViewerEntity {
  lessonContent: string;
  interactiveBlocks?: OrbitalSchema[];
  progress?: LearningProgress;
}

export interface GraphNavigatorEntity {
  subjects: KnowledgeSubject[];
  selectedNodeId?: string;
}

export interface DashboardEntity {
  suggestions?: NextSuggestion[];
}

export interface StoryCatalogEntity {
  stories: StorySummary[];
  series?: SeriesSummary[];
}

export interface StoryPlayEntity {
  story: StorySummary;
  progress?: UserStoryProgress;
}

export interface SeriesViewEntity {
  series: Series;
  progress?: SeriesProgress;
}
