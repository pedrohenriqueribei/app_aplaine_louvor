"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Erro no Painel</h2>
      <button
        onClick={() => reset()}
        className="bg-blue-800 text-white px-6 py-2 rounded-lg font-bold"
      >
        Tentar novamente
      </button>
    </div>
  );
}
