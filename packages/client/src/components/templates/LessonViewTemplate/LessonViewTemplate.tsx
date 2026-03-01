/**
 * LessonViewTemplate Component
 * 
 * Student lesson consumption view with content, flashcards, assessments,
 * and language/translation support for bilingual learning.
 * Uses Header, CourseSidebar, StudentLessonView, FlashCard, AssessmentCard organisms.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, Menu, X, BookOpen, CheckCircle, Home, Globe, Languages } from 'lucide-react';
import { Header } from '../../organisms/Header';
import { CourseSidebar, Module } from '../../organisms/CourseSidebar';
import { FlashCard } from '../../organisms/FlashCard';
import { LessonPanel } from '../../organisms/LessonPanel';
import { Card } from '../../molecules/Card';
import { ProgressCard } from '../../molecules/ProgressCard';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Breadcrumb, BreadcrumbItem } from '../../molecules/Breadcrumb';
import { LanguageSelector, LanguageOption, DEFAULT_LANGUAGES } from '../../molecules/LanguageSelector';
import { TranslationBanner } from '../../molecules/TranslationBanner';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Divider } from '../../atoms/Divider';
import { Badge } from '../../atoms/Badge';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { ProfilePopup } from '../../molecules/ProfilePopup/ProfilePopup';
import ThemeToggle from '../../ThemeToggle';
import { cn } from '../../../utils/theme';

export interface LessonViewTemplateProps {
  /**
   * Lesson ID
   */
  id: string;
  
  /**
   * Lesson title
   */
  title: string;
  
  /**
   * Lesson content (HTML)
   */
  content: string;
  
  /**
   * Lesson duration (minutes)
   */
  duration?: number;
  
  /**
   * Course title
   */
  courseTitle: string;
  
  /**
   * Course progress (0-100)
   */
  courseProgress: number;
  
  /**
   * Course modules for sidebar
   */
  modules: Module[];
  
  /**
   * Current lesson ID
   */
  currentLessonId: string;
  
  /**
   * Flashcards for this lesson
   */
  flashcards?: Array<{ id: string; question: string; answer: string }>;
  
  /**
   * Assessment questions
   */
  assessmentContent?: React.ReactNode;
  
  /**
   * Breadcrumb items
   */
  breadcrumbs?: BreadcrumbItem[];
  
  /**
   * Has previous lesson
   */
  hasPreviousLesson?: boolean;
  
  /**
   * Has next lesson
   */
  hasNextLesson?: boolean;
  
  /**
   * On previous lesson click
   */
  onPreviousLesson?: () => void;
  
  /**
   * On next lesson click
   */
  onNextLesson?: () => void;
  
  /**
   * On lesson complete
   */
  onComplete?: () => void | Promise<void>;
  
  /**
   * Is lesson completed
   */
  isCompleted?: boolean;
  
  /**
   * Reading progress (0-100)
   */
  readingProgress?: number;
  
  /**
   * On lesson click (from sidebar)
   */
  onLessonClick?: (lessonId: string) => void;
  
  /**
   * User information for header
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
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
   * On back to courses/home handler
   */
  onBackToCourses?: () => void;
  
  /**
   * Available languages for translation
   */
  availableLanguages?: LanguageOption[];
  
  /**
   * Source/original content language
   */
  sourceLanguage?: string;
  
  /**
   * Currently selected language
   */
  selectedLanguage?: string;
  
  /**
   * Translated content (if different from source)
   */
  translatedContent?: string;
  
  /**
   * Translation status
   */
  translationStatus?: 'original' | 'translated' | 'translating' | 'stale' | 'error';
  
  /**
   * Translation timestamp
   */
  translatedAt?: Date | number;
  
  /**
   * On language change
   */
  onLanguageChange?: (languageCode: string) => void;
  
  /**
   * On regenerate translation
   */
  onRegenerateTranslation?: () => void;
  
  /**
   * Show bilingual mode toggle
   */
  showBilingualToggle?: boolean;
  
  /**
   * Is bilingual mode active
   */
  isBilingualMode?: boolean;
  
  /**
   * On bilingual mode toggle
   */
  onBilingualModeToggle?: (enabled: boolean) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const LessonViewTemplate: React.FC<LessonViewTemplateProps> = ({
  id,
  title,
  content,
  duration,
  courseTitle,
  courseProgress,
  modules,
  currentLessonId,
  flashcards = [],
  assessmentContent,
  breadcrumbs = [],
  hasPreviousLesson = false,
  hasNextLesson = false,
  onPreviousLesson,
  onNextLesson,
  onComplete,
  isCompleted = false,
  readingProgress = 0,
  onLessonClick,
  user,
  logo,
  onLogoClick,
  onLogout,
  onBackToCourses,
  availableLanguages = DEFAULT_LANGUAGES,
  sourceLanguage = 'en',
  selectedLanguage = 'en',
  translatedContent,
  translationStatus = 'original',
  translatedAt,
  onLanguageChange,
  onRegenerateTranslation,
  showBilingualToggle = false,
  isBilingualMode = false,
  onBilingualModeToggle,
  className,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Determine which content to display
  const isViewingTranslation = selectedLanguage !== sourceLanguage && !showOriginal;
  const displayContent = isViewingTranslation && translatedContent ? translatedContent : content;
  const hasTranslation = availableLanguages.length > 1 && onLanguageChange;

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      {/* Minimal Header with progress */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 h-12 sm:h-14">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              icon={Menu}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open course menu"
              className="flex-shrink-0"
            >
              <span className="sr-only">Open course menu</span>
            </Button>
            <div className="hidden sm:block min-w-0 flex-1">
              <Typography variant="small" color="secondary" className="text-xs sm:text-sm truncate">
                {courseTitle}
              </Typography>
              <Typography variant="body" weight="medium" className="line-clamp-1 text-sm sm:text-base">
                {title}
              </Typography>
            </div>
            <div className="sm:hidden min-w-0 flex-1">
              <Typography variant="body" weight="medium" className="line-clamp-1 text-sm">
                {title}
              </Typography>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Language Selector */}
            {hasTranslation && (
              <div className="hidden md:block">
                <LanguageSelector
                  languages={availableLanguages}
                  value={selectedLanguage}
                  onChange={onLanguageChange}
                  size="sm"
                  showNativeName={false}
                />
              </div>
            )}
            {isCompleted && (
              <Badge variant="success" className="hidden sm:flex text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
            <div className="hidden sm:flex items-center gap-2 w-32 sm:w-40 md:w-48">
              <ProgressBar value={courseProgress} color="primary" size="sm" />
              <Typography variant="small" color="muted" className="text-xs sm:text-sm whitespace-nowrap">
                {courseProgress}%
              </Typography>
            </div>
            {user && onLogout && (
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <ProfilePopup
                  userName={user.name}
                  userEmail={user.email}
                  userAvatar={user.avatar}
                  onLogout={onLogout}
                  trigger={
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all cursor-pointer"
                    >
                      <Avatar
                        src={user.avatar}
                        initials={user.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                        size="sm"
                      />
                    </button>
                  }
                  position="top-right"
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Reading progress indicator */}
        <div className="h-1 bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-full sm:w-80 bg-white dark:bg-gray-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
              <Typography variant="h6" className="text-base sm:text-lg">Course Content</Typography>
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close</span>
              </Button>
            </div>
            
            {/* Back to Courses button */}
            {onBackToCourses && (
              <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Home}
                  onClick={() => {
                    setSidebarOpen(false);
                    onBackToCourses();
                  }}
                  className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Back to Courses
                </Button>
              </div>
            )}
            
            {/* Language selector in sidebar (mobile) */}
            {hasTranslation && (
              <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon={Globe} size="sm" className="text-indigo-500" />
                  <Typography variant="small" weight="medium">
                    Learning Language
                  </Typography>
                </div>
                <LanguageSelector
                  languages={availableLanguages}
                  value={selectedLanguage}
                  onChange={(code) => {
                    onLanguageChange?.(code);
                  }}
                  size="md"
                  showNativeName
                />
              </div>
            )}
            
            <CourseSidebar
              title={courseTitle}
              progress={courseProgress}
              modules={modules}
              currentLessonId={currentLessonId}
              className="border-none"
            />
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="pt-16 pb-24">
        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}

        {/* Lesson content */}
        <article className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-4 sm:mb-6 md:mb-8">
            <Typography variant="h2" className="mb-2 text-gray-900 dark:text-white text-2xl sm:text-3xl md:text-4xl">
              {title}
            </Typography>
            <div className="flex flex-wrap items-center gap-3">
              {duration && (
                <Typography variant="small" color="muted" className="text-xs sm:text-sm">
                  {duration} min read
                </Typography>
              )}
              
              {/* Mobile Language Selector */}
              {hasTranslation && (
                <div className="md:hidden">
                  <LanguageSelector
                    languages={availableLanguages}
                    value={selectedLanguage}
                    onChange={onLanguageChange}
                    size="sm"
                    showNativeName={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Translation Banner */}
          {selectedLanguage !== sourceLanguage && (
            <div className="mb-4">
              <TranslationBanner
                status={translationStatus}
                sourceLanguage={sourceLanguage}
                targetLanguage={selectedLanguage}
                translatedAt={translatedAt}
                onViewOriginal={() => setShowOriginal(true)}
                onRegenerate={onRegenerateTranslation}
                isRegenerating={translationStatus === 'translating'}
              />
            </div>
          )}
          
          {/* Bilingual Mode Toggle */}
          {showBilingualToggle && selectedLanguage !== sourceLanguage && translatedContent && (
            <Card className="mb-4 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon={Languages} size="md" className="text-indigo-500" />
                  <div>
                    <Typography variant="small" weight="medium">
                      Bilingual Mode
                    </Typography>
                    <Typography variant="small" color="secondary">
                      Show original and translated content side by side
                    </Typography>
                  </div>
                </div>
                <Button
                  variant={isBilingualMode ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onBilingualModeToggle?.(!isBilingualMode)}
                >
                  {isBilingualMode ? 'On' : 'Off'}
                </Button>
              </div>
            </Card>
          )}

          {/* Main lesson content */}
          <div className={cn('mb-6 sm:mb-8', translationStatus === 'translating' && 'opacity-60')}>
            {isBilingualMode && translatedContent && selectedLanguage !== sourceLanguage ? (
              // Bilingual view
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Badge variant="default" size="sm" className="mb-3">
                    {availableLanguages.find(l => l.code === sourceLanguage)?.name || 'Original'}
                  </Badge>
                  <LessonPanel
                    renderedLesson={content}
                    conceptHasLesson={!!content}
                    showGenerationButtons={false}
                  />
                </div>
                <div className="lg:border-l lg:border-gray-200 lg:dark:border-gray-700 lg:pl-6">
                  <Badge variant="info" size="sm" className="mb-3">
                    {availableLanguages.find(l => l.code === selectedLanguage)?.name || 'Translation'}
                  </Badge>
                  <LessonPanel
                    renderedLesson={translatedContent}
                    conceptHasLesson={!!translatedContent}
                    showGenerationButtons={false}
                  />
                </div>
              </div>
            ) : (
              // Single content view
              <div>
                {showOriginal && selectedLanguage !== sourceLanguage && (
                  <div className="mb-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <Typography variant="small" color="secondary">
                      Viewing original content
                    </Typography>
                    <Button variant="ghost" size="sm" onClick={() => setShowOriginal(false)}>
                      View Translation
                    </Button>
                  </div>
                )}
                <LessonPanel
                  renderedLesson={displayContent}
                  conceptHasLesson={!!displayContent}
                  showGenerationButtons={false}
                />
              </div>
            )}
          </div>

          {/* Flashcards section */}
          {flashcards.length > 0 && (
            <>
              <Divider className="my-8" />
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="h4">
                    Practice with Flashcards
                  </Typography>
                  <Badge variant="default">
                    {flashcards.length} cards
                  </Badge>
                </div>
                
                {showFlashcards ? (
                  <div className="space-y-4">
                    {flashcards && flashcards.length > 0 && currentFlashcardIndex < flashcards.length && (
                      <FlashCard
                        id={flashcards[currentFlashcardIndex].id}
                        front={flashcards[currentFlashcardIndex].question}
                        back={flashcards[currentFlashcardIndex].answer}
                        currentCard={currentFlashcardIndex + 1}
                        totalCards={flashcards.length}
                        onNext={() => setCurrentFlashcardIndex(prev => Math.min(prev + 1, flashcards.length - 1))}
                        onPrevious={() => setCurrentFlashcardIndex(prev => Math.max(prev - 1, 0))}
                      />
                    )}
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        onClick={() => setShowFlashcards(false)}
                      >
                        Close Flashcards
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-indigo-600 dark:text-indigo-400" />
                    <Typography variant="body" className="mb-4">
                      Review key concepts with interactive flashcards
                    </Typography>
                    <Button
                      variant="primary"
                      onClick={() => setShowFlashcards(true)}
                    >
                      Start Flashcards
                    </Button>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* Assessment section */}
          {assessmentContent && (
            <>
              <Divider className="my-8" />
              <div className="mb-8">
                <Typography variant="h4" className="mb-4">
                  Check Your Understanding
                </Typography>
                {assessmentContent}
              </div>
            </>
          )}

          {/* Complete lesson button */}
          {!isCompleted && onComplete && (
            <div className="text-center my-8">
              <Button
                variant="success"
                size="lg"
                icon={CheckCircle}
                onClick={async () => {
                  try {
                    await onComplete();
                  } catch (error) {
                    console.error('Failed to complete lesson:', error);
                  }
                }}
              >
                Mark as Complete
              </Button>
            </div>
          )}
        </article>
      </main>

      {/* Bottom navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            icon={ChevronLeft}
            onClick={onPreviousLesson}
            disabled={!hasPreviousLesson}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          
          <div className="hidden sm:block text-center flex-1">
            <Typography variant="small" color="muted" className="text-xs sm:text-sm">
              {isCompleted ? 'Lesson completed!' : 'Keep learning...'}
            </Typography>
          </div>
          
          <Button
            variant={hasNextLesson ? 'primary' : 'secondary'}
            iconRight={ChevronRight}
            onClick={onNextLesson}
            disabled={!hasNextLesson}
            size="sm"
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
          </Button>
        </div>
      </footer>
    </div>
  );
};

LessonViewTemplate.displayName = 'LessonViewTemplate';

