"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Users,
  Calendar,
  MessageCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Info,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CriticalDayItem {
  dayNumber: number;
  dateStr: string; // YYYY-MM-DD
  weekdayName: string;
  weekdayShort: string;
  availableCount: number;
  totalCount: number;
  percentage: number;
  status: "critical" | "warning"; // <30% critical, 30-49% warning
  isServiceDay: boolean;
  serviceName?: string;
  hasScheduleAlready: boolean;
  availableVolunteers: Array<{ id: string; name: string }>;
  unavailableVolunteers: Array<{ id: string; name: string }>;
}

export interface DayAvailabilityMapItem {
  dayNumber: number;
  dateStr: string;
  weekdayShort: string;
  availableCount: number;
  totalCount: number;
  percentage: number;
  isServiceDay: boolean;
  isCritical: boolean;
}

interface CriticalAvailabilityWidgetProps {
  criticalDays: CriticalDayItem[];
  allDaysAvailability?: DayAvailabilityMapItem[];
  currentMonthName: string;
  deptDisplayName?: string;
  totalTeamCount: number;
  loading?: boolean;
  onNudgeWhatsApp?: (selectedDays?: number[]) => void;
}

export function CriticalAvailabilityWidget({
  criticalDays = [],
  allDaysAvailability = [],
  currentMonthName,
  deptDisplayName = "Equipe",
  totalTeamCount = 0,
  loading = false,
  onNudgeWhatsApp,
}: CriticalAvailabilityWidgetProps) {
  const [filterMode, setFilterMode] = useState<"services" | "all" | "calendar">("services");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Filtra dias de culto críticos ou todos os dias críticos
  const filteredCriticalDays = useMemo(() => {
    if (filterMode === "services") {
      const serviceCritical = criticalDays.filter((d) => d.isServiceDay);
      return serviceCritical.length > 0 ? serviceCritical : criticalDays;
    }
    return criticalDays;
  }, [criticalDays, filterMode]);

  const criticalServiceDaysCount = criticalDays.filter((d) => d.isServiceDay).length;
  const severeDaysCount = criticalDays.filter((d) => d.percentage < 30).length;

  const handleSendTargetedWhatsApp = (specificDay?: number) => {
    if (onNudgeWhatsApp && !specificDay) {
      onNudgeWhatsApp(criticalDays.map((d) => d.dayNumber));
      return;
    }

    const daysText = specificDay
      ? `no dia ${specificDay}`
      : criticalDays.length <= 4
      ? `nos dias ${criticalDays.map((d) => `${d.dayNumber} (${d.weekdayShort})`).join(", ")}`
      : `em ${criticalDays.length} datas críticas`;

    const message = `Graça e paz, equipe! 🙏 Identificamos que ${daysText} de ${currentMonthName} estamos com menos de 50% de voluntários disponíveis para a escala. Por favor, quem tiver disponibilidade para servir, atualize no app da igreja para conseguirmos montar a escala! Deus abençoe! 🙌`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-amber-200/80 dark:border-amber-900/40 p-6 shadow-sm hover:shadow-md transition-all space-y-5">
      {/* CABEÇALHO DO WIDGET */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/50 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Disponibilidade Crítica
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                &lt; 50%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Datas em {currentMonthName} com baixo quórum antes de rodar a escala
            </p>
          </div>
        </div>

        {/* STATUS GERAL DO MÊS */}
        <div className="flex items-center gap-2">
          {criticalDays.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              {criticalDays.length} {criticalDays.length === 1 ? "data crítica" : "datas críticas"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Quórum Seguro
            </span>
          )}
        </div>
      </div>

      {/* BANNER INFORMATIVO RESUMIDO */}
      {criticalDays.length > 0 ? (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-extrabold">Atenção antes de fechar a escala:</span>{" "}
            <span>
              {criticalServiceDaysCount > 0
                ? `${criticalServiceDaysCount} ${criticalServiceDaysCount === 1 ? "culto possui" : "cultos possuem"} menos da metade da equipe disponível.`
                : `${criticalDays.length} dias possuem baixa adesão de voluntários.`}{" "}
              {severeDaysCount > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  ({severeDaysCount} com menos de 30%).
                </span>
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong className="font-bold">Tudo seguro!</strong> Todos os dias do mês contam com pelo menos 50% da equipe disponível. Pronto para criar a escala com tranquilidade.
          </span>
        </div>
      )}

      {/* TABS DE VISUALIZAÇÃO */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setFilterMode("services")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer text-center",
            filterMode === "services"
              ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs font-black"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          Dias de Culto ({criticalServiceDaysCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer text-center",
            filterMode === "all"
              ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs font-black"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          Todas as Datas ({criticalDays.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("calendar")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer text-center",
            filterMode === "calendar"
              ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs font-black"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          Grade Mensal
        </button>
      </div>

      {/* CONTEÚDO PRINCIPAL DO WIDGET */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400 animate-pulse font-medium">
          Calculando disponibilidade dos voluntários...
        </div>
      ) : filterMode === "calendar" ? (
        /* VISÃO DE GRADE MENSAL COM CORES DE ADESÃO */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Visão rápida dos dias do mês</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> &lt; 30%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 30-49%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ≥ 50%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {allDaysAvailability.map((item) => {
              const isSevere = item.percentage < 30;
              const isWarning = item.percentage >= 30 && item.percentage < 50;
              const isSafe = item.percentage >= 50;

              return (
                <div
                  key={`avail-day-${item.dayNumber}`}
                  className={cn(
                    "p-2 rounded-xl border text-center flex flex-col items-center justify-between transition-all aspect-square relative",
                    isSevere
                      ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 font-black"
                      : isWarning
                      ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 font-bold"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                  )}
                  title={`Dia ${item.dayNumber} (${item.weekdayShort}): ${item.percentage}% de voluntários disponíveis (${item.availableCount}/${item.totalCount})`}
                >
                  <span className="text-[9px] uppercase opacity-60 leading-none">
                    {item.weekdayShort}
                  </span>
                  <span className="text-sm font-extrabold">{item.dayNumber}</span>
                  <span
                    className={cn(
                      "text-[9px] px-1 rounded-sm font-black leading-tight",
                      isSevere
                        ? "bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200"
                        : isWarning
                        ? "bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                        : "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {item.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : filteredCriticalDays.length > 0 ? (
        /* LISTAGEM DOS DIAS CRÍTICOS (< 50%) */
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {filteredCriticalDays.map((day) => {
            const isSevere = day.percentage < 30;
            const isExpanded = expandedDay === day.dayNumber;

            return (
              <div
                key={`critical-day-${day.dayNumber}`}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all space-y-2.5",
                  isSevere
                    ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                    : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black shrink-0 shadow-2xs",
                        isSevere
                          ? "bg-rose-600 text-white"
                          : "bg-amber-500 text-white"
                      )}
                    >
                      <span className="text-[9px] uppercase leading-none opacity-80">
                        {day.weekdayShort}
                      </span>
                      <span className="text-sm leading-tight">{day.dayNumber}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                          {day.weekdayName}, dia {day.dayNumber}
                        </span>
                        {day.isServiceDay && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Culto
                          </span>
                        )}
                        {day.hasScheduleAlready && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Escala criada
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                        {day.availableCount} de {day.totalCount} voluntários disponíveis
                      </p>
                    </div>
                  </div>

                  {/* PERCENTUAL E EXPANDIR */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-xs font-black tracking-tight",
                        isSevere
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                      )}
                    >
                      {day.percentage}%
                    </span>

                    <button
                      type="button"
                      onClick={() => setExpandedDay(isExpanded ? null : day.dayNumber)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      title={isExpanded ? "Ocultar nomes" : "Ver voluntários disponíveis"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* BARRA DE PROGRESSO DE DISPONIBILIDADE DO DIA */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isSevere ? "bg-rose-500" : "bg-amber-500"
                    )}
                    style={{ width: `${day.percentage}%` }}
                  />
                </div>

                {/* DETALHES EXPANSÍVEIS: QUEM PODE E QUEM NÃO PODE */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs space-y-2"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 block mb-1">
                        Disponíveis ({day.availableVolunteers.length}):
                      </span>
                      {day.availableVolunteers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {day.availableVolunteers.map((v) => (
                            <span
                              key={v.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            >
                              {v.name.split(" ")[0]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Nenhum voluntário marcou disponibilidade.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        Indisponíveis / Não responderam: {day.unavailableVolunteers.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSendTargetedWhatsApp(day.dayNumber)}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Pedir reforço para este dia
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-850 rounded-2xl p-4">
          Nenhuma data de culto com menos de 50% de disponibilidade encontrada.
        </div>
      )}

      {/* RODAPÉ COM AÇÕES RÁPIDAS ANTES DE ESCALAR */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {criticalDays.length > 0 ? (
          <button
            type="button"
            onClick={() => handleSendTargetedWhatsApp()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Enviar mensagem cobrando disponibilidade para as datas críticas"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Cobrar Datas Críticas no WhatsApp</span>
          </button>
        ) : (
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Escala pronta para ser montada</span>
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Link
            href="/dashboard/availability"
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:underline px-2.5 py-1.5 transition-colors"
          >
            Ver Quadro Completo
          </Link>
          <Link
            href="/dashboard/schedules"
            className="text-xs font-bold text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 transition-all flex items-center gap-1"
          >
            <span>Montar Escala</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
