import { useState, useCallback } from 'react';
import type { ImportProgressStep, ImportProgressCounts } from '@almadar/ui';
import type {
  ImportDocumentInput,
  ImportPreviewDTO,
  MigrationStepEvent,
} from '@kflow-academy/shared';
import { previewImport, runImport, streamAgentImport, approveAgentImport } from '../api/importApi';

export type ImportStage = 'source' | 'paste' | 'preview' | 'progress' | 'done' | 'failed';

export interface PendingApproval {
  approvalId: string;
  summary: string;
}

export interface UseImport {
  stage: ImportStage;
  adapterId: 'markdown' | 'paste';
  pasteText: string;
  documents: ImportDocumentInput[];
  preview: ImportPreviewDTO | null;
  steps: MigrationStepEvent[];
  pendingApproval: PendingApproval | null;
  progressStep: ImportProgressStep;
  counts: ImportProgressCounts;
  graphId: string | null;
  error: string | null;
  busy: boolean;
  selectPaste: () => void;
  backToSource: () => void;
  setPasteText: (text: string) => void;
  previewPaste: () => void;
  pickFiles: (files: File[]) => void;
  confirmQuickImport: () => void;
  startAssistedImport: () => void;
  resolveApproval: (approved: boolean) => void;
  reset: () => void;
}

function readFiles(files: File[]): Promise<ImportDocumentInput[]> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<ImportDocumentInput>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({ ref: file.name, raw: typeof reader.result === 'string' ? reader.result : '' });
          reader.onerror = () => reject(new Error(`could not read ${file.name}`));
          reader.readAsText(file);
        }),
    ),
  );
}

/**
 * Import flow state: pick source → deterministic preview → confirm (quick import)
 * or hand the documents to the agent (assisted import, streamed steps + approval gate).
 */
export function useImport(): UseImport {
  const [stage, setStage] = useState<ImportStage>('source');
  const [adapterId, setAdapterId] = useState<'markdown' | 'paste'>('markdown');
  const [pasteText, setPasteText] = useState('');
  const [documents, setDocuments] = useState<ImportDocumentInput[]>([]);
  const [preview, setPreview] = useState<ImportPreviewDTO | null>(null);
  const [steps, setSteps] = useState<MigrationStepEvent[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [progressStep, setProgressStep] = useState<ImportProgressStep>('fetching');
  const [counts, setCounts] = useState<ImportProgressCounts>({});
  const [graphId, setGraphId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = useCallback((message: string) => {
    setError(message);
    setStage('failed');
    setBusy(false);
  }, []);

  const loadPreview = useCallback(
    async (adapter: 'markdown' | 'paste', docs: ImportDocumentInput[]) => {
      setBusy(true);
      setProgressStep('mapping');
      try {
        const result = await previewImport({ adapterId: adapter, documents: docs });
        setPreview(result.preview);
        setCounts({ staged: result.preview.units.length });
        setProgressStep('reviewing');
        setStage('preview');
      } catch (e) {
        fail(e instanceof Error ? e.message : 'Preview failed');
      } finally {
        setBusy(false);
      }
    },
    [fail],
  );

  const selectPaste = useCallback(() => {
    setAdapterId('paste');
    setStage('paste');
  }, []);

  const backToSource = useCallback(() => {
    setStage('source');
    setError(null);
  }, []);

  const previewPaste = useCallback(() => {
    const docs: ImportDocumentInput[] = [{ ref: 'paste', raw: pasteText }];
    setDocuments(docs);
    setAdapterId('paste');
    void loadPreview('paste', docs);
  }, [pasteText, loadPreview]);

  const pickFiles = useCallback(
    (files: File[]) => {
      setStage('progress');
      setProgressStep('fetching');
      setAdapterId('markdown');
      readFiles(files)
        .then((docs) => {
          setDocuments(docs);
          return loadPreview('markdown', docs);
        })
        .catch((e) => fail(e instanceof Error ? e.message : 'Could not read files'));
    },
    [loadPreview, fail],
  );

  const confirmQuickImport = useCallback(() => {
    setStage('progress');
    setProgressStep('committing');
    setBusy(true);
    runImport({ adapterId, documents })
      .then((result) => {
        setGraphId(result.graphId);
        setCounts((prev) => ({
          ...prev,
          committed: result.commit?.committed ?? 0,
          failed: result.commit?.failed.length ?? 0,
        }));
        setProgressStep('done');
        setStage('done');
      })
      .catch((e) => fail(e instanceof Error ? e.message : 'Import failed'))
      .finally(() => setBusy(false));
  }, [adapterId, documents, fail]);

  const startAssistedImport = useCallback(() => {
    setStage('progress');
    setProgressStep('committing');
    setSteps([]);
    setPendingApproval(null);
    setBusy(true);
    streamAgentImport(
      {
        documents: documents.map((doc) => ({ title: doc.ref, content: doc.raw })),
      },
      {
        onStep: (event) => {
          setSteps((prev) => [...prev, event]);
          if (event.type === 'approval_requested') {
            setPendingApproval({ approvalId: event.approvalId, summary: event.summary });
          }
          if (event.type === 'approval_resolved') setPendingApproval(null);
        },
      },
    )
      .then((result) => {
        setGraphId(result.graphId);
        setCounts((prev) => ({
          ...prev,
          committed: result.commit?.committed ?? 0,
          failed: result.commit?.failed.length ?? 0,
        }));
        setProgressStep('done');
        setStage('done');
      })
      .catch((e) => fail(e instanceof Error ? e.message : 'Import failed'))
      .finally(() => setBusy(false));
  }, [documents, fail]);

  const resolveApproval = useCallback(
    (approved: boolean) => {
      if (pendingApproval === null) return;
      const { approvalId } = pendingApproval;
      setPendingApproval(null);
      approveAgentImport({ approvalId, approved }).catch((e) =>
        fail(e instanceof Error ? e.message : 'Approval failed'),
      );
    },
    [pendingApproval, fail],
  );

  const reset = useCallback(() => {
    setStage('source');
    setAdapterId('markdown');
    setPasteText('');
    setDocuments([]);
    setPreview(null);
    setSteps([]);
    setPendingApproval(null);
    setProgressStep('fetching');
    setCounts({});
    setGraphId(null);
    setError(null);
    setBusy(false);
  }, []);

  return {
    stage,
    adapterId,
    pasteText,
    documents,
    preview,
    steps,
    pendingApproval,
    progressStep,
    counts,
    graphId,
    error,
    busy,
    selectPaste,
    backToSource,
    setPasteText,
    previewPaste,
    pickFiles,
    confirmQuickImport,
    startAssistedImport,
    resolveApproval,
    reset,
  };
}
