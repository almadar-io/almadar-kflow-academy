# Notes Feature - React Query Hooks

This directory contains React Query hooks for managing notes with AI generation capabilities, leveraging the centralized API client.

## 🚀 Quick Start

```typescript
import { 
  useGenerateNote, 
  useCreateNote, 
  useAIGeneratedNote,
  useAIGeneratedChildren 
} from '../features/notes';

// In your component
const MyComponent = () => {
  const { mutate: generateNote, isPending, error } = useGenerateNote();
  
  const handleGenerate = () => {
    generateNote('Create a note about React Query');
  };
  
  // ... rest of component
};
```

## 📚 Available Hooks

### Core React Query Hooks

#### `useGenerateNote()`
Generates note content using AI.

```typescript
const { mutate, isPending, error, data } = useGenerateNote();

// Usage
mutate('Create a note about TypeScript best practices');
```

**Returns:**
- `mutate`: Function to trigger the mutation
- `isPending`: Boolean indicating if the request is in progress
- `error`: Error object if the request failed
- `data`: Generated note data on success

#### `useGenerateChildren()`
Generates child notes using AI based on a parent note.

```typescript
const { mutate, isPending, error, data } = useGenerateChildren();

// Usage
mutate({
  parentTitle: 'React Fundamentals',
  parentContent: 'Core concepts of React',
  parentTags: ['react', 'frontend']
});
```

#### `useCreateNote()`
Creates a new note with optimistic updates.

```typescript
const { mutate, isPending, error } = useCreateNote();

// Usage
mutate({
  title: 'New Note',
  content: 'Note content',
  tags: ['tag1', 'tag2'],
  parentId: 'parent-id',
  level: 1
});
```

#### `useEditNote()`
Edits an existing note with optimistic updates.

```typescript
const { mutate, isPending, error } = useEditNote();

// Usage
mutate({
  id: 'note-id',
  title: 'Updated Title',
  content: 'Updated content',
  // ... other fields
});
```

#### `useDeleteNote()`
Deletes a note with optimistic updates.

```typescript
const { mutate, isPending, error } = useDeleteNote();

// Usage
mutate('note-id');
```

### Custom Composite Hooks

#### `useAIGeneratedNote()`
Combines AI generation with note creation in a single hook.

```typescript
const { 
  generateAndCreateNote, 
  isGenerating, 
  isCreating, 
  error 
} = useAIGeneratedNote();

// Usage
const handleGenerate = async () => {
  const result = await generateAndCreateNote(
    'Create a note about React Query',
    'parent-id',
    1
  );
  
  if (result.success) {
    console.log('Note created successfully!');
  }
};
```

#### `useAIGeneratedChildren()`
Combines AI children generation with note creation.

```typescript
const { 
  generateAndCreateChildren, 
  isGenerating, 
  isCreating, 
  error 
} = useAIGeneratedChildren();

// Usage
const handleGenerateChildren = async () => {
  const result = await generateAndCreateChildren(parentNote);
  
  if (result.success) {
    console.log(`${result.createdChildren.length} children created!`);
  }
};
```

## 🔧 Configuration

### Query Keys
The hooks use structured query keys for efficient caching:

```typescript
export const noteKeys = {
  all: ['notes'],
  lists: () => [...noteKeys.all, 'list'],
  detail: (id: string) => [...noteKeys.all, 'detail', id],
  search: (query: string) => [...noteKeys.all, 'search', query],
};
```

### Error Handling
All hooks include comprehensive error handling:

```typescript
const { mutate, error, isError } = useGenerateNote();

if (isError) {
  console.error('Generation failed:', error.message);
}
```

### Loading States
Track loading states for better UX:

```typescript
const { isPending, isSuccess, isError } = useGenerateNote();

return (
  <div>
    {isPending && <Spinner />}
    {isSuccess && <SuccessMessage />}
    {isError && <ErrorMessage />}
  </div>
);
```

## 🌐 API Integration

### Centralized API Client
All API calls go through the centralized `apiClient` service:

```typescript
// src/services/apiClient.ts
export const apiClient = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    // Centralized fetch logic with error handling
  }
};
```

### API Endpoints
- `POST /api/generate-note` - Generate note content
- `POST /api/generate-children` - Generate child notes

## 🔄 State Management

### Redux Integration
The hooks integrate with Redux for immediate UI updates:

```typescript
const dispatch = useAppDispatch();

// On success, dispatch to Redux
onSuccess: (data) => {
  dispatch(createNote(data));
  queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
}
```

### Optimistic Updates
Hooks provide optimistic updates for better UX:

```typescript
onMutate: async (newNote) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: noteKeys.lists() });
  
  // Optimistically update UI
  queryClient.setQueryData(noteKeys.lists(), (old) => [...old, newNote]);
}
```

## 📝 TypeScript Support

### Full Type Safety
All hooks are fully typed with TypeScript:

```typescript
interface GenerateNoteResponse {
  title: string;
  content: string;
  tags: string[];
}

const { data } = useGenerateNote();
// data is typed as GenerateNoteResponse | undefined
```

### Generic Types
Hooks use generic types for flexibility:

```typescript
const { mutate } = useCreateNote();
// mutate expects Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'isExpanded'>
```

## 🚀 Migration from Redux

### Gradual Migration
You can migrate from Redux to React Query gradually:

```typescript
// Before (Redux only)
const dispatch = useAppDispatch();
dispatch(createNote(noteData));

// After (React Query + Redux)
const { mutate } = useCreateNote();
mutate(noteData); // Automatically dispatches to Redux on success
```

### Benefits
- **Automatic caching** and background refetching
- **Optimistic updates** for better UX
- **Error handling** and retry logic
- **Loading states** management
- **Background synchronization**

## 🔍 Debugging

### React Query DevTools
Enable React Query DevTools for debugging:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In your app
<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Console Logging
Hooks include console logging for debugging:

```typescript
onError: (error: Error) => {
  console.error('Failed to generate note:', error);
}
```

## 📚 Examples

### Complete Component Example
```typescript
import React, { useState } from 'react';
import { useAIGeneratedNote } from '../features/notes';

const NoteGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const { generateAndCreateNote, isGenerating, error } = useAIGeneratedNote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await generateAndCreateNote(prompt);
    
    if (result.success) {
      setPrompt('');
      // Show success message
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the note you want to create..."
        disabled={isGenerating}
      />
      <button type="submit" disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Note'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </form>
  );
};
```

This setup provides a robust, type-safe, and user-friendly way to manage notes with AI generation capabilities using React Query!
