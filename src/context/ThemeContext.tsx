import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';

type Theme = 'dark' | 'light' | 'sunrise' | 'sunset';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const DEFAULT_THEME: Theme = 'dark';
const THEME_FLAG_KEY = 'configureTheme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const flags = useFlags();
  const client = useLDClient();
  const lastUpdateTime = useRef(0);
  const pendingUpdate = useRef<NodeJS.Timeout | null>(null);

  // Debounced context update function
  const updateLDContext = useCallback(async (newTheme?: Theme, forceUpdate = false) => {
    if (!client) return;

    const now = Date.now();
    // Only update if it's been more than 5 seconds since the last update or if forced
    if (!forceUpdate && now - lastUpdateTime.current < 5000) {
      // If an update is pending, clear it
      if (pendingUpdate.current) {
        clearTimeout(pendingUpdate.current);
      }
      // Schedule a new update
      pendingUpdate.current = setTimeout(() => {
        updateLDContext(newTheme, true);
      }, 5000);
      return;
    }

    try {
      const currentHour = new Date().getHours();
      await client.identify({
        kind: 'user',
        key: localStorage.getItem('ld_user_id') || 'anonymous',
        custom: {
          hourOfDay: currentHour,
          selectedTheme: newTheme || theme
        }
      });
      lastUpdateTime.current = now;
    } catch (error) {
      console.error('Failed to update LaunchDarkly context:', error);
    }
  }, [client, theme]);

  // Handle hour updates
  useEffect(() => {
    const updateHourContext = () => {
      updateLDContext(undefined, true);
    };

    // Update at the start of each hour
    const now = new Date();
    const minutesToNextHour = 60 - now.getMinutes();
    const msToNextHour = (minutesToNextHour * 60 - now.getSeconds()) * 1000;

    // Initial update
    updateHourContext();

    // Set up the hourly updates
    const timeout = setTimeout(() => {
      updateHourContext();
      // Then set up an interval for subsequent hours
      const interval = setInterval(updateHourContext, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msToNextHour);

    return () => {
      clearTimeout(timeout);
      if (pendingUpdate.current) {
        clearTimeout(pendingUpdate.current);
      }
    };
  }, [updateLDContext]);

  // Handle theme flag changes
  useEffect(() => {
    const configuredTheme = flags[THEME_FLAG_KEY] ?? DEFAULT_THEME;
    console.log('Flag value:', configuredTheme);
    
    if (configuredTheme === 'light' || configuredTheme === 'dark' || 
        configuredTheme === 'sunrise' || configuredTheme === 'sunset') {
      setTheme(configuredTheme);
    }
  }, [flags]);

  const toggleTheme = useCallback(async () => {
    // Cycle through themes: dark -> light -> sunrise -> sunset -> dark
    const themeOrder: Theme[] = ['dark', 'light', 'sunrise', 'sunset'];
    const currentIndex = themeOrder.indexOf(theme);
    const newTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(newTheme);
    
    // Update LaunchDarkly context with the new theme
    await updateLDContext(newTheme, true);
  }, [theme, updateLDContext]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 