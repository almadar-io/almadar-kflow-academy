/**
 * ScheduleCalendar Organism Component
 * 
 * Calendar view for schedule slots with weekly/monthly views.
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface ScheduleSlot {
  id: string;
  studentUserId: string;
  studentName: string;
  courseSettingsId: string;
  courseTitle: string;
  dayOfWeek: number | string;
  startTime: string;
  endTime: string;
  location?: string;
  room?: string;
}

export type CalendarView = 'week' | 'month';

export interface ScheduleCalendarProps {
  /**
   * Schedule slots to display
   */
  scheduleSlots: ScheduleSlot[];
  
  /**
   * Callback when a schedule slot is clicked
   */
  onSlotClick?: (scheduleId: string) => void;
  
  /**
   * Callback when an empty slot is clicked
   */
  onEmptySlotClick?: (day: number, time: string) => void;
  
  /**
   * Selected date (for navigation)
   */
  selectedDate?: Date;
  
  /**
   * Callback when date changes
   */
  onDateChange?: (date: Date) => void;
  
  /**
   * Initial view mode
   * @default 'week'
   */
  defaultView?: CalendarView;
  
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

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

// Generate colors for courses
const courseColors = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
];

const getCourseColor = (courseId: string, index: number): string => {
  return courseColors[index % courseColors.length];
};

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  scheduleSlots,
  onSlotClick,
  onEmptySlotClick,
  selectedDate: controlledSelectedDate,
  onDateChange,
  defaultView = 'week',
  loading = false,
  className,
}) => {
  const [view, setView] = useState<CalendarView>(defaultView);
  const [internalDate, setInternalDate] = useState(new Date());
  
  const selectedDate = controlledSelectedDate || internalDate;
  const handleDateChange = onDateChange || setInternalDate;

  // Get current week start (Sunday)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Group schedule slots by day and time
  const slotsByDay = useMemo(() => {
    const grouped: Record<number, ScheduleSlot[]> = {};
    scheduleSlots.forEach((slot) => {
      const day = typeof slot.dayOfWeek === 'string' ? parseInt(slot.dayOfWeek) : slot.dayOfWeek;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(slot);
    });
    return grouped;
  }, [scheduleSlots]);

  // Get unique courses for color mapping
  const courseColorMap = useMemo(() => {
    const courses = Array.from(new Set(scheduleSlots.map((s) => s.courseSettingsId)));
    const map: Record<string, string> = {};
    courses.forEach((courseId, index) => {
      map[courseId] = getCourseColor(courseId, index);
    });
    return map;
  }, [scheduleSlots]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    handleDateChange(newDate);
  };

  const goToToday = () => {
    handleDateChange(new Date());
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <Typography variant="body" color="secondary">
            Loading schedule...
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <Typography variant="h5">Schedule</Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setView(view === 'week' ? 'month' : 'week')}
          >
            {view === 'week' ? 'Month View' : 'Week View'}
          </Button>
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          icon={ChevronLeft}
          onClick={() => navigateWeek('prev')}
        >
          <span className="sr-only">Previous week</span>
        </Button>
        <Typography variant="h6">
          {weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Typography>
        <Button
          variant="ghost"
          size="sm"
          icon={ChevronRight}
          onClick={() => navigateWeek('next')}
        >
          <span className="sr-only">Next week</span>
        </Button>
      </div>

      {/* Calendar Grid */}
      {view === 'week' ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-8 bg-gray-50 dark:bg-gray-900/50">
            <div className="p-2 border-r border-gray-200 dark:border-gray-700"></div>
            {weekDays.map((day, index) => (
              <div
                key={index}
                className="p-2 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0"
              >
                <Typography variant="body" className="font-medium">
                  {dayNames[day.getDay()]}
                </Typography>
                <Typography variant="body" color="secondary" className="text-xs">
                  {day.getDate()}
                </Typography>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {timeSlots.slice(8, 20).map((time, timeIndex) => (
              <div key={timeIndex} className="grid grid-cols-8">
                <div className="p-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                  {time}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dayOfWeek = day.getDay();
                  const slotsForDay = slotsByDay[dayOfWeek] || [];
                  const slotsForTime = slotsForDay.filter(
                    (slot) => slot.startTime <= time && slot.endTime > time
                  );

                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        'p-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                        'min-h-[60px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                        'transition-colors'
                      )}
                      onClick={() => onEmptySlotClick?.(dayOfWeek, time)}
                    >
                      {slotsForTime.map((slot) => (
                        <div
                          key={slot.id}
                          className={cn(
                            'p-1 mb-1 rounded text-xs cursor-pointer',
                            'hover:opacity-80 transition-opacity',
                            courseColorMap[slot.courseSettingsId] || 'bg-gray-100 text-gray-800'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSlotClick?.(slot.id);
                          }}
                        >
                          <div className="font-medium truncate">{slot.courseTitle}</div>
                          <div className="text-xs opacity-75 truncate">{slot.studentName}</div>
                          {slot.location && (
                            <div className="text-xs opacity-60 truncate">{slot.location}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Typography variant="body" color="secondary">
            Month view coming soon
          </Typography>
        </div>
      )}
    </div>
  );
};

ScheduleCalendar.displayName = 'ScheduleCalendar';
