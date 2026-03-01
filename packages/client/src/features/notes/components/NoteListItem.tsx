import React from 'react';
import { Note } from '../types';
import { Edit3, Trash2, Save, X, Tag, Plus } from 'lucide-react';
import NoteTags from './NoteTags';
import NoteTitle from './NoteTitle';
import NoteContent from './NoteContent';

interface NoteListItemProps {
	note: Note;
	selectedNote: Note | null;
	editingState: { noteId: string; field: 'title' | 'content' | 'tags' } | null;
	editValues: { title: string; content: string; tags: string[] };
	newTag: string;
	noteRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
	titleInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
	contentTextareaRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
	tagsContainerRef: React.MutableRefObject<HTMLDivElement | null>;
	showFullContent: boolean;
	onSelectNote: (note: Note) => void;
	onDeleteNote: (noteId: string) => void;
	onEditNote: (note: Note) => void;
	onAddChildNote: (parentNote: Note) => void;
	onNavigateToNote: (note: Note) => void;
	onToggleExpand: (noteId: string) => void;
	startEditing: (note: Note, field: 'title' | 'content' | 'tags') => void;
	cancelEdit: () => void;
	queueAutoSave: (note: Note, partial: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => void;
	handleAddTag: (note: Note) => void;
	handleRemoveTag: (note: Note, tagToRemove: string) => void;
	handleKeyPress: (e: React.KeyboardEvent, note: Note) => void;
	handleTitleKeyDown: (e: React.KeyboardEvent, note: Note) => void;
	handleContentKeyDown: (e: React.KeyboardEvent, note: Note) => void;
	handleTagInputKeyDown: (e: React.KeyboardEvent, note: Note) => void;
	createChildNote: (parentNote: Note) => void;
	handleNoteDelete: (noteId: string) => void;
	formatDate: (date: Date) => string;
	getChildNotes: (noteId: string) => Note[];
	renderNoteItem: (note: Note) => React.ReactElement;
	setEditValues: React.Dispatch<React.SetStateAction<{ title: string; content: string; tags: string[] }>>;
	setNewTag: React.Dispatch<React.SetStateAction<string>>;
}

const NoteListItem: React.FC<NoteListItemProps> = ({
	note,
	selectedNote,
	editingState,
	editValues,
	newTag,
	noteRefs,
	titleInputRefs,
	contentTextareaRefs,
	tagsContainerRef,
	showFullContent,
	onSelectNote,
	onDeleteNote,
	onEditNote,
	onAddChildNote,
	onNavigateToNote,
	onToggleExpand,
	startEditing,
	cancelEdit,
	queueAutoSave,
	handleAddTag,
	handleRemoveTag,
	handleKeyPress,
	handleTitleKeyDown,
	handleContentKeyDown,
	handleTagInputKeyDown,
	createChildNote,
	handleNoteDelete,
	formatDate,
	getChildNotes,
	renderNoteItem,
	setEditValues,
	setNewTag
}) => {
	const hasChildren = note.children && note.children.length > 0;
	const isExpanded = note.isExpanded;
	const childNotes = getChildNotes(note.id);
	const displayDepth = note.level;
	const isEditing = editingState?.noteId === note.id;
	const isEditingTitle = isEditing && editingState?.field === 'title';
	const isEditingContent = isEditing && editingState?.field === 'content';
	const isEditingTags = isEditing && editingState?.field === 'tags';
	const isNewChildNote = note.title === 'New Child Note' && note.content === 'Add your content here...';

	return (
		<div
			className={`p-4 border border-gray-200 rounded-lg mb-3 transition-all duration-200 ${
				selectedNote?.id === note.id 
					? 'border-indigo-500 bg-indigo-50 shadow-md' 
					: 'hover:border-gray-300 hover:shadow-sm'
			} ${
				isNewChildNote 
					? 'border-orange-300 bg-orange-50 animate-pulse' 
					: ''
			}`}
			ref={(el) => { noteRefs.current[note.id] = el; }}
			onClick={(e) => {
				e.stopPropagation();
				// Only navigate if it's a root note (no parent)
				onSelectNote(note);
			    onNavigateToNote(note);
			}}
			style={{ 
				marginLeft: `${displayDepth * 20}px`,
				cursor: !note.parentId ? 'pointer' : 'default'
			}}
		>
			<div className="space-y-3">
				<NoteTitle
					note={note}
					isEditing={isEditingTitle}
					editValues={editValues}
					onTitleChange={(value) => {
						setEditValues({ ...editValues, title: value });
						queueAutoSave(note, { title: value });
					}}
					onStartEditing={startEditing}
					onCancelEdit={cancelEdit}
					onKeyDown={handleTitleKeyDown}
					titleInputRefs={titleInputRefs}
					showExpandButton={hasChildren}
					isExpanded={isExpanded}
					onToggleExpand={onToggleExpand}
				/>
				
				<NoteContent
					note={note}
					isEditing={isEditingContent}
					editValues={editValues}
					onContentChange={(value) => {
						setEditValues({ ...editValues, content: value });
						queueAutoSave(note, { content: value });
					}}
					onStartEditing={startEditing}
					onCancelEdit={cancelEdit}
					onKeyDown={handleContentKeyDown}
					contentTextareaRefs={contentTextareaRefs}
					showFullContent={showFullContent}
				/>
				
				<div className="flex justify-between items-center">
					<span className="text-sm text-gray-500">{formatDate(note.updatedAt)}</span>
					
					<NoteTags
						note={note}
						isEditing={isEditingTags}
						editValues={editValues}
						newTag={newTag}
						onAddTag={handleAddTag}
						onRemoveTag={handleRemoveTag}
						onKeyPress={handleKeyPress}
						onTagInputKeyDown={handleTagInputKeyDown}
						onNewTagChange={(value) => {
							setNewTag(value);
							// Autosave on typing in tag input (saving current tags state)
							queueAutoSave(note, { tags: editValues.tags });
						}}
						onStartEditing={startEditing}
						onCancelEdit={cancelEdit}
						maxDisplayTags={3}
						className="ml-4"
					/>
				</div>
			</div>
			
			<div className="flex gap-2 justify-end mt-3">
				<button
					className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors duration-200"
					onClick={(e) => {
						e.stopPropagation();
						createChildNote(note);
					}}
					title="Add child note"
				>
					<Plus size={14} />
				</button>
				<button
					className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
					onClick={(e) => {
						e.stopPropagation();
						handleNoteDelete(note.id);
					}}
					title="Delete note"
				>
					<Trash2 size={14} />
				</button>
			</div>
			
			{hasChildren && isExpanded && (
				<div className="mt-4 border-l-2 border-gray-200 pl-4">
					{childNotes.map(childNote => renderNoteItem(childNote))}
				</div>
			)}
		</div>
	);
};

export default NoteListItem;
