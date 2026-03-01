import { useMemo } from 'react';

export const decodeLessonString = (lesson: string): string =>
  lesson
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

export const useLessonRenderer = (lesson?: string) =>
  useMemo(() => {
    if (!lesson) return '';
    return decodeLessonString(lesson);
  }, [lesson]);


