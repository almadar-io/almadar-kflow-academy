import React, { useEffect, useRef, useState } from 'react';
import { Spinner, ProgressBar, Card, Badge, Typography, Box, Stack, Icon, useTranslate } from '@almadar/ui';
import { parseStreamingConcepts, ParsedConcept } from '@features/concepts/utils/streamParser';

interface LessonPreview {
  id: string;
  title: string;
  content: string;
}

interface ConceptLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  progress?: number;
  lessons?: LessonPreview[];
  emptyLessonsText?: string;
  className?: string;
  streamContent?: string;
  goal?: string;
}

const spinnerSize: Record<NonNullable<ConceptLoaderProps['size']>, 'sm' | 'md' | 'lg'> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'lg',
};

const ConceptLoader: React.FC<ConceptLoaderProps> = ({
  size = 'md',
  text = 'Loading...',
  progress,
  lessons = [],
  emptyLessonsText = "No lessons yet—give us a moment to craft something awesome for you! 🌱",
  className,
  streamContent = '',
  goal,
}) => {
  const { t } = useTranslate();
  const [parsedConcepts, setParsedConcepts] = useState<ParsedConcept[]>([]);
  const [extractedGoal, setExtractedGoal] = useState<string | undefined>(goal);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  useEffect(() => {
    if (streamContent) {
      setParsedConcepts(parseStreamingConcepts(streamContent));
      if (!goal) {
        const goalMatch = streamContent.match(/<goal>([\s\S]*?)<\/goal>/i);
        if (goalMatch) setExtractedGoal(goalMatch[1].trim());
      }
      if (shouldScrollRef.current && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [streamContent, goal]);

  useEffect(() => {
    if (goal) setExtractedGoal(goal);
  }, [goal]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  };

  const renderContent = () => {
    if (streamContent && parsedConcepts.length > 0) {
      return (
        <Stack gap="md" className="w-full">
          {extractedGoal && (
            <Card padding="md" className="bg-muted border-border">
              <Stack direction="horizontal" gap="sm" align="start">
                <Box className="flex-shrink-0 mt-0.5">
                  <Box rounded="full" bg="primary" className="w-8 h-8 flex items-center justify-center">
                    <Icon name="target" size="sm" className="text-primary-foreground" />
                  </Box>
                </Box>
                <Box className="flex-1 min-w-0">
                  <Stack direction="horizontal" gap="sm" align="center" className="mb-2">
                    <Typography variant="small" weight="semibold">{t('knowledge.learningGoal')}</Typography>
                    <Typography variant="caption" className="text-primary">{t('concept.levelTarget')}</Typography>
                  </Stack>
                  <Typography variant="small">{extractedGoal}</Typography>
                </Box>
              </Stack>
            </Card>
          )}

          <Stack direction="horizontal" justify="between" align="center">
            <Typography variant="caption" weight="semibold" className="text-muted-foreground uppercase tracking-wide">
              {t('concept.generatingConcepts')}
            </Typography>
            <Badge variant="secondary" label={parsedConcepts.length} />
          </Stack>

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="max-h-96 overflow-y-auto overflow-x-hidden pe-2 space-y-4 custom-scrollbar"
          >
            {parsedConcepts.map((concept, index) => (
              <Card key={`${concept.name}-${index}`} padding="md" className="bg-muted border-border">
                <Stack direction="horizontal" gap="sm" align="start">
                  <Box
                    rounded="full"
                    bg="primary"
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-primary-foreground font-semibold text-sm"
                  >
                    {index + 1}
                  </Box>
                  <Box className="flex-1 min-w-0">
                    <Typography variant="body" weight="bold" className="text-primary mb-2">{concept.name}</Typography>
                    {concept.description && (
                      <Typography variant="small" className="text-muted-foreground mb-2">{concept.description}</Typography>
                    )}
                    {concept.parents.length > 0 && (
                      <Stack direction="horizontal" gap="sm" wrap align="center" className="mt-2">
                        <Typography variant="caption" weight="medium" className="text-muted-foreground">
                          {t('concept.prerequisites')}
                        </Typography>
                        {concept.parents.map((parent, i) => (
                          <Badge key={i} variant="secondary" size="sm" label={parent} />
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </Card>
            ))}
          </div>
        </Stack>
      );
    }

    if (lessons.length > 0) {
      return (
        <Stack gap="sm" className="w-full">
          <Stack direction="horizontal" justify="between" align="center">
            <Typography variant="caption" weight="semibold" className="text-muted-foreground uppercase tracking-wide">
              {t('concept.previousLessons')}
            </Typography>
            <Badge variant="secondary" label={lessons.length} />
          </Stack>
          <div className="overflow-x-auto pb-2 -mx-2">
            <div className="flex gap-4 px-2 min-w-max">
              {lessons.map(lesson => (
                <Card key={lesson.id} padding="md" className="w-64 flex-shrink-0 bg-card border-border">
                  <Typography variant="small" weight="semibold" className="text-primary mb-2 line-clamp-2">{lesson.title}</Typography>
                  <Typography variant="caption" className="text-muted-foreground line-clamp-5">
                    {lesson.content.trim().length > 0
                      ? lesson.content.replace(/\s+/g, ' ').slice(0, 220) + (lesson.content.length > 220 ? '…' : '')
                      : 'This lesson is ready for you to explore.'}
                  </Typography>
                </Card>
              ))}
            </div>
          </div>
        </Stack>
      );
    }

    return (
      <Card padding="md" className="w-full text-center bg-muted border-border">
        <Typography variant="small" weight="medium" className="text-primary">{emptyLessonsText}</Typography>
      </Card>
    );
  };

  return (
    <Box className={`fixed inset-0 z-[99999] flex items-center justify-center bg-background/80 backdrop-blur ${className ?? ''}`}>
      <Card padding="lg" className="w-full max-w-3xl bg-card text-foreground">
        <Stack gap="lg" align="center">
          <Stack gap="md" align="center">
            <Spinner size={spinnerSize[size]} />
            {text && <Typography variant="body" weight="medium" className="text-muted-foreground text-center">{text}</Typography>}
          </Stack>
          {typeof progress === 'number' && (
            <Box className="w-full">
              <ProgressBar value={Math.min(progress, 100)} color="primary" showLabel />
            </Box>
          )}
          {renderContent()}
        </Stack>
      </Card>
    </Box>
  );
};

export type { LessonPreview, ConceptLoaderProps };
export default ConceptLoader;
