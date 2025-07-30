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

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className={`clock ${theme}`}>
      <span className="time-display">{formatTime(time)}</span>
    </div>
  );
};

export default Clock; 