import { ChildNote } from '../types';

export function extractTags(prompt: string): string[] {
  const commonTags = ['meeting', 'study', 'work', 'personal', 'ideas', 'todo', 'project'];
  const promptLower = (prompt || '').toLowerCase();
  return commonTags.filter((tag) => promptLower.includes(tag));
}

export function parseStructuredResponse(content: string): ChildNote[] {
  const children: ChildNote[] = [];
  const lines = (content || '').split('\n');
  let currentChild: ChildNote | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (
      trimmedLine.startsWith('Title:') ||
      trimmedLine.startsWith('1.') ||
      trimmedLine.startsWith('2.') ||
      trimmedLine.startsWith('3.') ||
      trimmedLine.startsWith('4.') ||
      trimmedLine.startsWith('5.')
    ) {
      if (currentChild) {
        children.push(currentChild);
      }
      currentChild = {
        title: trimmedLine.replace(/^(Title:|[0-9]+\.\s*)/, '').trim(),
        content: '',
        tags: [],
      };
    } else if (trimmedLine.startsWith('Content:') && currentChild) {
      currentChild.content = trimmedLine.replace('Content:', '').trim();
    } else if (trimmedLine.startsWith('Tags:') && currentChild) {
      const tags = trimmedLine.replace('Tags:', '').trim();
      currentChild.tags = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);
    } else if (currentChild && trimmedLine && !trimmedLine.startsWith('---')) {
      if (currentChild.content) {
        currentChild.content += ' ' + trimmedLine;
      } else {
        currentChild.content = trimmedLine;
      }
    }
  }

  if (currentChild) {
    children.push(currentChild);
  }

  return children;
}

export function generateFallbackChildren(parentTitle: string): ChildNote[] {
  const baseChildren: ChildNote[] = [
    {
      title: `Introduction to ${parentTitle}`,
      content: `Basic introduction and overview of ${parentTitle}`,
      tags: ['introduction', 'overview'],
    },
    {
      title: `Key Concepts of ${parentTitle}`,
      content: `Main concepts and principles related to ${parentTitle}`,
      tags: ['concepts', 'principles'],
    },
    {
      title: `Applications of ${parentTitle}`,
      content: `Practical applications and use cases of ${parentTitle}`,
      tags: ['applications', 'practical'],
    },
  ];

  return baseChildren;
}

