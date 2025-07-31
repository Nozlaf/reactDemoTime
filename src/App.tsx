import React, { useEffect } from 'react';
import Clock from './components/Clock';
import ThemeSwitcher from './components/ThemeSwitcher';
import { ThemeProvider } from './context/ThemeContext';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import './App.css';

const App = () => {
  const flags = useFlags();
  const client = useLDClient();
  const showTitle = flags['showTitle'] ?? true; // Default to showing title if flag not set
  const showButton = flags['showButton'] ?? true; // Default to showing button if flag not set

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
      </div>
    </ThemeProvider>
  );
};

export default App;
