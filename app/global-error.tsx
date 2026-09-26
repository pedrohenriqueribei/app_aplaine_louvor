'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="pt-br">
      <body className="antialiased font-sans bg-slate-50 text-slate-800">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Erro Crítico</h2>
          <p className="text-slate-500 max-w-md mb-8 text-sm">
            Ocorreu um erro no carregamento da aplicação.
          </p>
          <button
            onClick={() => reset()}
            className="bg-blue-800 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-900 transition-all shadow-md active:scale-95"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
