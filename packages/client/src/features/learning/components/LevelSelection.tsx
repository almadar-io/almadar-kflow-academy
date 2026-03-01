/**
 * Level Selection Component
 * Allows users to manually select their level or take a placement test
 */

import React, { useState } from 'react';
import { User } from 'lucide-react';

interface LevelSelectionProps {
  onSelectLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  onSkip?: () => void;
}

export const LevelSelection: React.FC<LevelSelectionProps> = ({
  onSelectLevel,
  onSkip,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>('beginner');

  const levels = [
    {
      value: 'beginner' as const,
      label: 'Beginner',
      description: 'I\'m new to this topic or have limited experience',
      color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      selectedColor: 'bg-green-100 dark:bg-green-900/40 border-green-500 dark:border-green-600',
      textColor: 'text-green-800 dark:text-green-300',
    },
    {
      value: 'intermediate' as const,
      label: 'Intermediate',
      description: 'I have some experience and understand the basics',
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      selectedColor: 'bg-blue-100 dark:bg-blue-900/40 border-blue-500 dark:border-blue-600',
      textColor: 'text-blue-800 dark:text-blue-300',
    },
    {
      value: 'advanced' as const,
      label: 'Advanced',
      description: 'I have significant experience and want to deepen my knowledge',
      color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      selectedColor: 'bg-purple-100 dark:bg-purple-900/40 border-purple-500 dark:border-purple-600',
      textColor: 'text-purple-800 dark:text-purple-300',
    },
  ];

  return (
    <div className="w-full">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            What's Your Current Level?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Help us tailor your learning path to your experience level
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {levels.map((level) => (
            <button
              key={level.value}
              onClick={() => setSelectedLevel(level.value)}
              className={`w-full p-6 border-2 rounded-lg text-left transition-all ${selectedLevel === level.value
                  ? level.selectedColor
                  : `${level.color} hover:border-opacity-60`
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedLevel === level.value
                    ? level.value === 'beginner'
                      ? 'border-green-600 dark:border-green-400 bg-green-600 dark:bg-green-400'
                      : level.value === 'intermediate'
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-600 dark:bg-blue-400'
                        : 'border-purple-600 dark:border-purple-400 bg-purple-600 dark:bg-purple-400'
                    : 'border-gray-300 dark:border-gray-600 bg-transparent'
                  }`}>
                  {selectedLevel === level.value && (
                    <div className="w-3 h-3 rounded-full bg-white dark:bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg mb-1 ${level.textColor}`}>
                    {level.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {level.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

      {/* Action Buttons - Fixed to bottom */}
      <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 -mx-6 sm:-mx-6 md:-mx-6 px-6 -mb-6">
        <div className="flex justify-end gap-4">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Skip for Now
            </button>
          )}
          <button
            onClick={() => {
              if (selectedLevel) {
                onSelectLevel(selectedLevel);
              }
            }}
            disabled={!selectedLevel}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <User size={18} />
            Continue with {selectedLevel ? selectedLevel : 'Level'}
          </button>
        </div>
      </div>
    </div>
  );
};

