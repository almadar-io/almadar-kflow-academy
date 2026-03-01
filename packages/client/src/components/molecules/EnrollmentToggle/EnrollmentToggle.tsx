/**
 * EnrollmentToggle Molecule Component
 * 
 * Toggle component for enrolling/unenrolling students in courses.
 */

import React from 'react';
import { Button } from '../../atoms/Button';
import { Badge } from '../../atoms/Badge';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface EnrollmentToggleProps {
  /**
   * Student ID
   */
  studentId: string;
  
  /**
   * Course ID
   */
  courseId: string;
  
  /**
   * Whether student is enrolled
   */
  isEnrolled: boolean;
  
  /**
   * Callback when toggle is clicked
   */
  onToggle?: (studentId: string, courseId: string, enroll: boolean) => void;
  
  /**
   * Show loading state
   * @default false
   */
  isLoading?: boolean;
  
  /**
   * Disable toggle
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const EnrollmentToggle: React.FC<EnrollmentToggleProps> = ({
  studentId,
  courseId,
  isEnrolled,
  onToggle,
  isLoading = false,
  disabled = false,
  className,
}) => {
  const handleToggle = () => {
    if (!disabled && !isLoading && onToggle) {
      onToggle(studentId, courseId, !isEnrolled);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isEnrolled ? (
        <>
          <Badge variant="success" className="flex items-center gap-1">
            <UserPlus className="w-3 h-3" />
            Enrolled
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            icon={isLoading ? Loader2 : UserMinus}
            onClick={handleToggle}
            disabled={disabled || isLoading}
            loading={isLoading}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Unenroll
          </Button>
        </>
      ) : (
        <Button
          variant="primary"
          size="sm"
          icon={isLoading ? Loader2 : UserPlus}
          onClick={handleToggle}
          disabled={disabled || isLoading}
          loading={isLoading}
        >
          Enroll
        </Button>
      )}
    </div>
  );
};

EnrollmentToggle.displayName = 'EnrollmentToggle';
