import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslate, useEventBus } from '@almadar/ui';
import type { Suggestion } from '@kflow-academy/shared';
import { streamCompanionAnalysis } from '../api/companionApi';
import type { CompanionStreamEvent } from '../api/companionApi';
import { createLogger } from '@almadar/logger';
import { auth } from '../../../config/firebase';

const log = createLogger('kflow:client:companion:useCompanion');

const TOOL_LABELS: Record<string, string> = {
  summarize_trajectory: 'Analyzing your learning trajectory',
  find_convergence: 'Looking for convergence points',
  summarize_cluster: 'Identifying topic clusters',
  find_gap: 'Finding knowledge gaps',
  suggest_expansion: 'Finding expansion targets',
  suggest_next_step: 'Choosing your next step',
  draft_nudge: 'Drafting your suggestion',
  ask_companion: 'Thinking',
};

interface CompanionState {
  suggestion: Suggestion | null;
  loading: boolean;
  progressLabel: string | null;
  reply: string | null;
  replying: boolean;
}

export function useCompanion(autoAnalyze: boolean = true) {
  const { locale } = useTranslate();
  const { emit } = useEventBus();
  const [state, setState] = useState<CompanionState>({
    suggestion: null,
    loading: false,
    progressLabel: null,
    reply: null,
    replying: false,
  });
  const dismissed = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (controller?: AbortController) => {
    const ctrl = controller ?? new AbortController();
    if (!controller) abortRef.current = ctrl;
    log.debug('analyze: called', { locale, uid: auth.currentUser?.uid ?? '(null)', signalAborted: ctrl.signal.aborted });
    setState(prev => ({ ...prev, loading: true, progressLabel: 'Starting analysis' }));

    try {
      await streamCompanionAnalysis(locale, (event: CompanionStreamEvent) => {
        if (ctrl.signal.aborted) {
          log.debug('analyze: stream aborted, ignoring event');
          return;
        }
        switch (event.type) {
          case 'tool_result': {
            const tool = event.data?.tool;
            const label = tool ? (TOOL_LABELS[tool] ?? 'Working') : 'Working';
            setState(prev => ({ ...prev, progressLabel: label }));
            break;
          }
          case 'result': {
            const suggestion = event.data?.suggestion;
            const cost = event.data?.cost;
            if (suggestion) {
              const sig = `${suggestion.type}:${suggestion.target}`;
              if (dismissed.current.has(sig)) {
                log.info('Companion suggestion already dismissed this session', { sig });
                setState(prev => ({ ...prev, suggestion: null, loading: false, progressLabel: null }));
              } else {
                setState(prev => ({ ...prev, suggestion, loading: false, progressLabel: null }));
              }
              if (cost) {
                log.info('Companion analysis cost', cost);
              }
              log.info('Companion analysis complete', { type: suggestion.type });
            }
            break;
          }
          case 'error': {
            const error = event.data?.error;
            log.warn('Companion stream error', { error });
            setState(prev => ({ ...prev, loading: false, progressLabel: null }));
            break;
          }
        }
      }, ctrl.signal);
    } catch (e) {
      if (ctrl.signal.aborted) {
        log.debug('analyze: aborted', { reason: 'AbortController aborted' });
        return;
      }
      log.warn('Companion analysis failed', { error: e instanceof Error ? e.message : String(e) });
      setState(prev => ({ ...prev, loading: false, progressLabel: null }));
    }
  }, [locale]);

  const dismiss = useCallback(() => {
    setState(prev => {
      if (prev.suggestion) {
        const sig = `${prev.suggestion.type}:${prev.suggestion.target}`;
        dismissed.current.add(sig);
      }
      return { ...prev, suggestion: null };
    });
  }, []);

  const accept = useCallback((suggestion: Suggestion) => {
    log.info('Companion suggestion accepted', { type: suggestion.type, action: suggestion.action, target: suggestion.target });
    setState(prev => ({ ...prev, suggestion: null }));

    switch (suggestion.action) {
      case 'open-graph':
        if (suggestion.target) {
          emit('UI:LEARNING_PATH_CLICK', { graphId: suggestion.target });
        }
        break;
      case 'open-concept':
        if (suggestion.target) {
          emit('UI:KNOWLEDGE_NODE_OPEN', { graphId: suggestion.target, nodeId: suggestion.nodeId });
        }
        break;
      case 'create-goal':
        emit('UI:CREATE_LEARNING_PATH', {});
        break;
    }
  }, [emit]);

  const askWhy = useCallback(async () => {
    setState(prev => ({ ...prev, replying: true }));
    try {
      const { replyToCompanion } = await import('../api/companionApi');
      const result = await replyToCompanion('Why are you suggesting this?', locale);
      setState(prev => ({ ...prev, reply: result.reply, replying: false }));
    } catch (e) {
      log.warn('Companion reply failed', { error: e instanceof Error ? e.message : String(e) });
      setState(prev => ({ ...prev, replying: false }));
    }
  }, [locale]);

  useEffect(() => {
    if (!autoAnalyze) return;
    const controller = new AbortController();
    abortRef.current = controller;
    log.debug('useEffect: firing analyze()', { autoAnalyze, locale });
    void analyze(controller);
    return () => {
      log.debug('useEffect: cleanup — aborting', {});
      controller.abort();
    };
  }, [autoAnalyze, locale]); // analyze is stable per locale; not in deps to avoid re-fire

  return {
    suggestion: state.suggestion,
    loading: state.loading,
    progressLabel: state.progressLabel,
    reply: state.reply,
    replying: state.replying,
    analyze,
    dismiss,
    accept,
    askWhy,
  };
}
