/**
 * LanguageSelector Molecule Component
 * 
 * A dropdown for selecting languages with flags/icons and native names.
 * Uses SelectDropdown molecule and Icon atom.
 */

import React from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

export interface LanguageOption {
  /**
   * ISO language code (e.g., 'en', 'es', 'ar')
   */
  code: string;
  
  /**
   * English name of the language
   */
  name: string;
  
  /**
   * Native name of the language
   */
  nativeName: string;
  
  /**
   * Text direction
   */
  direction?: 'ltr' | 'rtl';
  
  /**
   * Flag emoji or icon
   */
  flag?: string;
}

export interface LanguageSelectorProps {
  /**
   * Available languages
   */
  languages: LanguageOption[];
  
  /**
   * Currently selected language code
   */
  value?: string;
  
  /**
   * Callback when language changes
   */
  onChange?: (code: string) => void;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Show native name alongside English name
   * @default true
   */
  showNativeName?: boolean;
  
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Disable selector
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Default languages with common options
export const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', flag: '🇨🇳' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', flag: '🇰🇷' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', flag: '🇷🇺' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', flag: '🇮🇹' },
];

const sizeClasses = {
  sm: 'py-1.5 px-2.5 text-sm',
  md: 'py-2 px-3 text-base',
  lg: 'py-2.5 px-4 text-lg',
};

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages = DEFAULT_LANGUAGES,
  value,
  onChange,
  placeholder = 'Select language',
  showNativeName = true,
  size = 'md',
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  const selectedLanguage = languages.find(lang => lang.code === value);
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelect = (code: string) => {
    onChange?.(code);
    setIsOpen(false);
  };
  
  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2',
          'border border-gray-300 dark:border-gray-600 rounded-lg',
          'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
          'hover:border-gray-400 dark:hover:border-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
          isOpen && 'border-indigo-500 dark:border-indigo-500',
          sizeClasses[size]
        )}
      >
        <span className="flex items-center gap-2">
          <Icon icon={Globe} size={size === 'sm' ? 'sm' : 'md'} className="text-gray-500" />
          {selectedLanguage ? (
            <span className="flex items-center gap-2">
              {selectedLanguage.flag && (
                <span className="text-lg">{selectedLanguage.flag}</span>
              )}
              <span>{selectedLanguage.name}</span>
              {showNativeName && selectedLanguage.nativeName !== selectedLanguage.name && (
                <span className="text-gray-500 dark:text-gray-400">
                  ({selectedLanguage.nativeName})
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
          )}
        </span>
        <Icon
          icon={ChevronDown}
          size="sm"
          className={cn(
            'text-gray-500 transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>
      
      {isOpen && (
        <div className={cn(
          'absolute z-50 w-full mt-2',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg',
          'max-h-64 overflow-auto'
        )}>
          <div className="py-1">
            {languages.map((lang) => {
              const isSelected = lang.code === value;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-4 py-2 text-left',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                    isSelected && 'bg-indigo-50 dark:bg-indigo-900/20'
                  )}
                  dir={lang.direction}
                >
                  <span className="flex items-center gap-2">
                    {lang.flag && (
                      <span className="text-lg">{lang.flag}</span>
                    )}
                    <span className="flex flex-col">
                      <Typography variant="small" className="font-medium">
                        {lang.name}
                      </Typography>
                      {showNativeName && lang.nativeName !== lang.name && (
                        <Typography variant="small" color="secondary">
                          {lang.nativeName}
                        </Typography>
                      )}
                    </span>
                  </span>
                  {isSelected && (
                    <Icon icon={Check} size="sm" className="text-indigo-600 dark:text-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

LanguageSelector.displayName = 'LanguageSelector';
