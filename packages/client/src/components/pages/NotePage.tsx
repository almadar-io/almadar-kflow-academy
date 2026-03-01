/**
 * NotePage Library Component
 * 
 * Notes page component using DashboardTemplate.
 * Receives data as props - containers handle data fetching and state management.
 */

import React, { useState, useEffect } from 'react';
import { DashboardTemplate } from '../templates/DashboardTemplate';
import { Button } from '../atoms/Button';
import { Typography } from '../atoms/Typography';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { ButtonGroup } from '../molecules/ButtonGroup';
import { ArrowLeft, List, Map } from 'lucide-react';
import type { Note } from '../../features/notes/types';
import type { LucideIcon } from 'lucide-react';
import NoteList from '../../features/notes/components/NoteList';
import { MindMap } from '../../features/mindmap';
import SearchBar from '../SearchBar';

export interface NotePageProps {
  /**
   * Current note ID from route
   */
  currentNoteId?: string;
  
  /**
   * All notes
   */
  notes?: Note[];
  
  /**
   * Selected note
   */
  selectedNote?: Note | null;
  
  /**
   * Current note (the one being viewed)
   */
  currentNote?: Note | null;
  
  /**
   * View mode
   * @default 'list'
   */
  viewMode?: 'list' | 'mindmap';
  
  /**
   * Search query
   */
  searchQuery?: string;
  
  /**
   * Scroll target note
   */
  scrollTargetNote?: Note;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Error state
   */
  error?: string | null;
  
  /**
   * Callbacks
   */
  onNoteSelect?: (note: Note) => void;
  onNoteClick?: (noteId: string) => void;
  onNoteDelete?: (noteId: string) => void;
  onNoteCreate?: (parentId?: string) => void;
  onNoteEdit?: (noteId: string, updates: Partial<Note>) => void;
  onViewModeChange?: (mode: 'list' | 'mindmap') => void;
  onSearchChange?: (query: string) => void;
  onBack?: () => void;
  onToggleExpand?: (noteId: string) => void;
  onEnsureExpanded?: (noteId: string) => void;
  onSetScrollTargetNote?: (note: Note | undefined) => void;
  
  /**
   * Template props
   */
  user?: { name: string; email?: string; avatar?: string };
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  logo?: React.ReactNode;
  onLogoClick?: () => void;
}

export const NotePage: React.FC<NotePageProps> = ({
  currentNoteId,
  notes = [],
  selectedNote,
  currentNote,
  viewMode: controlledViewMode,
  searchQuery: controlledSearchQuery,
  scrollTargetNote,
  loading = false,
  error = null,
  onNoteSelect,
  onNoteClick,
  onNoteDelete,
  onNoteCreate,
  onNoteEdit,
  onViewModeChange,
  onSearchChange,
  onBack,
  onToggleExpand,
  onEnsureExpanded,
  onSetScrollTargetNote,
  user,
  navigationItems,
  logo,
  onLogoClick,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'mindmap'>('list');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  
  const viewMode = controlledViewMode ?? internalViewMode;
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  
  const handleViewModeChange = (mode: 'list' | 'mindmap') => {
    if (controlledViewMode === undefined) {
      setInternalViewMode(mode);
    }
    onViewModeChange?.(mode);
  };
  
  const handleSearchChange = (query: string) => {
    if (controlledSearchQuery === undefined) {
      setInternalSearchQuery(query);
    }
    onSearchChange?.(query);
  };
  
  // Get notes to display in sidebar - only the selected note and its hierarchy
  const getNotesForSidebar = (): Note[] => {
    if (!selectedNote || !currentNote) return [];
    
    const notesToShow: Note[] = [];
    
    // Add all parent notes from root to selected note
    const addParentPath = (noteId: string) => {
      const note = notes.find(n => n.id === noteId);
      if (note && note.parentId) {
        addParentPath(note.parentId);
      }
      if (note) {
        notesToShow.push(note);
      }
    };
    
    addParentPath(currentNote.id);
    
    // Add all children of the current note
    const addChildren = (parentId: string) => {
      const children = notes.filter(note => note.parentId === parentId);
      children.forEach(child => {
        notesToShow.push(child);
        addChildren(child.id);
      });
    };
    
    addChildren(currentNote.id);
    return notesToShow;
  };

  const sidebarNotes = getNotesForSidebar();
  
  const handleNoteClick = (note: Note) => {
    if (!note.parentId) {
      onNoteClick?.(note.id);
    }
  };

  const handleNoteSelect = (note: Note) => {
    onNoteSelect?.(note);
  };

  const handleDeleteNote = (noteId: string) => {
    onNoteDelete?.(noteId);
  };

  const handleAddChildNote = (parentNote: Note) => {
    onNoteCreate?.(parentNote.id);
  };

  const handleCreateNote = () => {
    onNoteCreate?.();
  };

  const handleEditNote = (note: Note) => {
    onNoteEdit?.(note.id, note);
  };

  const handleToggleExpand = (noteId: string) => {
    onToggleExpand?.(noteId);
  };

  const handleEnsureExpanded = (noteId: string) => {
    onEnsureExpanded?.(noteId);
  };

  const handleSetScrollTargetNote = (note: Note | undefined) => {
    onSetScrollTargetNote?.(note);
  };

  if (!currentNote) {
    return (
      <DashboardTemplate
        variant="student"
        user={user}
        navigationItems={navigationItems}
        logo={logo}
        onLogoClick={onLogoClick}
      >
        <Card>
          <div className="text-center p-8">
            <Typography variant="h2" className="mb-2">Note Not Found</Typography>
            <Typography variant="body" color="secondary" className="mb-4">
              The note you're looking for doesn't exist.
            </Typography>
            <Button variant="primary" onClick={onBack} icon={ArrowLeft}>
              Go Back
            </Button>
          </div>
        </Card>
      </DashboardTemplate>
    );
  }

  return (
    <DashboardTemplate
      variant="student"
      user={user}
      navigationItems={navigationItems}
      logo={logo}
      onLogoClick={onLogoClick}
    >
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Button variant="ghost" onClick={onBack} icon={ArrowLeft}>
            Back to All Notes
          </Button>
          
          <div className="flex-1 text-center">
            <Typography variant="h1" className="mb-2">
              {currentNote.title}
            </Typography>
            {currentNote.parentId && (
              <div className="flex items-center justify-center gap-3">
                <Badge variant="warning">
                  Parent: {notes.find(n => n.id === currentNote.parentId)?.title || 'Unknown'}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <ButtonGroup>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('list')}
                icon={List}
              >
                List View
              </Button>
              <Button
                variant={viewMode === 'mindmap' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('mindmap')}
                icon={Map}
              >
                Mind Map
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>

      {/* Search and Notes Content */}
      <Card>
        <div className="mb-4">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            notes={sidebarNotes}
            onSelectSuggestion={(note) => {
              handleNoteSelect(note);
              onSetScrollTargetNote?.(note);
            }}
          />
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Typography variant="body" color="secondary">Loading notes...</Typography>
          </div>
        ) : error ? (
          <div className="p-8">
            <Typography variant="body" color="error">{error}</Typography>
          </div>
        ) : viewMode === 'mindmap' ? (
          <MindMap
            notes={sidebarNotes}
            selectedNote={selectedNote ?? null}
            onSelectNote={handleNoteSelect}
            onDeleteNote={handleDeleteNote}
            onEditNote={handleEditNote}
            onCreateNote={handleCreateNote}
            onAddChildNote={handleAddChildNote}
            onNavigateToNote={handleNoteSelect}
            scrollTargetNote={scrollTargetNote}
            onSetScrollTargetNote={handleSetScrollTargetNote}
          />
        ) : (
          <NoteList 
            notes={sidebarNotes}
            selectedNote={selectedNote ?? null}
            onDeleteNote={handleDeleteNote}
            onEditNote={handleEditNote}
            onAddChildNote={handleAddChildNote}
            onCreateNote={handleCreateNote}
            onSelectNote={handleNoteSelect}
            onNavigateToNote={handleNoteClick}
            showCreateButton={false}
            autoExpandParent={true}
            currentNoteId={currentNote.id}
            onToggleExpand={handleToggleExpand}
            onEnsureExpanded={handleEnsureExpanded}
            scrollTargetNote={scrollTargetNote}
          />
        )}
      </Card>
    </DashboardTemplate>
  );
};

NotePage.displayName = 'NotePage';
