"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  ChevronRight,
  Sparkles,
  Command,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { QuickSearchModal } from "@/components/QuickSearchModal";

interface PremiumPageHeaderProps {
  user: any;
  userData: any;
  userRoleTitle: string;
  unreadCount?: number;
  onOpenMobileMenu: () => void;
  churchName?: string | null;
}

interface PageMeta {
  category: string;
  subCategory?: string;
  title: string;
  subtitle: string;
}

export function PremiumPageHeader({
  user,
  userData,
  userRoleTitle,
  unreadCount = 0,
  onOpenMobileMenu,
  churchName,
}: PremiumPageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getPageMeta = (): PageMeta => {
    // 1. Detalhes de Ministérios
    if (pathname.includes("/ministries/louvor")) {
      return {
        category: "Ministérios",
        subCategory: "Música & Bandas",
        title: "Ministério de Louvor",
        subtitle: "Gestão do repertório musical, integrantes vocais, instrumentistas e ensaios.",
      };
    }
    if (pathname.includes("/ministries/danca") || pathname.includes("/ministries/dance")) {
      return {
        category: "Ministérios",
        subCategory: "Expressão & Artes",
        title: "Ministério de Dança",
        subtitle: "Coreografias, figurinos, repertório de dança e escalas de bailarinas.",
      };
    }
    if (pathname.includes("/ministries/multimidia")) {
      return {
        category: "Ministérios",
        subCategory: "Técnica & Mídia",
        title: "Multimídia & Transmissão",
        subtitle: "Operação de áudio, projeção visual, live streaming e redes sociais.",
      };
    }
    if (pathname.includes("/ministries/secretaria")) {
      return {
        category: "Ministérios",
        subCategory: "Administração",
        title: "Secretaria & Apoio",
        subtitle: "Relatórios pastorais, atas, controle cadastral e suporte administrativo.",
      };
    }
    if (pathname.includes("/scale-config")) {
      return {
        category: "Planejamento",
        subCategory: "Regras de Escala",
        title: "Configuração de Escalas",
        subtitle: "Defina parâmetros de frequência, folgas obrigatórias e revezamento automático.",
      };
    }
    if (pathname.includes("/bands/")) {
      return {
        category: "Louvor",
        subCategory: "Bandas",
        title: "Formação de Banda",
        subtitle: "Composição fixa, líder e instrumentistas designados para os cultos.",
      };
    }

    // 2. Páginas de Gestão
    if (pathname.includes("/members/")) {
      return {
        category: "Gestão de Pessoas",
        subCategory: "Perfil",
        title: "Perfil do Integrante",
        subtitle: "Dados de contato, ministérios, funções ativas e histórico na comunidade.",
      };
    }
    if (pathname.includes("/members")) {
      return {
        category: "Gestão de Pessoas",
        title: "Membros & Voluntários",
        subtitle: "Gerencie os integrantes, instrumentos, dons e funções ativas na igreja.",
      };
    }
    if (pathname.includes("/visitors")) {
      return {
        category: "Integração",
        title: "Visitantes & Novos Convertidos",
        subtitle: "Acompanhe e acolha novas vidas integrando-as à vida da comunidade.",
      };
    }
    if (pathname.includes("/appointments")) {
      return {
        category: "Cuidado Pastoral",
        title: "Atendimentos & Aconselhamento",
        subtitle: "Gestão de aconselhamentos pastorais, sessões de oração e mentorias.",
      };
    }
    if (pathname.includes("/songs")) {
      return {
        category: "Repertório",
        title: "Repertório Musical",
        subtitle: "Explore louvores cadastrados, cifras, tonalidades e guias de áudio.",
      };
    }
    if (pathname.includes("/schedules")) {
      return {
        category: "Planejamento",
        title: "Escalas & Cultos",
        subtitle: "Organização estratégica dos cultos, bandas e voluntários escalados.",
      };
    }
    if (pathname.includes("/availability")) {
      return {
        category: "Planejamento",
        title: "Disponibilidade Ministerial",
        subtitle: "Acompanhe as datas livres, confirmações e bloqueios da equipe.",
      };
    }
    if (pathname.match(/\/churches\/[^/]+$/)) {
      return {
        category: "Comunidade",
        subCategory: "Unidade Local",
        title: churchName || "Detalhes da Igreja",
        subtitle: "Configurações, departamentos ativos e visão geral da congregação.",
      };
    }
    if (pathname.includes("/churches")) {
      return {
        category: "Administração",
        title: "Igrejas & Unidades",
        subtitle: "Configurações, sedes e filiais conectadas à plataforma Applane.",
      };
    }
    if (pathname.includes("/audit")) {
      return {
        category: "Segurança",
        title: "Auditoria & Conformidade",
        subtitle: "Rastreabilidade de alterações de dados, acessos e auditoria de segurança.",
      };
    }
    if (pathname.includes("/notifications")) {
      return {
        category: "Comunicação",
        title: "Notificações & Avisos",
        subtitle: "Central de comunicados, convocações de escalas e mensagens recebidas.",
      };
    }

    return {
      category: "Visão Geral",
      title: "Dashboard",
      subtitle: "Acompanhe em tempo real as métricas, escalas e avisos do seu ministério.",
    };
  };

  const meta = getPageMeta();
  const profileHref = `/dashboard/members/${userData?.uid || user?.uid || ""}`;

  return (
    <>
      <header
        aria-label="Cabeçalho da Página"
        className="w-full mb-8 sm:mb-10 pt-1"
      >
        {/* ============================================================== */}
        {/* BARRA SUPERIOR MOBILE (Aparece estritamente em telas < md) */}
        {/* ============================================================== */}
        <div className="md:hidden flex items-center justify-between gap-2.5 pb-4 mb-4 border-b border-slate-200/70 dark:border-slate-800/70">
          {/* Lado Esquerdo: Menu + Marca */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900 transition-all shadow-xs active:scale-95"
              title="Abrir menu de navegação"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-xs">
                <img
                  src="/icon_applane.png"
                  alt="Applane"
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo_aplane.png";
                  }}
                />
              </div>
              <span className="text-base font-black tracking-tight font-display text-slate-900 dark:text-white">
                Applane
              </span>
            </Link>
          </div>

          {/* Lado Direito: Ações (Busca, Notificação, Tema e Avatar) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão de Pesquisa */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all shadow-xs active:scale-95"
              title="Pesquisar páginas e ações (⌘K)"
              aria-label="Pesquisar"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Alternador de Tema */}
            <ThemeToggle
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all shadow-xs active:scale-95"
              iconClassName="w-4 h-4"
            />

            {/* Sino de Notificações */}
            <button
              type="button"
              onClick={() => router.push("/dashboard/notifications")}
              className={`p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all shadow-xs relative active:scale-95 ${
                unreadCount > 0 ? "ring-2 ring-blue-500/20" : ""
              }`}
              title="Notificações"
              aria-label="Notificações"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-bold shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar do Usuário */}
            <Link
              href={profileHref}
              className="p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/50 transition-all active:scale-95"
              title="Meu Perfil"
            >
              <UserAvatar
                photoURL={userData?.photoURL || user?.photoURL}
                name={userData?.name || user?.displayName || "Usuário"}
                size="sm"
              />
            </Link>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CABEÇALHO PRINCIPAL (Harmônico tanto no Desktop quanto no Mobile) */}
        {/* ============================================================== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* ZONA ESQUERDA: Breadcrumb Kicker + Título de Alto Impacto + Subtítulo */}
          <div className="space-y-1.5 min-w-0">
            {/* Breadcrumb Contextual Discreto e Refinado */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wide">
              <span className="text-slate-400 dark:text-slate-500">
                Applane
              </span>
              <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
              <span className="text-blue-700 dark:text-blue-400 font-bold">
                {meta.category}
              </span>
              {meta.subCategory && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  <span className="text-slate-600 dark:text-slate-300">
                    {meta.subCategory}
                  </span>
                </>
              )}
            </div>

            {/* Título Principal */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-slate-900 dark:text-slate-50 tracking-tight text-balance leading-tight">
              {meta.title}
            </h1>

            {/* Subtítulo Elegante */}
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal max-w-2xl leading-relaxed">
              {meta.subtitle}
            </p>
          </div>

          {/* ============================================================== */}
          {/* ZONA DIREITA: Dock de Controles Desktop (Visível a partir de md:) */}
          {/* ============================================================== */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {/* Barra de Pesquisa Interativa / Gatilho de Paleta de Comandos */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-3 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-blue-500/40 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-slate-400 dark:text-slate-500 transition-all shadow-xs group cursor-pointer"
              title="Pesquisa Rápida (Atalho: ⌘K ou Ctrl+K)"
            >
              <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                Buscar páginas ou ações...
              </span>
              <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 shadow-2xs">
                <Command className="w-2.5 h-2.5" /> K
              </span>
            </button>

            {/* Alternador de Tema Escuro / Claro */}
            <ThemeToggle
              className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
              iconClassName="w-4 h-4"
            />

            {/* Sino de Notificações com Badge */}
            <button
              type="button"
              onClick={() => router.push("/dashboard/notifications")}
              className={`p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs relative shrink-0 ${
                unreadCount > 0 ? "ring-2 ring-blue-500/20" : ""
              }`}
              title="Notificações"
              aria-label="Notificações"
            >
              <Bell className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-bold shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Divisor Hairline Vertical */}
            <div className="h-8 w-[1px] bg-slate-200/80 dark:bg-slate-800 mx-1 shrink-0" />

            {/* Cápsula de Perfil Executivo */}
            <Link
              href={profileHref}
              className="flex items-center gap-3 py-1.5 pl-2 pr-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0 hover:border-blue-500/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all cursor-pointer group"
              title="Acessar meu perfil completo"
            >
              <UserAvatar
                photoURL={userData?.photoURL || user?.photoURL}
                name={userData?.name || user?.displayName || "Usuário"}
                size="md"
              />
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                    {userData?.name || user?.displayName || "Usuário"}
                  </p>
                  <VerifiedBadge
                    verified={Boolean(
                      userData?.emailVerified ||
                        userData?.email_verified ||
                        user?.emailVerified
                    )}
                    size="xs"
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none mt-1">
                  {userRoleTitle}
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Linha Divisória de Acabamento com Suave Degradê */}
        <div className="mt-6 sm:mt-8 h-[1px] w-full bg-gradient-to-r from-slate-200/90 via-slate-200/40 to-transparent dark:from-slate-800/90 dark:via-slate-800/40 dark:to-transparent" />
      </header>

      {/* Modal de Busca Rápida (Command Palette) */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        churchId={userData?.churchId}
        userUid={userData?.uid || user?.uid}
      />
    </>
  );
}
