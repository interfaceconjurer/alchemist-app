import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { readStorage, writeStorage } from '../utils/safeStorage';

const ThemeContext = createContext();
const savedTheme = () => {
  const value = readStorage('theme');
  return value === 'light' || value === 'dark' ? value : null;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => savedTheme()
    ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const manuallySelected = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) return;
    const handleChange = (e) => {
      if (!manuallySelected.current && !savedTheme()) setTheme(e.matches ? 'dark' : 'light');
    };
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', handleChange);
    else mediaQuery.addListener(handleChange);
    return () => {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener('change', handleChange);
      else mediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (manuallySelected.current) writeStorage('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    manuallySelected.current = true;
    setTheme(current => current === 'light' ? 'dark' : 'light');
  }, []);
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
