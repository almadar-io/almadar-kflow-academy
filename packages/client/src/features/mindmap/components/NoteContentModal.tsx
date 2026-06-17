import React from 'react';
import { Modal } from '../../../components/molecules/Modal';
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
      size="xl"
    >
      <div>
        <input
          defaultValue={note.title}
          onChange={(e) => onSave({ ...note, title: e.target.value, updatedAt: new Date() })}
        />
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

export default NoteContentModal;
