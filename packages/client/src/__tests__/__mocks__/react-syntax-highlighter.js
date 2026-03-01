// Mock for react-syntax-highlighter
import React from 'react';

export const Prism = ({ children, language, style, ...props }) => {
  return React.createElement(
    'pre',
    { 'data-testid': 'syntax-highlighter', 'data-language': language, ...props },
    React.createElement('code', {}, children)
  );
};

export default {
  Prism,
};

