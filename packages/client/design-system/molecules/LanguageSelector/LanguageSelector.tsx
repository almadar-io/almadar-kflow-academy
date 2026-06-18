import React from 'react';
import { Select, type SelectOption } from '@almadar/ui';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  direction?: 'ltr' | 'rtl';
  flag?: string;
}

export interface LanguageSelectorProps {
  languages?: LanguageOption[];
  value?: string;
  onChange?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English',    nativeName: 'English',    direction: 'ltr', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',    direction: 'ltr', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',    direction: 'rtl', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',        direction: 'ltr', flag: '🇨🇳' },
  { code: 'fr', name: 'French',     nativeName: 'Français',   direction: 'ltr', flag: '🇫🇷' },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',    direction: 'ltr', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português',  direction: 'ltr', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese',   nativeName: '日本語',      direction: 'ltr', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     nativeName: '한국어',      direction: 'ltr', flag: '🇰🇷' },
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',     direction: 'ltr', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian',    nativeName: 'Русский',    direction: 'ltr', flag: '🇷🇺' },
  { code: 'it', name: 'Italian',    nativeName: 'Italiano',   direction: 'ltr', flag: '🇮🇹' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages = DEFAULT_LANGUAGES,
  value,
  onChange,
  placeholder = 'Select language',
  disabled,
  className,
}) => {
  const options: SelectOption[] = languages.map((lang) => ({
    value: lang.code,
    label: lang.name,
    icon: lang.flag ? <span>{lang.flag}</span> : undefined,
    secondaryLabel: lang.nativeName !== lang.name ? lang.nativeName : undefined,
    dir: lang.direction,
  }));

  return (
    <Select
      options={options}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      searchable={languages.length > 6}
      className={className}
      onValueChange={(v) => onChange?.(v as string)}
    />
  );
};

LanguageSelector.displayName = 'LanguageSelector';
