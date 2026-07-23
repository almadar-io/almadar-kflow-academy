import React, { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography, Spinner, useTranslate } from '@almadar/ui';
import { Icon as IconifyIcon } from '@iconify/react';
import type { TaxonomyNode } from '../../../src/config/taxonomy';
import { KNOWLEDGE_TAXONOMY } from '../../../src/config/taxonomy';

export interface OnboardingBoardEntity {
  welcomeName: string;
  isCreating: boolean;
  partialGoalTitle?: string;
  error?: string | null;
}

export interface OnboardingBoardProps {
  entity: OnboardingBoardEntity;
  onComplete: (anchorAnswer: string) => void;
  onSkip: (anchorAnswer: string) => void;
}

export const OnboardingBoard: React.FC<OnboardingBoardProps> = ({ entity, onComplete, onSkip }) => {
  const { t } = useTranslate();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const availableDomains = useMemo(
    () =>
      KNOWLEDGE_TAXONOMY
        .filter((cat) => selectedCategories.has(cat.id))
        .flatMap((cat) => cat.children ?? []),
    [selectedCategories],
  );

  const availableSubjects = useMemo(() => {
    const subjects: TaxonomyNode[] = [];
    for (const cat of KNOWLEDGE_TAXONOMY) {
      if (!cat.children) continue;
      for (const domain of cat.children) {
        if (!selectedDomains.has(domain.id) || !domain.children) continue;
        subjects.push(...domain.children);
      }
    }
    return subjects;
  }, [selectedDomains]);

  const selectedTopics: TaxonomyNode[] = useMemo(() => {
    const topics: TaxonomyNode[] = [];
    for (const cat of KNOWLEDGE_TAXONOMY) {
      if (selectedCategories.has(cat.id) && cat.children) {
        for (const domain of cat.children) {
          if (selectedDomains.has(domain.id)) {
            if (!domain.children || domain.children.length === 0 || selectedSubjects.size === 0) {
              topics.push(domain);
            }
          }
        }
      }
    }
    for (const subject of availableSubjects) {
      if (selectedSubjects.has(subject.id)) {
        topics.push(subject);
      }
    }
    return topics;
  }, [selectedCategories, selectedDomains, selectedSubjects, availableSubjects]);

  const canProceed = selectedTopics.length > 0;

  const handleCreate = () => {
    const names = selectedTopics.map((tp) => tp.label);
    const anchorAnswer = names.length === 1
      ? `I want to learn ${names[0]}`
      : `I want to learn ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    onComplete(anchorAnswer);
  };

  if (entity.isCreating) {
    return (
      <Stack direction="vertical" align="center" justify="center" gap="md" className="min-h-[60vh]">
        <Spinner size="lg" />
        <Typography variant="h3" weight="semibold" align="center">
          {t('onboarding.creating')}
        </Typography>
        {entity.partialGoalTitle && (
          <Typography variant="body" color="muted" align="center">
            {entity.partialGoalTitle}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Box className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <Stack direction="vertical" align="center" gap="sm" className="mb-8 sm:mb-10">
        <Typography variant="h1" weight="bold" align="center">
          {t('onboarding.welcome', { name: entity.welcomeName })}
        </Typography>
        <Typography variant="body" color="muted" align="center" className="max-w-lg">
          {t('onboarding.subtitle')}
        </Typography>
      </Stack>

      {entity.error && (
        <Box className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error text-center">
          {entity.error}
        </Box>
      )}

      {/* Step 1: Top categories */}
      <Stack direction="vertical" gap="xs" className="mb-4">
        <Typography variant="h4" weight="semibold">
          {t('onboarding.step1Title')}
        </Typography>
        <Typography variant="small" color="muted">
          {t('onboarding.step1Hint')}
        </Typography>
      </Stack>
      <Stack direction="horizontal" gap="md" wrap className="mb-8">
        {KNOWLEDGE_TAXONOMY.map((cat) => {
          const isSelected = selectedCategories.has(cat.id);
          return (
            <Button
              key={cat.id}
              type="button"
              variant={isSelected ? 'primary' : 'secondary'}
              onClick={() => toggle(selectedCategories, cat.id, setSelectedCategories)}
              className="flex-1 min-w-[140px] !h-auto py-4 flex-col gap-1"
            >
              <IconifyIcon icon={cat.icon} width={24} height={24} />
              <Typography variant="body" weight="semibold">
                {cat.label}
              </Typography>
            </Button>
          );
        })}
      </Stack>

      {/* Step 2: Domains */}
      {availableDomains.length > 0 && (
        <>
          <Stack direction="vertical" gap="xs" className="mb-4">
            <Typography variant="h4" weight="semibold">
              {t('onboarding.step2Title')}
            </Typography>
            <Typography variant="small" color="muted">
              {t('onboarding.step2Hint')}
            </Typography>
          </Stack>
          <Box className="flex flex-wrap gap-2 mb-8">
            {availableDomains.map((domain) => {
              const isSelected = selectedDomains.has(domain.id);
              return (
                <Button
                  key={domain.id}
                  type="button"
                  size="sm"
                  variant={isSelected ? 'primary' : 'secondary'}
                  onClick={() => toggle(selectedDomains, domain.id, setSelectedDomains)}
                  className="!h-auto py-2 px-3"
                >
                  <IconifyIcon icon={domain.icon} width={16} height={16} className="inline-block me-1" />
                  {domain.label}
                </Button>
              );
            })}
          </Box>
        </>
      )}

      {/* Step 3: Subjects */}
      {availableSubjects.length > 0 && (
        <>
          <Stack direction="vertical" gap="xs" className="mb-4">
            <Typography variant="h4" weight="semibold">
              {t('onboarding.step3Title')}
            </Typography>
            <Typography variant="small" color="muted">
              {t('onboarding.step3Hint')}
            </Typography>
          </Stack>
          <Box className="flex flex-wrap gap-2 mb-8">
            {availableSubjects.map((subject) => {
              const isSelected = selectedSubjects.has(subject.id);
              return (
                <Button
                  key={subject.id}
                  type="button"
                  size="sm"
                  variant={isSelected ? 'primary' : 'secondary'}
                  onClick={() => toggle(selectedSubjects, subject.id, setSelectedSubjects)}
                  className="!h-auto py-2 px-3"
                >
                  <IconifyIcon icon={subject.icon} width={16} height={16} className="inline-block me-1" />
                  {subject.label}
                </Button>
              );
            })}
          </Box>
        </>
      )}

      {/* Selected topics summary */}
      {selectedTopics.length > 0 && (
        <Box className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <Typography variant="small" color="muted" className="mb-2">
            {t('onboarding.selected')}
          </Typography>
          <Box className="flex flex-wrap gap-2">
            {selectedTopics.map((tp, i) => (
              <Box
                key={`${tp.id}-${i}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
              >
                <IconifyIcon icon={tp.icon} width={14} height={14} />
                {tp.label}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Actions */}
      <Stack direction="horizontal" justify="between" className="pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={() => {
          const catLabels = KNOWLEDGE_TAXONOMY
            .filter((c) => selectedCategories.has(c.id))
            .map((c) => c.label);
          const anchor = catLabels.length > 0
            ? `I want to explore ${catLabels.join(', ')}`
            : 'I want to explore general knowledge and discover new topics';
          onSkip(anchor);
        }}>
          {t('onboarding.skip')}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleCreate}
          disabled={!canProceed}
          isLoading={entity.isCreating}
        >
          {t('onboarding.createPath')}
        </Button>
      </Stack>
    </Box>
  );
};

OnboardingBoard.displayName = 'OnboardingBoard';
