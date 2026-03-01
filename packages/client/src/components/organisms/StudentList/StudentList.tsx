/**
 * StudentList Organism Component
 * 
 * List of students with search and filters.
 */

import React, { useState, useMemo } from 'react';
import { StudentCard } from '../../molecules/StudentCard';
import { SearchInput } from '../../molecules/SearchInput';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { EmptyState } from '../../molecules/EmptyState';
import { Spinner } from '../../atoms/Spinner';
import { SelectDropdown, SelectOption } from '../../molecules/SelectDropdown';
import { Plus, Users } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  enrolledCoursesCount?: number;
}

export type SortOption = 'name' | 'email' | 'enrolled' | 'created';
export type FilterOption = 'all' | 'enrolled' | 'not-enrolled';

export interface StudentListProps {
  /**
   * List of students
   */
  students: Student[];
  
  /**
   * Callback when student is selected
   */
  onSelectStudent?: (studentId: string) => void;
  
  /**
   * Callback when add student button is clicked
   */
  onAddStudent?: () => void;
  
  /**
   * Callback when edit student button is clicked
   */
  onEditStudent?: (studentId: string) => void;
  
  /**
   * Callback when delete student button is clicked
   */
  onDeleteStudent?: (studentId: string) => void;
  
  /**
   * Current search query
   */
  searchQuery?: string;
  
  /**
   * Callback when search query changes
   */
  onSearchChange?: (query: string) => void;
  
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
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'email', label: 'Email (A-Z)' },
  { value: 'enrolled', label: 'Most Enrolled' },
  { value: 'created', label: 'Recently Added' },
];

const filterOptions: SelectOption[] = [
  { value: 'all', label: 'All Students' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'not-enrolled', label: 'Not Enrolled' },
];

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  searchQuery: controlledSearchQuery,
  onSearchChange,
  loading = false,
  className,
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  const searchQuery = controlledSearchQuery !== undefined ? controlledSearchQuery : internalSearchQuery;
  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearchQuery(value);
    }
  };

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (student) =>
          student.name.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query) ||
          student.phone?.toLowerCase().includes(query)
      );
    }

    // Apply enrollment filter
    if (filterBy === 'enrolled') {
      result = result.filter((student) => (student.enrolledCoursesCount || 0) > 0);
    } else if (filterBy === 'not-enrolled') {
      result = result.filter((student) => (student.enrolledCoursesCount || 0) === 0);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'enrolled':
          return (b.enrolledCoursesCount || 0) - (a.enrolledCoursesCount || 0);
        case 'created':
          // Assuming students are already sorted by creation time
          return 0;
        default:
          return 0;
      }
    });

    return result;
  }, [students, searchQuery, filterBy, sortBy]);

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
          <Users className="w-5 h-5 text-gray-400" />
          <Typography variant="h5">
            Students ({filteredAndSortedStudents.length})
          </Typography>
        </div>
        {onAddStudent && (
          <Button variant="primary" icon={Plus} onClick={onAddStudent}>
            Add Student
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onSearch={handleSearchChange}
            placeholder="Search students by name, email, or phone..."
          />
        </div>
        <div className="flex gap-2">
          <SelectDropdown
            options={filterOptions}
            value={filterBy}
            onChange={(value) => setFilterBy((typeof value === 'string' ? value : value[0]) as FilterOption)}
            className="w-40"
          />
          <SelectDropdown
            options={sortOptions}
            value={sortBy}
            onChange={(value) => setSortBy((typeof value === 'string' ? value : value[0]) as SortOption)}
            className="w-48"
          />
        </div>
      </div>

      {/* Student List */}
      {filteredAndSortedStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No students found' : 'No students yet'}
          description={
            searchQuery
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first student'
          }
          actionLabel={onAddStudent ? 'Add Student' : undefined}
          onAction={onAddStudent}
        />
      ) : (
        <div className="space-y-3">
          {filteredAndSortedStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClick={onSelectStudent}
              onEdit={onEditStudent}
              onDelete={onDeleteStudent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

StudentList.displayName = 'StudentList';
