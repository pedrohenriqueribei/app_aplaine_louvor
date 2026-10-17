'use client';

import React from 'react';
import { AuditSecuritySettingsPanel } from '@/components/AuditSecuritySettingsPanel';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminSecurityPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/admin/dashboard"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Painel
        </Link>
      </div>

      <AuditSecuritySettingsPanel />
    </div>
  );
}
