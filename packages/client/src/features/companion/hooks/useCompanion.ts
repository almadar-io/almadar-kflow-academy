import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslate, useEventBus } from '@almadar/ui';
import type { Suggestion } from '@kflow-academy/shared';
import { fetchSuggestions, resolveSuggestion as resolveSuggestionApi, replyToCompanion } from '../api/companionApi';
import { createLogger } from '@almadar/logger';
import { auth } from '../../../config/firebase';

const log = createLogger('kflow:client:companion:useCompanion');

export function toolLabel(_tool: string): string {
  return '';
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
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async () => {
    if (!auth.currentUser) return;
    setState(prev => ({ ...prev, loading: true }));

    try {
      const result = await fetchSuggestions(locale);
      setState(prev => ({ ...prev, suggestions: result.suggestions, loading: false }));
      log.info('Companion suggestions fetched', { count: result.suggestions.length, fromCache: result.fromCache });
    } catch (e) {
      log.warn('Companion fetch failed', { error: e instanceof Error ? e.message : String(e) });
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [locale]);

  const dismiss = useCallback(async (suggestion: Suggestion) => {
    setState(prev => ({ ...prev, suggestions: prev.suggestions.filter(s => s !== suggestion) }));
    try {
      await resolveSuggestionApi(suggestion, 'dismissed');
      log.info('Suggestion dismissed', { type: suggestion.type, target: suggestion.target });
    } catch (e) {
      log.warn('Failed to persist dismissal', { error: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const accept = useCallback(async (suggestion: Suggestion) => {
    log.info('Companion suggestion accepted', { type: suggestion.type, action: suggestion.action, target: suggestion.target });
    setState(prev => ({ ...prev, suggestions: prev.suggestions.filter(s => s !== suggestion) }));

    try {
      await resolveSuggestionApi(suggestion, 'accepted');
    } catch (e) {
      log.warn('Failed to persist acceptance', { error: e instanceof Error ? e.message : String(e) });
    }

    switch (suggestion.action) {
      case 'open-graph':
        if (suggestion.target) emit('UI:NAVIGATE', { url: `/concepts/${suggestion.target}` });
        break;
      case 'open-concept':
        if (suggestion.target && suggestion.nodeId) {
          emit('UI:NAVIGATE', { url: `/concepts/${suggestion.target}/concept/${encodeURIComponent(suggestion.nodeId)}` });
        } else if (suggestion.target) {
          emit('UI:NAVIGATE', { url: `/concepts/${suggestion.target}` });
        }
        break;
      case 'create-goal':
        emit('UI:NAVIGATE', { url: '/home?create=true' });
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
    void analyze();
    return () => { controller.abort(); };
  }, [autoAnalyze, locale, analyze]);

  const suggestion = state.suggestions[0] ?? null;

  return {
    suggestion,
    suggestions: state.suggestions,
    loading: state.loading,
    events: state.events,
    replying: state.replying,
    analyze,
    dismiss,
    accept,
    reply,
  };
}
