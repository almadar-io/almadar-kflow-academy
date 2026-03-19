/**
 * ConceptDetailBoard Organism
 *
 * Concept detail view with tabs, prerequisite navigation, progress display,
 * and lesson/practice content. Extracted from ConceptDetailTemplate for flattener compliance.
 */

import React, { useState, useCallback } from 'react';
import {
  BookOpen,
  Brain,
  ChevronRight,
  PlayCircle,
} from 'lucide-react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Typography,
  PageHeader,
  Section,
  ProgressBar,
  LoadingState,
  useEventBus,
  useTranslate,
  type EntityDisplayProps,
} from '@almadar/ui';
import { SegmentRenderer } from '../organisms/SegmentRenderer';
import { FlashCardStack } from '../organisms/FlashCardStack';
import { ConceptMetaTags } from '../molecules/ConceptMetaTags';
import { LearningGoalDisplay } from '../molecules/LearningGoalDisplay';
import { ConceptStoryLink } from '../molecules/story/ConceptStoryLink';
import type { StorySummary } from '../types/knowledge';
import type { Segment } from '../utils/parseLessonSegments';
import type { FlashCardEntity } from '../organisms/FlashCard';

export interface ConceptEntity {
  id: string;
  name: string;
  description?: string;
  layer?: number;
  isSeed?: boolean;
  prerequisites?: string[];
  parents?: string[];
  learningGoal?: string;
  hasLesson?: boolean;
  lessonSegments?: Segment[];
  flashcards?: FlashCardEntity[];
  progress?: number;
  relatedStories?: StorySummary[];
}

export interface ConceptDetailBoardProps extends EntityDisplayProps<ConceptEntity> {
  graphId?: string;
  showBack?: boolean;
  backEvent?: string;
  startLessonEvent?: string;
  startPracticeEvent?: string;
  navigatePrerequisiteEvent?: string;
  generateLessonEvent?: string;
}

export function ConceptDetailBoard({
  entity,
  isLoading,
  graphId,
  showBack = true,
  backEvent,
  startLessonEvent,
  startPracticeEvent,
  navigatePrerequisiteEvent,
  generateLessonEvent,
  className = '',
}: ConceptDetailBoardProps): React.JSX.Element | null {
  const resolved = Array.isArray(entity) ? entity[0] : (entity as ConceptEntity | undefined);

  const { emit } = useEventBus();
  const { t } = useTranslate();
  const [activeTab, setActiveTab] = useState<'overview' | 'lesson' | 'practice'>('overview');

  if (isLoading || !resolved) {
    return <LoadingState message={t('concept.loading')} />;
  }

  const handleStartLesson = () => {
    setActiveTab('lesson');
    if (startLessonEvent) emit(`UI:${startLessonEvent}`, { conceptId: resolved.id });
  };

  const handleStartPractice = () => {
    setActiveTab('practice');
    if (startPracticeEvent) emit(`UI:${startPracticeEvent}`, { conceptId: resolved.id });
  };

  const handleGenerateLesson = useCallback(() => {
    if (generateLessonEvent) emit(`UI:${generateLessonEvent}`, { conceptId: resolved?.id });
  }, [emit, generateLessonEvent, resolved?.id]);

  const handlePrerequisiteClick = (prereq: string) => {
    if (navigatePrerequisiteEvent) {
      emit(`UI:${navigatePrerequisiteEvent}`, { prerequisiteName: prereq, fromConcept: resolved.id });
    }
  };

  return (
    <Box className={`min-h-screen bg-[var(--color-background)] ${className}`}>
      <PageHeader
        showBack={showBack}
        backEvent={backEvent}
        status={resolved.layer !== undefined ? { label: t('concept.layer', { number: resolved.layer }), variant: 'info' } : undefined}
        tabs={[
          { label: t('concept.tab.overview'), value: 'overview' },
          { label: t('concept.tab.lesson'), value: 'lesson' },
          { label: t('concept.tab.practice'), value: 'practice' },
        ]}
        activeTab={activeTab}
        onTabChange={(value) => setActiveTab(value as typeof activeTab)}
        className="max-w-4xl mx-auto"
      />

      <Box className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <VStack gap="lg">
            <VStack gap="sm">
              <Typography variant="h1" className="text-3xl font-bold text-[var(--color-foreground)]">{resolved.name}</Typography>
              {resolved.description && (
                <Typography variant="body" className="text-[var(--color-foreground)] text-lg">{resolved.description}</Typography>
              )}
            </VStack>

            <ConceptMetaTags
              layer={resolved.layer}
              isSeed={resolved.isSeed}
              parents={resolved.parents || []}
            />

            {resolved.learningGoal && (
              <LearningGoalDisplay
                goal={resolved.learningGoal}
                layerNumber={resolved.layer || 0}
                graphId={graphId}
              />
            )}

            {resolved.prerequisites && resolved.prerequisites.length > 0 && (
              <Section title={t('concept.prerequisites')} variant="card">
                <VStack gap="xs">
                  {resolved.prerequisites.map((prereq: string) => {
                    const handleClick = () => handlePrerequisiteClick(prereq);
                    return (
                    <Button
                      key={prereq}
                      onClick={handleClick}
                      variant="secondary"
                      className="text-left px-3 py-2 bg-[var(--color-surface)] rounded hover:bg-[var(--color-muted)] text-[var(--color-foreground)] flex items-center justify-between"
                    >
                      <Typography variant="small">{prereq}</Typography>
                      <ChevronRight size={16} className="text-[var(--color-muted-foreground)]" />
                    </Button>
                    );
                  })}
                </VStack>
              </Section>
            )}

            {resolved.progress !== undefined && (
              <Section title={t('concept.progress')} variant="card">
                <VStack gap="sm">
                  <HStack justify="between" align="center">
                    <Box />
                    <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">{resolved.progress}%</Typography>
                  </HStack>
                  <ProgressBar value={resolved.progress} max={100} size="sm" variant="primary" />
                </VStack>
              </Section>
            )}

            {resolved.relatedStories && resolved.relatedStories.length > 0 && (
              <VStack gap="sm">
                {resolved.relatedStories.map((story: StorySummary) => (
                  <Box key={story.id} data-entity-row={story.id}>
                    <ConceptStoryLink
                      story={story}
                      conceptName={resolved.name}
                    />
                  </Box>
                ))}
              </VStack>
            )}

            <HStack gap="md" wrap>
              {resolved.hasLesson && (
                <Button
                  onClick={handleStartLesson}
                  variant="primary"
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <BookOpen size={20} />
                  {t('concept.startLesson')}
                </Button>
              )}
              {resolved.flashcards && resolved.flashcards.length > 0 && (
                <Button
                  onClick={handleStartPractice}
                  variant="secondary"
                  className="px-6 py-3 bg-gray-100 text-[var(--color-foreground)] font-medium rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <Brain size={20} />
                  {t('concept.practice', { count: resolved.flashcards.length })}
                </Button>
              )}
            </HStack>
          </VStack>
        )}

        {activeTab === 'lesson' && (
          <VStack gap="lg">
            {resolved.lessonSegments && resolved.lessonSegments.length > 0 ? (
              <SegmentRenderer segments={resolved.lessonSegments} />
            ) : (
              <Section variant="card">
                <VStack gap="md" align="center" className="py-12">
                  <BookOpen size={48} className="text-[var(--color-muted-foreground)]" />
                  <Typography variant="small" className="text-[var(--color-muted-foreground)]">{t('concept.noLessonContent')}</Typography>
                  {!resolved.hasLesson && (
                    <Button
                      onClick={handleGenerateLesson}
                      variant="primary"
                      size="sm"
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
                    >
                      <PlayCircle size={16} />
                      {t('concept.generateLesson')}
                    </Button>
                  )}
                </VStack>
              </Section>
            )}
          </VStack>
        )}

        {activeTab === 'practice' && (
          <VStack gap="lg">
            {resolved.flashcards && resolved.flashcards.length > 0 ? (
              <FlashCardStack cards={resolved.flashcards} />
            ) : (
              <Section variant="card">
                <VStack gap="md" align="center" className="py-12">
                  <Brain size={48} className="text-[var(--color-muted-foreground)]" />
                  <Typography variant="small" className="text-[var(--color-muted-foreground)]">{t('concept.noPracticeCards')}</Typography>
                </VStack>
              </Section>
            )}
          </VStack>
        )}
      </Box>
    </Box>
  );
}

ConceptDetailBoard.displayName = 'ConceptDetailBoard';

export default ConceptDetailBoard;
