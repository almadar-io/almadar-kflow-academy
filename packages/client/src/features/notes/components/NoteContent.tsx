import React from 'react';
import { Note } from '../types';

interface NoteContentProps {
  note: Note;
  isEditing: boolean;
  editValues: { content: string };
  onContentChange: (value: string) => void;
  onStartEditing: (note: Note, field: 'title' | 'content' | 'tags') => void;
  onCancelEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent, note: Note) => void;
  contentTextareaRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  showFullContent?: boolean;
  className?: string;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
}

const NoteContent: React.FC<NoteContentProps> = ({
  note,
  isEditing,
  editValues,
  onContentChange,
  onStartEditing,
  onCancelEdit,
  onKeyDown,
  contentTextareaRefs,
  showFullContent = false,
  className = '',
  placeholder = 'Tab → tags, Shift+Tab → title',
  rows = 4,
  minHeight = '100px'
}) => {
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    onContentChange(newContent);
  };

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown(e, note);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEditing(note, 'content');
  };

  if (isEditing) {
    return (
      <div className={`flex-1 ${className}`} onClick={(e) => e.stopPropagation()}>
        <textarea
          className="w-full px-3 py-2 border-2 border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
          style={{ minHeight }}
          value={editValues.content}
          onChange={handleContentChange}
          rows={rows}
          onBlur={onCancelEdit}
          autoFocus
          ref={(el) => { 
            contentTextareaRefs.current[note.id] = el; 
          }}
          onKeyDown={handleContentKeyDown}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <p 
      className={`text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded cursor-pointer transition-all duration-200 ${className}`}
      style={{ minHeight: '24px' }}
      onClick={handleClick}
      title="Click to edit content"
    >
      {!showFullContent 
        ? `${note.content.substring(0, 100)}...` 
        : note.content || 'No content'
      }
    </p>
  );
};

export default NoteContent;
