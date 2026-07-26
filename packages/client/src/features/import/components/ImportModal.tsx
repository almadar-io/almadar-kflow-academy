import React, { useMemo } from 'react';
import {
  Box,
  Button,
  ImportPreviewTree,
  ImportProgress,
  ImportSourcePicker,
  Spinner,
  Stack,
  Textarea,
  Typography,
  VStack,
  useTranslate,
} from '@almadar/ui';
import type { ImportEntityDisplay, ImportPreviewUnit, ImportSourceOption } from '@almadar/ui';
import type { ImportPreviewDTO, MigrationStepEvent } from '@kflow-academy/shared';
import { useImport } from '../hooks/useImport';
import type { PendingApproval } from '../hooks/useImport';

export interface ImportModalProps {
  onComplete: (graphId: string) => void;
  onCancel: () => void;
}

const ENTITY_DISPLAY: Record<string, ImportEntityDisplay> = {
  Concept: { singular: 'Concept', plural: 'Concepts' },
  Lesson: { singular: 'Lesson', plural: 'Lessons' },
  FlashCard: { singular: 'Flash card', plural: 'Flash cards' },
  LearningGoal: { singular: 'Learning goal', plural: 'Learning goals' },
};

function previewUnits(preview: ImportPreviewDTO): ImportPreviewUnit[] {
  return preview.units.map((unit) => ({
    ref: unit.ref,
    targetEntity: unit.targetEntity,
    fields: unit.fields,
    ...(unit.parentRef !== null ? { parentRef: unit.parentRef } : {}),
  }));
}

function stepLabel(event: MigrationStepEvent): string | null {
  if (event.type === 'tool_result') {
    return event.error !== null ? `${event.toolName} — ${event.error}` : event.toolName;
  }
  if (event.type === 'assistant') return event.content;
  return null;
}

const AgentSteps: React.FC<{ steps: MigrationStepEvent[] }> = ({ steps }) => {
  const labels = steps.map(stepLabel).filter((label): label is string => label !== null);
  if (labels.length === 0) return null;
  return (
    <VStack gap="xs" className="w-full max-h-48 overflow-y-auto">
      {labels.map((label, index) => (
        <Typography key={index} variant="caption" color="secondary">
          {label}
        </Typography>
      ))}
    </VStack>
  );
};

const ApprovalGate: React.FC<{
  pending: PendingApproval;
  onResolve: (approved: boolean) => void;
}> = ({ pending, onResolve }) => {
  const { t } = useTranslate();
  return (
    <VStack gap="sm" className="w-full rounded-md border border-border bg-card p-4">
      <Typography variant="h4">{t('import.approvalTitle')}</Typography>
      <Typography variant="body" color="secondary">
        {pending.summary}
      </Typography>
      <Stack direction="horizontal" justify="end" gap="md">
        <Button variant="secondary" onClick={() => onResolve(false)}>
          {t('import.reject')}
        </Button>
        <Button variant="primary" onClick={() => onResolve(true)}>
          {t('import.approve')}
        </Button>
      </Stack>
    </VStack>
  );
};

/**
 * Import modal: pick source (paste / markdown files) → preview → quick import
 * (deterministic) or assisted import (agentic, streamed steps + approval gate).
 */
export const ImportModal: React.FC<ImportModalProps> = ({ onComplete, onCancel }) => {
  const { t } = useTranslate();
  const flow = useImport();

  const sources: ImportSourceOption[] = useMemo(
    () => [
      {
        id: 'paste',
        label: t('import.paste'),
        description: t('import.pasteDescription'),
        icon: 'type',
        kind: 'action',
      },
      {
        id: 'markdown',
        label: t('import.markdownFiles'),
        description: t('import.markdownDescription'),
        icon: 'file-text',
        kind: 'file',
        accept: '.md,.markdown,text/markdown',
        multiple: true,
      },
    ],
    [t],
  );

  const handleComplete = () => {
    if (flow.graphId !== null) onComplete(flow.graphId);
  };

  return (
    <Box className="w-full">
      {flow.stage === 'source' ? (
        <ImportSourcePicker
          sources={sources}
          title={t('import.title')}
          onSelect={flow.selectPaste}
          onFilesSelected={flow.pickFiles}
        />
      ) : null}

      {flow.stage === 'paste' ? (
        <VStack gap="md" className="w-full">
          <Typography variant="h4">{t('import.paste')}</Typography>
          <Textarea
            rows={12}
            placeholder={t('import.pastePlaceholder')}
            value={flow.pasteText}
            onChange={(event) => flow.setPasteText(event.target.value)}
          />
          <Stack direction="horizontal" justify="end" gap="md">
            <Button variant="secondary" onClick={flow.backToSource}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={flow.pasteText.trim().length === 0 || flow.busy}
              onClick={flow.previewPaste}
            >
              {t('import.preview')}
            </Button>
          </Stack>
        </VStack>
      ) : null}

      {flow.stage === 'preview' && flow.preview !== null ? (
        <VStack gap="md" className="w-full">
          <Box className="max-h-96 overflow-y-auto">
            <ImportPreviewTree
              units={previewUnits(flow.preview)}
              skipped={flow.preview.skipped}
              entityDisplay={ENTITY_DISPLAY}
              onConfirm={flow.confirmQuickImport}
              onCancel={flow.backToSource}
              confirmLabel={t('import.confirm')}
              cancelLabel={t('common.cancel')}
            />
          </Box>
          {flow.preview.validationErrors.length > 0 ? (
            <VStack gap="xs" className="w-full">
              {flow.preview.validationErrors.map((validationError) => (
                <Typography key={`${validationError.ref}:${validationError.code}`} variant="caption" color="secondary">
                  {`${validationError.ref}: ${validationError.message}`}
                </Typography>
              ))}
            </VStack>
          ) : null}
          <Stack direction="horizontal" justify="end" gap="md">
            <Button variant="ghost" disabled={flow.busy} onClick={flow.startAssistedImport}>
              {t('import.assisted')}
            </Button>
          </Stack>
        </VStack>
      ) : null}

      {flow.stage === 'progress' ? (
        <VStack gap="md" align="center" className="w-full py-4">
          <ImportProgress step={flow.progressStep} counts={flow.counts} />
          {flow.pendingApproval === null ? <Spinner size="md" /> : null}
          <AgentSteps steps={flow.steps} />
          {flow.pendingApproval !== null ? (
            <ApprovalGate pending={flow.pendingApproval} onResolve={flow.resolveApproval} />
          ) : null}
        </VStack>
      ) : null}

      {flow.stage === 'done' ? (
        <VStack gap="md" align="center" className="w-full py-4">
          <ImportProgress step="done" counts={flow.counts} />
          <Typography variant="h3">{t('import.done')}</Typography>
          <Button variant="primary" onClick={handleComplete}>
            {t('import.viewGraph')}
          </Button>
        </VStack>
      ) : null}

      {flow.stage === 'failed' ? (
        <VStack gap="md" align="center" className="w-full py-4">
          <ImportProgress step="failed" counts={flow.counts} />
          <Typography variant="body" color="secondary">
            {flow.error ?? t('import.failed')}
          </Typography>
          <Stack direction="horizontal" justify="end" gap="md">
            <Button variant="secondary" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={flow.reset}>
              {t('import.tryAgain')}
            </Button>
          </Stack>
        </VStack>
      ) : null}
    </Box>
  );
};

ImportModal.displayName = 'ImportModal';
