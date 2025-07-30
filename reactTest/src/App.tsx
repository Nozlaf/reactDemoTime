import React from 'react';
import Clock from './components/Clock';
import ThemeSwitcher from './components/ThemeSwitcher';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <Clock />
        <ThemeSwitcher />
      </div>
    </ThemeProvider>
  );
}

export default App; 