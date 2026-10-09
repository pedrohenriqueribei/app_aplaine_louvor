"use client";

import React from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  ShieldAlert,
  Flame,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";

export interface VitalKpiData {
  healthScore: number;
  healthSubtext: string;
  criticalGapsCount: number;
  criticalGapsSubtext: string;
  burnoutRiskCount: number;
  burnoutSubtext: string;
  slaVisitorsRate: number;
  slaVisitorsSubtext: string;
  pendingVisitorsCount: number;
}

interface VitalKpisRowProps {
  metrics: VitalKpiData;
  onOpenKpiModal: (kpiId: "confirmation" | "gaps" | "burnout" | "visitors") => void;
  onToggleGuide?: () => void;
  showGuide?: boolean;
}

export function VitalKpisRow({
  metrics,
  onOpenKpiModal,
  onToggleGuide,
  showGuide,
}: VitalKpisRowProps) {
  const cards = [
    {
      id: "confirmation" as const,
      title: "% Confirmação Domingo",
      value: `${metrics.healthScore}%`,
      subtitle: metrics.healthScore >= 85 ? "Paz de Espírito" : "Atenção Necessária",
      statusColor: metrics.healthScore >= 85 ? "text-emerald-800 dark:text-emerald-400" : "text-amber-800 dark:text-amber-400",
      badgeBg: metrics.healthScore >= 85 ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      iconBg: metrics.healthScore >= 85 ? "bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
      icon: CheckCircle2,
      subtext: metrics.healthSubtext,
      progress: metrics.healthScore,
      progressColor: metrics.healthScore >= 85 ? "bg-emerald-500" : "bg-amber-500",
      diagnosticLabel: "Ver status da escala",
    },
    {
      id: "gaps" as const,
      title: "Buracos Críticos",
      value: metrics.criticalGapsCount === 0 ? "0" : `${metrics.criticalGapsCount}`,
      valueSuffix: metrics.criticalGapsCount === 1 ? "vaga" : "vagas",
      subtitle: metrics.criticalGapsCount === 0 ? "100% Coberto" : "Ação Imediata",
      statusColor: metrics.criticalGapsCount === 0 ? "text-emerald-800 dark:text-emerald-400" : "text-rose-800 dark:text-rose-400",
      badgeBg: metrics.criticalGapsCount === 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      iconBg: metrics.criticalGapsCount === 0 ? "bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-rose-500/10 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400",
      icon: ShieldAlert,
      subtext: metrics.criticalGapsSubtext,
      progress: metrics.criticalGapsCount === 0 ? 100 : Math.max(15, 100 - metrics.criticalGapsCount * 30),
      progressColor: metrics.criticalGapsCount === 0 ? "bg-emerald-500" : "bg-rose-500",
      diagnosticLabel: "Preencher vagas",
    },
    {
      id: "burnout" as const,
      title: "Risco Sobrecarga",
      value: `${metrics.burnoutRiskCount}`,
      valueSuffix: metrics.burnoutRiskCount === 1 ? "alerta" : "alertas",
      subtitle: metrics.burnoutRiskCount === 0 ? "Equipe Saudável" : "Risco de Fadiga",
      statusColor: metrics.burnoutRiskCount === 0 ? "text-emerald-800 dark:text-emerald-400" : "text-amber-800 dark:text-amber-400",
      badgeBg: metrics.burnoutRiskCount === 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      iconBg: metrics.burnoutRiskCount === 0 ? "bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
      icon: Flame,
      subtext: metrics.burnoutSubtext,
      progress: metrics.burnoutRiskCount === 0 ? 100 : Math.max(20, 100 - metrics.burnoutRiskCount * 25),
      progressColor: metrics.burnoutRiskCount === 0 ? "bg-emerald-500" : "bg-amber-500",
      diagnosticLabel: "Ver voluntários descansados",
    },
    {
      id: "visitors" as const,
      title: "SLA Atendimento",
      value: `${metrics.slaVisitorsRate}%`,
      subtitle: metrics.pendingVisitorsCount === 0 ? "100% no Prazo (48h)" : `${metrics.pendingVisitorsCount} Pendentes`,
      statusColor: metrics.pendingVisitorsCount === 0 ? "text-emerald-800 dark:text-emerald-400" : "text-indigo-800 dark:text-indigo-400",
      badgeBg: metrics.pendingVisitorsCount === 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" : "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
      iconBg: metrics.pendingVisitorsCount === 0 ? "bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-indigo-500/10 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400",
      icon: Clock,
      subtext: metrics.slaVisitorsSubtext,
      progress: metrics.slaVisitorsRate,
      progressColor: metrics.pendingVisitorsCount === 0 ? "bg-emerald-500" : "bg-indigo-500",
      diagnosticLabel: "Acolher visitantes",
    },
  ];

  return (
    <div className="space-y-4">
      {/* LINHA 1: KPIS VITAIS HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-800/10 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-display font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>Linha 1 • KPIs Vitais da Igreja</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                Operação em Tempo Real
              </span>
            </h3>
          </div>
        </div>

        {onToggleGuide && (
          <button
            onClick={onToggleGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400" />
            <span>{showGuide ? "Ocultar Guia dos Indicadores" : "Entender Métricas"}</span>
          </button>
        )}
      </div>

      {/* OS 4 CARDS DOS KPIS VITAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={() => onOpenKpiModal(card.id)}
            className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                  <card.icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-3xl font-display font-black tracking-tight ${card.statusColor}`}>
                  {card.value}
                </span>
                {card.valueSuffix && (
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                    {card.valueSuffix}
                  </span>
                )}
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${card.badgeBg}`}>
                  {card.subtitle}
                </span>
              </div>

              {/* BARRA DE PROGRESSO */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full my-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${card.progressColor}`}
                  style={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                {card.subtext}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-3 flex items-center justify-between text-[11px] font-bold text-blue-800 dark:text-blue-400 group-hover:underline">
              <span>{card.diagnosticLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
