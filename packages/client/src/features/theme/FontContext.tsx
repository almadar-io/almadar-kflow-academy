import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FONT_ID,
  FONT_OPTIONS,
  FONT_STORAGE_KEY,
  getFontById,
  isValidFontId,
  type FontOption,
} from '../../config/fonts';

export interface FontContextValue {
  /** Currently active font option. */
  font: FontOption;
  /** Set the active font by id. */
  setFont: (id: string) => void;
  /** All available font options. */
  availableFonts: FontOption[];
}

const FontContext = createContext<FontContextValue | undefined>(undefined);

function getInitialFont(): FontOption {
  if (typeof window === 'undefined') {
    return getFontById(DEFAULT_FONT_ID) ?? FONT_OPTIONS[0];
  }
  const stored = window.localStorage.getItem(FONT_STORAGE_KEY);
  if (stored && isValidFontId(stored)) {
    return getFontById(stored) ?? FONT_OPTIONS[0];
  }
  return getFontById(DEFAULT_FONT_ID) ?? FONT_OPTIONS[0];
}

function applyFontToRoot(font: FontOption): void {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--font-family', font.family);
  root.style.setProperty('--font-family-body', font.family);
  root.style.setProperty(
    '--font-family-display',
    font.displayFamily ?? font.family,
  );
  root.style.setProperty(
    '--font-family-mono',
    font.monoFamily ??
      '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  );
}

export interface FontProviderProps {
  children: React.ReactNode;
}

export const FontProvider: React.FC<FontProviderProps> = ({ children }) => {
  const [font, setFontState] = useState<FontOption>(getInitialFont);

  const setFont = useCallback((id: string) => {
    const next = getFontById(id);
    if (!next) return;
    window.localStorage.setItem(FONT_STORAGE_KEY, next.id);
    setFontState(next);
  }, []);

  useEffect(() => {
    applyFontToRoot(font);
  }, [font]);

  const value = useMemo(
    () => ({ font, setFont, availableFonts: FONT_OPTIONS }),
    [font, setFont],
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
};

export function useFont(): FontContextValue {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}
