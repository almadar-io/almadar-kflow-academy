import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslate, useEventBus } from '@almadar/ui';
import type { Suggestion } from '@kflow-academy/shared';
import { streamCompanionAnalysis } from '../api/companionApi';
import type { CompanionStreamEvent } from '../api/companionApi';
import { createLogger } from '@almadar/logger';

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

  const analyze = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, progressLabel: 'Starting analysis' }));

    try {
      await streamCompanionAnalysis(locale, (event: CompanionStreamEvent) => {
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
      });
    } catch (e) {
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
    log.info('Companion suggestion accepted', { type: suggestion.type, target: suggestion.target });
    setState(prev => ({ ...prev, suggestion: null }));

    switch (suggestion.action) {
      case 'navigate':
        if (suggestion.target) {
          emit('UI:NAVIGATE', { url: suggestion.target });
        }
        break;
      case 'open-graph':
        if (suggestion.target) {
          emit('UI:LEARNING_PATH_CLICK', { pathId: suggestion.target });
        }
        break;
      case 'open-concept':
        if (suggestion.target) {
          emit('UI:KNOWLEDGE_NODE_OPEN', { conceptId: suggestion.target });
        }
        break;
      default:
        log.info('No dispatchable action for suggestion', { action: suggestion.action });
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
    if (autoAnalyze) {
      void analyze();
    }
  }, [autoAnalyze, analyze]);

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
