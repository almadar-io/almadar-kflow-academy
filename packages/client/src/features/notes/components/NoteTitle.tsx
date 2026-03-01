import React from 'react';
import { Note } from '../types';

interface NoteTitleProps {
  note: Note;
  isEditing: boolean;
  editValues: { title: string };
  onTitleChange: (value: string) => void;
  onStartEditing: (note: Note, field: 'title' | 'content' | 'tags') => void;
  onCancelEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent, note: Note) => void;
  titleInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  className?: string;
  placeholder?: string;
  showExpandButton?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (noteId: string) => void;
}

const NoteTitle: React.FC<NoteTitleProps> = ({
  note,
  isEditing,
  editValues,
  onTitleChange,
  onStartEditing,
  onCancelEdit,
  onKeyDown,
  titleInputRefs,
  className = '',
  placeholder = 'Tab → content',
  showExpandButton = false,
  isExpanded = false,
  onToggleExpand
}) => {
  const isNewChildNote = note.title === 'New Child Note' && note.content === 'Add your content here...';

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    onTitleChange(newTitle);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown(e, note);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEditing(note, 'title');
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand(note.id);
    }
  };

  if (isEditing) {
    return (
      <div className={`flex-1 ${className}`} onClick={(e) => e.stopPropagation()}>
        <input
          ref={(el) => { titleInputRefs.current[note.id] = el; }}
          type="text"
          className={`w-full px-3 py-2 border-2 border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${
            isNewChildNote 
              ? 'bg-orange-50 border-orange-500' 
              : 'bg-white'
          }`}
          value={editValues.title}
          onChange={handleTitleChange}
          onBlur={onCancelEdit}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          placeholder={isNewChildNote ? "Enter note title... (Tab → content)" : placeholder}
          onKeyDown={handleTitleKeyDown}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showExpandButton && (
        <button
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
          onClick={handleToggleExpand}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      )}
      
      <h4 
        className="flex-1 text-lg font-semibold text-gray-900 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded cursor-pointer transition-all duration-200"
        onClick={handleClick}
        title="Click to edit title"
      >
        {note.title}
      </h4>
    </div>
  );
};

export default NoteTitle;
