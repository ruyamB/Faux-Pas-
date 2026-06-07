'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(currentTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('fauxpas_theme', nextTheme);
  };

  if (!mounted) {
    return (
      <button
        className="btn btn-ghost btn-sm theme-toggle-btn"
        id="theme-toggle"
        style={{ minWidth: '40px', opacity: 0 }}
        disabled
      >
        ☀
      </button>
    );
  }

  return (
    <button
      className="btn btn-ghost btn-sm theme-toggle-btn"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'Day' : 'Night'} Mode`}
      id="theme-toggle"
      style={{ minWidth: '40px', fontSize: '15px', padding: '4px var(--space-md)' }}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
