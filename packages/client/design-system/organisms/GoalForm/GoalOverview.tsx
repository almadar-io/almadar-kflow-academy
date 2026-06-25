import React from 'react';
import type { LearningGoal } from '@features/learning/goalApi';
import { MilestoneList } from './MilestoneList';
import { Target, Clock, BookOpen, Award } from 'lucide-react';
import { Box, Stack, Typography, useTranslate } from '@almadar/ui';

interface GoalOverviewProps {
    goal: LearningGoal | Partial<LearningGoal>;
}

export const GoalOverview: React.FC<GoalOverviewProps> = ({ goal }) => {
    const { t } = useTranslate();
    return (
        <Stack direction="vertical" gap="xl">
            {/* Header Section */}
            <Stack direction="vertical" gap="md">
                <Box>
                    <Typography variant="h3" weight="bold" className="text-foreground mb-2">
                        {goal.title || <Typography as="span" className="text-muted-foreground italic">{t('learning.generatingTitle')}</Typography>}
                    </Typography>
                    <Typography variant="body" className="text-muted-foreground leading-relaxed">
                        {goal.description || <Typography as="span" className="text-muted-foreground italic">{t('learning.generatingDescription')}</Typography>}
                    </Typography>
                </Box>

                {/* Key Metrics Grid */}
                <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Stack direction="horizontal" align="start" gap="sm" className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <Box className="p-2 bg-primary/20 rounded-lg text-primary">
                            <Target size={20} />
                        </Box>
                        <Stack direction="vertical" gap="xs" className="flex-1 min-w-0">
                            <Typography variant="overline" weight="semibold" className="uppercase tracking-wider text-primary">
                                {t('learning.targetOutcome')}
                            </Typography>
                            <Typography variant="small" weight="medium" className="text-foreground">
                                {goal.target || <Typography as="span" className="text-muted-foreground italic">{t('learning.generating')}</Typography>}
                            </Typography>
                        </Stack>
                    </Stack>

                    {goal.estimatedTime && (
                        <Stack direction="horizontal" align="start" gap="sm" className="p-4 rounded-xl bg-info/10 border border-info/20">
                            <Box className="p-2 bg-info/20 rounded-lg text-info">
                                <Clock size={20} />
                            </Box>
                            <Stack direction="vertical" gap="xs" className="flex-1 min-w-0">
                                <Typography variant="overline" weight="semibold" className="uppercase tracking-wider text-info">
                                    {t('learning.estTime')}
                                </Typography>
                                <Typography variant="small" weight="medium" className="text-foreground">
                                    {t('learning.hours', { count: goal.estimatedTime })}
                                </Typography>
                            </Stack>
                        </Stack>
                    )}

                    <Stack direction="horizontal" align="start" gap="sm" className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                        <Box className="p-2 bg-accent/20 rounded-lg text-accent">
                            <BookOpen size={20} />
                        </Box>
                        <Stack direction="vertical" gap="xs" className="flex-1 min-w-0">
                            <Typography variant="overline" weight="semibold" className="uppercase tracking-wider text-accent">
                                {t('learning.type')}
                            </Typography>
                            <Typography variant="small" weight="medium" className="text-foreground capitalize">
                                {goal.type || <Typography as="span" className="text-muted-foreground italic">{t('learning.generating')}</Typography>}
                            </Typography>
                        </Stack>
                    </Stack>

                    {goal.assessedLevel && (
                        <Stack direction="horizontal" align="start" gap="sm" className="p-4 rounded-xl bg-success/10 border border-success/20">
                            <Box className="p-2 bg-success/20 rounded-lg text-success">
                                <Award size={20} />
                            </Box>
                            <Stack direction="vertical" gap="xs" className="flex-1 min-w-0">
                                <Typography variant="overline" weight="semibold" className="uppercase tracking-wider text-success">
                                    {t('learning.level')}
                                </Typography>
                                <Typography variant="small" weight="medium" className="text-foreground capitalize">
                                    {goal.assessedLevel}
                                </Typography>
                            </Stack>
                        </Stack>
                    )}
                </Box>
            </Stack>

            {/* Milestones Section */}
            {goal.milestones && goal.milestones.length > 0 && (
                <Box>
                    <Stack direction="horizontal" align="center" gap="sm" className="mb-6">
                        <Box className="w-1 h-6 bg-primary rounded-full" />
                        <Typography variant="h4" weight="bold" className="text-foreground">
                            {t('learning.learningMilestones')}
                        </Typography>
                    </Stack>
                    <MilestoneList milestones={goal.milestones} />
                </Box>
            )}

            {/* Additional Info Grid */}
            {goal.shortTermGoals && goal.shortTermGoals.length > 0 && (
                <Box className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Box>
                        <Typography variant="overline" weight="bold" className="uppercase tracking-wider text-foreground mb-4 border-b border-border pb-2 block">
                            {t('learning.immediateSteps')}
                        </Typography>
                        <Stack direction="vertical" gap="sm">
                            {goal.shortTermGoals.map((shortTermGoal, index) => (
                                <Stack key={index} direction="horizontal" align="start" gap="xs" className="text-muted-foreground">
                                    <Box className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    <Typography variant="small" className="text-muted-foreground">{shortTermGoal}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>
                </Box>
            )}
        </Stack>
    );
};
