'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const defaultClasses =
    "p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-blue-800 dark:hover:text-blue-400 transition-all shadow-sm";

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Alternar Tema"
        className={className || defaultClasses}
      >
        <Moon className={iconClassName || "w-5 h-5 opacity-0"} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className || defaultClasses}
      aria-label="Alternar Tema"
      title={theme === 'light' ? "Mudar para modo escuro" : "Mudar para modo claro"}
    >
      {theme === 'light' ? (
        <Moon className={iconClassName || "w-5 h-5"} />
      ) : (
        <Sun className={iconClassName || "w-5 h-5 text-amber-500"} />
      )}
    </button>
  );
}
