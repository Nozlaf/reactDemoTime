import React from 'react';
import { useTheme } from '../context/ThemeContext';
import '../themes/ThemeSwitcher.css';

const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button className={`theme-switcher ${theme}`} onClick={toggleTheme}>
      Switch to {theme === 'dark' ? 'light' : 'dark'} mode
    </button>
  );
};

export default ThemeSwitcher; 