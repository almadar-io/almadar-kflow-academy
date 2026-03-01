/**
 * SearchResultsTemplate Component
 * 
 * Global search results page with categorized results.
 * Uses AppLayoutTemplate for consistent layout structure.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, BookOpen, FileText, Layers, Filter, X } from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { SearchInput } from '../../molecules/SearchInput';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { Pagination } from '../../molecules/Pagination';
import { EmptyState } from '../../molecules/EmptyState';
import { Card } from '../../molecules/Card';
import { SelectDropdown } from '../../molecules/SelectDropdown';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Spinner } from '../../atoms/Spinner';
import { cn } from '../../../utils/theme';

export type ResultType = 'all' | 'courses' | 'lessons' | 'concepts';

export interface SearchResult {
  /**
   * Result ID
   */
  id: string;
  
  /**
   * Result type
   */
  type: 'course' | 'lesson' | 'concept';
  
  /**
   * Result title
   */
  title: string;
  
  /**
   * Result description
   */
  description?: string;
  
  /**
   * Highlighted text (with match)
   */
  highlight?: string;
  
  /**
   * Parent context (e.g., course name for lesson)
   */
  context?: string;
  
  /**
   * On click
   */
  onClick?: () => void;
}

export interface SearchResultsTemplateProps {
  /**
   * Search query
   */
  query: string;
  
  /**
   * On query change
   */
  onQueryChange?: (query: string) => void;
  
  /**
   * Search results
   */
  results: SearchResult[];
  
  /**
   * Total results count
   */
  totalResults?: number;
  
  /**
   * Results by type counts
   */
  resultCounts?: {
    all: number;
    courses: number;
    lessons: number;
    concepts: number;
  };
  
  /**
   * Active result type filter
   */
  activeType?: ResultType;
  
  /**
   * On type change
   */
  onTypeChange?: (type: ResultType) => void;
  
  /**
   * Current page
   */
  currentPage?: number;
  
  /**
   * Total pages
   */
  totalPages?: number;
  
  /**
   * On page change
   */
  onPageChange?: (page: number) => void;
  
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
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Recent searches
   */
  recentSearches?: string[];
  
  /**
   * On recent search click
   */
  onRecentSearchClick?: (query: string) => void;
  
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

export const SearchResultsTemplate: React.FC<SearchResultsTemplateProps> = ({
  query,
  onQueryChange,
  results,
  totalResults,
  resultCounts = { all: 0, courses: 0, lessons: 0, concepts: 0 },
  activeType = 'all',
  onTypeChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
  ],
  sortValue = 'relevance',
  onSortChange,
  loading = false,
  recentSearches = [],
  onRecentSearchClick,
  user,
  navigationItems = [],
  logo,
  onLogoClick,
  onLogout,
  className,
}) => {

  const tabs: TabItem[] = [
    { id: 'all', label: `All (${resultCounts.all})`, content: null },
    { id: 'courses', label: `Courses (${resultCounts.courses})`, icon: BookOpen, content: null },
    { id: 'lessons', label: `Lessons (${resultCounts.lessons})`, icon: FileText, content: null },
    { id: 'concepts', label: `Concepts (${resultCounts.concepts})`, icon: Layers, content: null },
  ];

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'course': return BookOpen;
      case 'lesson': return FileText;
      case 'concept': return Layers;
    }
  };

  const getTypeBadge = (type: SearchResult['type']) => {
    switch (type) {
      case 'course': return { label: 'Course', variant: 'primary' as const };
      case 'lesson': return { label: 'Lesson', variant: 'success' as const };
      case 'concept': return { label: 'Concept', variant: 'info' as const };
    }
  };

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName="KFlow"
      onLogoClick={onLogoClick}
      className={className}
      contentClassName="max-w-5xl mx-auto"
    >
          {/* Search bar */}
          <div className="mb-4 sm:mb-6">
            <SearchInput
              value={query}
              onSearch={onQueryChange}
              placeholder="Search courses, lessons, concepts..."
              className="w-full max-w-2xl"
            />
            
            {/* Results count */}
            {query && !loading && (
              <Typography variant="small" color="muted" className="mt-2 text-xs sm:text-sm">
                {totalResults} results for "{query}"
              </Typography>
            )}
          </div>

          {/* Recent searches (when no query) */}
          {!query && recentSearches.length > 0 && (
            <Card className="mb-6">
              <Typography variant="h6" className="mb-3">Recent Searches</Typography>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onRecentSearchClick?.(search)}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Search className="w-3 h-3 inline mr-1" />
                    {search}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Results section */}
          {query && (
            <>
              {/* Tabs and sort */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <Tabs
                  items={tabs}
                  activeTab={activeType}
                  onTabChange={(id: string) => onTypeChange?.(id as ResultType)}
                  className="flex-1 min-w-0"
                />
                <SelectDropdown
                  options={sortOptions}
                  value={sortValue}
                  onChange={(value) => onSortChange?.(value as string)}
                  placeholder="Sort by"
                  className="w-full sm:w-40"
                />
              </div>

              {/* Loading state */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              )}

              {/* Results list */}
              {!loading && results.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  {results.map((result) => {
                    const TypeIcon = getTypeIcon(result.type);
                    const badge = getTypeBadge(result.type);
                    
                    return (
                      <Card
                        key={result.id}
                        onClick={result.onClick}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <TypeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <Typography variant="h6" className="truncate text-base sm:text-lg">
                                {result.title}
                              </Typography>
                              <Badge variant={badge.variant} size="sm" className="text-xs sm:text-sm self-start sm:self-center">
                                {badge.label}
                              </Badge>
                            </div>
                            {result.context && (
                              <Typography variant="small" color="muted" className="mb-1 text-xs sm:text-sm">
                                {result.context}
                              </Typography>
                            )}
                            {result.description && (
                              <Typography variant="body" color="secondary" className="line-clamp-2 text-sm sm:text-base">
                                {result.description}
                              </Typography>
                            )}
                            {result.highlight && (
                              <Typography 
                                variant="small" 
                                color="secondary" 
                                className="mt-2 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded text-xs sm:text-sm"
                              >
                                ...{result.highlight}...
                              </Typography>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-8">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={onPageChange || (() => {})}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!loading && results.length === 0 && (
                <EmptyState
                  icon={Search}
                  title="No results found"
                  description={`No results match "${query}". Try different keywords or check your spelling.`}
                />
              )}
            </>
          )}

          {/* No query state */}
          {!query && recentSearches.length === 0 && (
            <EmptyState
              icon={Search}
              title="Search for anything"
              description="Find courses, lessons, and concepts across the platform."
            />
          )}
    </AppLayoutTemplate>
  );
};

SearchResultsTemplate.displayName = 'SearchResultsTemplate';

