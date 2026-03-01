/**
 * Mock data for student management components
 */

export interface MockStudent {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  enrolledCoursesCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MockCourse {
  id: string;
  title: string;
  description?: string;
}

export interface MockScheduleSlot {
  id: string;
  studentUserId: string;
  studentName: string;
  courseSettingsId: string;
  courseTitle: string;
  dayOfWeek: number | string;
  startTime: string;
  endTime: string;
  duration: number;
  location?: string;
  room?: string;
  recurring: boolean;
  createdAt: number;
  updatedAt: number;
}

export const mockStudents: MockStudent[] = [
  {
    id: 'student-1',
    userId: 'user-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    enrolledCoursesCount: 3,
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'student-2',
    userId: 'user-2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1 (555) 234-5678',
    enrolledCoursesCount: 2,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'student-3',
    userId: 'user-3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    enrolledCoursesCount: 1,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'student-4',
    userId: 'user-4',
    name: 'Alice Williams',
    email: 'alice.williams@example.com',
    phone: '+1 (555) 456-7890',
    enrolledCoursesCount: 0,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 1,
  },
];

export const mockCourses: MockCourse[] = [
  {
    id: 'course-1',
    title: 'Introduction to React',
    description: 'Learn the fundamentals of React',
  },
  {
    id: 'course-2',
    title: 'Advanced TypeScript',
    description: 'Master TypeScript for large-scale applications',
  },
  {
    id: 'course-3',
    title: 'Full Stack Development',
    description: 'Build complete web applications',
  },
];

export const mockScheduleSlots: MockScheduleSlot[] = [
  {
    id: 'schedule-1',
    studentUserId: 'user-1',
    studentName: 'John Doe',
    courseSettingsId: 'course-1',
    courseTitle: 'Introduction to React',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '10:30',
    duration: 90,
    location: 'Main Building',
    room: 'Room 101',
    recurring: true,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'schedule-2',
    studentUserId: 'user-1',
    studentName: 'John Doe',
    courseSettingsId: 'course-2',
    courseTitle: 'Advanced TypeScript',
    dayOfWeek: 3, // Wednesday
    startTime: '14:00',
    endTime: '15:30',
    duration: 90,
    location: 'Tech Building',
    room: 'Room 205',
    recurring: true,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'schedule-3',
    studentUserId: 'user-2',
    studentName: 'Jane Smith',
    courseSettingsId: 'course-1',
    courseTitle: 'Introduction to React',
    dayOfWeek: 2, // Tuesday
    startTime: '10:00',
    endTime: '11:30',
    duration: 90,
    location: 'Main Building',
    room: 'Room 102',
    recurring: true,
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
  },
  {
    id: 'schedule-4',
    studentUserId: 'user-3',
    studentName: 'Bob Johnson',
    courseSettingsId: 'course-3',
    courseTitle: 'Full Stack Development',
    dayOfWeek: 4, // Thursday
    startTime: '13:00',
    endTime: '14:30',
    duration: 90,
    recurring: false,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
];

export const dayOfWeekOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];
