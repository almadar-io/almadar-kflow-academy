// Mock for react-markdown to avoid ES module transformation issues in tests
import React from 'react';

const ReactMarkdown = ({ children, ...props }) => {
  return React.createElement('div', { 'data-testid': 'react-markdown', ...props }, children);
};

export default ReactMarkdown;

