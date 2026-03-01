import React, { useState } from 'react';
import { Concept } from '../types';
import { Menu } from '../../../components';
import { MoreVertical, Trash2, GraduationCap, Upload } from 'lucide-react';
import ConfirmationDialog from '../../../components/ConfirmationDialog';
import { PlacementTest } from '../../learning/components/PlacementTest';

interface ConceptCardProps {
  concept: Concept;
  onClick: () => void;
  model?: string;  // Optional model to display
  conceptCount?: number;
  levelCount?: number;
  graphId?: string; // Graph ID for deletion
  showMentorIcon?: boolean; // Show mentor mode icon
  // Callbacks (handled by container)
  onDelete?: (graphId: string) => Promise<void>;
  onNavigateToMentor?: (graphId: string) => void;
  onPublishCourse?: (graphId: string) => void;
  isDeleting?: boolean;
  // Placement test (optional - handled by container)
  goal?: { id: string; title: string } | null;
  hasCompletedPlacementTest?: boolean;
  onShowPlacementTest?: () => void;
  onPlacementTestComplete?: () => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({
  concept,
  onClick,
  model,
  conceptCount,
  levelCount,
  graphId,
  showMentorIcon = false,
  onDelete,
  onNavigateToMentor,
  onPublishCourse,
  isDeleting = false,
  goal,
  hasCompletedPlacementTest,
  onShowPlacementTest,
  onPlacementTestComplete,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPlacementTest, setShowPlacementTest] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (graphId && onDelete) {
      try {
        await onDelete(graphId);
        setShowDeleteDialog(false);
      } catch (error) {
        // Error is handled by container
      }
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on the menu
    if ((e.target as HTMLElement).closest('.menu-trigger')) {
      return;
    }
    onClick();
  };

  return (
    <>
      <div
        className="relative p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Menu Button */}
        {graphId && (
          <div 
            className="absolute top-3 right-3 menu-trigger isolate z-40"
            onClick={(e) => e.stopPropagation()}
          >
            <Menu
              trigger={
                <button
                  type="button"
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <MoreVertical size={18} />
                </button>
              }
              options={[
                ...(graphId && onPublishCourse ? [{
                  id: 'publish',
                  label: 'Publish Course',
                  onClick: () => onPublishCourse(graphId),
                  icon: <Upload size={16} className="text-indigo-600" />,
                }] : []),
                ...(graphId && onNavigateToMentor ? [{
                  id: 'mentor',
                  label: 'Mentor Mode',
                  onClick: () => onNavigateToMentor(graphId),
                  icon: <GraduationCap size={16} className="text-purple-600" />,
                }] : []),
                ...(graphId && onDelete ? [{
                  id: 'delete',
                  label: 'Delete',
                  onClick: () => setShowDeleteDialog(true),
                  icon: <Trash2 size={16} className="text-red-600" />,
                }] : []),
              ]}
              position="bottom-right"
              className="relative"
            />
          </div>
        )}

      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 flex items-center gap-2">
        {showMentorIcon && (
          <div className="flex-shrink-0 p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <GraduationCap size={16} className="text-purple-600 dark:text-purple-400" />
          </div>
        )}
        <span>{concept.name}</span>
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
        {concept.description}
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {conceptCount !== undefined && (
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
              {conceptCount} concept{conceptCount === 1 ? '' : 's'}
            </span>
          )}
          {levelCount !== undefined && (
            <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
              {levelCount} level{levelCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {graphId && (
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Learning Path"
          message={`Are you sure you want to delete "${concept.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={isDeleting}
        />
      )}

      {/* Placement Test Modal */}
      {showPlacementTest && goal && graphId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Placement Test</h2>
              <button
                onClick={() => {
                  setShowPlacementTest(false);
                  onPlacementTestComplete?.();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <PlacementTest
                goalId={goal.id}
                graphId={graphId}
                topic={goal.title}
                onComplete={() => {
                  setShowPlacementTest(false);
                  onPlacementTestComplete?.();
                }}
                onSkip={() => {
                  setShowPlacementTest(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConceptCard;

