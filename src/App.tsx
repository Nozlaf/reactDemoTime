import React from 'react';
import Clock from './components/Clock';
import ThemeSwitcher from './components/ThemeSwitcher';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

const App = () => {
  return (
    <ThemeProvider>
      <div className="App">
        <h1 className="app-title">LaunchTimely</h1>
        <Clock />
        <ThemeSwitcher />
      </div>
    </ThemeProvider>
  );
};

export default App;
