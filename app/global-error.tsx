'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
          <h1 className="text-4xl font-black text-red-600 mb-4 italic">Erro Crítico</h1>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Ocorreu um erro na inicialização do sistema.</h2>
          <button
            onClick={() => reset()}
            className="bg-blue-800 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20"
          >
            Tentar Novamente
          </button>
        </div>
      </body>
    </html>
  );
}
