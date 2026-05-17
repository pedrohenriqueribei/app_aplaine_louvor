'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
        <span className="text-4xl">⚠️</span>
      </div>
      <h1 className="text-3xl font-black text-slate-900 mb-2">Algo não deu certo</h1>
      <p className="text-slate-500 mb-8 max-w-sm mx-auto">Ocorreu um erro inesperado no aplicativo. Por favor, tente recarregar.</p>
      <button
        onClick={() => reset()}
        className="bg-blue-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-900 transition-all shadow-lg active:scale-95"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
