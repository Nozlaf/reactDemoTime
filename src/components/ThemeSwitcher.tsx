import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import '../themes/ThemeSwitcher.css';

const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const flags = useFlags();
  const client = useLDClient();
  const configuredTheme = flags['configureTheme'];

  // Debug log
  console.log('Current state:', {
    themeFromContext: theme,
    themeFromFlag: configuredTheme,
    allFlags: flags,
    clientInitialized: !!client
  });

  return (
    <button 
      onClick={toggleTheme} 
      className={`theme-switcher ${theme}`}
      title={`Current theme - Context: ${theme}, Flag: ${configuredTheme}`}
    >
      Switch to {theme === 'dark' ? 'light' : 'dark'} mode
    </button>
  );
};

export default ThemeSwitcher; 