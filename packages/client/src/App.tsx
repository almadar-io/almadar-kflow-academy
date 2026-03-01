import React from 'react';
import { Providers } from './app/providers';
import AppRouter from './routes/AppRouter';
import './styles/index.css';

function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}

export default App;
