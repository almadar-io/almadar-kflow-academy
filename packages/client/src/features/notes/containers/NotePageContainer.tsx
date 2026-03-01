/**
 * Container component for NotePage
 * Handles data fetching, state management, and passes data to library NotePage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { selectNote, deleteNote, addChildNote, createNote, editNote, toggleNoteExpanded, expandNote } from '../noteSlice';
import { NotePage } from '../../../components/pages/NotePage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useAuthContext } from '../../auth/AuthContext';
import { Note } from '../types';

const NotePageContainer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAuthContext();
  const [viewMode, setViewMode] = useState<'list' | 'mindmap'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollTargetNote, setScrollTargetNote] = useState<Note>();
  
  // Get state from Redux
  const { notes, selectedNote } = useAppSelector(state => state.notes);

  // Find the current note
  const currentNote = notes.find(note => note.id === id);
  
  // Navigation configuration
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  // When searching in NotePage sidebar, if a unique match is found within the sidebar set,
  // ensure it is expanded (and its ancestors), scroll to it, and select it
  useEffect(() => {
    if (!searchQuery.trim()) {
      setScrollTargetNote(undefined);
      return;
    }
    
    // Get sidebar notes for filtering
    const getNotesForSidebar = (): Note[] => {
      if (!selectedNote || !currentNote) return [];
      
      const notesToShow: Note[] = [];
      
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
    const sidebarIds = new Set(sidebarNotes.map(n => n.id));
    const matches = notes.filter(n => sidebarIds.has(n.id) && (
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    ));
    
    if (matches.length > 1) {
      setScrollTargetNote(matches[0]);
      return;
    } else if (matches.length === 0) {
      setScrollTargetNote(undefined);
      return;
    }
    
    const match = matches[0];

    // Expand ancestors up to root
    const expandAncestors = (note: Note | undefined) => {
      if (!note) return;
      if (note.parentId) {
        const parent = notes.find(n => n.id === note.parentId);
        if (parent) {
          dispatch(expandNote(parent.id));
          expandAncestors(parent);
        }
      }
    };
    expandAncestors(match);
    dispatch(expandNote(match.id));
    dispatch(selectNote(match));
    setScrollTargetNote({...match});
  }, [searchQuery, notes, selectedNote, currentNote, dispatch]);

  // Auto-select current note if none selected
  useEffect(() => {
    if (currentNote && !selectedNote) {
      dispatch(selectNote(currentNote));
    }
  }, [currentNote, selectedNote, dispatch]);

  const handleNoteSelect = (note: Note) => {
    dispatch(selectNote(note));
  };

  const handleNoteClick = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  const handleDeleteNote = (noteId: string) => {
    dispatch(deleteNote(noteId));
    if (noteId === currentNote?.id) {
      navigate('/');
    }
  };

  const handleNoteCreate = (parentId?: string) => {
    if (parentId) {
      const parentNote = notes.find(n => n.id === parentId);
      if (parentNote) {
        dispatch(addChildNote(parentNote));
      }
    } else {
      const newNote = {
        title: 'New Note',
        content: '',
        tags: [],
        parentId: undefined,
        children: [],
        level: 0
      };
      dispatch(createNote(newNote));
    }
  };

  const handleNoteEdit = (noteId: string, updates: Partial<Note>) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      dispatch(editNote({ ...note, ...updates }));
    }
  };

  const handleToggleExpand = (noteId: string) => {
    dispatch(toggleNoteExpanded(noteId));
  };

  const handleEnsureExpanded = (noteId: string) => {
    dispatch(expandNote(noteId));
  };

  const handleSetScrollTargetNote = (note: Note | undefined) => {
    setScrollTargetNote(note);
  };

  return (
    <NotePage
      currentNoteId={id}
      notes={notes}
      selectedNote={selectedNote}
      currentNote={currentNote ?? undefined}
      viewMode={viewMode}
      searchQuery={searchQuery}
      scrollTargetNote={scrollTargetNote}
      onNoteSelect={handleNoteSelect}
      onNoteClick={handleNoteClick}
      onNoteDelete={handleDeleteNote}
      onNoteCreate={handleNoteCreate}
      onNoteEdit={handleNoteEdit}
      onViewModeChange={setViewMode}
      onSearchChange={setSearchQuery}
      onBack={() => navigate('/')}
      onToggleExpand={handleToggleExpand}
      onEnsureExpanded={handleEnsureExpanded}
      onSetScrollTargetNote={handleSetScrollTargetNote}
      user={templateUser}
      navigationItems={navigationItems}
      onLogoClick={() => navigate('/home')}
    />
  );
};

NotePageContainer.displayName = 'NotePageContainer';

export default NotePageContainer;
export { NotePageContainer };
