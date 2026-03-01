/**
 * StudentCard Molecule Component
 * 
 * Card component displaying student information with actions.
 */

import React from 'react';
import { Card } from '../Card';
import { Button } from '../../atoms/Button';
import { StudentAvatar } from '../../atoms/StudentAvatar';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Edit2, Trash2, Mail, Phone } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface StudentCardProps {
  /**
   * Student data
   */
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    enrolledCoursesCount?: number;
  };
  
  /**
   * Callback when edit button is clicked
   */
  onEdit?: (studentId: string) => void;
  
  /**
   * Callback when delete button is clicked
   */
  onDelete?: (studentId: string) => void;
  
  /**
   * Callback when card is clicked
   */
  onClick?: (studentId: string) => void;
  
  /**
   * Show loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onEdit,
  onDelete,
  onClick,
  loading = false,
  className,
}) => {
  const handleCardClick = () => {
    if (onClick && !loading) {
      onClick(student.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(student.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(student.id);
  };

  return (
    <Card
      variant={onClick ? 'interactive' : 'default'}
      onClick={handleCardClick}
      loading={loading}
      className={cn('p-4', className)}
    >
      <div className="flex items-center gap-4">
        <StudentAvatar
          studentName={student.name}
          studentEmail={student.email}
          size="md"
        />
        
        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-6">
            <div className="min-w-0 flex-1">
              <Typography variant="h6" className="truncate">
                {student.name}
              </Typography>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <Typography variant="body" color="secondary" className="truncate">
                  {student.email}
                </Typography>
              </div>
            </div>
            
            {student.phone && (
              <div className="hidden md:flex items-center gap-2 min-w-0">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <Typography variant="body" color="secondary" className="truncate">
                  {student.phone}
                </Typography>
              </div>
            )}
            
            {student.enrolledCoursesCount !== undefined && (
              <Badge variant="info" className="flex-shrink-0">
                {student.enrolledCoursesCount} {student.enrolledCoursesCount === 1 ? 'course' : 'courses'}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                icon={Edit2}
                onClick={handleEdit}
                disabled={loading}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={handleDelete}
                disabled={loading}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

StudentCard.displayName = 'StudentCard';
