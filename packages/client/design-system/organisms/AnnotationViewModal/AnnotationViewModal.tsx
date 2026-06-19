import React from 'react';
import {
  Modal,
  Box,
  VStack,
  HStack,
  Typography,
  Button,
  MarkdownContent,
  useEventBus,
  useTranslate,
  type DisplayStateProps,
} from '@almadar/ui';
import type { QuestionAnswerItem, NoteItem, AnnotationType } from '@features/knowledge-graph/types';

export interface AnnotationEntity {
  type: AnnotationType;
  annotation: QuestionAnswerItem | NoteItem;
  isOpen: boolean;
}

export interface AnnotationViewModalProps extends DisplayStateProps {
  entity: AnnotationEntity | null;
}

export function AnnotationViewModal({ entity }: AnnotationViewModalProps): React.JSX.Element | null {
  const { emit } = useEventBus();
  const { t } = useTranslate();

  if (!entity) return null;

  const { type, annotation, isOpen } = entity;
  const title = type === 'question'
    ? t('annotation.titleQuestion')
    : t('annotation.titleNote');

  const handleClose = () => {
    emit('UI:ANNOTATION_CLOSE', {});
  };

  const handleDelete = () => {
    emit('UI:ANNOTATION_DELETE', { annotationId: annotation.id, type });
  };

  const isQuestion = type === 'question' && 'question' in annotation;
  const qa = isQuestion ? (annotation as QuestionAnswerItem) : null;
  const note = !isQuestion ? (annotation as NoteItem) : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
      <VStack gap="md">
        {annotation.selectedText && (
          <Box
            className={
              isQuestion
                ? 'border-l-4 p-3 rounded-r-md bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                : 'border-l-4 p-3 rounded-r-md bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
            }
          >
            <Typography variant="small" color="muted">
              {t('annotation.context')}
            </Typography>
            <Typography variant="body" className="text-sm italic">
              &ldquo;{annotation.selectedText}&rdquo;
            </Typography>
          </Box>
        )}

        {qa && (
          <VStack gap="md">
            <VStack gap="xs">
              <Typography variant="small" className="font-semibold text-blue-600 dark:text-blue-400">
                {t('annotation.question')}
              </Typography>
              <Typography variant="body">{qa.question}</Typography>
            </VStack>
            <VStack gap="xs">
              <Typography variant="small" className="font-semibold text-green-600 dark:text-green-400">
                {t('annotation.answer')}
              </Typography>
              <Box className="prose dark:prose-invert max-w-none">
                <MarkdownContent content={qa.answer} />
              </Box>
            </VStack>
          </VStack>
        )}

        {note && (
          <Typography variant="body">{note.text}</Typography>
        )}

        <HStack className="pt-4 border-t border-gray-200 dark:border-gray-700 justify-between">
          <Typography variant="small" color="muted">
            {t('annotation.created', { date: new Date(annotation.timestamp).toLocaleString() })}
          </Typography>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            {t('annotation.delete')}
          </Button>
        </HStack>
      </VStack>
    </Modal>
  );
}

AnnotationViewModal.displayName = 'AnnotationViewModal';
