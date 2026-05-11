'use client';

import React from 'react';
import { Music } from 'lucide-react';

export default function SongsPage() {
  return (
    <div className="bg-white p-20 rounded-[3rem] border border-slate-200 border-dashed flex flex-col items-center text-center">
      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300">
        <Music size={40} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Repertório em breve</h3>
      <p className="text-slate-500 max-w-sm">Estamos restaurando a funcionalidade de gestão de músicas.</p>
    </div>
  );
}
