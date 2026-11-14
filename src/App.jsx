import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Vitals } from './pages/Vitals';
import { SystemDetail } from './pages/SystemDetail';

export function App() {
  const [currentPath, setCurrentPath] = useState('/');

  const handleNavigate = (path) => {
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentView = () => {
    if (currentPath === '/vitals') {
      return <Vitals onNavigate={handleNavigate} />;
    }
    if (currentPath.startsWith('/system/')) {
      const systemId = currentPath.replace('/system/', '') || 'cardiovascular';
      return <SystemDetail systemId={systemId} onNavigate={handleNavigate} />;
    }
    return <Home onNavigate={handleNavigate} />;
  };

  return (
    <div className="min-h-screen bg-space-bg bg-space-grid text-space-text flex flex-col font-sans selection:bg-space-cyan/30 selection:text-space-cyan">
      <Navbar currentPath={currentPath} onNavigate={handleNavigate} />
      <main className="flex-1 pb-12">
        {renderCurrentView()}
      </main>

      <footer className="border-t border-space-border/60 bg-space-surface/40 py-4 text-center text-xs font-mono text-space-muted">
        NASA Space Apps Challenge 2026 · Equipo Riobamba · Panel de Monitoreo Astronauta Walter C.
      </footer>
    </div>
  );
}

export default App;
