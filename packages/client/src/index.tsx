import React from 'react';
import ReactDOM from 'react-dom/client';
import { enableMapSet } from 'immer';
import { initializePatterns } from '@almadar/ui/renderer';
import './styles';
import App from './App';

// Enable Immer support for Map and Set - must be called before any Redux code
enableMapSet();

// Load the Almadar pattern registry so runtime-rendered orbitals can instantiate UI patterns
initializePatterns();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
