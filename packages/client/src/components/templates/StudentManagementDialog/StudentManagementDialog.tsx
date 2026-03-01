/**
 * StudentManagementDialog Template Component
 * 
 * Main student management dialog/section with tabs for Students, Enrollment, and Schedule.
 * Can be rendered as a modal or embedded section.
 */

import React, { useState } from 'react';
import { Modal } from '../../molecules/Modal';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { StudentList } from '../../organisms/StudentList';
import { ScheduleCalendar } from '../../organisms/ScheduleCalendar';
import { ScheduleList } from '../../organisms/ScheduleList';
import { Typography } from '../../atoms/Typography';
import { Users, Calendar } from 'lucide-react';
import { cn } from '../../../utils/theme';
import type { StudentListProps } from '../../organisms/StudentList/StudentList';
import type { ScheduleCalendarProps, ScheduleSlot as ScheduleCalendarSlot } from '../../organisms/ScheduleCalendar/ScheduleCalendar';
import type { ScheduleListProps, ScheduleSlot as ScheduleListSlot } from '../../organisms/ScheduleList/ScheduleList';

export interface StudentManagementDialogProps {
  /**
   * Whether dialog is open (only used when asModal is true)
   */
  isOpen?: boolean;
  
  /**
   * Callback when dialog should close (only used when asModal is true)
   */
  onClose?: () => void;
  
  /**
   * Course ID (if provided, shows course-specific view)
   */
  courseId?: string;
  
  /**
   * Course title (displayed in header if courseId provided)
   */
  courseTitle?: string;
  
  /**
   * Render as modal or embedded section
   * @default true
   */
  asModal?: boolean;
  
  /**
   * Students data and handlers
   */
  students?: StudentListProps['students'];
  onSelectStudent?: StudentListProps['onSelectStudent'];
  onAddStudent?: StudentListProps['onAddStudent'];
  onEditStudent?: StudentListProps['onEditStudent'];
  onDeleteStudent?: StudentListProps['onDeleteStudent'];
  studentsLoading?: boolean;
  
  /**
   * Schedule data and handlers
   */
  scheduleSlots?: ScheduleCalendarSlot[];
  onSlotClick?: ScheduleCalendarProps['onSlotClick'];
  onEmptySlotClick?: ScheduleCalendarProps['onEmptySlotClick'];
  scheduleLoading?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const StudentManagementDialog: React.FC<StudentManagementDialogProps> = ({
  isOpen = true,
  onClose,
  courseId,
  courseTitle,
  asModal = true,
  students = [],
  onSelectStudent,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  studentsLoading = false,
  scheduleSlots = [],
  onSlotClick,
  onEmptySlotClick,
  scheduleLoading = false,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('students');

  const tabs: TabItem[] = [
    {
      id: 'students',
      label: 'Students',
      icon: Users,
      badge: students.length > 0 ? students.length : undefined,
      content: (
        <StudentList
          students={students}
          onSelectStudent={onSelectStudent}
          onAddStudent={onAddStudent}
          onEditStudent={onEditStudent}
          onDeleteStudent={onDeleteStudent}
          loading={studentsLoading}
        />
      ),
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      badge: scheduleSlots.length > 0 ? scheduleSlots.length : undefined,
      content: (
        <div className="space-y-4">
          <ScheduleCalendar
            scheduleSlots={scheduleSlots as ScheduleCalendarSlot[]}
            onSlotClick={onSlotClick}
            onEmptySlotClick={onEmptySlotClick}
            loading={scheduleLoading}
          />
          <ScheduleList
            scheduleSlots={scheduleSlots as ScheduleListSlot[]}
            filterByCourse={courseId}
            loading={scheduleLoading}
          />
        </div>
      ),
    },
  ];

  const title = courseId && courseTitle 
    ? `Manage Students - ${courseTitle}`
    : courseId
    ? 'Manage Students'
    : 'Student Management';

  const content = (
    <div className={cn('space-y-4', !asModal && 'p-6', className)}>
      {courseId && (
        <div className="mb-4">
          <Typography variant="h6" className="mb-1">
            {courseTitle || 'Course Students'}
          </Typography>
          {courseId && (
            <Typography variant="body" color="secondary">
              Manage students enrolled in this course
            </Typography>
          )}
        </div>
      )}
      
      <Tabs
        items={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
      />
    </div>
  );

  if (asModal) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        title={title}
        size="xl"
      >
        {content}
      </Modal>
    );
  }

  return content;
};

StudentManagementDialog.displayName = 'StudentManagementDialog';
