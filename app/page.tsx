'use client';

import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { ArrowRight, Music, Users, Calendar, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleStart = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-800 rounded-xl flex items-center justify-center text-white font-display font-black text-xl shadow-lg shadow-blue-800/20">
              A
            </div>
            <span className="text-2xl font-display font-black text-slate-800 tracking-tight" id="logo-text">Aplaine</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/login')}
              disabled={loading}
              className="text-slate-600 font-bold hover:text-blue-800 transition-colors px-4 py-2"
              id="nav-login-btn"
            >
              Entrar
            </button>
            <button 
              onClick={() => router.push('/register')}
              disabled={loading}
              className="bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-900 transition-all shadow-lg shadow-blue-800/10 active:scale-95"
              id="nav-register-btn"
            >
              Cadastrar como Músico
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold mb-6 border border-blue-100">
              <Music className="w-4 h-4" />
              Gestão para Ministério de Louvor
            </div>
            <h1 className="text-6xl lg:text-7xl font-display font-black text-slate-900 mb-6 leading-[1.1] tracking-tight">
              Sua igreja em <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-900 bg-clip-text text-transparent italic drop-shadow-[0_2px_2px_rgba(0,0,0,0.05)]">harmonia</span> perfeita.
            </h1>
            <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-lg">
              A plataforma definitiva para gerir ministérios de louvor, escalas, repertórios e equipes de forma integrada e intuitiva.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleStart}
                disabled={loading}
                className="bg-blue-800 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 flex items-center gap-3 active:scale-95 group"
                id="hero-start-btn"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => router.push('/login')}
                className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
                id="hero-secondary-btn"
              >
                Já tenho conta
              </button>
            </div>
          </div>

          <div 
            className="relative"
            id="hero-visual"
          >
            <div className="bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-[3rem] p-8 lg:p-12 border border-blue-50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <FeatureCard 
                    icon={Calendar}
                    iconColor="text-blue-600"
                    title="Escalas"
                    desc="Organize sua equipe semanalmente"
                  />
                  <FeatureCard 
                    icon={Music}
                    iconColor="text-purple-600"
                    title="Repertório"
                    desc="Central de cifras e tons"
                  />
                </div>
                <div className="space-y-4 pt-8">
                  <FeatureCard 
                    icon={Users}
                    iconColor="text-emerald-600"
                    title="Equipes"
                    desc="Gestão de músicos e talentos"
                  />
                  <div className="bg-white/40 backdrop-blur-sm p-6 rounded-3xl border border-white/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-display font-black text-blue-900 mb-1">100%</div>
                      <div className="text-xs font-bold text-blue-700/60 uppercase tracking-widest">Digital</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="bg-slate-900 py-20 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,#3b82f6_0,transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-5xl font-display font-black mb-2">+500</div>
              <div className="text-slate-400 font-bold">Igrejas Ativas</div>
            </div>
            <div>
              <div className="text-5xl font-display font-black mb-2">+10k</div>
              <div className="text-slate-400 font-bold">Músicos Cadastrados</div>
            </div>
            <div>
              <div className="text-5xl font-display font-black mb-2">24h</div>
              <div className="text-slate-400 font-bold">Suporte Dedicado</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, iconColor, title, desc }: { icon: any, iconColor: string, title: string, desc: string }) {
  return (
    <div 
      className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
    >
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h3 className="font-display font-black text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
