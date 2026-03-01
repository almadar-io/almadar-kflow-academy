import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useGenerateNote } from '../queries';
import { Loader } from '../../../components';

interface AIGeneratorProps {
  onFillForm: (data: { title: string; content: string; tags: string[] }) => void;
}

const AIGenerator: React.FC<AIGeneratorProps> = ({ onFillForm }) => {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  const { mutate: generateNote, isPending, error: queryError, data, reset } = useGenerateNote();

  // Handle successful generation
  useEffect(() => {
    if (data) {
      // Fill the form with generated content
      onFillForm({
        title: data.title || 'AI Generated Title',
        content: data.content || '',
        tags: data.tags || []
      });

      // Reset the form and query state
      setPrompt('');
      reset();
    }
  }, [data, onFillForm, reset]);

  // Handle errors
  useEffect(() => {
    if (queryError) {
      setError('Failed to generate content. Please try again.');
      console.error('Error generating content:', queryError);
    }
  }, [queryError]);

  const generateContent = () => {
    if (!prompt.trim()) return;

    setError('');
    generateNote(prompt.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateContent();
    }
  };

    return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          AI Content Generator
        </h3>
      </div>
      
      {/* Show full-screen loader when AI is generating */}
      {isPending && (
        <Loader 
          size="lg" 
          text="AI is generating content..." 
          overlay={true}
          className="z-50"
        />
      )}
      
      <div className="space-y-3">
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 resize-none"
          placeholder="Describe what kind of content you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={3}
          disabled={isPending}
        />
        
        <button
          className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 font-medium"
          onClick={generateContent}
          disabled={!prompt.trim() || isPending}
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Content
            </>
            )}
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default AIGenerator;
