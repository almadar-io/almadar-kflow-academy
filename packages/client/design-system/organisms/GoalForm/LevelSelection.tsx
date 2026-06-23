/**
 * Level Selection Component
 * Allows users to manually select their level or take a placement test
 */

import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Box, Stack, Typography, Button, useTranslate } from '@almadar/ui';

interface LevelSelectionProps {
  onSelectLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  onSkip?: () => void;
}

type LevelValue = 'beginner' | 'intermediate' | 'advanced';

export const LevelSelection: React.FC<LevelSelectionProps> = ({
  onSelectLevel,
  onSkip,
}) => {
  const { t } = useTranslate();
  const [selectedLevel, setSelectedLevel] = useState<LevelValue | null>('beginner');

  const levels: Array<{
    value: LevelValue;
    label: string;
    description: string;
    tint: string;
    selectedTint: string;
    dot: string;
  }> = [
    {
      value: 'beginner',
      label: t('level.beginner'),
      description: t('level.beginnerDesc'),
      tint: 'bg-success/10 border-success/20',
      selectedTint: 'bg-success/20 border-success',
      dot: 'border-success bg-success',
    },
    {
      value: 'intermediate',
      label: t('level.intermediate'),
      description: t('level.intermediateDesc'),
      tint: 'bg-info/10 border-info/20',
      selectedTint: 'bg-info/20 border-info',
      dot: 'border-info bg-info',
    },
    {
      value: 'advanced',
      label: t('level.advanced'),
      description: t('level.advancedDesc'),
      tint: 'bg-accent/10 border-accent/20',
      selectedTint: 'bg-accent/20 border-accent',
      dot: 'border-accent bg-accent',
    },
  ];

  return (
    <Box className="w-full">
      <Box className="text-center mb-6 sm:mb-8">
        <Typography variant="h2" weight="bold" align="center" className="text-foreground mb-2">
          {t('level.whatsYourLevel')}
        </Typography>
        <Typography variant="body" align="center" className="text-muted-foreground">
          {t('level.tailorDesc')}
        </Typography>
      </Box>

      <Stack direction="vertical" gap="md" className="mb-8">
        {levels.map((level) => {
          const isSelected = selectedLevel === level.value;
          return (
            <Box
              key={level.value}
              as="button"
              onClick={() => setSelectedLevel(level.value)}
              className={`w-full p-6 border-2 rounded-lg text-left transition-all ${isSelected ? level.selectedTint : `${level.tint} hover:border-opacity-60`}`}
            >
              <Stack direction="horizontal" align="center" gap="md">
                <Box className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? level.dot : 'border-border bg-transparent'}`}>
                  {isSelected && <Box className="w-3 h-3 rounded-full bg-primary-foreground" />}
                </Box>
                <Box className="flex-1">
                  <Typography variant="h4" weight="semibold" className="text-foreground mb-1">
                    {level.label}
                  </Typography>
                  <Typography variant="small" className="text-muted-foreground">
                    {level.description}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {/* Action Buttons - Fixed to bottom */}
      <Box className="sticky bottom-0 left-0 right-0 bg-card border-t border-border py-4 -mx-6 px-6 -mb-6">
        <Stack direction="horizontal" justify="end" gap="md">
          {onSkip && (
            <Button variant="secondary" onClick={onSkip}>
              {t('activation.skipForNow')}
            </Button>
          )}
          <Button
            variant="primary"
            leftIcon={User}
            onClick={() => {
              if (selectedLevel) {
                onSelectLevel(selectedLevel);
              }
            }}
            disabled={!selectedLevel}
          >
            {t('level.continueWith', { level: selectedLevel ?? t('level.level') })}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};
