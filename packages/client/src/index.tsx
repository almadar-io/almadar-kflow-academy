import React from 'react';
import ReactDOM from 'react-dom/client';
import { enableMapSet } from 'immer';
import './styles';
import App from './App';

// Enable Immer support for Map and Set - must be called before any Redux code
enableMapSet();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
