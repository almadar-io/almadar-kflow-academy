/** @type {import('tailwindcss').Config} */
// Canonical theming: consume the shared @almadar/ui Tailwind preset (same as
// apps/builder). The preset owns the semantic, theme-aware color tokens
// (bg-primary, text-foreground, bg-card, border-border, … → var(--color-*)),
// radius, shadow, fonts, and the var-based safelist. Theme switches via the
// `data-theme` attribute set by @almadar/ui's ThemeProvider — NOT a `.dark`
// class. Prefer the preset's semantic classes over hard-coded colours/`dark:`.
const almadarPreset = require('@almadar/ui/tailwind-preset');

module.exports = {
  presets: [almadarPreset],
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    './design-system/**/*.{js,jsx,ts,tsx}',
    './node_modules/@almadar/ui/dist/**/*.{js,ts}',
    '../../node_modules/@almadar/ui/dist/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      // TEMPORARY back-compat numbered scales for existing hard-coded usages
      // (bg-primary-600, bg-success-500, text-error-700, …). These are NOT
      // theme-aware. Components are being migrated to the preset's semantic
      // tokens; remove these scales once that migration is complete.
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
}
