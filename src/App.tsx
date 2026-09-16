import React from 'react';
import { CADProvider } from './context/CADContext';
import { CADLayout } from './components/layout/CADLayout';

function App() {
  return (
    <CADProvider>
      <CADLayout />
    </CADProvider>
  );
}

export default App;
