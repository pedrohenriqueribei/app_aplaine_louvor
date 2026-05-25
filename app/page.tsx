"use client";

import React from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Music,
  Users,
  Calendar,
  ShieldCheck,
  Video,
  Briefcase,
  ChevronDown,
} from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isRegisterMenuOpen, setIsRegisterMenuOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsRegisterMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStart = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src="https://lh3.googleusercontent.com/d/1lKzsn9yPg-jpcH5Lw1x5QwCyH_W9btXq?v=2"
              alt="Aplaine Logo"
              className="h-10 w-auto"
              referrerPolicy="no-referrer"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              prefetch={false}
              className="text-slate-600 font-bold hover:text-blue-800 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50 transition-all active:scale-95"
              id="nav-login-btn"
            >
              Entrar
            </Link>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsRegisterMenuOpen(!isRegisterMenuOpen)}
                className="bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-900 transition-all shadow-lg shadow-blue-800/10 active:scale-95 hover:shadow-blue-800/20 inline-flex items-center gap-2 cursor-pointer"
                id="nav-register-btn"
              >
                <span>Criar conta</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${isRegisterMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isRegisterMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-55 animate-in fade-in slide-in-from-top-2 duration-150">
                  <Link
                    href="/register?role=musico"
                    prefetch={false}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsRegisterMenuOpen(false)}
                  >
                    <Music className="w-4 h-4 text-blue-800" />
                    <span>Músico</span>
                  </Link>
                  <Link
                    href="/register?role=multimidia"
                    prefetch={false}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsRegisterMenuOpen(false)}
                  >
                    <Video className="w-4 h-4 text-amber-500" />
                    <span>Multimídia</span>
                  </Link>
                  <Link
                    href="/register?role=secretaria"
                    prefetch={false}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsRegisterMenuOpen(false)}
                  >
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                    <span>Secretaria</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold mb-6 border border-blue-100">
              <Music className="w-4 h-4" />
              Chegou o App que a sua igreja esperava!
            </div>
            <h1 className="text-6xl lg:text-7xl font-display font-black text-slate-900 mb-6 leading-[1.1] tracking-tight">
              Sua igreja em{" "}
              <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-900 bg-clip-text text-transparent italic drop-shadow-[0_2px_2px_rgba(0,0,0,0.05)]">
                harmonia
              </span>{" "}
              perfeita.
            </h1>
            <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-lg">
              A plataforma definitiva para gerir ministérios de louvor,
              multimídia, escalas, músicas e equipe de forma integrada e
              intuitiva.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleStart}
                className="bg-blue-800 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 flex items-center gap-3 active:scale-95 group hover:shadow-blue-800/30"
                id="hero-start-btn"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/login"
                prefetch={false}
                className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center"
                id="hero-secondary-btn"
              >
                Já tenho conta
              </Link>
            </div>
          </div>

          <div className="relative" id="hero-visual">
            <div className="bg-gradient-to-tr from-blue-100 to-indigo-50/50 rounded-[3rem] p-6 lg:p-8 border border-blue-50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  {/* Ministério de Louvor */}
                  <div className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm group">
                    <div className="relative h-40 rounded-2xl overflow-hidden">
                      <img
                        src="/images/worship.png"
                        alt="Banda tocando"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent"></div>
                      <div className="absolute bottom-3 left-3">
                        <h3 className="text-white font-bold text-sm">
                          Ministério de Louvor
                        </h3>
                      </div>
                    </div>
                  </div>

                  <FeatureCard
                    icon={Calendar}
                    iconColor="text-blue-600"
                    title="Escalas"
                    desc="Organize semanalmente"
                  />

                  {/* Secretaria */}
                  <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-white shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 mb-3">
                      <Users className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2">
                      Secretaria
                    </h3>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                      Faça gestão dos membros, tenha controle de
                      aniversariantes, visitas, aconselhamento pastoral.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-10">
                  <FeatureCard
                    icon={Music}
                    iconColor="text-purple-600"
                    title="Repertório"
                    desc="Central de cifras e tons"
                  />

                  {/* Ministério de Multimídia */}
                  <div className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm group">
                    <div className="relative h-48 rounded-2xl overflow-hidden">
                      <img
                        src="/images/multimedia.png"
                        alt="Mesa de som e painel digital"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent"></div>
                      <div className="absolute bottom-3 left-3">
                        <h3 className="text-white font-bold text-sm">
                          Ministério de Multimídia
                        </h3>
                      </div>
                    </div>
                  </div>

                  <FeatureCard
                    icon={Users}
                    iconColor="text-emerald-600"
                    title="Equipe"
                    desc="Gestão de músicos e talentos"
                  />
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
              <div className="text-slate-400 font-bold">
                Músicos Cadastrados
              </div>
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

function FeatureCard({
  icon: Icon,
  iconColor,
  title,
  desc,
}: {
  icon: any;
  iconColor: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h3 className="font-display font-black text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
