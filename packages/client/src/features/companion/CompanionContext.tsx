import React, { createContext, useContext } from 'react';
import type { Suggestion, CompanionPersonaDTO } from '@kflow-academy/shared';
import { useCompanion } from './hooks/useCompanion';
import { useCompanionPersona } from './hooks/useCompanionPersona';
import type { CompanionEvent } from './hooks/useCompanion';

export interface CompanionContextValue {
  enabled: boolean;
  persona: CompanionPersonaDTO | null;
  suggestions: Suggestion[];
  events: CompanionEvent[];
  loading: boolean;
  replying: boolean;
  accept: (suggestion: Suggestion) => void;
  dismiss: (suggestion: Suggestion) => void;
  reply: (message: string) => Promise<string>;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

export interface CompanionProviderProps {
  enabled: boolean;
  children: React.ReactNode;
}

export const CompanionProvider: React.FC<CompanionProviderProps> = ({ enabled, children }) => {
  const companion = useCompanion(enabled);
  const { persona } = useCompanionPersona(enabled);

  const value: CompanionContextValue = {
    enabled,
    persona,
    suggestions: companion.suggestions,
    events: companion.events,
    loading: companion.loading,
    replying: companion.replying,
    accept: companion.accept,
    dismiss: companion.dismiss,
    reply: companion.reply,
  };

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
};

export function useCompanionContext(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('useCompanionContext must be used within CompanionProvider');
  return ctx;
}
