/**
 * DailyMenuBoard Organism
 *
 * Main entry point for the learning story. Shows a daily menu with:
 * - Suggestions grid (what to learn next)
 * - Reviews due (spaced repetition)
 * - Quick access (explorer, graph, path)
 * - Recent nodes
 * - Daily stats (streak, XP, progress)
 *
 * Events Emitted:
 * - UI:CONTINUE_LEARNING — Via NextSuggestionCard
 * - UI:START_REVIEW — When review section is clicked
 * - UI:OPEN_EXPLORER — Quick access explorer
 * - UI:OPEN_GRAPH — Quick access graph
 * - UI:SELECT_NODE — When a recent node is clicked
 */

import React, { useCallback } from "react";
import {
  Box,
  VStack,
  HStack,
  Typography,
  Button,
  Container,
  Icon,
  EmptyState,
  SimpleGrid,
  ProgressBar,
  PageHeader,
  Section,
  useEventBus,
  useTranslate,
  type EntityDisplayProps,
} from "@almadar/ui";
import { BookOpen, Map, GitBranch, RefreshCw, Compass } from "lucide-react";
import type {
  KnowledgeSession,
  DailyProgress,
  NextSuggestion,
  ReviewItem,
  KnowledgeNode,
  KnowledgeDomain,
  KnowledgeSubject,
} from "../types/knowledge";
import { StreakBadge } from "../atoms/StreakBadge";
import { XpCounter } from "../atoms/XpCounter";
import { NextSuggestionCard } from "../molecules/NextSuggestionCard";
import { KnowledgeNodeCard } from "../molecules/KnowledgeNodeCard";

export interface DailyMenuEntity {
  session: KnowledgeSession | null;
  dailyProgress: DailyProgress;
  suggestions: NextSuggestion[];
  reviewsDue: ReviewItem[];
  recentNodes: KnowledgeNode[];
  domains: KnowledgeDomain[];
  subjects: KnowledgeSubject[];
}

export interface DailyMenuBoardProps extends EntityDisplayProps<DailyMenuEntity> {
}

export function DailyMenuBoard({
  entity,
  className = "",
}: DailyMenuBoardProps): React.JSX.Element {
  const { emit } = useEventBus();
  const { t } = useTranslate();
  const data = (entity && typeof entity === 'object' && !Array.isArray(entity)) ? entity as DailyMenuEntity : undefined;
  const dailyProgress = data?.dailyProgress ?? { date: '', streakDay: 0, xpEarned: 0, nodesExplored: 0, lessonsCompleted: 0, challengesPassed: 0 };
  const suggestions = data?.suggestions ?? [];
  const reviewsDue = data?.reviewsDue ?? [];
  const recentNodes = data?.recentNodes ?? [];

  const handleStartReview = useCallback(() => {
    emit("UI:START_REVIEW", { count: reviewsDue.length });
  }, [emit, reviewsDue.length]);

  const handleOpenExplorer = useCallback(() => {
    emit("UI:OPEN_EXPLORER", {});
  }, [emit]);

  const handleOpenGraph = useCallback(() => {
    emit("UI:OPEN_GRAPH", {});
  }, [emit]);

  const handleOpenWorldMap = useCallback(() => {
    emit("UI:OPEN_WORLD_MAP", {});
  }, [emit]);

  return (
    <Box className={`min-h-screen bg-[var(--color-background)] ${className}`}>
      <PageHeader
        title={t('daily.title')}
        subtitle={dailyProgress.date}
      >
        <HStack gap="sm" align="center">
          <StreakBadge streakDay={dailyProgress.streakDay} size="md" />
          <XpCounter xp={dailyProgress.xpEarned} label="today" />
        </HStack>
      </PageHeader>

      <Container size="lg" padding="sm" className="py-6">
        <VStack gap="lg">
          {/* Daily progress */}
          <Section variant="card">
            <HStack gap="md">
              <VStack gap="xs" className="flex-1">
                <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">
                  {t('daily.explored')}
                </Typography>
                <ProgressBar value={dailyProgress.nodesExplored} max={20} size="sm" variant="primary" />
              </VStack>
              <VStack gap="xs" className="flex-1">
                <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">
                  {t('daily.lessons')}
                </Typography>
                <ProgressBar value={dailyProgress.lessonsCompleted} max={5} size="sm" variant="success" />
              </VStack>
              <VStack gap="xs" className="flex-1">
                <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">
                  {t('daily.challenges')}
                </Typography>
                <ProgressBar value={dailyProgress.challengesPassed} max={3} size="sm" variant="warning" />
              </VStack>
            </HStack>
          </Section>

          {/* Suggestions */}
          <Section title={t('daily.whatsNext')}>
            {suggestions.length > 0 ? (
              <SimpleGrid cols={2}>
                {suggestions.slice(0, 4).map((s) => (
                  <NextSuggestionCard key={s.nodeId} suggestion={s} />
                ))}
              </SimpleGrid>
            ) : (
              <EmptyState
                icon={Compass}
                title={t('daily.allCaughtUp')}
                description={t('daily.noSuggestions')}
              />
            )}
          </Section>

          {/* Reviews due */}
          {reviewsDue.length > 0 && (
            <Section
              title={t('daily.reviewsDue', { count: reviewsDue.length })}
              action={
                <Icon icon={RefreshCw} size="sm" />
              }
            >
              <VStack gap="sm">
                <VStack gap="xs">
                  {reviewsDue.slice(0, 3).map((r) => (
                    <HStack key={r.nodeId} justify="between">
                      <Typography variant="small" className="text-sm text-[var(--color-foreground)]">{r.nodeTitle}</Typography>
                      <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">{r.subject}</Typography>
                    </HStack>
                  ))}
                  {reviewsDue.length > 3 && (
                    <Typography variant="small" className="text-sm text-[var(--color-muted-foreground)]">
                      +{reviewsDue.length - 3} {t('daily.more')}
                    </Typography>
                  )}
                </VStack>
                <Button
                  variant="primary"
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
                  onClick={handleStartReview}
                >
                  {t('daily.startReview')}
                </Button>
              </VStack>
            </Section>
          )}

          {/* Quick access */}
          <Section title={t('daily.quickAccess')}>
            <HStack gap="sm" wrap>
              <Button
                variant="secondary"
                className="px-4 py-2 bg-gray-100 text-[var(--color-foreground)] rounded-lg hover:bg-gray-200 flex items-center gap-2"
                onClick={handleOpenExplorer}
              >
                <Compass size={16} />
                {t('daily.explorer')}
              </Button>
              <Button
                variant="secondary"
                className="px-4 py-2 bg-gray-100 text-[var(--color-foreground)] rounded-lg hover:bg-gray-200 flex items-center gap-2"
                onClick={handleOpenGraph}
              >
                <GitBranch size={16} />
                {t('daily.graph')}
              </Button>
              <Button
                variant="secondary"
                className="px-4 py-2 bg-gray-100 text-[var(--color-foreground)] rounded-lg hover:bg-gray-200 flex items-center gap-2"
                onClick={handleOpenWorldMap}
              >
                <Map size={16} />
                {t('daily.worldMap')}
              </Button>
            </HStack>
          </Section>

          {/* Recent nodes */}
          {recentNodes.length > 0 && (
            <Section
              title={t('daily.recentlyVisited')}
              action={<Icon icon={BookOpen} size="sm" />}
            >
              <SimpleGrid cols={2}>
                {recentNodes.slice(0, 4).map((node) => (
                  <Box key={node.id} data-entity-row={node.id}>
                    <KnowledgeNodeCard
                      node={node}
                      selectNodeEvent="SELECT_NODE"
                    />
                  </Box>
                ))}
              </SimpleGrid>
            </Section>
          )}
        </VStack>
      </Container>
    </Box>
  );
}

DailyMenuBoard.displayName = "DailyMenuBoard";
