/**
 * NotesWidget Organism Component
 * 
 * Widget for managing notes on concepts with text selection support.
 * Uses Modal, Button, Typography atoms/molecules.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StickyNote, X, Plus, Check, Trash2, Edit2 } from 'lucide-react';
import { NoteItem } from '../../../features/concepts/types';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import ConfirmationDialog from '../../ConfirmationDialog';

export interface NotesWidgetProps {
  /**
   * Notes array (managed by container)
   */
  notes?: NoteItem[];
  
  /**
   * Callback to add a new note
   */
  onAddNote?: (text: string, selectedText?: string, selectedTextChunks?: string[]) => void;
  
  /**
   * Callback to update a note
   */
  onUpdateNote?: (id: string, updates: Partial<NoteItem>) => void;
  
  /**
   * Callback to delete a note
   */
  onDeleteNote?: (id: string) => void;
  
  /**
   * Selected text from lesson (for context)
   */
  selectedText?: string;
  
  /**
   * Selected text chunks (for highlighting)
   */
  selectedTextChunks?: string[];
  
  /**
   * Whether widget is open (controlled)
   */
  isOpen?: boolean;
  
  /**
   * Callback to close widget
   */
  onClose?: () => void;
  
  /**
   * Callback to open widget
   */
  onOpen?: () => void;
  
  /**
   * Whether to show floating button
   * @default true
   */
  showFloatingButton?: boolean;
}

export const NotesWidget: React.FC<NotesWidgetProps> = ({
  notes = [],
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  selectedText,
  selectedTextChunks,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpen: controlledOnOpen,
  showFloatingButton = true,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [preservedSelectedText, setPreservedSelectedText] = useState<string>('');
  const [preservedChunks, setPreservedChunks] = useState<string[] | undefined>(undefined);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Handle opening
  const handleOpen = useCallback(() => {
    if (controlledOnOpen) {
      controlledOnOpen();
    } else {
      setInternalIsOpen(true);
    }
  }, [controlledOnOpen]);

  // Handle closing
  const handleClose = useCallback(() => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setNewNoteText('');
    setEditingNoteId(null);
    setEditingText('');
  }, [controlledOnClose]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingNoteId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingNoteId]);

  const handleAddNote = useCallback(() => {
    if (newNoteText.trim() && onAddNote) {
      onAddNote(
        newNoteText,
        preservedSelectedText,
        preservedChunks
      );
      setNewNoteText('');
      inputRef.current?.focus();
    }
  }, [newNoteText, preservedSelectedText, preservedChunks, onAddNote]);

  const handleStartEdit = useCallback((id: string, currentText: string) => {
    setEditingNoteId(id);
    setEditingText(currentText);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingNoteId && editingText.trim() && onUpdateNote) {
      onUpdateNote(editingNoteId, { text: editingText.trim() });
      setEditingNoteId(null);
      setEditingText('');
    }
  }, [editingNoteId, editingText, onUpdateNote]);

  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null);
    setEditingText('');
  }, []);

  const handleDeleteNote = useCallback(
    (id: string) => {
      setNoteToDelete(id);
    },
    []
  );

  const handleConfirmDelete = useCallback(() => {
    if (noteToDelete && onDeleteNote) {
      onDeleteNote(noteToDelete);
      setNoteToDelete(null);
    }
  }, [noteToDelete, onDeleteNote]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (editingNoteId) {
        handleSaveEdit();
      } else {
        handleAddNote();
      }
    } else if (e.key === 'Escape') {
      if (editingNoteId) {
        handleCancelEdit();
      } else {
        handleClose();
      }
    }
  };

  // Preserve selectedText internally when provided
  useEffect(() => {
    if (selectedText && selectedText.trim().length > 0) {
      setPreservedSelectedText(selectedText);
    }
  }, [selectedText]);

  // Preserve selectedTextChunks internally when provided
  useEffect(() => {
    if (selectedTextChunks && selectedTextChunks.length > 0) {
      setPreservedChunks(selectedTextChunks);
    }
  }, [selectedTextChunks]);

  // Clear preserved selectedText and chunks only on unmount
  useEffect(() => {
    return () => {
      setPreservedSelectedText('');
      setPreservedChunks(undefined);
    };
  }, []);

  const modalFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" onClick={handleClose}>
        Close
      </Button>
    </div>
  );

  return (
    <>
      {/* Floating Notes Button */}
      {showFloatingButton && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-32 z-50 p-4 bg-green-600 dark:bg-green-500 text-white rounded-full shadow-lg hover:bg-green-700 dark:hover:bg-green-600 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label="Add or edit notes"
          title="Add or edit notes for this lesson"
        >
          <StickyNote size={24} />
        </button>
      )}

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Notes (${notes.length})`}
        footer={modalFooter}
        size="lg"
        closeOnOverlayClick={true}
        closeOnEscape={true}
      >
        <div className="space-y-4">
          {/* Modal Header Icon */}
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={20} />
            <Typography variant="h6">Notes ({notes.length})</Typography>
          </div>

          {/* Selected Text Display */}
          {preservedSelectedText && preservedSelectedText.trim() && (
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 p-3 rounded-r-md">
              <Typography variant="small" className="text-green-700 dark:text-green-300 mb-1 font-medium">
                Selected text:
              </Typography>
              <Typography variant="body" className="text-gray-700 dark:text-gray-300 italic break-words">
                "{preservedSelectedText}"
              </Typography>
            </div>
          )}

          {/* Add New Note */}
          <div className="flex flex-col gap-2">
            <textarea
              ref={inputRef}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a new note... (Ctrl+Enter to save)"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y min-h-[80px]"
              disabled={!!editingNoteId}
            />
            <Button
              variant="success"
              onClick={handleAddNote}
              disabled={!newNoteText.trim() || !!editingNoteId}
              icon={Plus}
              className="self-end"
            >
              Add
            </Button>
          </div>

          {/* Notes List */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <Typography variant="h6" className="text-sm font-semibold">
                Notes ({notes.length})
              </Typography>
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {editingNoteId === note.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        ref={editInputRef}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={3}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 resize-y min-h-[60px]"
                        placeholder="Edit note... (Ctrl+Enter to save)"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={handleSaveEdit}
                          icon={Check}
                        >
                          Save
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCancelEdit}
                          icon={X}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <Typography variant="body" className="flex-1">
                          {note.text}
                        </Typography>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStartEdit(note.id, note.text)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label="Edit note"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            aria-label="Delete note"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {note.selectedText && (
                        <Typography variant="small" className="mt-2 text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          Context: "{note.selectedText}"
                        </Typography>
                      )}
                      {note.timestamp && (
                        <Typography variant="small" className="mt-1 text-gray-400 dark:text-gray-500">
                          {new Date(note.timestamp).toLocaleString()}
                        </Typography>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {notes.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <StickyNote size={48} className="mx-auto mb-2 opacity-50" />
              <Typography variant="body">No notes yet. Add your first note above!</Typography>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
      />
    </>
  );
};

NotesWidget.displayName = 'NotesWidget';

