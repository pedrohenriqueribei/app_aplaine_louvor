"use client";

import React from "react";
import { motion } from "motion/react";
import {
  Music,
  Video,
  Sparkles,
  ClipboardList,
  Baby,
  Globe2,
  Building2,
  ChevronDown,
  Layers,
  ArrowRight,
} from "lucide-react";
import { BallerinaIcon } from "@/components/BallerinaIcon";
import Link from "next/link";

export type MinistryLens =
  | "all"
  | "worship"
  | "multimedia"
  | "dance"
  | "secretariat"
  | "kids";

interface ContextLensSwitcherProps {
  activeLens: MinistryLens;
  onSelectLens: (lens: MinistryLens) => void;
  campus: string;
  onSelectCampus?: (campus: string) => void;
  availableCampuses?: string[];
  churchName?: string;
  counts?: {
    worship?: number;
    multimedia?: number;
    dance?: number;
    secretariat?: number;
    kids?: number;
  };
}

export function ContextLensSwitcher({
  activeLens,
  onSelectLens,
  campus,
  onSelectCampus,
  availableCampuses = ["Sede Principal", "Campus Norte", "Campus Sul"],
  churchName,
  counts,
}: ContextLensSwitcherProps) {
  const [campusDropdownOpen, setCampusDropdownOpen] = React.useState(false);

  const lenses: Array<{
    id: MinistryLens;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string; size?: number | string }>;
    accentColor: string;
    activeBg: string;
    badgeCount?: number;
    description: string;
  }> = [
    {
      id: "all",
      label: "Todos (Visão Pastoral)",
      shortLabel: "Todos",
      icon: Layers,
      accentColor: "text-blue-600 dark:text-blue-400",
      activeBg: "bg-blue-600 text-white shadow-blue-600/30",
      description: "Visão consolidada para o Pastor Sênior e coordenação geral",
    },
    {
      id: "worship",
      label: "Louvor",
      shortLabel: "Louvor",
      icon: Music,
      accentColor: "text-purple-600 dark:text-purple-400",
      activeBg: "bg-purple-600 text-white shadow-purple-600/30",
      badgeCount: counts?.worship,
      description: "Foco em repertório, cifras, banda, vocal e passagens de som",
    },
    {
      id: "multimedia",
      label: "Mídia",
      shortLabel: "Mídia",
      icon: Video,
      accentColor: "text-indigo-600 dark:text-indigo-400",
      activeBg: "bg-indigo-600 text-white shadow-indigo-600/30",
      badgeCount: counts?.multimedia,
      description: "Foco em transmissão ao vivo, projeção, câmeras e operadores de som",
    },
    {
      id: "dance",
      label: "Dança",
      shortLabel: "Dança",
      icon: BallerinaIcon,
      accentColor: "text-rose-600 dark:text-rose-400",
      activeBg: "bg-rose-600 text-white shadow-rose-600/30",
      badgeCount: counts?.dance,
      description: "Foco em coreografias, ensaios de ministração, figurinos e elenco",
    },
    {
      id: "secretariat",
      label: "Secretaria",
      shortLabel: "Secretaria",
      icon: ClipboardList,
      accentColor: "text-emerald-600 dark:text-emerald-400",
      activeBg: "bg-emerald-600 text-white shadow-emerald-600/30",
      badgeCount: counts?.secretariat,
      description: "Foco em acolhimento de visitantes (SLA 48h), fichas e aniversariantes",
    },
    {
      id: "kids",
      label: "Infantil",
      shortLabel: "Infantil",
      icon: Baby,
      accentColor: "text-amber-600 dark:text-amber-400",
      activeBg: "bg-amber-600 text-white shadow-amber-600/30",
      badgeCount: counts?.kids,
      description: "Foco em salas por faixa etária, tios voluntários e ratio de crianças",
    },
  ];

  const currentLensObj = lenses.find((l) => l.id === activeLens) || lenses[0];

  return (
    <div className="space-y-3">
      {/* BARRA PRINCIPAL DE SEGMENTED PILLS + CAMPUS SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        {/* SEGMENTED PILL FILTERS */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {lenses.map((lens) => {
            const Icon = lens.icon;
            const isActive = activeLens === lens.id;

            return (
              <button
                key={lens.id}
                onClick={() => onSelectLens(lens.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? `${lens.activeBg} shadow-md font-black`
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? "text-white" : lens.accentColor}`} />
                <span className="hidden sm:inline">{lens.label}</span>
                <span className="sm:hidden">{lens.shortLabel}</span>
                {typeof lens.badgeCount === "number" && lens.badgeCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {lens.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CAMPUS SWITCHER */}
        <div className="relative self-end md:self-auto shrink-0 pr-1">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                {campus || "Sede Principal"}
              </span>
              {availableCampuses.length > 1 && (
                <button
                  onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
                  className="ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {campusDropdownOpen && availableCampuses.length > 1 && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-1.5 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400">
                Selecione o Campus
              </div>
              {availableCampuses.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onSelectCampus?.(c);
                    setCampusDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    campus === c
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BANNER DE FOCO DA LENTE (QUANDO MINISTÉRIO SELECIONADO NÃO É 'TODOS') */}
      {activeLens !== "all" && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <currentLensObj.icon className={`w-4 h-4 ${currentLensObj.accentColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                  Lente Ativa: {currentLensObj.label}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                  Filtro Departamental
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                {currentLensObj.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {activeLens === "dance" && (
              <Link
                href="/dashboard/dance"
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Workspace de Dança</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {activeLens === "worship" && (
              <Link
                href="/dashboard/songs"
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Repertório & Louvor</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {activeLens === "multimedia" && (
              <Link
                href="/dashboard/multimedia"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Workspace de Mídia</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {activeLens === "secretariat" && (
              <Link
                href="/dashboard/visitors"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Acolhimento & Visitantes</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {activeLens === "kids" && (
              <Link
                href="/dashboard/schedules"
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Escalas do Infantil</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            <button
              onClick={() => onSelectLens("all")}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors"
            >
              Voltar para Todos
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
