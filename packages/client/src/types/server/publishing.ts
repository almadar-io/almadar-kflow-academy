// Publishing types - simplified for Lite build

export interface Assessment {
  id: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  mentorId?: string;
  title?: string;
  description?: string;
  questions: AssessmentQuestion[];
  passingScore: number;
  maxAttempts?: number;
  timeLimit?: number;
  showResults?: boolean;
  randomizeQuestions?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'code' | 'essay';
  question?: string;
  text?: string;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  points: number;
  explanation?: string;
}

export interface AssessmentOption {
  id: string;
  text: string;
}

export interface AssessmentSubmission {
  id?: string;
  assessmentId?: string;
  enrollmentId?: string;
  studentId?: string;
  lessonId?: string;
  answers: AssessmentAnswer[];
  score?: number;
  maxScore?: number;
  percentage?: number;
  passed?: boolean;
  submittedAt?: number;
  gradedAt?: number;
}

export interface AssessmentAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  pointsEarned?: number;
  feedback?: string;
}

export interface PublishedCourse {
  id: string;
  title: string;
  description: string;
  modules: PublishedModule[];
  isPublished: boolean;
  visibility: 'public' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishedModule {
  id: string;
  title: string;
  description?: string;
  lessons: LessonPreview[];
  order: number;
}

export interface LessonPreview {
  id: string;
  title: string;
  description?: string;
  contentId: string;
  order: number;
  duration?: number;
}
