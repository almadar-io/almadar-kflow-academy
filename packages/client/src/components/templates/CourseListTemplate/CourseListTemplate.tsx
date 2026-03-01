/**
 * CourseListTemplate Component
 * 
 * Display courses in grid/list view with filtering and search.
 * Uses AppLayoutTemplate for consistent layout structure.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Grid, List, Plus, Filter, X } from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { CourseCard, CourseCardProps } from '../../organisms/CourseCard';
import { SearchInput } from '../../molecules/SearchInput';
import { SelectDropdown } from '../../molecules/SelectDropdown';
import { Pagination } from '../../molecules/Pagination';
import { EmptyState } from '../../molecules/EmptyState';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Card } from '../../molecules/Card';
import { Popover } from '../../molecules/Popover';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Checkbox } from '../../atoms/Checkbox';
import { cn } from '../../../utils/theme';

export interface CourseFilter {
  /**
   * Filter ID
   */
  id: string;
  
  /**
   * Filter label
   */
  label: string;
  
  /**
   * Filter options
   */
  options: Array<{
    value: string;
    label: string;
    count?: number;
  }>;
  
  /**
   * Selected values
   */
  selectedValues?: string[];
}

export interface CourseListTemplateProps {
  /**
   * Page title
   */
  title?: string;
  
  /**
   * Page subtitle
   */
  subtitle?: string;
  
  /**
   * Courses to display
   */
  courses: CourseCardProps[];
  
  /**
   * Total course count (for pagination)
   */
  totalCourses?: number;
  
  /**
   * Current page
   */
  currentPage?: number;
  
  /**
   * Items per page
   */
  pageSize?: number;
  
  /**
   * On page change
   */
  onPageChange?: (page: number) => void;
  
  /**
   * Search query
   */
  searchQuery?: string;
  
  /**
   * On search change
   */
  onSearchChange?: (query: string) => void;
  
  /**
   * Sort options
   */
  sortOptions?: Array<{ value: string; label: string }>;
  
  /**
   * Current sort value
   */
  sortValue?: string;
  
  /**
   * On sort change
   */
  onSortChange?: (value: string) => void;
  
  /**
   * Filters
   */
  filters?: CourseFilter[];
  
  /**
   * On filter change
   */
  onFilterChange?: (filterId: string, values: string[]) => void;
  
  /**
   * View mode
   */
  viewMode?: 'grid' | 'list';
  
  /**
   * On view mode change
   */
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  
  /**
   * Show create button
   */
  showCreateButton?: boolean;
  
  /**
   * On create click
   */
  onCreateClick?: () => void;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * User information for header
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /**
   * Navigation items for sidebar
   */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * On logo click
   */
  onLogoClick?: () => void;
  
  /**
   * On logout handler
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const CourseListTemplate: React.FC<CourseListTemplateProps> = ({
  title = 'Courses',
  subtitle,
  courses,
  totalCourses,
  currentPage = 1,
  pageSize = 12,
  onPageChange,
  searchQuery = '',
  onSearchChange,
  sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'popular', label: 'Most Popular' },
  ],
  sortValue = 'newest',
  onSortChange,
  filters = [],
  onFilterChange,
  viewMode = 'list',
  onViewModeChange,
  showCreateButton = false,
  onCreateClick,
  loading = false,
  user,
  navigationItems = [],
  logo,
  onLogoClick,
  onLogout,
  className,
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const totalPages = totalCourses ? Math.ceil(totalCourses / pageSize) : 1;
  const hasActiveFilters = filters.some(f => f.selectedValues && f.selectedValues.length > 0);

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Typography variant="h6">Filters</Typography>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => filters.forEach(f => onFilterChange?.(f.id, []))}
          >
            Clear all
          </Button>
        )}
      </div>
      
      {filters.map((filter) => (
        <div key={filter.id}>
          <Typography variant="body" weight="medium" className="mb-2">
            {filter.label}
          </Typography>
          <div className="space-y-2">
            {filter.options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={filter.selectedValues?.includes(option.value) || false}
                  onChange={(e) => {
                    const currentValues = filter.selectedValues || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value);
                    onFilterChange?.(filter.id, newValues);
                  }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
                {option.count !== undefined && (
                  <Badge variant="default" size="sm">
                    {option.count}
                  </Badge>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName="KFlow"
      onLogoClick={onLogoClick}
      className={className}
    >
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="min-w-0 flex-1">
              <Typography variant="h3" className="text-2xl sm:text-3xl">{title}</Typography>
              {subtitle && (
                <Typography variant="body" color="secondary" className="text-sm sm:text-base mt-1">
                  {subtitle}
                </Typography>
              )}
            </div>
            {showCreateButton && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={onCreateClick}
                className="w-full sm:w-auto"
                size="sm"
              >
                <span className="hidden sm:inline">Create Course</span>
                <span className="sm:hidden">Create</span>
              </Button>
            )}
          </div>

          {/* Search and filters bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onSearch={onSearchChange}
                placeholder="Search courses..."
              />
            </div>
            <div className="flex gap-2">
              <SelectDropdown
                options={sortOptions}
                value={sortValue}
                onChange={(value) => onSortChange?.(value as string)}
                placeholder="Sort by"
                className="w-full sm:w-40"
              />
              <ButtonGroup>
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  icon={Grid}
                  onClick={() => onViewModeChange?.('grid')}
                  aria-label="Grid view"
                >
                  <span className="sr-only">Grid view</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  icon={List}
                  onClick={() => onViewModeChange?.('list')}
                  aria-label="List view"
                >
                  <span className="sr-only">List view</span>
                </Button>
              </ButtonGroup>
              {filters.length > 0 && (
                window.innerWidth < 1024 ? (
                  <Button
                    variant="secondary"
                    icon={Filter}
                    onClick={() => setMobileFiltersOpen(true)}
                  >
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="primary" size="sm" className="ml-2">
                        {filters.reduce((acc, f) => acc + (f.selectedValues?.length || 0), 0)}
                      </Badge>
                    )}
                  </Button>
                ) : (
                  <Popover
                    content={
                      <div className="w-80 max-h-96 overflow-y-auto">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <Typography variant="h6">Filters</Typography>
                            {hasActiveFilters && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => filters.forEach(f => onFilterChange?.(f.id, []))}
                              >
                                Clear all
                              </Button>
                            )}
                          </div>
                          
                          {filters.map((filter) => (
                            <div key={filter.id}>
                              <Typography variant="body" weight="medium" className="mb-2">
                                {filter.label}
                              </Typography>
                              <div className="space-y-2">
                                {filter.options.map((option) => (
                                  <label
                                    key={option.value}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={filter.selectedValues?.includes(option.value) || false}
                                      onChange={(e) => {
                                        const currentValues = filter.selectedValues || [];
                                        const newValues = e.target.checked
                                          ? [...currentValues, option.value]
                                          : currentValues.filter(v => v !== option.value);
                                        onFilterChange?.(filter.id, newValues);
                                      }}
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                      {option.label}
                                    </span>
                                    {option.count !== undefined && (
                                      <Badge variant="default" size="sm">
                                        {option.count}
                                      </Badge>
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                    position="bottom"
                    trigger="click"
                  >
                    <Button
                      variant="secondary"
                      icon={Filter}
                    >
                      Filters
                      {hasActiveFilters && (
                        <Badge variant="primary" size="sm" className="ml-2">
                          {filters.reduce((acc, f) => acc + (f.selectedValues?.length || 0), 0)}
                        </Badge>
                      )}
                    </Button>
                  </Popover>
                )
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex gap-6">
            {/* Course grid/list */}
            <div className="flex-1">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="h-64 animate-pulse bg-gray-200 dark:bg-gray-700">
                      <div />
                    </Card>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <EmptyState
                  icon={searchQuery ? undefined : undefined}
                  title={searchQuery ? 'No courses found' : 'No courses yet'}
                  description={
                    searchQuery
                      ? `No courses match "${searchQuery}". Try adjusting your search or filters.`
                      : 'Get started by creating your first course.'
                  }
                  actionLabel={showCreateButton ? 'Create Course' : undefined}
                  onAction={showCreateButton ? onCreateClick : undefined}
                />
              ) : (
                <>
                  <div
                    className={cn(
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                        : 'space-y-4'
                    )}
                  >
                    {courses.map((course, index) => (
                      <CourseCard
                        key={course.id || index}
                        {...course}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={onPageChange || (() => {})}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-white dark:bg-gray-800 z-50 lg:hidden overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <Typography variant="h5">Filters</Typography>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  <span className="sr-only">Close filters</span>
                </Button>
              </div>
              <FilterSidebar />
            </div>
          </div>
        </>
      )}
    </AppLayoutTemplate>
  );
};

CourseListTemplate.displayName = 'CourseListTemplate';

