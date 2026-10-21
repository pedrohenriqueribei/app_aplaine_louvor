"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Users,
  UserCheck,
  BookHeart,
  Calendar,
  Music,
  Clock,
  Church,
  Bell,
  ShieldCheck,
  Moon,
  Sun,
  ArrowRight,
  Sparkles,
  Command,
  Mic2,
  Monitor,
  Briefcase,
  Sliders,
} from "lucide-react";
import { BallerinaIcon } from "@/components/BallerinaIcon";

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchId?: string;
  userUid?: string;
}

interface SearchItem {
  id: string;
  title: string;
  category: "Páginas" | "Ministérios" | "Ações Rápidas";
  description: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
}

export function QuickSearchModal({
  isOpen,
  onClose,
  churchId,
  userUid,
}: QuickSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const items: SearchItem[] = [
    {
      id: "dash",
      title: "Dashboard Principal",
      category: "Páginas",
      description: "Visão geral, indicadores e escalas da semana",
      icon: <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      href: "/dashboard",
    },
    {
      id: "schedules",
      title: "Escalas de Culto",
      category: "Páginas",
      description: "Organização das bandas, horários e convocações",
      icon: <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      href: "/dashboard/schedules",
    },
    {
      id: "songs",
      title: "Repertório de Louvor",
      category: "Páginas",
      description: "Músicas, cifras, tons e links de áudio",
      icon: <Music className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      href: "/dashboard/songs",
    },
    {
      id: "members",
      title: "Membros & Voluntários",
      category: "Páginas",
      description: "Equipe, instrumentos, dados e ministérios",
      icon: <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      href: "/dashboard/members",
    },
    {
      id: "visitors",
      title: "Visitantes & Novos Convertidos",
      category: "Páginas",
      description: "Acompanhamento pastoral e integração",
      icon: <UserCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
      href: "/dashboard/visitors",
    },
    {
      id: "appointments",
      title: "Atendimentos Pastorais",
      category: "Páginas",
      description: "Aconselhamentos e horários marcados",
      icon: <BookHeart className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      href: "/dashboard/appointments",
    },
    {
      id: "availability",
      title: "Disponibilidade Ministerial",
      category: "Páginas",
      description: "Gerenciamento de datas livres e indisponíveis",
      icon: <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
      href: "/dashboard/availability",
    },
    {
      id: "churches",
      title: "Igrejas & Congregações",
      category: "Páginas",
      description: "Configurações e unidades locais",
      icon: <Church className="w-4 h-4 text-violet-600 dark:text-violet-400" />,
      href: "/dashboard/churches",
    },
    {
      id: "notifications",
      title: "Notificações & Avisos",
      category: "Páginas",
      description: "Comunicados da liderança e convites de escalas",
      icon: <Bell className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
      href: "/dashboard/notifications",
    },
    {
      id: "audit",
      title: "Segurança & Auditoria",
      category: "Páginas",
      description: "Log de ações, acessos e auditoria de dados",
      icon: <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
      href: "/dashboard/audit",
    },

    // Ministérios
    {
      id: "min-louvor",
      title: "Ministério de Louvor",
      category: "Ministérios",
      description: "Músicos, cantores, bandas e ensaios",
      icon: <Mic2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      href: churchId
        ? `/dashboard/churches/${churchId}/ministries/louvor`
        : "/dashboard/churches",
    },
    {
      id: "min-danca",
      title: "Ministério de Dança",
      category: "Ministérios",
      description: "Bailarinas, coreografias e figurinos",
      icon: <BallerinaIcon className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      href: churchId
        ? `/dashboard/churches/${churchId}/ministries/danca`
        : "/dashboard/churches",
    },
    {
      id: "min-multi",
      title: "Multimídia & Transmissão",
      category: "Ministérios",
      description: "Som, projeção, lives e iluminação",
      icon: <Monitor className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      href: churchId
        ? `/dashboard/churches/${churchId}/ministries/multimidia`
        : "/dashboard/churches",
    },
    {
      id: "min-sec",
      title: "Secretaria & Apoio",
      category: "Ministérios",
      description: "Relatórios e organização administrativa",
      icon: <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      href: churchId
        ? `/dashboard/churches/${churchId}/ministries/secretaria`
        : "/dashboard/churches",
    },

    // Ações Rápidas
    {
      id: "act-profile",
      title: "Meu Perfil de Integrante",
      category: "Ações Rápidas",
      description: "Visualizar e editar meus dados e foto",
      icon: <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
      href: userUid ? `/dashboard/members/${userUid}` : "/dashboard/members",
    },
    {
      id: "act-theme",
      title: "Alternar Tema Claro / Escuro",
      category: "Ações Rápidas",
      description: "Mudar o contraste visual da plataforma",
      icon: <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
      action: () => {
        const isDark = document.documentElement.classList.contains("dark");
        const nextTheme = isDark ? "light" : "dark";
        localStorage.setItem("theme", nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        onClose();
      },
    },
  ];

  const filteredItems = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleSelect = (item: SearchItem) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : Math.max(0, filteredItems.length - 1)
      );
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pesquisa Rápida"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Barra de Entrada de Pesquisa */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Digite para buscar páginas, louvores, escalas..."
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm sm:text-base outline-none font-medium"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
              <kbd>ESC</kbd>
            </div>
          )}
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 dark:divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nenhum resultado encontrado
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Tente buscar por &quot;Escalas&quot;, &quot;Repertório&quot;, &quot;Membros&quot; ou &quot;Louvor&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-500/10 text-blue-900 dark:text-blue-100 shadow-xs"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? "bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 shadow-xs"
                            : "bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-700/50"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            · {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected
                          ? "text-blue-600 dark:text-blue-400 translate-x-0.5 opacity-100"
                          : "text-slate-300 dark:text-slate-600 opacity-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé com Dicas de Navegação */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">
                ↓
              </kbd>{" "}
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">
                ↵
              </kbd>{" "}
              Acessar
            </span>
          </div>
          <span className="hidden sm:inline font-medium text-slate-400 dark:text-slate-500">
            Applane Studio
          </span>
        </div>
      </div>
    </div>
  );
}
