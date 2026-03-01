import { useCallback, useState } from 'react';
import { Note } from '../../notes/types';
import { EditingState } from '../types/mindMapTypes';

interface UseMindMapEditingProps {
  notes: Note[];
  onEditNote: (note: Note) => void;
  onSetScrollTargetNote: (note: Note | undefined) => void;
}

interface UseMindMapEditingReturn {
  editingState: EditingState | null;
  editValues: { title: string; content: string };
  showContentModal: boolean;
  editingNote: Note | null;
  startEditing: (note: Note, field: 'title' | 'content') => void;
  cancelEdit: () => void;
  saveEdit: (note: Note) => void;
  openContentEditor: (note: Note) => void;
  closeContentEditor: () => void;
  onEditValuesChange: (values: { title: string; content: string }) => void;
}

export const useMindMapEditing = ({ 
  notes, 
  onEditNote, 
  onSetScrollTargetNote 
}: UseMindMapEditingProps): UseMindMapEditingReturn => {
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [editValues, setEditValues] = useState<{ title: string; content: string }>({
    title: '',
    content: ''
  });
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const startEditing = useCallback((note: Note, field: 'title' | 'content') => {
    setEditingState({ noteId: note.id, field });
    setEditValues({
      title: note.title,
      content: note.content
    });
    onSetScrollTargetNote(note);

    if (field === 'content') {
      setEditingNote(note);
      setShowContentModal(true);
    }
  }, [onSetScrollTargetNote]);

  const cancelEdit = useCallback(() => {
    setEditingState(null);
    setEditValues({ title: '', content: '' });
  }, []);

  const saveEdit = useCallback((note: Note) => {
    const updatedNote = {
      ...note,
      title: editValues.title,
      content: editValues.content,
      updatedAt: new Date()
    };
    onEditNote(updatedNote);
    cancelEdit();
    onSetScrollTargetNote(undefined);
  }, [editValues.title, editValues.content, onEditNote, cancelEdit, onSetScrollTargetNote]);

  const openContentEditor = useCallback((note: Note) => {
    setEditingNote(note);
    setEditValues({
      title: note.title,
      content: note.content
    });
    setShowContentModal(true);
  }, []);

  const closeContentEditor = useCallback(() => {
    setShowContentModal(false);
    setEditingNote(null);
    setEditValues({ title: '', content: '' });
  }, []);

  const onEditValuesChange = useCallback((values: { title: string; content: string }) => {
    setEditValues(values);
  }, []);

  return {
    editingState,
    editValues,
    showContentModal,
    editingNote,
    startEditing,
    cancelEdit,
    saveEdit,
    openContentEditor,
    closeContentEditor,
    onEditValuesChange
  };
};
