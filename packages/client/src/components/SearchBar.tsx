import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../features/notes/types';
import { Search, X, ChevronDown } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notes: Note[];
  onSelectSuggestion?: (note: Note) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  searchQuery, 
  onSearchChange, 
  notes,
  onSelectSuggestion 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<Note[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Generate suggestions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filteredNotes = notes.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );

    // Limit suggestions to 8 items for better UX
    const limitedSuggestions = filteredNotes.slice(0, 8);
    setSuggestions(limitedSuggestions);
    setShowSuggestions(limitedSuggestions.length > 0);
    setSelectedIndex(-1);
  }, [searchQuery, notes]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (note: Note) => {
    if (onSelectSuggestion) {
      onSelectSuggestion(note);
    }
    onSearchChange(''); // Clear search input
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Highlight matching text in suggestions
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded font-semibold">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="relative mb-6">
      <div className="relative flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all duration-200">
        <Search size={18} className="text-gray-400 mr-3 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 border-none outline-none text-gray-900 placeholder-gray-500 text-sm"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
        />
        {searchQuery && (
          <button
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors duration-200"
            onClick={() => onSearchChange('')}
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
        {showSuggestions && (
          <ChevronDown size={16} className="ml-2 text-gray-400 transition-transform duration-200" />
        )}
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && (
        <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {suggestions.map((note, index) => (
            <div
              key={note.id}
              className={`p-4 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                index === selectedIndex 
                  ? 'bg-indigo-50 border-l-4 border-l-indigo-500' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelectSuggestion(note)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium text-gray-900 mb-1">
                {highlightText(note.title, searchQuery)}
              </div>
              {note.content && (
                <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {highlightText(note.content.substring(0, 100), searchQuery)}
                  {note.content.length > 100 && '...'}
                </div>
              )}
              {note.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {note.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
