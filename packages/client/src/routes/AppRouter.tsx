import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import LandingPage from '../pages/LandingPage';
import { NotePageContainer } from '../features/notes/containers';
import { ConceptListPageContainer, ConceptDetailPageContainer } from '../features/concepts/containers';
import { LearnPageContainer } from '../features/learning/containers';
import MentorPageContainer from '../features/mentor/containers/MentorPageContainer';
import MentorConceptListPageContainer from '../features/mentor/containers/MentorConceptListPageContainer';
import MentorConceptDetailPageContainer from '../features/mentor/containers/MentorConceptDetailPageContainer';
import { StudentCoursePageContainer, CoursesPageContainer, MyCourseDetailPageContainer } from '../features/student/containers';
import { DashboardPageContainer } from '../features/dashboard/containers';
import PublicCoursesPage from '../pages/PublicCoursesPage';
import CourseDetailPage from '../pages/CourseDetailPage';
import { Login, ProtectedRoute } from '../features/auth';
import { useAuthContext } from '../features/auth/AuthContext';
import { Loader } from '../components';

/**
 * All routes now use template-based pages (no Layout wrapper).
 * Each page uses its own template which includes Header/Sidebar.
 */

const HomeRoute: React.FC = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <Loader
        size="lg"
        text="Loading..."
        overlay={false}
        className="min-h-screen bg-gray-50 dark:bg-gray-900"
      />
    );
  }

  if (user) {
    // Redirect authenticated users to /home which uses DashboardTemplate
    return <Navigate to="/home" replace />;
  }

  return <LandingPage />;
};

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes (no auth required) */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/courses" element={<PublicCoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />

        {/* 
         * Template-based Routes (migrated - no Layout wrapper)
         * These pages use their own templates which include Header/Sidebar
         */}
        <Route path="/home" element={
          <ProtectedRoute><DashboardPageContainer /></ProtectedRoute>
        } />
        <Route path="/mentor" element={
          <ProtectedRoute><MentorPageContainer /></ProtectedRoute>
        } />
        <Route path="/mentor/:graphId" element={
          <ProtectedRoute><MentorConceptListPageContainer /></ProtectedRoute>
        } />
        <Route path="/mentor/:graphId/concept/:conceptId" element={
          <ProtectedRoute><MentorConceptDetailPageContainer /></ProtectedRoute>
        } />
        <Route path="/course/:courseId" element={
          <ProtectedRoute><StudentCoursePageContainer /></ProtectedRoute>
        } />
        <Route path="/course/:courseId/lesson/:lessonId" element={
          <ProtectedRoute><StudentCoursePageContainer /></ProtectedRoute>
        } />
        <Route path="/my-courses" element={
          <ProtectedRoute><CoursesPageContainer /></ProtectedRoute>
        } />
        <Route path="/my-courses/:courseId" element={
          <ProtectedRoute><MyCourseDetailPageContainer /></ProtectedRoute>
        } />
        <Route path="/learn" element={
          <ProtectedRoute><LearnPageContainer /></ProtectedRoute>
        } />
        <Route path="/concepts/:graphId" element={
          <ProtectedRoute><ConceptListPageContainer /></ProtectedRoute>
        } />
        <Route path="/concepts/:graphId/concept/:conceptId/prerequisite/:prereqId" element={
          <ProtectedRoute><ConceptDetailPageContainer /></ProtectedRoute>
        } />
        <Route path="/concepts/:graphId/concept/:conceptId" element={
          <ProtectedRoute><ConceptDetailPageContainer /></ProtectedRoute>
        } />

        {/* 
         * All routes have been migrated to use templates
         * Layout wrapper is no longer needed
         */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
