import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';

type Theme = 'dark' | 'light' | 'sunrise' | 'sunset';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const DEFAULT_THEME: Theme = 'dark';
const THEME_FLAG_KEY = 'configureTheme'; // Changed back to camelCase for React SDK

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const flags = useFlags();
  const client = useLDClient();

  // Update context with current hour periodically
  useEffect(() => {
    const updateHourContext = async () => {
      if (client) {
        try {
          const currentHour = new Date().getHours();
          await client.identify({
            kind: 'user',
            key: localStorage.getItem('ld_user_id') || 'anonymous',
            custom: {
              hourOfDay: currentHour,
              selectedTheme: theme
            }
          });
        } catch (error) {
          console.error('Failed to update hour in context:', error);
        }
      }
    };

    // Update immediately
    updateHourContext();

    // Then update at the start of each hour
    const now = new Date();
    const minutesToNextHour = 60 - now.getMinutes();
    const msToNextHour = (minutesToNextHour * 60 - now.getSeconds()) * 1000;

    // Set initial timeout to align with the start of the next hour
    const initialTimeout = setTimeout(() => {
      updateHourContext();

      // Then set up an interval for subsequent hours
      const hourlyInterval = setInterval(updateHourContext, 60 * 60 * 1000);
      
      return () => clearInterval(hourlyInterval);
    }, msToNextHour);

    return () => clearTimeout(initialTimeout);
  }, [client, theme]);

  useEffect(() => {
    // Get theme from LaunchDarkly flag
    const configuredTheme = flags[THEME_FLAG_KEY] ?? DEFAULT_THEME;
    console.log('Flag value:', configuredTheme); // Debug log
    
    if (configuredTheme === 'light' || configuredTheme === 'dark' || 
        configuredTheme === 'sunrise' || configuredTheme === 'sunset') {
      setTheme(configuredTheme);
    }
  }, [flags]);

  const toggleTheme = async () => {
    // Cycle through themes: dark -> light -> sunrise -> sunset -> dark
    const themeOrder: Theme[] = ['dark', 'light', 'sunrise', 'sunset'];
    const currentIndex = themeOrder.indexOf(theme);
    const newTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(newTheme);
    
    // If we have a client, try to update the flag value
    if (client) {
      try {
        await client.identify({
          kind: 'user',
          key: localStorage.getItem('ld_user_id') || 'anonymous',
          custom: {
            selectedTheme: newTheme,
            hourOfDay: new Date().getHours()
          }
        });
      } catch (error) {
        console.error('Failed to update LaunchDarkly context:', error);
      }
    }
  };

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