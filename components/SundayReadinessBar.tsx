"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Music,
  Video,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Flame,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export interface DepartmentReadiness {
  name: string;
  confirmed: number;
  total: number;
  status: "ready" | "warning" | "danger";
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  unconfirmedNames?: string[];
  unconfirmedPhones?: string[];
}

export interface SundayServiceRunItem {
  time: string;
  durationMinutes: number;
  title: string;
  leader: string;
  category: "prep" | "praise" | "word" | "fellowship";
  status: "ready" | "in_progress" | "pending";
}

interface SundayReadinessBarProps {
  serviceTitle?: string;
  serviceDateFormatted?: string;
  overallScore?: number;
  departments?: DepartmentReadiness[];
  orderOfServiceDefined?: boolean;
  orderOfServiceCount?: number;
  onRemindPendingWhatsApp?: (deptName: string, unconfirmedNames: string[]) => void;
  scheduleId?: string;
}

export function SundayReadinessBar({
  serviceTitle = "Culto de Domingo 19h (Celebração)",
  serviceDateFormatted = "Próximo Domingo • 19:00",
  overallScore = 88,
  departments,
  orderOfServiceDefined = true,
  orderOfServiceCount = 6,
  onRemindPendingWhatsApp,
  scheduleId,
}: SundayReadinessBarProps) {
  const [expandedTimeline, setExpandedTimeline] = useState(false);

  // Default ministry readiness if not passed
  const deptList: DepartmentReadiness[] = departments || [
    {
      name: "Louvor",
      confirmed: 6,
      total: 6,
      status: "ready",
      icon: Music,
      unconfirmedNames: [],
    },
    {
      name: "Mídia/Som",
      confirmed: 2,
      total: 3,
      status: "warning",
      icon: Video,
      unconfirmedNames: ["Operador de Som (Pendente)"],
      unconfirmedPhones: ["11988887777"],
    },
    {
      name: "Recepção",
      confirmed: 4,
      total: 4,
      status: "ready",
      icon: Users,
      unconfirmedNames: [],
    },
    {
      name: "Dança",
      confirmed: 4,
      total: 4,
      status: "ready",
      icon: Sparkles,
      unconfirmedNames: [],
    },
  ];

  // Timeline / Run of Show do culto
  const runOfShowItems: SundayServiceRunItem[] = [
    {
      time: "18:30",
      durationMinutes: 15,
      title: "Chegada dos Voluntários & Passagem de Som",
      leader: "Equipe de Som & Banda",
      category: "prep",
      status: "ready",
    },
    {
      time: "18:45",
      durationMinutes: 15,
      title: "Oração e Alinhamento em Círculo (Foyer)",
      leader: "Líder Geral do Domingo",
      category: "prep",
      status: "ready",
    },
    {
      time: "19:00",
      durationMinutes: 10,
      title: "Abertura, Vídeo de Boas-Vindas & Oração",
      leader: "Secretaria / Pastor Dirigente",
      category: "fellowship",
      status: "ready",
    },
    {
      time: "19:10",
      durationMinutes: 28,
      title: "Louvor & Adoração Congregacional (4 Louvores)",
      leader: "Ministro de Louvor + Dança",
      category: "praise",
      status: "ready",
    },
    {
      time: "19:38",
      durationMinutes: 7,
      title: "Dízimos, Ofertas & Recepção de Visitantes",
      leader: "Diaconia & Boas-Vindas",
      category: "fellowship",
      status: "ready",
    },
    {
      time: "19:45",
      durationMinutes: 40,
      title: "Palavra Pastoral & Ministração",
      leader: "Pastor Presidente",
      category: "word",
      status: "ready",
    },
    {
      time: "20:25",
      durationMinutes: 10,
      title: "Apelo, Oração Final & Bênção Apostólica",
      leader: "Corpo Pastoral",
      category: "word",
      status: "ready",
    },
    {
      time: "20:35",
      durationMinutes: 25,
      title: "Acolhimento no Lounge dos Visitantes & Café",
      leader: "Equipe da Secretaria",
      category: "fellowship",
      status: "ready",
    },
  ];

  const totalConfirmed = deptList.reduce((acc, d) => acc + d.confirmed, 0);
  const totalSlots = deptList.reduce((acc, d) => acc + d.total, 0);
  const calculatedPercent = totalSlots > 0 ? Math.round((totalConfirmed / totalSlots) * 100) : 100;
  const score = overallScore ?? calculatedPercent;

  const scoreBadgeColor =
    score >= 90
      ? "bg-emerald-500 text-white"
      : score >= 70
        ? "bg-amber-500 text-white"
        : "bg-rose-500 text-white";

  const scoreBorderColor =
    score >= 90
      ? "border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10"
      : score >= 70
        ? "border-amber-200/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10"
        : "border-rose-200/80 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10";

  return (
    <div className={`p-5 sm:p-7 rounded-[2.5rem] border shadow-xs transition-all ${scoreBorderColor} bg-white dark:bg-slate-900`}>
      {/* HEADER DA READINESS BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Sunday Readiness Bar • Prontidão do Culto
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {serviceDateFormatted}
              </span>
            </div>
            <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
              {serviceTitle}
            </h3>
          </div>
        </div>

        {/* HEALTH SCORE & QUICK METRIC */}
        <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-slate-400 block leading-tight">
                Health Score
              </span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                {score}% Pronto
              </span>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${scoreBadgeColor}`}>
              {score >= 90 ? "A+" : score >= 70 ? "B" : "C"}
            </div>
          </div>

          <Link
            href="/dashboard/schedules"
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>Ver Escala</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* HORIZONTAL MINISTRIES READINESS PILLS */}
      <div className="pt-5 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Cobertura por Ministério</span>
          <span className="text-slate-500 font-semibold lowercase">
            {totalConfirmed}/{totalSlots} voluntários confirmados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {deptList.map((dept) => {
            const Icon = dept.icon;
            const isFull = dept.confirmed === dept.total;
            const isWarning = dept.status === "warning" || (!isFull && dept.confirmed > 0);

            return (
              <div
                key={dept.name}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  isFull
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60"
                    : isWarning
                      ? "bg-amber-50/50 dark:bg-amber-950/25 border-amber-200/90 dark:border-amber-900/70"
                      : "bg-rose-50/50 dark:bg-rose-950/25 border-rose-200/90 dark:border-rose-900/70"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isFull
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : isWarning
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {dept.name}
                    </h4>
                    <span
                      className={`text-[11px] font-black ${
                        isFull
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isWarning
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {dept.confirmed}/{dept.total} confirmados
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {isFull ? (
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        onRemindPendingWhatsApp
                          ? onRemindPendingWhatsApp(dept.name, dept.unconfirmedNames || [])
                          : window.open(
                              `https://wa.me/?text=${encodeURIComponent(
                                `Olá equipe de ${dept.name}! Lembrando de confirmar presença no culto deste domingo no app da igreja. Deus abençoe! 🙏`
                              )}`,
                              "_blank"
                            )
                      }
                      title="Disparar lembrete no WhatsApp"
                      className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>Cobrar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ORDEM DO CULTO / SETLIST BAR */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  Ordem do Culto & Setlist:
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Definido ✅
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                4 Músicas principais, momento de boas-vindas e tempo pastoral cronometrado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandedTimeline(!expandedTimeline)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>{expandedTimeline ? "Ocultar Timeline" : "Ver Linha do Tempo"}</span>
              {expandedTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* MINI-TIMELINE EXPANSÍVEL (RUN OF SHOW) */}
        <AnimatePresence>
          {expandedTimeline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pt-2"
            >
              <div className="p-5 rounded-3xl bg-slate-900 text-slate-100 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Roteiro Cronometrado do Culto (Run of Show)
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Duração Estimada: ~1h45m
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {runOfShowItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black">
                          {item.time}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {item.durationMinutes} min
                        </span>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-white line-clamp-2">
                          {item.title}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.leader}
                        </p>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="capitalize">{item.category}</span>
                        <span className="text-emerald-400 font-bold">● Pronto</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
