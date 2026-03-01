/**
 * Goal Details Modal Component
 * Displays the learning goal details in a read-only modal
 */

import React from 'react';
import Modal from '../../../components/Modal';
import type { LearningGoal, Milestone } from '../goalApi';
import { Target } from 'lucide-react';
import { GoalOverview } from './GoalOverview';


interface GoalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: LearningGoal | null;
  isLoading?: boolean;
}

export const GoalDetailsModal: React.FC<GoalDetailsModalProps> = ({
  isOpen,
  onClose,
  goal,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Learning Goal Details"
      size="large"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading goal details...</p>
          </div>
        </div>
      ) : !goal ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">No learning goal found for this learning path.</p>
          </div>
        </div>
      ) : (
        <GoalOverview goal={goal} />
      )}
    </Modal>
  );
};

