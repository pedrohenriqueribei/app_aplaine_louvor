'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name, { phone: '', instruments: [], vocalRange: '' });
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar. Verifique seus dados.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Left Side - Visual/Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-20 w-80 h-80 bg-blue-400 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 -right-20 w-80 h-80 bg-indigo-400 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-lg text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-white font-display font-black text-4xl mx-auto mb-10 border border-white/20 shadow-2xl"
          >
            A
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-display font-black text-white mb-6 leading-tight"
          >
            Sua igreja em <span className="text-blue-300 italic">harmonia</span> perfeita.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-blue-100 text-xl font-medium leading-relaxed"
          >
            Gestão ministerial inteligente para louvor, escalas e repertórios.
          </motion.p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-display font-black text-slate-900 mb-2 tracking-tight">
              {isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
            </h1>
            <p className="text-slate-500 font-medium">
              {isLogin ? 'Acesse o sistema do seu ministério' : 'Comece a gerir seu ministério hoje'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Ex: João Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar no Sistema' : 'Criar minha Conta')}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">ou continue com</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full bg-white border border-slate-200 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Entrar com Google
          </button>

          <p className="mt-10 text-center text-slate-600 font-medium">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            <button 
              onClick={() => isLogin ? router.push('/register') : setIsLogin(true)}
              className="ml-2 text-blue-800 font-bold hover:underline"
            >
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
