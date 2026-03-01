import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { Save, Tag, Plus, X } from 'lucide-react';
import AIGenerator from './AIGenerator';

interface NoteFormProps {
  note?: Note;
  onSave: (note: Partial<Note>) => void;
  onCancel: () => void;
  isCreating?: boolean;
  isLoading?: boolean;
}

const NoteForm: React.FC<NoteFormProps> = ({
  note,
  onSave,
  onCancel,
  isCreating = true,
  isLoading = false
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Initialize form with note data if editing
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags([...note.tags]);
    }
  }, [note]);

  // Handle AI-generated content filling the form
  const handleAIFillForm = (data: { title: string; content: string; tags: string[] }) => {
    setTitle(data.title);
    setContent(data.content);
    setTags(data.tags);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a title for the note');
      return;
    }

    const noteData: Partial<Note> = {
      title: title.trim(),
      content: content.trim(),
      tags: tags,
      updatedAt: new Date()
    };

    if (isCreating) {
      noteData.createdAt = new Date();
      noteData.level = 0;
      noteData.isExpanded = true;
    }

    onSave(noteData);
  };

  return (
    <div className="space-y-6">
      {/* AI Generator Section */}
      {/* <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <AIGenerator onFillForm={handleAIFillForm} />
      </div> */}

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="note-title" className="block text-sm font-medium text-gray-700">
            Title:
          </label>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
            placeholder="Enter note title..."
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="note-content" className="block text-sm font-medium text-gray-700">
            Content:
          </label>
          <textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onScroll={e => e.stopPropagation()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-vertical min-h-[200px]"
            rows={8}
            placeholder="Enter note content..."
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="note-tags" className="block text-sm font-medium text-gray-700">
            Tags:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a tag..."
            />
            <button
              type="button"
              className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 flex items-center justify-center"
              onClick={handleAddTag}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                #{tag}
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-800 transition-colors duration-200 p-0.5 rounded-full hover:bg-indigo-200"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {isCreating ? 'Creating...' : 'Saving...'}
              </div>
            ) : (
              isCreating ? 'Create Note' : 'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NoteForm;
