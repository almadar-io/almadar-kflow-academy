import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslate, useEventBus } from '@almadar/ui';
import type { Suggestion } from '@kflow-academy/shared';
import { analyzeTrajectory, replyToCompanion } from '../api/companionApi';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:client:companion:useCompanion');

interface CompanionState {
  suggestion: Suggestion | null;
  loading: boolean;
  reply: string | null;
  replying: boolean;
}

export function useCompanion(autoAnalyze: boolean = true) {
  const { locale } = useTranslate();
  const { emit } = useEventBus();
  const [state, setState] = useState<CompanionState>({
    suggestion: null,
    loading: false,
    reply: null,
    replying: false,
  });
  const dismissed = useRef<Set<string>>(new Set());

  const analyze = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const result = await analyzeTrajectory(undefined, locale);
      const sig = `${result.suggestion.type}:${result.suggestion.target}`;
      if (dismissed.current.has(sig)) {
        log.info('Companion suggestion already dismissed this session', { sig });
        setState(prev => ({ ...prev, suggestion: null, loading: false }));
      } else {
        setState(prev => ({ ...prev, suggestion: result.suggestion, loading: false }));
      }
      log.info('Companion analysis complete', { type: result.suggestion.type });
    } catch (e) {
      log.warn('Companion analysis failed', { error: e instanceof Error ? e.message : String(e) });
      setState(prev => ({ ...prev, loading: false }));
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
    reply: state.reply,
    replying: state.replying,
    analyze,
    dismiss,
    accept,
    askWhy,
  };
}
