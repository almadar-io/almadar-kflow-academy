import React, { useState } from 'react';
import { ArrowLeft, Circle, ChevronDown, ChevronUp, FileText, List, Map, Network } from 'lucide-react';

export type ConceptViewMode = 'list' | 'detail' | 'mindmap' | 'radial' | 'graph';

export interface ConceptViewOption {
  mode: ConceptViewMode;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface ConceptViewHeaderProps {
  title: string;
  subtitle?: string;
  model?: string;
  currentMode: ConceptViewMode;
  options: ConceptViewOption[];
  onModeChange: (mode: ConceptViewMode) => void;
  onBack: () => void;
  rightContent?: React.ReactNode;
  hideViewToggle?: boolean;
}

const defaultIcons: Record<ConceptViewMode, React.ReactNode> = {
  list: <List size={16} className="mr-2" />,
  detail: <FileText size={16} className="mr-2" />,
  mindmap: <Map size={16} className="mr-2" />,
  radial: <Circle size={16} className="mr-2" />,
  graph: <Network size={16} className="mr-2" />,
};

const ConceptViewHeader: React.FC<ConceptViewHeaderProps> = ({
  title,
  subtitle,
  model,
  currentMode,
  options,
  onModeChange,
  onBack,
  rightContent,
  hideViewToggle = false,
}) => {
  const [isMobileToggleOpen, setIsMobileToggleOpen] = useState(false);

  const toggleMobileNav = () => {
    setIsMobileToggleOpen(prev => !prev);
  };

  const renderHeaderContent = () => (
    <div className="concept-view-header__wrapper flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between min-w-0">
      <div className="concept-view-header__main flex items-start gap-3 min-w-0 flex-1">
        <button
          onClick={onBack}
          className="concept-view-header__back inline-flex items-center rounded-md px-2 py-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          title="Back"
          type="button"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="concept-view-header__title-row mb-1 flex items-center gap-3 flex-wrap">
            <h2
              className="concept-view-header__title text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate min-w-0"
              title={title}
            >
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="concept-view-header__subtitle text-gray-500 dark:text-gray-400 text-sm">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="concept-view-header__controls flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto flex-shrink-0">
        {options.length > 0 && !hideViewToggle && (
          <>
            <button
              type="button"
              onClick={toggleMobileNav}
              className="concept-view-header__view-toggle flex items-center justify-between sm:hidden bg-white/20 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <span>View Modes</span>
              {isMobileToggleOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            <div
              className={`${isMobileToggleOpen ? 'flex' : 'hidden'
                } concept-view-header__view-options flex-col bg-white/15 rounded-lg p-2 gap-2 sm:flex sm:flex-row sm:bg-white/20 sm:p-1 sm:justify-end w-full sm:w-auto`}
            >
              {options.map(option => {
                const Icon = option.icon ?? defaultIcons[option.mode];
                const isActive = currentMode === option.mode;
                return (
                  <button
                    key={option.mode}
                    type="button"
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                      } ${option.disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-600' : ''}`}
                    onClick={() => {
                      if (!option.disabled) {
                        onModeChange(option.mode);
                        setIsMobileToggleOpen(false);
                      }
                    }}
                    disabled={option.disabled}
                  >
                    {Icon}
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {rightContent && <div className="flex justify-end flex-shrink-0">{rightContent}</div>}
      </div>
    </div>
  );

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm transition-all duration-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {renderHeaderContent()}
      </div>
    </header>
  );
};

export default ConceptViewHeader;

