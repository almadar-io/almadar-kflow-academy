import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Note } from '../types';
import { Plus, Edit3, Trash2, Save, X, Tag } from 'lucide-react';
import NoteListItem from './NoteListItem';
import NoteListCard from './NoteListCard';

interface NoteListProps {
	notes: Note[];
	selectedNote: Note | null;
	onSelectNote: (note: Note) => void;
	onDeleteNote: (noteId: string) => void;
	onEditNote: (note: Note) => void;
	onAddChildNote: (parentNote: Note) => void;
	onCreateNote: () => void;
	onNavigateToNote: (note: Note) => void;
	showCreateButton?: boolean;
	showFullContent?: boolean;
	autoExpandParent?: boolean;
	currentNoteId?: string;
	onToggleExpand: (noteId: string) => void;
	onEnsureExpanded?: (noteId: string) => void;
	scrollTargetNote?: Note;
	displayMode?: 'list' | 'card';
}

interface EditingState {
	noteId: string;
	field: 'title' | 'content' | 'tags';
}

const NoteList: React.FC<NoteListProps> = ({
	notes,
	selectedNote,
	onSelectNote,
	onDeleteNote,
	onEditNote,
	onAddChildNote,
	onCreateNote,
	onNavigateToNote,
	showCreateButton = true,
	showFullContent = true,
	autoExpandParent = false,
	currentNoteId,
	onToggleExpand,
	onEnsureExpanded,
	scrollTargetNote,
	displayMode = 'list'
}) => {
	const [editingState, setEditingState] = useState<EditingState | null>(null);
	const [editValues, setEditValues] = useState<{ title: string; content: string; tags: string[] }>({
		title: '',
		content: '',
		tags: []
	});
	const [newTag, setNewTag] = useState('');
	const [autoEditNoteId, setAutoEditNoteId] = useState<string | null>(null);
	const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const titleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
	const contentTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
	const tagsContainerRef = useRef<HTMLDivElement | null>(null);
	const queueAutoSave = useCallback((note: Note, partial: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => {
		const updatedNote: Note = {
			...note,
			title: partial.title !== undefined ? partial.title : editValues.title,
			content: partial.content !== undefined ? partial.content : editValues.content,
			tags: partial.tags !== undefined ? partial.tags : editValues.tags,
			updatedAt: new Date()
		};
		onEditNote(updatedNote);
	}, [editValues.title, editValues.content, editValues.tags, onEditNote]);

	// Auto-expand parent note when child is selected
	useEffect(() => {
		if (autoExpandParent && currentNoteId && selectedNote) {
			const currentNote = notes.find(note => note.id === currentNoteId);
			if (currentNote && currentNote.parentId) {
				onEnsureExpanded && onEnsureExpanded(currentNote.parentId);
			}
		}
	}, [autoExpandParent, currentNoteId, selectedNote, notes, onEnsureExpanded]);

	// Scroll to target note id when requested
	useEffect(() => {
		if (!scrollTargetNote) return;
		const el = noteRefs.current[scrollTargetNote.id];
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}, [scrollTargetNote]);

	// Auto-edit newly created child notes
	useEffect(() => {
		if (autoEditNoteId) {
			const parentNote = notes.find(note => note.id === autoEditNoteId);
			if (parentNote && parentNote.children && parentNote.children.length > 0) {
				// Find the most recently created child note (last in children array)
				const lastChildId = parentNote.children[parentNote.children.length - 1];
				const childNote = notes.find(note => note.id === lastChildId);
				if (childNote && childNote.title === 'New Child Note') {
					// Auto-start editing the title of this new child note
					setTimeout(() => {
						startEditing(childNote, 'title');
						setAutoEditNoteId(null); // Reset after starting edit
					}, 150); // Small delay to ensure the note is rendered and ref is set
				}
			}
		}
	}, [notes, autoEditNoteId]);

	const createNewNote = () => {
		onCreateNote();
	};

	const createChildNote = (parentNote: Note) => {
		// Ensure parent is expanded and saved
		onEnsureExpanded && onEnsureExpanded(parentNote.id);
		onAddChildNote(parentNote);
		setAutoEditNoteId(parentNote.id);
	};

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString();
	};

	const toggleExpanded = (noteId: string) => {
		onToggleExpand(noteId);
	};

	const getChildNotes = (noteId: string): Note[] => {
		return notesWithChildren.filter(note => note.parentId === noteId);
	};

	// Update children arrays for all notes
	const updateChildrenArrays = (notes: Note[]): Note[] => {
		return notes.map(note => ({
			...note,
			children: notes.filter(n => n.parentId === note.id).map(n => n.id)
		}));
	};

	// Get notes with updated children arrays
	const notesWithChildren = updateChildrenArrays(notes);

	const getRootNotes = (): Note[] => {
		return notesWithChildren.filter(note => !note.parentId);
	};

	const renderNoteItem = (note: Note) => {
		if (displayMode === 'card') {
			return (
				<NoteListCard
					key={note.id}
					note={note}
					selectedNote={selectedNote}
					editingState={editingState}
					editValues={editValues}
					newTag={newTag}
					noteRefs={noteRefs}
					titleInputRefs={titleInputRefs}
					contentTextareaRefs={contentTextareaRefs}
					tagsContainerRef={tagsContainerRef}
					showFullContent={showFullContent}
					onSelectNote={onSelectNote}
					onDeleteNote={onDeleteNote}
					onEditNote={onEditNote}
					onAddChildNote={onAddChildNote}
					onNavigateToNote={onNavigateToNote}
					onToggleExpand={onToggleExpand}
					startEditing={startEditing}
					cancelEdit={cancelEdit}
					queueAutoSave={queueAutoSave}
					handleAddTag={handleAddTag}
					handleRemoveTag={handleRemoveTag}
					handleKeyPress={handleKeyPress}
					handleContentKeyDown={handleContentKeyDown}
					handleTagInputKeyDown={handleTagInputKeyDown}
					createChildNote={createChildNote}
					handleNoteDelete={handleNoteDelete}
					formatDate={formatDate}
					getChildNotes={getChildNotes}
					renderNoteItem={renderNoteItem}
					setEditValues={setEditValues}
					setNewTag={setNewTag}
				/>
			);
		}

		return (
			<NoteListItem
				key={note.id}
				note={note}
				selectedNote={selectedNote}
				editingState={editingState}
				editValues={editValues}
				newTag={newTag}
				noteRefs={noteRefs}
				titleInputRefs={titleInputRefs}
				contentTextareaRefs={contentTextareaRefs}
				tagsContainerRef={tagsContainerRef}
				showFullContent={showFullContent}
				onSelectNote={onSelectNote}
				onDeleteNote={onDeleteNote}
				onEditNote={onEditNote}
				onAddChildNote={onAddChildNote}
				onNavigateToNote={onNavigateToNote}
				onToggleExpand={onToggleExpand}
				startEditing={startEditing}
				cancelEdit={cancelEdit}
				queueAutoSave={queueAutoSave}
				handleAddTag={handleAddTag}
				handleRemoveTag={handleRemoveTag}
				handleKeyPress={handleKeyPress}
				handleTitleKeyDown={handleTitleKeyDown}
				handleContentKeyDown={handleContentKeyDown}
				handleTagInputKeyDown={handleTagInputKeyDown}
				createChildNote={createChildNote}
				handleNoteDelete={handleNoteDelete}
				formatDate={formatDate}
				getChildNotes={getChildNotes}
				renderNoteItem={renderNoteItem}
				setEditValues={setEditValues}
				setNewTag={setNewTag}
			/>
		);
	};

	const handleNoteDelete = (noteId: string) => {
		onDeleteNote(noteId);
	};

	// Inline editing functions
	const startEditing = (note: Note, field: 'title' | 'content' | 'tags') => {
		setEditingState({ noteId: note.id, field });
		setEditValues({
			title: note.title,
			content: note.content,
			tags: [...note.tags]
		});

		// Auto-focus title input for newly created child notes
		if (field === 'title' && note.title === 'New Child Note') {
			setTimeout(() => {
				if (titleInputRefs.current[note.id]) {
					titleInputRefs.current[note.id]?.focus();
					titleInputRefs.current[note.id]?.select(); // Select all text for easy replacement
				}
			}, 50);
		}
		else if(field === 'content' && note.content === 'Add your content here...'){
			setTimeout(() => {
				if(contentTextareaRefs.current[note.id]){
					contentTextareaRefs.current[note.id]?.focus();
					contentTextareaRefs.current[note.id]?.select(); // Select all text for easy replacement
				}
			},50);
		}
	};

	const cancelEdit = () => {
		setEditingState(null);
	};

	const handleAddTag = (note: Note) => {
		if (newTag.trim() && !editValues.tags.includes(newTag.trim())) {
			const updatedTags = [...editValues.tags, newTag.trim()];
			setEditValues({ ...editValues, tags: updatedTags });
			setNewTag('');
			// Do not autosave here; only autosave on typing per requirement
		}
	};

	const handleRemoveTag = (note: Note, tagToRemove: string) => {
		const updatedTags = editValues.tags.filter(tag => tag !== tagToRemove);
		setEditValues({ ...editValues, tags: updatedTags });
		// Do not autosave here; only autosave on typing per requirement
	};

	const handleKeyPress = (e: React.KeyboardEvent, note: Note) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAddTag(note);
		}
	};

	const handleTitleKeyDown = (e: React.KeyboardEvent, note: Note) => {
		if (e.key === 'Tab') {
			e.preventDefault();
			if (e.shiftKey) {
				// Shift+Tab: close edit mode (no previous field)
				cancelEdit();
			} else {
				// Tab: start editing content field
				startEditing(note, 'content');
			}
		}
	};

	const handleContentKeyDown = (e: React.KeyboardEvent, note: Note) => {
		if (e.key === 'Tab') {
			e.preventDefault();
			if (e.shiftKey) {
				// Shift+Tab: go back to title field
				startEditing(note, 'title');
			} else {
				// Tab: start editing tags field
				startEditing(note, 'tags');
			}
		}
	};

	const handleTagInputKeyDown = (e: React.KeyboardEvent, note: Note) => {
		if (e.key === 'Tab') {
			e.preventDefault();
			if (e.shiftKey) {
				// Shift+Tab: go back to content field
				startEditing(note, 'content');
			} else {
				// Tab: close edit mode (end of navigation cycle)
				cancelEdit();
			}
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div className="space-y-2">
					<h3 className="text-2xl font-bold text-gray-900">Notes ({notes.length})</h3>
				</div>
				{showCreateButton && (
					<button 
						className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 font-medium"
						onClick={createNewNote}
						title="Create new note"
					>
						<Plus size={16} />
						New Note
					</button>
				)}
			</div>
			
			<div className={displayMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
				{notes.length === 0 ? (
					<div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
						<p className="text-gray-500 text-lg mb-4">No notes yet</p>
						{showCreateButton && (
							<button 
								className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 font-medium"
								onClick={createNewNote}
							>
								<Plus size={18} />
								Create your first note
							</button>
						)}
					</div>
				) : (
					getRootNotes().map(note => renderNoteItem(note))
				)}
			</div>
		</div>
	);
};

export default NoteList;
