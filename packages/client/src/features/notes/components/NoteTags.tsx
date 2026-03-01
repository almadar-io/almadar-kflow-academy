import React, { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Note } from '../types';

interface NoteTagsProps {
  note: Note;
  isEditing: boolean;
  editValues: { tags: string[] };
  newTag: string;
  onAddTag: (note: Note) => void;
  onRemoveTag: (note: Note, tagToRemove: string) => void;
  onKeyPress: (e: React.KeyboardEvent, note: Note) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent, note: Note) => void;
  onNewTagChange: (value: string) => void;
  onStartEditing: (note: Note, field: 'title' | 'content' | 'tags') => void;
  onCancelEdit: () => void;
  maxDisplayTags?: number;
  className?: string;
}

const NoteTags: React.FC<NoteTagsProps> = ({
  note,
  isEditing,
  editValues,
  newTag,
  onAddTag,
  onRemoveTag,
  onKeyPress,
  onTagInputKeyDown,
  onNewTagChange,
  onStartEditing,
  onCancelEdit,
  maxDisplayTags = 3,
  className = ''
}) => {
  const tagsContainerRef = useRef<HTMLDivElement>(null);

  const handleBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (!next || (tagsContainerRef.current && !tagsContainerRef.current.contains(next))) {
      onCancelEdit();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEditing(note, 'tags');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNewTagChange(e.target.value);
  };

  const handleAddTag = () => {
    onAddTag(note);
  };

  const handleRemoveTag = (tag: string) => {
    onRemoveTag(note, tag);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    onKeyPress(e, note);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    onTagInputKeyDown(e, note);
  };

  if (isEditing) {
    return (
      <div
        className={`flex-1 ${className}`}
        ref={tagsContainerRef}
        onClick={(e) => e.stopPropagation()}
        onBlur={handleBlur}
      >
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            value={newTag}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onKeyDown={handleTagInputKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder="Add a tag..."
          />
          <button
            className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleAddTag}
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {editValues.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              #{tag}
              <button
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-0.5 transition-colors duration-200"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleRemoveTag(tag)}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors duration-200 ${className}`}
      onClick={handleClick}
      title="Click to edit tags"
    >
      {note.tags.length > 0 ? (
        <>
          {note.tags.slice(0, maxDisplayTags).map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              #{tag}
            </span>
          ))}
          {note.tags.length > maxDisplayTags && (
            <span className="text-xs text-gray-500">
              +{note.tags.length - maxDisplayTags}
            </span>
          )}
        </>
      ) : (
        <span className="text-xs text-gray-400 italic">
          Click to add tags
        </span>
      )}
    </div>
  );
};

export default NoteTags;
