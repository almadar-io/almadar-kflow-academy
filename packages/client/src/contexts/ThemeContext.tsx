import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  header: string;
  headerText: string;
}

export interface ThemeDefinition {
  name: string;
  id: Theme;
  colors: ThemeColors;
}

const themes: Record<Theme, ThemeDefinition> = {
  light: {
    name: 'Light',
    id: 'light',
    colors: {
      background: 'bg-gray-50',
      surface: 'bg-white',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      border: 'border-gray-200',
      primary: 'bg-indigo-600',
      primaryHover: 'hover:bg-indigo-700',
      secondary: 'bg-purple-600',
      accent: 'bg-indigo-500',
      error: 'bg-red-600',
      warning: 'bg-yellow-500',
      success: 'bg-green-600',
      header: 'bg-gradient-to-r from-indigo-600 to-purple-600',
      headerText: 'text-white',
    },
  },
  dark: {
    name: 'Dark',
    id: 'dark',
    colors: {
      background: 'bg-gray-900',
      surface: 'bg-gray-800',
      text: 'text-gray-100',
      textSecondary: 'text-gray-400',
      border: 'border-gray-700',
      primary: 'bg-indigo-500',
      primaryHover: 'hover:bg-indigo-600',
      secondary: 'bg-purple-500',
      accent: 'bg-indigo-400',
      error: 'bg-red-500',
      warning: 'bg-yellow-400',
      success: 'bg-green-500',
      header: 'bg-gradient-to-r from-gray-800 to-gray-900',
      headerText: 'text-white',
    },
  },
};

interface ThemeContextType {
  theme: Theme;
  themeDefinition: ThemeDefinition;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'kflow-theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    if (stored && (stored === 'light' || stored === 'dark')) {
      return stored;
    }
    // Default to dark theme
    return 'dark';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    // Apply theme class to document root
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Apply theme on mount and when theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Note: System preference listener removed - default theme is always dark

  const value: ThemeContextType = {
    theme,
    themeDefinition: themes[theme],
    setTheme,
    toggleTheme,
    availableThemes: Object.values(themes),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

