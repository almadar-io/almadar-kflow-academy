/**
 * LayerPracticeModal Organism
 *
 * Full-height bottom-sheet that loads (and streams) a layer's final-review
 * practice via useLayerPractice and renders it as markdown segments.
 * Entity-interacting (hook-driven, streaming) → organism.
 */

import React, { useRef, useMemo } from 'react';
import { BookOpen, CheckCircle2, X } from 'lucide-react';
import {
  parseMarkdownWithCodeBlocks,
  SegmentRenderer,
  Box,
  VStack,
  HStack,
  Typography,
  Button,
  Icon,
  Card,
  LoadingState,
  EmptyState,
  useTranslate,
  type LessonSegment,
} from '@almadar/ui';
import { normalizeLatexDelimiters } from '../../utils/normalizeLatexDelimiters';
import { Concept, PracticeItem } from '@features/concepts/types';
import { useLayerPractice } from '@features/concepts/hooks/useLayerPractice';

export interface LayerPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  concepts: Concept[];
  layerGoal: string;
  layerNumber: number;
  existingExercises?: PracticeItem[]; // Existing exercises from layer data
  graphId?: string; // Graph ID to save exercises to layer
}

export const LayerPracticeModal: React.FC<LayerPracticeModalProps> = ({
  isOpen,
  onClose,
  concepts,
  layerGoal,
  layerNumber,
  existingExercises,
  graphId,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslate();

  const {
    items,
    isLoading,
    error,
    streamingContent,
    loadPractice,
  } = useLayerPractice({
    concepts,
    layerGoal,
    layerNumber,
    graphId,
    existingExercises,
    isOpen,
  });

  const displayContent = streamingContent || (items.length > 0 ? items[0]?.question : '');

  // Parse content into segments (markdown and code blocks).
  // Normalize LaTeX delimiters first so \[...\] / \(...\) math renders
  // via remark-math/KaTeX.
  const contentSegments = useMemo((): LessonSegment[] => {
    if (!displayContent) return [];
    return parseMarkdownWithCodeBlocks(normalizeLatexDelimiters(displayContent));
  }, [displayContent]);

  if (!isOpen) return null;

  return (
    <Box
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end transition-all duration-normal ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <Box
        ref={modalRef}
        className={`bg-card w-full h-full rounded-t-3xl shadow-2xl transform transition-transform duration-normal ease-standard ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <HStack
          justify="between"
          align="center"
          className="p-6 border-b border-border sticky top-0 bg-card z-10"
        >
          <Typography variant="h3" weight="semibold">
            {t('concept.levelFinalReview', { number: layerNumber })}
          </Typography>
          <Button variant="ghost" onClick={onClose}>
            <Icon icon={X} size="md" />
          </Button>
        </HStack>

        {/* Content */}
        <Box className="h-[calc(100vh-80px)] overflow-y-auto p-6 bg-card">
          <VStack gap="lg" className="w-full">
            {/* Learning Goal */}
            {layerGoal && (
              <Box
                padding="md"
                className="bg-gradient-to-br from-[var(--color-info)]/10 via-[var(--color-primary)]/10 to-[var(--color-primary)]/10 border border-[var(--color-info)]/30 rounded-lg"
              >
                <HStack gap="md" align="start">
                  <Box className="flex-shrink-0 mt-0.5">
                    <Box className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-info)] to-[var(--color-primary)] flex items-center justify-center shadow-sm">
                      <Icon icon={CheckCircle2} size="sm" className="text-[var(--color-primary-foreground)]" />
                    </Box>
                  </Box>
                  <Box className="flex-1 min-w-0">
                    <Typography variant="subheading" weight="semibold" className="mb-1">
                      {t('knowledge.learningGoal')}
                    </Typography>
                    <Typography variant="body2" className="leading-relaxed">
                      {layerGoal}
                    </Typography>
                  </Box>
                </HStack>
              </Box>
            )}

            {/* Loading State */}
            {isLoading && !streamingContent && (
              <LoadingState message={t('concept.generatingReview')} />
            )}

            {/* Error State */}
            {error && (
              <Box padding="md" className="bg-surface border border-[var(--color-error)] rounded-lg">
                <Typography variant="body2" className="text-[var(--color-error)]">
                  {error}
                </Typography>
                <Button variant="danger" size="sm" onClick={loadPractice} className="mt-3">
                  {t('learn.retry')}
                </Button>
              </Box>
            )}

            {/* Review Content */}
            {contentSegments.length > 0 && (
              <Card className="shadow-sm">
                <Box padding="lg">
                  <SegmentRenderer
                    segments={contentSegments}
                    containerClassName="lesson-markdown"
                  />
                </Box>
              </Card>
            )}

            {/* Empty State */}
            {!isLoading && !error && !displayContent && (
              <EmptyState icon={BookOpen} message={t('concept.noReviewForLevel')} />
            )}
          </VStack>
        </Box>
      </Box>
    </Box>
  );
};
