'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User as UserIcon, ArrowRight, Music, CheckCircle2, Phone, Mic2, Home } from 'lucide-react';

export default function RegisterPage() {
  const { user, signUpWithEmail, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instrumentsSelected, setInstrumentsSelected] = useState<string[]>([]);
  const [vocalRange, setVocalRange] = useState('');
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
      await signUpWithEmail(email, password, name, {
        phone,
        instruments: instrumentsSelected,
        vocalRange
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Verifique seus dados.');
    }
  };

  const toggleInstrument = (inst: string) => {
    setInstrumentsSelected(prev => 
      prev.includes(inst) 
        ? prev.filter(i => i !== inst)
        : [...prev, inst]
    );
  };

  const instrumentsList = [
    'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Voz', 'Percussão'
  ];

  const vocalRanges = [
    'Soprano', 'Contralto', 'Mezzo', 'Baixo', 'Tenor', 'Barítono'
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-20 w-80 h-80 bg-blue-400 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 -right-20 w-80 h-80 bg-indigo-400 rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-lg text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center text-white mb-10 border border-white/20 shadow-2xl mx-auto"
          >
            <Music className="w-10 h-10" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-display font-black text-white mb-6 leading-tight"
          >
            Faça parte da <span className="text-blue-300 italic">equipe</span>.
          </motion.h2>
          <div className="space-y-6 text-left inline-block self-center">
            <FeatureItem text="Organize suas escalas semanais" />
            <FeatureItem text="Acesse cifras e repertórios completos" />
            <FeatureItem text="Comunicação integrada com o ministério" />
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto relative">
        <button 
          onClick={() => router.push('/')}
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-blue-800 font-bold transition-all group"
        >
          <Home className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
          <span>Voltar para Início</span>
        </button>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md py-12"
        >
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-display font-black text-slate-900 mb-2 tracking-tight">
              Cadastro de Músico
            </h1>
            <p className="text-slate-500 font-medium">
              Preencha os dados abaixo para se juntar ao ministério.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

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
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Telefone / WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Instrumentos (pode escolher vários)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {instrumentsList.map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => toggleInstrument(inst)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                      instrumentsSelected.includes(inst) 
                        ? 'bg-blue-800 text-white border-blue-800 shadow-lg shadow-blue-800/20' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {inst}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                <Mic2 className="w-4 h-4" /> Vocal (se possuir)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {vocalRanges.map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setVocalRange(vocalRange === range ? '' : range)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                      vocalRange === range 
                        ? 'bg-indigo-700 text-white border-indigo-700 shadow-lg shadow-indigo-700/20' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Criando conta...' : 'Cadastrar agora'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">ou use sua conta</span>
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
            Google
          </button>

          <p className="mt-10 text-center text-slate-600 font-medium">
            Já possui uma conta?
            <button 
              onClick={() => router.push('/login')}
              className="ml-2 text-blue-800 font-bold hover:underline"
            >
              Fazer Login
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-blue-100 font-medium">
      <CheckCircle2 className="w-5 h-5 text-blue-400" />
      {text}
    </div>
  );
}
