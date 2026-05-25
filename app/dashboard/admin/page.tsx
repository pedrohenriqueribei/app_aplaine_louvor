"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ShieldAlert, AlertTriangle, CheckCircle2, Loader2, Mail } from "lucide-react";

export default function AdminPage() {
  const { isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{message: string, count: number} | null>(null);

  React.useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push("/dashboard");
    }
  }, [loading, isSuperAdmin, router]);

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const handleSyncClaims = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Não autenticado");

      const response = await fetch("/api/admin/sync-claims", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao sincronizar claims.");
      }
      
      setSyncResult({ message: data.message, count: data.totalFixes || 0 });
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao sincronizar claims");
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Não autenticado");

      const response = await fetch("/api/set-super-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao conceder permissões");
      }

      setSuccess(data.message || "Permissão concedida com sucesso");
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-6 mb-8 flex gap-4 text-amber-800 dark:text-amber-200">
        <ShieldAlert className="w-6 h-6 shrink-0 mt-1" />
        <div>
          <h2 className="text-lg font-bold">Área Restrita</h2>
          <p className="mt-1">
            Esta seção é exclusiva para administradores da plataforma. Acesso
            aqui permite ações que alteram privilégios globais do sistema.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3 mb-6">
          <ShieldAlert className="w-5 h-5 text-blue-500" />
          Conceder Acesso Super Admin
        </h2>

        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Informe o e-mail de um usuário já cadastrado para conceder privilégios
          de Super Administrador. Atenção: Esta ação garante acesso irrestrito a
          todas as informações de todas as igrejas e usuários da plataforma.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              E-mail do Usuário
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="usuario@dominio.com"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium text-sm">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!email.trim() || isSubmitting}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Conceder Acesso"
            )}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 mt-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3 mb-6">
          Auditoria de Privilégios Globais
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Utilize esta ferramenta para verificar todos os usuários na plataforma e forçar a sincronização de seus Custom Claims de acordo com a base de dados (MongoDB/Firestore). Útil para recuperar consistência entre os tokens de autenticação e os perfis.
        </p>
        
        {syncResult && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium text-sm">{syncResult.message} ({syncResult.count} correções aplicadas)</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSyncClaims}
          disabled={syncing}
          className="w-full sm:w-auto px-8 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {syncing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Sincronizando...
            </>
          ) : (
            "Verificar e Corrigir Custom Claims"
          )}
        </button>
      </div>
    </div>
  );
}
