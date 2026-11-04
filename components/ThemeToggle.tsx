'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

export interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
  variant?: 'icon' | 'pill' | 'segmented';
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({
  className,
  iconClassName,
  showLabel = false,
  variant = 'icon',
  size = 'md',
}: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      window.dispatchEvent(
        new CustomEvent('applane-theme-change', { detail: { theme: newTheme } })
      );
    } catch (_) {}
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      const initialTheme = savedTheme || systemTheme;
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    } catch (_) {}

    const handleThemeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: 'light' | 'dark' }>;
      if (customEvent.detail && customEvent.detail.theme) {
        setTheme(customEvent.detail.theme);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
        document.documentElement.classList.toggle('dark', e.newValue === 'dark');
      }
    };

    window.addEventListener('applane-theme-change', handleThemeEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('applane-theme-change', handleThemeEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
  };

  // Segmented control variant (e.g., [Claro | Escuro])
  if (variant === 'segmented') {
    if (!mounted) {
      return (
        <div
          className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold ${
            className || ''
          }`}
        >
          <div className="px-2.5 py-1.5 rounded-lg opacity-0">...</div>
        </div>
      );
    }

    return (
      <div
        role="group"
        aria-label="Seletor de tema"
        className={`inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold transition-all shadow-2xs ${
          className || ''
        }`}
      >
        <button
          type="button"
          onClick={() => applyTheme('light')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white text-blue-900 shadow-xs ring-1 ring-slate-900/5 dark:bg-transparent dark:text-slate-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Ativar modo claro"
          aria-pressed={theme === 'light'}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Claro</span>
        </button>

        <button
          type="button"
          onClick={() => applyTheme('dark')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900 text-white shadow-xs ring-1 ring-white/10 dark:bg-slate-700 dark:text-blue-300 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Ativar modo escuro"
          aria-pressed={theme === 'dark'}
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Escuro</span>
        </button>
      </div>
    );
  }

  // Pill variant with label
  if (variant === 'pill') {
    if (!mounted) {
      return (
        <button
          type="button"
          aria-label="Alternar Tema"
          className={
            className ||
            'flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-500'
          }
        >
          <Moon className={iconClassName || 'w-4 h-4 opacity-0'} />
          {showLabel && <span>Tema</span>}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={
          className ||
          'flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all shadow-2xs hover:border-blue-400/50 cursor-pointer active:scale-95'
        }
        aria-label="Alternar Tema"
        title={theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
      >
        {theme === 'light' ? (
          <>
            <Moon className={iconClassName || 'w-4 h-4 text-slate-600 dark:text-slate-400'} />
            {showLabel && <span>Modo Escuro</span>}
          </>
        ) : (
          <>
            <Sun className={iconClassName || 'w-4 h-4 text-amber-400'} />
            {showLabel && <span>Modo Claro</span>}
          </>
        )}
      </button>
    );
  }

  // Standard icon button variant
  const defaultClasses =
    'p-2.5 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all shadow-xs cursor-pointer active:scale-95';

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Alternar Tema"
        className={className || defaultClasses}
      >
        <Moon className={iconClassName || 'w-4 h-4 opacity-0'} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className || defaultClasses}
      aria-label={theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
      title={theme === 'light' ? 'Mudar para modo escuro (leitura noturna)' : 'Mudar para modo claro (leitura diurna)'}
    >
      {theme === 'light' ? (
        <span className="flex items-center gap-1.5">
          <Moon className={iconClassName || 'w-4 h-4 text-slate-600 transition-transform duration-200 hover:-rotate-12'} />
          {showLabel && <span className="text-xs font-semibold">Escuro</span>}
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <Sun className={iconClassName || 'w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45'} />
          {showLabel && <span className="text-xs font-semibold">Claro</span>}
        </span>
      )}
    </button>
  );
}

