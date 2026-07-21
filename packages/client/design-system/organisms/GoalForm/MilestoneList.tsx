import React from 'react';
import type { Milestone } from '@features/learning/goalApi';
import { CheckCircle2, Circle, Calendar, Clock } from 'lucide-react';
import { Box, Stack, Typography, useTranslate } from '@almadar/ui';

interface MilestoneListProps {
    milestones: Milestone[];
}

export const MilestoneList: React.FC<MilestoneListProps> = ({ milestones }) => {
    const { t } = useTranslate();
    if (!milestones || milestones.length === 0) return null;

    return (
        <Box className="space-y-6 relative">
            {/* Vertical Line for Timeline Effect */}
            <Box className="absolute start-[19px] top-4 bottom-4 w-0.5 bg-border -z-10" />

            {milestones.map((milestone, index) => {
                const isCompleted = milestone.completed;
                const isNext = !isCompleted && (index === 0 || milestones[index - 1].completed);

                return (
                    <Box key={milestone.id} className={`group relative flex gap-4 ${isCompleted ? 'opacity-75 hover:opacity-100 transition-opacity' : ''}`}>
                        {/* Icon/Status Indicator */}
                        <Box className={`flex-shrink-0 w-10 h-10 rounded-full border-4 flex items-center justify-center bg-card transition-colors duration-300 ${isCompleted
                                ? 'border-success/30 text-success'
                                : isNext
                                    ? 'border-primary/30 text-primary ring-2 ring-primary/20'
                                    : 'border-border text-muted-foreground'
                            }`}>
                            {isCompleted ? (
                                <CheckCircle2 size={20} />
                            ) : (
                                <Circle size={16} />
                            )}
                        </Box>

                        {/* Content Card */}
                        <Box className={`flex-1 min-w-0 rounded-xl border p-4 transition-all duration-200 ${isNext
                                ? 'bg-card border-primary/40 shadow-sm'
                                : 'bg-muted/20 border-border'
                            }`}>
                            <Stack direction="horizontal" align="start" justify="between" gap="md" className="mb-2">
                                <Typography
                                    variant="h4"
                                    weight="semibold"
                                    className={isCompleted ? 'text-muted-foreground' : 'text-foreground'}
                                >
                                    {milestone.title}
                                </Typography>
                                {milestone.targetDate && (
                                    <Stack direction="horizontal" align="center" gap="xs" className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground whitespace-nowrap">
                                        <Calendar size={12} />
                                        {new Date(milestone.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </Stack>
                                )}
                            </Stack>

                            {milestone.description && (
                                <Typography
                                    variant="small"
                                    className={`mb-3 ${isCompleted ? 'text-muted-foreground' : 'text-muted-foreground'}`}
                                >
                                    {milestone.description}
                                </Typography>
                            )}

                            {/* Status Badge */}
                            {isNext && (
                                <Stack direction="horizontal" align="center" gap="xs" className="text-xs font-semibold text-primary">
                                    <Clock size={12} />
                                    {t('learning.currentFocus')}
                                </Stack>
                            )}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};
