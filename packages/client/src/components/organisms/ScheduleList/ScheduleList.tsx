/**
 * ScheduleList Organism Component
 * 
 * List/table view for schedule slots with filtering and sorting.
 */

import React, { useState, useMemo } from 'react';
import { ScheduleSlotCard } from '../../molecules/ScheduleSlotCard';
import { SearchInput } from '../../molecules/SearchInput';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { EmptyState } from '../../molecules/EmptyState';
import { Spinner } from '../../atoms/Spinner';
import { SelectDropdown, SelectOption } from '../../molecules/SelectDropdown';
import { Calendar, Filter } from 'lucide-react';
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
  recurring?: boolean;
}

export type SortOption = 'day' | 'time' | 'student' | 'course';
export type FilterBy = 'all' | 'student' | 'course';

export interface ScheduleListProps {
  /**
   * Schedule slots to display
   */
  scheduleSlots: ScheduleSlot[];
  
  /**
   * Callback when edit button is clicked
   */
  onEditSlot?: (scheduleId: string) => void;
  
  /**
   * Callback when delete button is clicked
   */
  onDeleteSlot?: (scheduleId: string) => void;
  
  /**
   * Filter by student ID
   */
  filterByStudent?: string;
  
  /**
   * Filter by course ID
   */
  filterByCourse?: string;
  
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

const sortOptions: SelectOption[] = [
  { value: 'day', label: 'Day of Week' },
  { value: 'time', label: 'Time' },
  { value: 'student', label: 'Student Name' },
  { value: 'course', label: 'Course Name' },
];

const dayOrder: Record<string | number, number> = {
  0: 0, Sunday: 0,
  1: 1, Monday: 1,
  2: 2, Tuesday: 2,
  3: 3, Wednesday: 3,
  4: 4, Thursday: 4,
  5: 5, Friday: 5,
  6: 6, Saturday: 6,
};

export const ScheduleList: React.FC<ScheduleListProps> = ({
  scheduleSlots,
  onEditSlot,
  onDeleteSlot,
  filterByStudent,
  filterByCourse,
  loading = false,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('day');

  // Filter and sort schedule slots
  const filteredAndSortedSlots = useMemo(() => {
    let result = [...scheduleSlots];

    // Apply filters
    if (filterByStudent) {
      result = result.filter((slot) => slot.studentUserId === filterByStudent);
    }
    if (filterByCourse) {
      result = result.filter((slot) => slot.courseSettingsId === filterByCourse);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (slot) =>
          slot.studentName.toLowerCase().includes(query) ||
          slot.courseTitle.toLowerCase().includes(query) ||
          slot.location?.toLowerCase().includes(query) ||
          slot.room?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'day':
          const dayA = dayOrder[a.dayOfWeek] ?? 0;
          const dayB = dayOrder[b.dayOfWeek] ?? 0;
          if (dayA !== dayB) return dayA - dayB;
          return a.startTime.localeCompare(b.startTime);
        case 'time':
          return a.startTime.localeCompare(b.startTime);
        case 'student':
          return a.studentName.localeCompare(b.studentName);
        case 'course':
          return a.courseTitle.localeCompare(b.courseTitle);
        default:
          return 0;
      }
    });

    return result;
  }, [scheduleSlots, filterByStudent, filterByCourse, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <Typography variant="h5">
            Schedule Slots ({filteredAndSortedSlots.length})
          </Typography>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onSearch={setSearchQuery}
            placeholder="Search by student, course, location..."
          />
        </div>
        <SelectDropdown
          options={sortOptions}
          value={sortBy}
          onChange={(value) => setSortBy((typeof value === 'string' ? value : value[0]) as SortOption)}
          className="w-48"
        />
      </div>

      {/* Filter Badges */}
      {(filterByStudent || filterByCourse) && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {filterByStudent && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Student: {scheduleSlots.find((s) => s.studentUserId === filterByStudent)?.studentName}
            </span>
          )}
          {filterByCourse && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Course: {scheduleSlots.find((s) => s.courseSettingsId === filterByCourse)?.courseTitle}
            </span>
          )}
        </div>
      )}

      {/* Schedule List */}
      {filteredAndSortedSlots.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={searchQuery ? 'No schedule slots found' : 'No schedule slots yet'}
          description={
            searchQuery
              ? 'Try adjusting your search or filters'
              : 'Add schedule slots to organize student schedules'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedSlots.map((slot) => (
            <ScheduleSlotCard
              key={slot.id}
              scheduleSlot={slot}
              onEdit={onEditSlot}
              onDelete={onDeleteSlot}
            />
          ))}
        </div>
      )}
    </div>
  );
};

ScheduleList.displayName = 'ScheduleList';
