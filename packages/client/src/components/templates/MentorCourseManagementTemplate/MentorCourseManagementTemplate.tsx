/**
 * MentorCourseManagementTemplate Template Component
 * 
 * Template for course management page with tabs for Settings, Students, and Content.
 * Uses AppLayoutTemplate for consistent layout.
 */

import React from 'react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { Breadcrumb } from '../../molecules/Breadcrumb';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { ArrowLeft, Settings, Users, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface MentorCourseManagementTemplateProps {
  /**
   * Course ID
   */
  courseId: string;
  
  /**
   * Course settings data
   */
  courseSettings?: {
    title?: string;
    description?: string;
    visibility?: 'public' | 'private' | 'unlisted';
    enrollmentEnabled?: boolean;
    maxStudents?: number;
  };
  
  /**
   * Active tab ID
   */
  activeTab?: string;
  
  /**
   * Callback when tab changes
   */
  onTabChange?: (tabId: string) => void;
  
  /**
   * Tab content (Settings tab)
   */
  settingsContent?: React.ReactNode;
  
  /**
   * Tab content (Students tab)
   */
  studentsContent?: React.ReactNode;
  
  /**
   * Tab content (Content tab)
   */
  contentContent?: React.ReactNode;
  
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
   * Callback when back button is clicked
   */
  onBack?: () => void;
  
  /**
   * On logout handler
   */
  onLogout?: () => void;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * Brand name
   * @default 'KFlow'
   */
  brandName?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const defaultTabs: TabItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    content: null,
  },
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    content: null,
  },
  {
    id: 'content',
    label: 'Content',
    icon: BookOpen,
    content: null,
  },
];

export const MentorCourseManagementTemplate: React.FC<MentorCourseManagementTemplateProps> = ({
  courseId,
  courseSettings,
  activeTab = 'settings',
  onTabChange,
  settingsContent,
  studentsContent,
  contentContent,
  user,
  navigationItems,
  onBack,
  onLogout,
  logo,
  brandName = 'KFlow',
  className,
}) => {
  const tabs: TabItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      content: settingsContent || (
        <div className="py-8 text-center text-gray-500">
          Settings content goes here
        </div>
      ),
    },
    {
      id: 'students',
      label: 'Students',
      icon: Users,
      content: studentsContent || (
        <div className="py-8 text-center text-gray-500">
          Students content goes here
        </div>
      ),
    },
    {
      id: 'content',
      label: 'Content',
      icon: BookOpen,
      content: contentContent || (
        <div className="py-8 text-center text-gray-500">
          Content management goes here
        </div>
      ),
    },
  ];

  const courseTitle = courseSettings?.title || 'Untitled Course';

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName={brandName}
      className={className}
    >
      <div className="space-y-6">
        {/* Breadcrumb */}
        {onBack && (
          <Breadcrumb
            items={[
              { label: 'Courses', onClick: onBack },
              { label: courseTitle },
            ]}
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={onBack}
              >
                Back
              </Button>
            )}
            <div>
              <Typography variant="h3">{courseTitle}</Typography>
              {courseSettings?.description && (
                <Typography variant="body" color="secondary" className="mt-1">
                  {courseSettings.description}
                </Typography>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          items={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          variant="underline"
        />
      </div>
    </AppLayoutTemplate>
  );
};

MentorCourseManagementTemplate.displayName = 'MentorCourseManagementTemplate';
