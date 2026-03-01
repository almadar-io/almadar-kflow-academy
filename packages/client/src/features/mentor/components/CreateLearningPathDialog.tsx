import React from 'react';
import Modal from '../../../components/Modal';
import { Slider } from '../../../components';
import { ConceptDifficulty } from '../../concepts/types';
import { BookOpen, Target, Sparkles, HelpCircle, GraduationCap, Plus, Loader2 } from 'lucide-react';

interface CreateLearningPathDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newConceptName: string;
  onConceptNameChange: (value: string) => void;
  newConceptDescription: string;
  onConceptDescriptionChange: (value: string) => void;
  difficulty: ConceptDifficulty;
  onDifficultyChange: (value: ConceptDifficulty) => void;
  projectBased: boolean;
  onProjectBasedChange: (value: boolean) => void;
  createWithFirstLayer: boolean;
  onCreateWithFirstLayerChange: (value: boolean) => void;
  isLoading: boolean;
  isLoadingFirstLayer: boolean;
  onCreate: () => void;
}

const CreateLearningPathDialog: React.FC<CreateLearningPathDialogProps> = ({
  isOpen,
  onClose,
  newConceptName,
  onConceptNameChange,
  newConceptDescription,
  onConceptDescriptionChange,
  difficulty,
  onDifficultyChange,
  projectBased,
  onProjectBasedChange,
  createWithFirstLayer,
  onCreateWithFirstLayerChange,
  isLoading,
  isLoadingFirstLayer,
  onCreate,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start a new learning path"
      size="extra-large"
    >
      <div className="space-y-5">
        {/* Topic Input */}
        <div className="space-y-1.5">
          <label htmlFor="concept-name" className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
            What would you like to learn next?
          </label>
          <input
            id="concept-name"
            type="text"
            value={newConceptName}
            onChange={e => onConceptNameChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700"
            placeholder="e.g., History, Programming, Math, Spanish, French, German..."
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter the main topic or subject you want to explore
          </p>
        </div>

        {/* Focus Input */}
        <div className="space-y-1.5">
          <label htmlFor="concept-description" className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Target size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>What would you like to focus on?</span>
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(optional)</span>
          </label>
          <textarea
            id="concept-description"
            value={newConceptDescription}
            onChange={e => onConceptDescriptionChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-vertical text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700"
            rows={3}
            placeholder="e.g., Learn conversational Spanish, Build web applications, Master calculus..."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Specify a particular area or goal within this topic
          </p>
        </div>

        {/* Difficulty Slider */}
        <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <Slider
            label="What is your level of expertise?"
            options={[
              { label: 'Beginner', value: 'beginner' },
              { label: 'Intermediate', value: 'intermediate' },
              { label: 'Advanced', value: 'advanced' },
            ]}
            value={difficulty}
            onChange={value => onDifficultyChange(value as ConceptDifficulty)}
          />
        </div>

        {/* Project-based Checkbox */}
        <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors duration-200">
          <input
            type="checkbox"
            id="project-based"
            checked={projectBased}
            onChange={e => onProjectBasedChange(e.target.checked)}
            className="mt-1 h-5 w-5 text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-colors"
          />
          <div className="flex-1">
            <label htmlFor="project-based" className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer">
              <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
              Goal focused learning path
              <div className="relative group">
                <HelpCircle size={16} className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg">
                  <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-800"></div>
                  When enabled, the learning path will be structured around a specific project or goal. Each level will build toward completing that goal, making learning more practical and goal-oriented.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Create with first layer option */}
        <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <input
            type="checkbox"
            id="create-with-layer"
            checked={createWithFirstLayer}
            onChange={e => onCreateWithFirstLayerChange(e.target.checked)}
            className="mt-1 h-5 w-5 text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-colors"
          />
          <div className="flex-1">
            <label htmlFor="create-with-layer" className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer">
              <GraduationCap size={16} className="text-indigo-600 dark:text-indigo-400" />
              Generate first learning level automatically
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              If unchecked, creates a blank learning path with just the seed concept. You can generate the first level later.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!newConceptName.trim() || isLoading || isLoadingFirstLayer}
            className="px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 dark:disabled:hover:bg-indigo-500 inline-flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {(isLoading || isLoadingFirstLayer) ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            Create Learning Path
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateLearningPathDialog;

