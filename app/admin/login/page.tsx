'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';

export default function AdminLogin() {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AdminLoginForm />
    </React.Suspense>
  );
}

function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isSuperAdmin, loading, signInWithEmail } = useAuth();
  
  const redirect = searchParams?.get('redirect') || '/admin/dashboard';

  useEffect(() => {
    if (!loading && user) {
      if (isSuperAdmin || user.email === 'pedrohenriqueribei@gmail.com') {
        router.push(redirect);
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isSuperAdmin, loading, router, redirect]);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await signInWithEmail(email.trim(), password);
      // O useEffect cuidará do redirecionamento
    } catch (err: any) {
      const code = err?.code || '';
      const msg = String(err?.message || '');

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        msg.includes('invalid-credential') ||
        msg.includes('wrong-password')
      ) {
        setError(
          'E-mail ou senha incorretos. Verifique suas credenciais de super administrador.'
        );
      } else if (code === 'auth/too-many-requests') {
        setError('Muitas tentativas consecutivas. Aguarde alguns minutos antes de tentar novamente por motivos de segurança.');
      } else {
        setError('Ocorreu um erro ao fazer login. Verifique seus dados de acesso restrito.');
      }
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail no campo de login para solicitar a redefinição de senha.');
      return;
    }
    setIsResetting(true);
    setError('');
    setSuccessMsg('');

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg(
        `Se o e-mail estiver cadastrado no sistema, enviamos as instruções de redefinição. Verifique sua caixa de entrada e pasta de Spam.`
      );
      setResetCooldown(60);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        setError('Nenhuma conta administrativa encontrada com este e-mail.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Muitas solicitações recentes. Por favor, aguarde alguns instantes antes de reenviar.');
      } else {
        setError('Não foi possível enviar o e-mail no momento. Verifique a conexão e tente novamente.');
      }
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-500/10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/10 blur-3xl rounded-full" />
      
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-3 rounded-2xl shadow-lg shadow-blue-500/10 border border-slate-200 dark:border-slate-700">
              <img src="/logo_aplane.png" alt="Applane Logo" className="h-12 w-auto object-contain" />
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-3 border border-blue-200 dark:border-blue-800">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Ambiente Seguro • Acesso Restrito</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Admin Login</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Autenticação exclusiva para super administradores via credenciais protegidas.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800 leading-relaxed">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium border border-emerald-200 dark:border-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              E-mail do Administrador
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white text-sm"
              placeholder="admin@dominio.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Senha de Acesso
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting || resetCooldown > 0}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                {resetCooldown > 0 ? `Aguarde (${resetCooldown}s)` : 'Esqueceu a senha?'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white text-sm"
                placeholder="Sua senha secreta"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Entrar no Painel Seguro</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <Link href="/login" className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium">
            Voltar para o login padrão
          </Link>
        </div>
      </div>
    </div>
  );
}


