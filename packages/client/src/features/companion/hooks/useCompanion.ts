import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslate, useEventBus } from '@almadar/ui';
import type { Suggestion } from '@kflow-academy/shared';
import { streamCompanionAnalysis, replyToCompanion } from '../api/companionApi';
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

export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? 'Working';
}

export interface CompanionEvent {
  id: number;
  kind: 'tool' | 'result' | 'error';
  label: string;
  tool?: string;
}

interface CompanionState {
  suggestions: Suggestion[];
  loading: boolean;
  events: CompanionEvent[];
  reply: string | null;
  replying: boolean;
}

export function useCompanion(autoAnalyze: boolean = true) {
  const { locale } = useTranslate();
  const { emit } = useEventBus();
  const [state, setState] = useState<CompanionState>({
    suggestions: [],
    loading: false,
    events: [],
    reply: null,
    replying: false,
  });
  const dismissed = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const eventId = useRef(0);

  const analyze = useCallback(async (controller?: AbortController) => {
    const ctrl = controller ?? new AbortController();
    if (!controller) abortRef.current = ctrl;
    log.debug('analyze: called', { locale, uid: auth.currentUser?.uid ?? '(null)', signalAborted: ctrl.signal.aborted });
    setState(prev => ({ ...prev, loading: true, events: [] }));

    try {
      await streamCompanionAnalysis(locale, (event: CompanionStreamEvent) => {
        if (ctrl.signal.aborted) return;
        switch (event.type) {
          case 'tool_result': {
            const tool = event.data?.tool;
            const label = tool ? toolLabel(tool) : 'Working';
            setState(prev => ({
              ...prev,
              events: [...prev.events, { id: ++eventId.current, kind: 'tool', label, tool }],
            }));
            break;
          }
          case 'result': {
            const suggestion = event.data?.suggestion;
            if (suggestion) {
              const sig = `${suggestion.type}:${suggestion.target}`;
              if (dismissed.current.has(sig)) {
                log.info('Companion suggestion already dismissed this session', { sig });
                setState(prev => ({ ...prev, loading: false }));
              } else {
                setState(prev => ({
                  ...prev,
                  suggestions: [suggestion, ...prev.suggestions.filter(s => `${s.type}:${s.target}` !== sig)],
                  loading: false,
                }));
              }
              log.info('Companion analysis complete', { type: suggestion.type });
            }
            break;
          }
          case 'error': {
            const error = event.data?.error;
            log.warn('Companion stream error', { error });
            setState(prev => ({
              ...prev,
              loading: false,
              events: [...prev.events, { id: ++eventId.current, kind: 'error', label: error ?? 'Analysis failed' }],
            }));
            break;
          }
        }
      }, ctrl.signal);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      log.warn('Companion analysis failed', { error: e instanceof Error ? e.message : String(e) });
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [locale]);

  const dismiss = useCallback((suggestion: Suggestion) => {
    const sig = `${suggestion.type}:${suggestion.target}`;
    dismissed.current.add(sig);
    setState(prev => ({ ...prev, suggestions: prev.suggestions.filter(s => `${s.type}:${s.target}` !== sig) }));
  }, []);

  const dismissAll = useCallback(() => {
    setState(prev => {
      for (const s of prev.suggestions) dismissed.current.add(`${s.type}:${s.target}`);
      return { ...prev, suggestions: [] };
    });
  }, []);

  const accept = useCallback((suggestion: Suggestion) => {
    log.info('Companion suggestion accepted', { type: suggestion.type, action: suggestion.action, target: suggestion.target });
    setState(prev => ({ ...prev, suggestions: prev.suggestions.filter(s => s !== suggestion) }));

    switch (suggestion.action) {
      case 'open-graph':
        if (suggestion.target) emit('UI:LEARNING_PATH_CLICK', { graphId: suggestion.target });
        break;
      case 'open-concept':
        if (suggestion.target) emit('UI:KNOWLEDGE_NODE_OPEN', { graphId: suggestion.target, nodeId: suggestion.nodeId });
        break;
      case 'create-goal':
        emit('UI:CREATE_LEARNING_PATH', {});
        break;
    }
  }, [emit]);

  const reply = useCallback(async (message: string): Promise<string> => {
    setState(prev => ({ ...prev, replying: true }));
    try {
      const result = await replyToCompanion(message, locale);
      setState(prev => ({ ...prev, replying: false }));
      return result.reply;
    } catch (e) {
      log.warn('Companion reply failed', { error: e instanceof Error ? e.message : String(e) });
      setState(prev => ({ ...prev, replying: false }));
      throw e;
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
  }, [autoAnalyze, locale]);

  // Backward-compat: first suggestion
  const suggestion = state.suggestions[0] ?? null;

  return {
    suggestion,
    suggestions: state.suggestions,
    loading: state.loading,
    events: state.events,
    replying: state.replying,
    analyze,
    dismiss,
    dismissAll,
    accept,
    reply,
  };
}
