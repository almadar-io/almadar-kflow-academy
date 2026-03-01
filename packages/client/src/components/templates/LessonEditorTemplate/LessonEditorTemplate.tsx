/**
 * LessonEditorTemplate Component
 * 
 * Mentor lesson creation/editing with split editor/preview.
 * Uses Header, LessonPanel, ConceptDetailPanel organisms and Tabs, ButtonGroup, Modal molecules.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Save, Eye, Send, Sparkles, FileText, Settings, ArrowLeft, X } from 'lucide-react';
import { Header } from '../../organisms/Header';
import { LessonPanel, Prerequisite } from '../../organisms/LessonPanel';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { Card } from '../../molecules/Card';
import { Modal } from '../../molecules/Modal';
import { Alert } from '../../molecules/Alert';
import { FormField } from '../../molecules/FormField';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Spinner } from '../../atoms/Spinner';
import { cn } from '../../../utils/theme';

export interface LessonEditorTemplateProps {
  /**
   * Lesson ID (null for new lesson)
   */
  id?: string | null;
  
  /**
   * Lesson title
   */
  title: string;
  
  /**
   * On title change
   */
  onTitleChange?: (title: string) => void;
  
  /**
   * Lesson content (markdown)
   */
  content: string;
  
  /**
   * On content change
   */
  onContentChange?: (content: string) => void;
  
  /**
   * Rendered content (HTML)
   */
  renderedContent?: string;
  
  /**
   * Prerequisites
   */
  prerequisites?: Prerequisite[];
  
  /**
   * On prerequisite change
   */
  onPrerequisiteChange?: (prerequisites: Prerequisite[]) => void;
  
  /**
   * On save
   */
  onSave?: () => void;
  
  /**
   * On publish
   */
  onPublish?: () => void;
  
  /**
   * On back
   */
  onBack?: () => void;
  
  /**
   * On generate lesson
   */
  onGenerateLesson?: (simple: boolean) => void;
  
  /**
   * On generate flashcards
   */
  onGenerateFlashCards?: () => void;
  
  /**
   * Is saving
   */
  isSaving?: boolean;
  
  /**
   * Is generating
   */
  isGenerating?: boolean;
  
  /**
   * Is generating flashcards
   */
  isGeneratingFlashCards?: boolean;
  
  /**
   * Is published
   */
  isPublished?: boolean;
  
  /**
   * Has unsaved changes
   */
  hasUnsavedChanges?: boolean;
  
  /**
   * Last saved timestamp
   */
  lastSaved?: string;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Success message
   */
  success?: string;
  
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
   * Additional CSS classes
   */
  className?: string;
}

export const LessonEditorTemplate: React.FC<LessonEditorTemplateProps> = ({
  id,
  title,
  onTitleChange,
  content,
  onContentChange,
  renderedContent,
  prerequisites = [],
  onPrerequisiteChange,
  onSave,
  onPublish,
  onBack,
  onGenerateLesson,
  onGenerateFlashCards,
  isSaving = false,
  isGenerating = false,
  isGeneratingFlashCards = false,
  isPublished = false,
  hasUnsavedChanges = false,
  lastSaved,
  error,
  success,
  user,
  logo,
  onLogoClick,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('edit');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const tabs: TabItem[] = [
    { id: 'edit', label: 'Edit', content: null },
    { id: 'preview', label: 'Preview', icon: Eye, content: null },
    { id: 'split', label: 'Split View', content: null },
  ];

  const isNewLesson = !id;

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col', className)}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 h-12 sm:h-14">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={onBack}
              className="flex-shrink-0"
            >
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="hidden sm:block flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange?.(e.target.value)}
                placeholder="Lesson title..."
                className="text-base sm:text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full max-w-md text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <div className="sm:hidden flex-1 min-w-0">
              <Typography variant="body" weight="medium" className="truncate text-sm">
                {title || 'Untitled Lesson'}
              </Typography>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Status badges */}
            {hasUnsavedChanges && (
              <Badge variant="warning" size="sm">Unsaved</Badge>
            )}
            {isPublished && (
              <Badge variant="success" size="sm">Published</Badge>
            )}
            {!isPublished && !isNewLesson && (
              <Badge variant="default" size="sm">Draft</Badge>
            )}
            
            {/* Last saved */}
            {lastSaved && (
              <Typography variant="small" color="muted" className="hidden lg:block text-xs">
                Saved {lastSaved}
              </Typography>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={Settings}
                onClick={() => setShowSettingsModal(true)}
                className="hidden sm:flex"
              >
                <span className="sr-only">Settings</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Save}
                onClick={onSave}
                loading={isSaving}
                disabled={isSaving}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Save</span>
                <span className="sm:hidden">Save</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                onClick={() => setShowPublishModal(true)}
                disabled={!content || isSaving}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Publish</span>
                <span className="sm:hidden">Pub</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-3 sm:px-4 md:px-6 border-t border-gray-100 dark:border-gray-700 overflow-x-auto">
          <Tabs
            items={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </header>

      {/* Messages */}
      {error && (
        <Alert variant="error" className="mx-3 sm:mx-4 md:mx-6 mt-3 sm:mt-4">{error}</Alert>
      )}
      {success && (
        <Alert variant="success" className="mx-3 sm:mx-4 md:mx-6 mt-3 sm:mt-4">{success}</Alert>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <div className={cn(
          'h-full',
          activeTab === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-0' : ''
        )}>
          {/* Editor */}
          {(activeTab === 'edit' || activeTab === 'split') && (
            <div className={cn(
              'h-full overflow-auto',
              activeTab === 'split' && 'border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700'
            )}>
              <div className="p-3 sm:p-4 md:p-6">
                <Card>
                  <FormField
                    label="Lesson Content"
                    type="textarea"
                    inputProps={{
                      value: content,
                      onChange: (e) => onContentChange?.(e.target.value),
                      placeholder: 'Write your lesson content in Markdown...',
                      rows: 25,
                      className: 'font-mono text-sm',
                    }}
                  />
                  
                  {/* Generation actions */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Sparkles}
                      onClick={() => onGenerateLesson?.(true)}
                      loading={isGenerating}
                      disabled={isGenerating}
                      className="text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Quick Generate</span>
                      <span className="sm:hidden">Quick</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Sparkles}
                      onClick={() => onGenerateLesson?.(false)}
                      loading={isGenerating}
                      disabled={isGenerating}
                      className="text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Detailed Generate</span>
                      <span className="sm:hidden">Detailed</span>
                    </Button>
                    {content && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={FileText}
                        onClick={onGenerateFlashCards}
                        loading={isGeneratingFlashCards}
                        disabled={isGeneratingFlashCards}
                        className="text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Generate Flashcards</span>
                        <span className="sm:hidden">Flashcards</span>
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Preview */}
          {(activeTab === 'preview' || activeTab === 'split') && (
            <div className="h-full overflow-auto bg-white dark:bg-gray-800">
              <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
                <Typography variant="h2" className="mb-4 sm:mb-6 text-xl sm:text-2xl md:text-3xl">{title || 'Untitled Lesson'}</Typography>
                
                {/* Prerequisites */}
                {prerequisites.length > 0 && (
                  <div className="mb-6">
                    <Typography variant="small" color="secondary" className="mb-2">
                      Prerequisites:
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {prerequisites.map((prereq) => (
                        <Badge key={prereq.id} variant="default" size="sm">
                          {prereq.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Content */}
                {renderedContent ? (
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderedContent }}
                  />
                ) : content ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap">{content}</pre>
                  </div>
                ) : (
                  <Typography variant="body" color="muted" className="italic">
                    Start writing to see preview...
                  </Typography>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Publish Modal */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="Publish Lesson"
        size="sm"
      >
        <div className="space-y-4">
          <Typography variant="body" color="secondary">
            {isPublished
              ? 'Update the published version of this lesson?'
              : 'Make this lesson available to students?'}
          </Typography>
          
          {!title && (
            <Alert variant="warning">Please add a title before publishing.</Alert>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowPublishModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onPublish?.();
                setShowPublishModal(false);
              }}
              disabled={!title}
            >
              {isPublished ? 'Update' : 'Publish'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Lesson Settings"
        size="md"
      >
        <div className="space-y-4">
          <FormField
            label="Lesson Title"
            type="input"
            inputProps={{
              value: title,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => onTitleChange?.(e.target.value),
              placeholder: 'Enter lesson title',
            }}
          />
          
          <div>
            <Typography variant="body" weight="medium" className="mb-2">
              Prerequisites
            </Typography>
            <div className="flex flex-wrap gap-2">
              {prerequisites.map((prereq) => (
                <Badge
                  key={prereq.id}
                  variant="default"
                  dismissible
                  onDismiss={() => {
                    onPrerequisiteChange?.(prerequisites.filter(p => p.id !== prereq.id));
                  }}
                >
                  {prereq.name}
                </Badge>
              ))}
              {prerequisites.length === 0 && (
                <Typography variant="small" color="muted">
                  No prerequisites set
                </Typography>
              )}
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => setShowSettingsModal(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

LessonEditorTemplate.displayName = 'LessonEditorTemplate';

