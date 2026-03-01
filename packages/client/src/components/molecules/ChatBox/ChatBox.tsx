/**
 * ChatBox Molecule Component
 * 
 * A chat interface for LLM interaction with message history and input.
 * Uses Button, Input, Typography atoms and Card molecule.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Textarea } from '../../atoms/Textarea';
import { Typography } from '../../atoms/Typography';
import { Card } from '../Card';
import { cn } from '../../../utils/theme';

export interface ChatMessage {
  /**
   * Message ID
   */
  id: string;
  
  /**
   * Message role
   */
  role: 'user' | 'assistant';
  
  /**
   * Message content
   */
  content: string;
  
  /**
   * Timestamp
   */
  timestamp?: Date;
}

export interface ChatBoxProps {
  /**
   * Messages to display
   */
  messages?: ChatMessage[];
  
  /**
   * On send message
   */
  onSend?: (message: string) => void;
  
  /**
   * Is loading
   */
  loading?: boolean;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages = [],
  onSend,
  loading = false,
  placeholder = 'Type your message...',
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() && onSend && !loading) {
      onSend(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Typography variant="body" color="secondary">
              Start a conversation with the AI assistant
            </Typography>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <Card
                className={cn(
                  'max-w-[80%] p-3',
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <Typography
                  variant="body"
                  className={message.role === 'user' ? 'text-white' : ''}
                >
                  {message.content}
                </Typography>
              </Card>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-3 bg-gray-100 dark:bg-gray-700">
              <Typography variant="body" color="secondary">
                Thinking...
              </Typography>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={loading}
          className="flex-1 min-h-[60px] max-h-[120px] resize-none"
          rows={1}
          autoResize
        />
        <Button
          variant="primary"
          icon={Send}
          onClick={handleSend}
          disabled={!inputValue.trim() || loading}
          aria-label="Send message"
          className="mb-1"
        >
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </div>
  );
};

ChatBox.displayName = 'ChatBox';

