import { apiClient } from '../../services/apiClient';

// API response types
export interface GenerateNoteResponse {
  title: string;
  content: string;
  tags: string[];
}

export interface GenerateChildrenResponse {
  children: Array<{
    title: string;
    content: string;
    tags: string[];
  }>;
}

// Raw API calls for notes
export const NotesAPI = {
  // Generate note content using AI
  generateNote: async (prompt: string): Promise<GenerateNoteResponse> => {
    return apiClient.fetch('/api/generate-note', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  // Generate children notes using AI
  generateChildren: async (
    parentTitle: string, 
    parentContent: string, 
    parentTags: string[]
  ): Promise<GenerateChildrenResponse> => {
    return apiClient.fetch('/api/generate-children', {
      method: 'POST',
      body: JSON.stringify({ 
        parentTitle,
        parentContent,
        parentTags
      }),
    });
  },
};
