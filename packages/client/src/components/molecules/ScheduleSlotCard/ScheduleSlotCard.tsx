/**
 * ScheduleSlotCard Molecule Component
 * 
 * Card component displaying schedule slot information.
 */

import React from 'react';
import { Card } from '../Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Edit2, Trash2, Clock, MapPin, Calendar, Repeat } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface ScheduleSlotCardProps {
  /**
   * Schedule slot data
   */
  scheduleSlot: {
    id: string;
    studentName: string;
    courseTitle: string;
    dayOfWeek: number | string;
    startTime: string;
    endTime: string;
    location?: string;
    room?: string;
    recurring?: boolean;
  };
  
  /**
   * Callback when edit button is clicked
   */
  onEdit?: (scheduleId: string) => void;
  
  /**
   * Callback when delete button is clicked
   */
  onDelete?: (scheduleId: string) => void;
  
  /**
   * Callback when card is clicked
   */
  onClick?: (scheduleId: string) => void;
  
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

const dayNames: Record<string | number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  Sunday: 'Sunday',
  Monday: 'Monday',
  Tuesday: 'Tuesday',
  Wednesday: 'Wednesday',
  Thursday: 'Thursday',
  Friday: 'Friday',
  Saturday: 'Saturday',
};

export const ScheduleSlotCard: React.FC<ScheduleSlotCardProps> = ({
  scheduleSlot,
  onEdit,
  onDelete,
  onClick,
  loading = false,
  className,
}) => {
  const dayName = dayNames[scheduleSlot.dayOfWeek] || String(scheduleSlot.dayOfWeek);
  const timeRange = `${scheduleSlot.startTime} - ${scheduleSlot.endTime}`;

  const handleCardClick = () => {
    if (onClick && !loading) {
      onClick(scheduleSlot.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(scheduleSlot.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(scheduleSlot.id);
  };

  return (
    <Card
      variant={onClick ? 'interactive' : 'default'}
      onClick={handleCardClick}
      loading={loading}
      className={cn('p-4', className)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Typography variant="h6" className="truncate">
              {scheduleSlot.courseTitle}
            </Typography>
            <Typography variant="body" color="secondary" className="mt-1">
              {scheduleSlot.studentName}
            </Typography>
          </div>
          
          {scheduleSlot.recurring && (
            <Badge variant="info" className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              Recurring
            </Badge>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <Typography variant="body" color="secondary">
              {dayName}
            </Typography>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <Typography variant="body" color="secondary">
              {timeRange}
            </Typography>
          </div>
          
          {scheduleSlot.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <Typography variant="body" color="secondary">
                {scheduleSlot.location}
                {scheduleSlot.room && `, ${scheduleSlot.room}`}
              </Typography>
            </div>
          )}
        </div>
        
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
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
        )}
      </div>
    </Card>
  );
};

ScheduleSlotCard.displayName = 'ScheduleSlotCard';
