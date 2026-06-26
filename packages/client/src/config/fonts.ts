/**
 * Font options available in KFlow settings.
 *
 * These map to CSS font-family stacks applied as overrides on top of the
 * active theme. The theme system already exposes --font-family,
 * --font-family-body, --font-family-display, and --font-family-mono, so we
 * can change fonts independently of colors/radius/shadows.
 */

export interface FontOption {
  /** Stable identifier stored in localStorage. */
  id: string;
  /** Human-readable label shown in the settings dropdown. */
  displayName: string;
  /** Value for --font-family / --font-family-body. */
  family: string;
  /** Optional value for --font-family-display. Defaults to `family`. */
  displayFamily?: string;
  /** Optional value for --font-family-mono. */
  monoFamily?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'inter',
    displayName: 'Inter',
    family:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: 'nunito',
    displayName: 'Nunito',
    family:
      '"Nunito", "Nunito Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: 'fraunces',
    displayName: 'Fraunces',
    family: '"Fraunces", "Charter", Georgia, serif',
    displayFamily: '"Fraunces", "Charter", Georgia, serif',
  },
  {
    id: 'jetbrains-mono',
    displayName: 'JetBrains Mono',
    family:
      '"JetBrains Mono", "Fira Code", "SF Mono", ui-monospace',
    displayFamily:
      '"JetBrains Mono", "Fira Code", "SF Mono", ui-monospace',
    monoFamily:
      '"JetBrains Mono", "Fira Code", "SF Mono", ui-monospace',
  },
  {
    id: 'system',
    displayName: 'System Default',
    family:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
];

export const DEFAULT_FONT_ID = 'inter';

export const FONT_STORAGE_KEY = 'kflow-font';

export function getFontById(id: string): FontOption | undefined {
  return FONT_OPTIONS.find((font) => font.id === id);
}

export function isValidFontId(id: string): id is FontOption['id'] {
  return FONT_OPTIONS.some((font) => font.id === id);
}
