import React, { useEffect, useState } from 'react';
import Clock from './components/Clock';
import ThemeSwitcher from './components/ThemeSwitcher';
import { ThemeProvider } from './context/ThemeContext';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import DiagnosticOverlay from './components/DiagnosticOverlay';
import './App.css';

const App = () => {
  const flags = useFlags();
  const client = useLDClient();
  const showTitle = flags['showTitle'] ?? true;
  const showButton = flags['showButton'] ?? true;
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Command+K (Mac) or Control+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setShowDiagnostics(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Debug logging for flag values
    console.log('Feature flags:', {
      showTitle,
      showButton,
      allFlags: flags,
      clientInitialized: !!client
    });
  }, [showTitle, showButton, flags, client]);

  return (
    <ThemeProvider>
      <div className="App">
        {showTitle && <h1 className="app-title">LaunchTimely</h1>}
        <Clock />
        {showButton && <ThemeSwitcher />}
        {showDiagnostics && (
          <DiagnosticOverlay onClose={() => setShowDiagnostics(false)} />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
