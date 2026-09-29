"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === "ChunkLoadError" ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("Failed to fetch dynamically imported module");

  useEffect(() => {
    if (isChunkError && typeof window !== "undefined") {
      const lastReload = sessionStorage.getItem("last_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("last_chunk_reload", now.toString());
        window.location.reload();
        return;
      }
    }
    console.error("Dashboard Error:", error);
  }, [error, isChunkError]);

  const handleRetry = () => {
    if (isChunkError && typeof window !== "undefined") {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="p-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Erro no Painel</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        Houve uma falha ao carregar a página. Recarregue para tentar novamente.
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleRetry}
          className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-900 transition-all shadow-md active:scale-95"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
