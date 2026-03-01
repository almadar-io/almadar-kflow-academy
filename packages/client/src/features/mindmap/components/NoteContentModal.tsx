import React from 'react';
import Modal from '../../../components/Modal';
import NoteForm from '../../notes/components/NoteForm';
import { NoteContentModalProps } from '../types/mindMapTypes';

const NoteContentModal: React.FC<NoteContentModalProps> = ({
  isOpen,
  note,
  onClose,
  onSave
}) => {
  if (!note) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Note Content"
      size="extra-large"
    >
      <NoteForm
        note={note}
        onSave={(noteData) => {
          const updatedNote = {
            ...note,
            title: noteData.title || note.title,
            content: noteData.content || note.content,
            tags: noteData.tags || note.tags,
            updatedAt: new Date()
          };
          onSave(updatedNote);
          onClose(); // Close the modal after saving
        }}
        onCancel={onClose}
        isCreating={false}
      />
    </Modal>
  );
};

export default NoteContentModal;
