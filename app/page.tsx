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
  ChevronRight,
  BookOpen,
  HeartHandshake,
  Flame,
  Globe,
  Coins,
  Building2,
  Sparkles,
} from "lucide-react";
import { BallerinaIcon } from "@/components/BallerinaIcon";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    router.push("/ministerios");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900 transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
            id="nav-logo-link"
          >
            <img
              src="/logo_aplane_transparent.png"
              alt="Applane Logo"
              className="h-10 md:h-12 w-auto object-contain bg-transparent dark:brightness-110"
            />
          </Link>
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Seletor de Tema: Segmented no desktop, botão compacto no mobile */}
            <div className="flex items-center">
              <ThemeToggle
                variant="segmented"
                className="hidden sm:inline-flex"
              />
              <ThemeToggle
                variant="icon"
                className="sm:hidden p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
                iconClassName="w-4 h-4"
              />
            </div>

            <Link
              href="/fale-conosco"
              prefetch={false}
              className="text-slate-600 dark:text-slate-300 font-bold hover:text-blue-800 dark:hover:text-blue-400 transition-colors px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-sm hidden md:inline-block"
            >
              Fale Conosco
            </Link>
            <Link
              href="/login"
              prefetch={false}
              className="text-slate-600 dark:text-slate-300 font-bold hover:text-blue-800 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all active:scale-95 text-sm"
              id="nav-login-btn"
            >
              Entrar
            </Link>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsRegisterMenuOpen(!isRegisterMenuOpen)}
                className="bg-blue-800 hover:bg-blue-900 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-800/10 active:scale-95 hover:shadow-blue-800/20 inline-flex items-center gap-2 cursor-pointer text-sm"
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
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsRegisterMenuOpen(false)}
                  >
                    <Music className="w-4 h-4 text-blue-800 dark:text-blue-400" />
                    <span>Músico</span>
                  </Link>
                  <Link
                    href="/register?role=multimidia"
                    prefetch={false}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsRegisterMenuOpen(false)}
                  >
                    <Video className="w-4 h-4 text-amber-500" />
                    <span>Multimídia</span>
                  </Link>
                  <Link
                    href="/register?role=danca"
                    prefetch={false}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsRegisterMenuOpen(false)}
                  >
                    <BallerinaIcon className="w-4 h-4 text-rose-500" />
                    <span>Ministério de Dança</span>
                  </Link>
                  <Link
                    href="/register?role=secretaria"
                    prefetch={false}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
          <div className="lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full text-sm font-bold mb-6 border border-blue-100 dark:border-blue-900/60">
              <Music className="w-4 h-4" />
              Chegou o App que a sua igreja esperava!
            </div>
            <h1 className="text-6xl lg:text-7xl font-display font-black text-slate-900 dark:text-slate-50 mb-6 leading-[1.1] tracking-tight">
              Sua igreja em{" "}
              <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-900 dark:from-blue-400 dark:via-blue-300 dark:to-blue-500 bg-clip-text text-transparent italic drop-shadow-[0_2px_2px_rgba(0,0,0,0.05)]">
                harmonia
              </span>{" "}
              perfeita.
            </h1>
            <p className="text-xl text-[#6b6a90] dark:text-slate-400 mb-10 leading-relaxed max-w-lg">
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
                className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center shadow-xs"
                id="hero-secondary-btn"
              >
                Já tenho conta
              </Link>
            </div>
          </div>

          <div className="relative" id="hero-visual">
            <div className="bg-gradient-to-tr from-blue-100 to-indigo-50/50 dark:from-slate-900 dark:to-blue-950/40 rounded-[3rem] p-5 lg:p-7 border border-blue-100/70 dark:border-slate-800 shadow-xl shadow-blue-900/5 dark:shadow-black/40">
              {/* Header inside hero visual */}
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                    Ministérios & Gestão
                  </span>
                </div>
                <Link
                  href="/ministerios"
                  className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/60 transition-colors inline-flex items-center gap-1 group"
                >
                  <span>12 Áreas Integradas</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Grid of Ministry Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Ministério de Louvor (Principal 1) */}
                <Link
                  href="/ministerios#louvor"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-louvor"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-louvor-image-container">
                    <img
                      id="card-louvor-image"
                      src="/images/worship.png"
                      alt="Ministério de Louvor"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute top-2.5 right-2.5">
                      <span className="bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-xs">
                        Principal
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Music className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Ministério de Louvor
                        </h3>
                        <p className="text-[10px] text-blue-100/90 font-medium line-clamp-1 mt-0.5">
                          Bandas, repertório de cifras, vozes e adoração
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 2. Multimídia (Principal 2) */}
                <Link
                  href="/ministerios#multimedia"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-multimedia"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-multimedia-image-container">
                    <img
                      id="card-multimedia-image"
                      src="/images/multimedia.png"
                      alt="Multimídia"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute top-2.5 right-2.5">
                      <span className="bg-purple-600/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-xs">
                        Principal
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Multimídia
                        </h3>
                        <p className="text-[10px] text-purple-100/90 font-medium line-clamp-1 mt-0.5">
                          Áudio, projeção de letras, transmissões e redes
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 3. Escalas (Principal 3) */}
                <Link
                  href="/ministerios#escalas"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-escalas"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-escalas-image-container">
                    <img
                      id="card-escalas-image"
                      src="/images/calendar_schedule_1790306007642.jpg"
                      alt="Escalas"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute top-2.5 right-2.5">
                      <span className="bg-indigo-600/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-xs">
                        Principal
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Escalas
                        </h3>
                        <p className="text-[10px] text-indigo-100/90 font-medium line-clamp-1 mt-0.5">
                          Organize e confirme cultos semanalmente
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 4. Ministério de Dança (Principal 4) */}
                <Link
                  href="/ministerios#danca"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-danca"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-danca-image-container">
                    <img
                      id="card-danca-image"
                      src="/images/church_dance_ministry_1790305997872.jpg"
                      alt="Ministério de Dança"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute top-2.5 right-2.5">
                      <span className="bg-rose-600/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-xs">
                        Principal
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <BallerinaIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Ministério de Dança
                        </h3>
                        <p className="text-[10px] text-rose-100/90 font-medium line-clamp-1 mt-0.5">
                          Adoração com gestos, coreografias e vestes
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 5. Secretaria & Administração */}
                <Link
                  href="/ministerios#secretaria"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-secretaria"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-secretaria-image-container">
                    <img
                      id="card-secretaria-image"
                      src="/images/church_secretariat.jpg"
                      alt="Secretaria"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Secretaria
                        </h3>
                        <p className="text-[10px] text-emerald-100/90 font-medium line-clamp-1 mt-0.5">
                          Membros, atas, aniversariantes e apoio pastoral
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 6. Ministério Bíblico & Ensino */}
                <Link
                  href="/ministerios#biblico"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-biblico"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-biblico-image-container">
                    <img
                      id="card-biblico-image"
                      src="/images/church_teaching.jpg"
                      alt="Ministério Bíblico"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Ministério Bíblico
                        </h3>
                        <p className="text-[10px] text-indigo-100/90 font-medium line-clamp-1 mt-0.5">
                          Escola Bíblica (EBD), discipulado e formação
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 7. Ministério de Acolhimento & Recepção */}
                <Link
                  href="/ministerios#acolhimento"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-acolhimento"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-acolhimento-image-container">
                    <img
                      id="card-acolhimento-image"
                      src="/images/church_welcome.jpg"
                      alt="Acolhimento & Recepção"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <HeartHandshake className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Acolhimento & Recepção
                        </h3>
                        <p className="text-[10px] text-teal-100/90 font-medium line-clamp-1 mt-0.5">
                          Recepção de visitantes, boas-vindas e acolhimento
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 8. Ministério de Intercessão & Oração */}
                <Link
                  href="/ministerios#intercessao"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-intercessao"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-intercessao-image-container">
                    <img
                      id="card-intercessao-image"
                      src="/images/church_prayer.jpg"
                      alt="Intercessão & Oração"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Intercessão & Oração
                        </h3>
                        <p className="text-[10px] text-violet-100/90 font-medium line-clamp-1 mt-0.5">
                          Vigílias, clamor pelas famílias e oração contínua
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 9. Ministério de Evangelismo & Missões */}
                <Link
                  href="/ministerios#evangelismo"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-evangelismo"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-evangelismo-image-container">
                    <img
                      id="card-evangelismo-image"
                      src="/images/church_missions.jpg"
                      alt="Evangelismo & Missões"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Evangelismo & Missões
                        </h3>
                        <p className="text-[10px] text-orange-100/90 font-medium line-clamp-1 mt-0.5">
                          Ações urbanas, impactos sociais e apoio missionário
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 10. Tesouraria & Finanças */}
                <Link
                  href="/ministerios#tesouraria"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-tesouraria"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-tesouraria-image-container">
                    <img
                      id="card-tesouraria-image"
                      src="/images/church_treasury.jpg"
                      alt="Tesouraria & Finanças"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Coins className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Tesouraria & Finanças
                        </h3>
                        <p className="text-[10px] text-emerald-100/90 font-medium line-clamp-1 mt-0.5">
                          Dízimos, ofertas, relatórios e prestação de contas
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 11. Patrimônio & Zeladoria */}
                <Link
                  href="/ministerios#patrimonio"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-patrimonio"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-patrimonio-image-container">
                    <img
                      id="card-patrimonio-image"
                      src="/images/church_heritage.jpg"
                      alt="Patrimônio & Zeladoria"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-cyan-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Patrimônio & Zeladoria
                        </h3>
                        <p className="text-[10px] text-cyan-100/90 font-medium line-clamp-1 mt-0.5">
                          Inventário de bens, zeladoria e cuidado com o templo
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* 12. Ministério Infantil */}
                <Link
                  href="/ministerios#infantil"
                  className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col cursor-pointer"
                  id="card-infantil"
                >
                  <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden" id="card-infantil-image-container">
                    <img
                      id="card-infantil-image"
                      src="/images/church_kids.jpg"
                      alt="Ministério Infantil"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight truncate">
                          Ministério Infantil (Kids)
                        </h3>
                        <p className="text-[10px] text-amber-100/90 font-medium line-clamp-1 mt-0.5">
                          Culto infantil lúdico, histórias bíblicas e apoio às famílias
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
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

      {/* Footer with Applane logo */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-10 px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" prefetch={false} className="flex items-center hover:opacity-90 transition-opacity">
            <div className="bg-white p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <img
                src="/logo_aplane.png"
                alt="Applane Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
          </Link>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <ThemeToggle
              variant="segmented"
              className="text-xs"
            />
            <Link href="/fale-conosco" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-400 transition-colors">
              Fale Conosco
            </Link>
            <p suppressHydrationWarning className="text-sm font-medium text-slate-500 dark:text-slate-500 text-center md:text-right">
              © {new Date().getFullYear()} Applane. Gestão ministerial com excelência.
            </p>
          </div>
        </div>
      </footer>
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
