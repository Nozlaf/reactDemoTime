import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import '../themes/Clock.css';

const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`clock ${theme}`}>
      {time.toLocaleTimeString([], { hour12: false })}
    </div>
  );
};

export default Clock; 