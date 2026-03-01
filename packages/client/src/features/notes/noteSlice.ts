import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Note } from './types';
import { generateUUID } from '../../utils';

interface NoteState {
  notes: Note[];
  selectedNote: Note | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: NoteState = {
  notes: [
    {
      id: '1',
      title: 'Welcome to KFlow',
      content: 'This is your first note. Start building your knowledge base!',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['welcome', 'getting-started'],
      parentId: undefined,
      children: [],
      level: 0,
      isExpanded: false
    },
    {
      id: '2',
      title: 'Getting Started Guide',
      content: 'Learn how to use KFlow effectively. Create notes, organize them hierarchically, and use AI to generate content.',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['guide', 'tutorial'],
      parentId: undefined,
      children: ['2'],
      level: 0,
      isExpanded: false
    },
    {
      id: '3',
      title: 'Note Organization Tips',
      content: 'Use parent-child relationships to organize your notes. Create a logical hierarchy that makes sense for your workflow.',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['organization', 'tips'],
      parentId: '2',
      children: [],
      level: 1,
      isExpanded: false
    }
  ],
  selectedNote: null,
  searchQuery: '',
  isLoading: false,
  error: null
};

const noteSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    // Create a new note
    createNote: (state, action: PayloadAction<Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'isExpanded'>>) => {
      const newNote: Note = {
        ...action.payload,
        id: generateUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isExpanded: false
      };
      state.notes.push(newNote);
      
      // Update parent note's children array if this is a child note
      if (newNote.parentId) {
        const parentNote = state.notes.find(n => n.id === newNote.parentId);
        if (parentNote) {
          parentNote.children = parentNote.children || [];
          parentNote.children.push(newNote.id);
        }
      }
    },

    // Toggle isExpanded on a note; expanding updates updatedAt
    toggleNoteExpanded: (state, action: PayloadAction<string>) => {
      const note = state.notes.find(n => n.id === action.payload);
      if (note) {
        note.isExpanded = !note.isExpanded;
        if (note.isExpanded) {
          note.updatedAt = new Date();
        }
      }
    },

    // Ensure expanded and save
    expandNote: (state, action: PayloadAction<string>) => {
      const note = state.notes.find(n => n.id === action.payload);
      if (note && !note.isExpanded) {
        note.isExpanded = true;
        note.updatedAt = new Date();
      }
    },

    // Collapse a note
    collapseNote: (state, action: PayloadAction<string>) => {
      const note = state.notes.find(n => n.id === action.payload);
      if (note) {
        note.isExpanded = false;
      }
    },

    // Select a note
    selectNote: (state, action: PayloadAction<Note | null>) => {
      state.selectedNote = action.payload;
    },

    // Edit/Update a note
    editNote: (state, action: PayloadAction<Note>) => {
      const index = state.notes.findIndex(note => note.id === action.payload.id);
      if (index !== -1) {
        state.notes[index] = {
          ...action.payload,
          updatedAt: new Date()
        };
        
        // Update selectedNote if it's the same note
        if (state.selectedNote?.id === action.payload.id) {
          state.selectedNote = state.notes[index];
        }
      }
    },

    // Delete a note
    deleteNote: (state, action: PayloadAction<string>) => {
      const noteId = action.payload;
      const noteToDelete = state.notes.find(n => n.id === noteId);
      
      if (noteToDelete) {
        // Remove from parent's children array
        if (noteToDelete.parentId) {
          const parentNote = state.notes.find(n => n.id === noteToDelete.parentId);
          if (parentNote && parentNote.children) {
            parentNote.children = parentNote.children.filter(id => id !== noteId);
          }
        }
        
        // Remove the note itself
        state.notes = state.notes.filter(note => note.id !== noteId);
        
        // Clear selection if deleted note was selected
        if (state.selectedNote?.id === noteId) {
          state.selectedNote = null;
        }
      }
    },

    // Add a child note
    addChildNote: (state, action: PayloadAction<Note>) => {
      const parentNote = state.notes.find(n => n.id === action.payload.id);
      if (parentNote) {
        const newChildNote: Note = {
          id: generateUUID(),
          title: 'New Child Note',
          content: 'Add your content here...',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          parentId: parentNote.id,
          children: [],
          level: parentNote.level + 1,
          isExpanded: false
        };
        
        state.notes.push(newChildNote);
        parentNote.children = parentNote.children || [];
        parentNote.isExpanded = true;
        parentNote.children.push(newChildNote.id);
      }
    },

    // AI Generate Children - Create multiple children and update parent atomically
    aiGenerateChildren: (state, action: PayloadAction<{ parentId: string; children: Array<{ title: string; content: string; tags: string[] }> }>) => {
      const { parentId, children } = action.payload;
      const parentNote = state.notes.find(n => n.id === parentId);
      
      if (parentNote) {
        // Create all child notes
        children.forEach(childData => {
          const newChildNote: Note = {
            id: generateUUID(),
            title: childData.title,
            content: childData.content,
            tags: childData.tags,
            parentId: parentId,
            children: [],
            level: parentNote.level + 1,
            isExpanded: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          state.notes.push(newChildNote);
        });

        // Update parent note's children array with all new child IDs
        const newChildIds = state.notes
          .filter(n => n.parentId === parentId)
          .map(n => n.id);
        
        parentNote.children = newChildIds;
        parentNote.isExpanded = true; // Auto-expand to show new children
        parentNote.updatedAt = new Date();
      }
    },

    // Set search query
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    // Clear search
    clearSearch: (state) => {
      state.searchQuery = '';
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const {
  createNote,
  selectNote,
  editNote,
  deleteNote,
  addChildNote,
  aiGenerateChildren,
  toggleNoteExpanded,
  expandNote,
  collapseNote,
  setSearchQuery,
  clearSearch,
  setLoading,
  setError
} = noteSlice.actions;

export default noteSlice.reducer;
