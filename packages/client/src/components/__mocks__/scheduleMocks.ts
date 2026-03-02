/**
 * Mock data for schedule-related Storybook stories
 */

export const mockScheduleSlots = [
  {
    id: 'slot-1',
    studentUserId: 'user-1',
    studentName: 'Ahmad Khalil',
    courseSettingsId: 'settings-1',
    courseTitle: 'Introduction to Physics',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:30',
    location: 'Building A',
    room: 'Room 101',
  },
  {
    id: 'slot-2',
    studentUserId: 'user-2',
    studentName: 'Fatima Hassan',
    courseSettingsId: 'settings-2',
    courseTitle: 'Organic Chemistry',
    dayOfWeek: 2,
    startTime: '14:00',
    endTime: '15:30',
    location: 'Building B',
    room: 'Lab 203',
  },
  {
    id: 'slot-3',
    studentUserId: 'user-3',
    studentName: 'Omar Saleh',
    courseSettingsId: 'settings-1',
    courseTitle: 'Introduction to Physics',
    dayOfWeek: 3,
    startTime: '11:00',
    endTime: '12:30',
    location: 'Building A',
    room: 'Room 102',
  },
];

export const mockStudents = [
  { id: 'user-1', name: 'Ahmad Khalil', email: 'ahmad@example.com' },
  { id: 'user-2', name: 'Fatima Hassan', email: 'fatima@example.com' },
  { id: 'user-3', name: 'Omar Saleh', email: 'omar@example.com' },
];

export const mockCourses = [
  { id: 'settings-1', title: 'Introduction to Physics' },
  { id: 'settings-2', title: 'Organic Chemistry' },
];
