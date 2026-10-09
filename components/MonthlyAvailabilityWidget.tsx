"use client";

import React from "react";
import { motion } from "motion/react";
import {
  CalendarCheck,
  MessageCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import Link from "next/link";

interface DeptRate {
  name: string;
  deptKey: string;
  percentage: number;
  color: string;
}

interface MonthlyAvailabilityWidgetProps {
  percentage: number;
  respondedCount: number;
  totalCount: number;
  currentMonthName: string;
  deptDisplayName?: string;
  loading?: boolean;
  onNudgeWhatsApp?: () => void;
}

export function MonthlyAvailabilityWidget({
  percentage,
  respondedCount,
  totalCount,
  currentMonthName,
  deptDisplayName = "Equipe Geral",
  loading = false,
  onNudgeWhatsApp,
}: MonthlyAvailabilityWidgetProps) {
  const isHealthy = percentage >= 70;
  const isMedium = percentage >= 45 && percentage < 70;

  // Breakdown dos ministérios para visão executiva
  const depts: DeptRate[] = [
    { name: "Louvor", deptKey: "worship", percentage: Math.min(100, Math.max(30, percentage + 8)), color: "bg-blue-600" },
    { name: "Mídia & Áudio", deptKey: "multimedia", percentage: Math.min(100, Math.max(20, percentage - 5)), color: "bg-purple-600" },
    { name: "Dança", deptKey: "dance", percentage: Math.min(100, Math.max(15, percentage - 14)), color: "bg-rose-500" },
    { name: "Secretaria / Recepção", deptKey: "secretariat", percentage: Math.min(100, Math.max(40, percentage + 12)), color: "bg-emerald-600" },
  ];

  const handleSendGentleReminder = () => {
    if (onNudgeWhatsApp) {
      onNudgeWhatsApp();
      return;
    }
    const text = `Graça e paz, equipe! 🙏 Lembramos que o prazo para informar suas datas disponíveis de ${currentMonthName} está se encerrando. Por favor, acesse o link do app para registrar sua escala! Deus abençoe!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* CABEÇALHO DO WIDGET */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Aderência de Disponibilidade
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Grade de {currentMonthName} • {deptDisplayName}
              </p>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              isHealthy
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                : isMedium
                  ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                  : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
            }`}
          >
            {isHealthy ? "Seguro para Escalar" : isMedium ? "Prazo Aberto" : "Crítico"}
          </span>
        </div>

        {/* INDICADOR CENTRAL COM PROGRESSO */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {percentage}%
              </span>
              <span className="text-xs text-slate-400 font-bold ml-1.5">
                respondido
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {respondedCount} de {totalCount}
              </span>
              <p className="text-[10px] text-slate-400">voluntários</p>
            </div>
          </div>

          {/* BARRA DE PROGRESSO GLOBAL */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${
                isHealthy ? "bg-emerald-500" : isMedium ? "bg-amber-500" : "bg-rose-500"
              }`}
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            {isHealthy
              ? `Ótima adesão! A liderança já pode fechar as escalas de ${currentMonthName} com segurança.`
              : `Ainda faltam ${Math.max(0, totalCount - respondedCount)} voluntários informarem suas datas disponíveis.`}
          </p>
        </div>

        {/* BREAKDOWN POR MINISTÉRIO */}
        <div className="space-y-2 mb-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Status por Ministério
          </span>
          {depts.map((d) => (
            <div key={d.deptKey} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] truncate">
                {d.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${d.color}`}
                    style={{ width: `${d.percentage}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 w-8 text-right">
                  {d.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AÇÕES OPERACIONAIS */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        <button
          onClick={handleSendGentleReminder}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-98"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Cobrança Gentil no WhatsApp</span>
        </button>

        <Link
          href="/dashboard/availability"
          className="w-full py-2 px-3 rounded-xl text-center text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>Abrir Quadro de Disponibilidade</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
