"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Music,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export interface ScheduledDayHeatmap {
  date: string; // YYYY-MM-DD
  title: string;
  time?: string;
  status: "safe" | "warning" | "critical";
  totalSlots: number;
  confirmedSlots: number;
  missingRoles: string[];
  scheduleId?: string;
  ministries: string[];
}

interface CompactCalendarHeatmapProps {
  schedules?: ScheduledDayHeatmap[];
  onSelectDay?: (day: ScheduledDayHeatmap) => void;
}

export function CompactCalendarHeatmap({
  schedules = [],
  onSelectDay,
}: CompactCalendarHeatmapProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Gera dados simulados caso schedules venha vazio ou parcial para preencher os domingos do mês
  const enrichedSchedules = useMemo(() => {
    const map = new Map<string, ScheduledDayHeatmap>();
    schedules.forEach((s) => map.set(s.date, s));

    // Garantir que os próximos domingos deste mês tenham status visual
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const isSunday = dateObj.getDay() === 0;
      const isWednesday = dateObj.getDay() === 3;
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      if (!map.has(dateKey)) {
        if (isSunday) {
          // Domingo com status variado
          if (d <= 7) {
            map.set(dateKey, {
              date: dateKey,
              title: "Culto de Celebração 19h",
              time: "19:00",
              status: "safe",
              totalSlots: 14,
              confirmedSlots: 14,
              missingRoles: [],
              ministries: ["Louvor", "Mídia", "Recepção", "Dança"],
            });
          } else if (d <= 14) {
            map.set(dateKey, {
              date: dateKey,
              title: "Culto de Celebração 19h",
              time: "19:00",
              status: "critical",
              totalSlots: 14,
              confirmedSlots: 11,
              missingRoles: ["Operador de Transmissão", "Baterista"],
              ministries: ["Louvor", "Mídia", "Recepção"],
            });
          } else if (d <= 21) {
            map.set(dateKey, {
              date: dateKey,
              title: "Culto de Família 10h & 19h",
              time: "10:00 / 19:00",
              status: "warning",
              totalSlots: 16,
              confirmedSlots: 12,
              missingRoles: ["2 Dançarinas"],
              ministries: ["Louvor", "Dança"],
            });
          } else {
            map.set(dateKey, {
              date: dateKey,
              title: "Culto de Domingo 19h",
              time: "19:00",
              status: "safe",
              totalSlots: 12,
              confirmedSlots: 12,
              missingRoles: [],
              ministries: ["Louvor", "Mídia"],
            });
          }
        } else if (isWednesday && d >= 10 && d <= 20) {
          map.set(dateKey, {
            date: dateKey,
            title: "Culto de Ensino & Oração",
            time: "20:00",
            status: "safe",
            totalSlots: 6,
            confirmedSlots: 6,
            missingRoles: [],
            ministries: ["Louvor"],
          });
        }
      }
    }

    return map;
  }, [schedules, currentDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Seleção de dia interativo
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(() => {
    // Default selecionar o primeiro domingo com culto
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (enrichedSchedules.has(key)) {
        return key;
      }
    }
    return null;
  });

  const selectedSchedule = selectedDayKey ? enrichedSchedules.get(selectedDayKey) : null;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayKey(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayKey(null);
  };

  // Resumo do mês
  const monthlyStats = useMemo(() => {
    let safeCount = 0;
    let warnCount = 0;
    let critCount = 0;

    enrichedSchedules.forEach((s) => {
      const [sYear, sMonth] = s.date.split("-").map(Number);
      if (sYear === year && sMonth === month + 1) {
        if (s.status === "safe") safeCount++;
        else if (s.status === "warning") warnCount++;
        else if (s.status === "critical") critCount++;
      }
    });

    return { safeCount, warnCount, critCount, total: safeCount + warnCount + critCount };
  }, [enrichedSchedules, year, month]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6">
      {/* HEADER DO MINI-CALENDÁRIO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Heatmap de Escalas
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                Visão Mensal
              </span>
            </div>
            <h3 className="text-base font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Calendário de Cobertura de Voluntários
            </h3>
          </div>
        </div>

        {/* NAVEGAÇÃO DO MÊS */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-slate-800 dark:text-slate-100 min-w-[110px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CALENDÁRIO HEATMAP GRID (7 COLUNAS) */}
        <div className="lg:col-span-7 space-y-3">
          {/* DIAS DA SEMANA */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* DIAS DO MÊS */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Espaços vazios antes do dia 1 */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 sm:h-12 rounded-xl bg-slate-50/40 dark:bg-slate-800/20" />
            ))}

            {/* Dias do mês */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const schedule = enrichedSchedules.get(dateKey);
              const isSelected = selectedDayKey === dateKey;

              let cellStyle = "bg-slate-50 dark:bg-slate-800/40 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";
              let badgeColor = "";

              if (schedule) {
                if (schedule.status === "safe") {
                  cellStyle = isSelected
                    ? "bg-emerald-600 text-white font-black shadow-md ring-2 ring-emerald-500/40"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-200/80 dark:border-emerald-800/60";
                  badgeColor = "bg-emerald-500";
                } else if (schedule.status === "warning") {
                  cellStyle = isSelected
                    ? "bg-amber-500 text-white font-black shadow-md ring-2 ring-amber-400/40"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-bold border border-amber-200/80 dark:border-amber-800/60";
                  badgeColor = "bg-amber-500";
                } else if (schedule.status === "critical") {
                  cellStyle = isSelected
                    ? "bg-rose-600 text-white font-black shadow-md ring-2 ring-rose-500/40 animate-pulse"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-bold border border-rose-200/80 dark:border-rose-800/60";
                  badgeColor = "bg-rose-500";
                }
              }

              return (
                <button
                  key={dateKey}
                  onClick={() => {
                    setSelectedDayKey(dateKey);
                    if (schedule && onSelectDay) onSelectDay(schedule);
                  }}
                  className={`h-10 sm:h-12 rounded-xl transition-all relative flex flex-col items-center justify-center text-xs cursor-pointer ${cellStyle}`}
                >
                  <span>{dayNum}</span>
                  {schedule && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? "bg-white" : badgeColor
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* LEGENDA DO HEATMAP */}
          <div className="pt-3 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-500 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>100% Seguro</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Atenção / Parcial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Escassez Crítica</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>Sem Culto</span>
            </div>
          </div>
        </div>

        {/* DETALHE DO DIA SELECIONADO (DRAWER/CARD LATERAL) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-700">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Diagnóstico do Dia
              </span>
              {selectedDayKey && (
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {selectedDayKey.split("-").reverse().join("/")}
                </span>
              )}
            </div>

            {selectedSchedule ? (
              <div className="pt-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {selectedSchedule.title}
                    </h4>
                    {selectedSchedule.time && (
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {selectedSchedule.time}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedSchedule.status === "safe"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : selectedSchedule.status === "warning"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                    }`}
                  >
                    {selectedSchedule.status === "safe"
                      ? "100% Seguro"
                      : selectedSchedule.status === "warning"
                        ? "Pendente"
                        : "Escassez Crítica"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Confirmados:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedSchedule.confirmedSlots} de {selectedSchedule.totalSlots} vagas
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        selectedSchedule.status === "safe"
                          ? "bg-emerald-500"
                          : selectedSchedule.status === "warning"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{
                        width: `${Math.round(
                          (selectedSchedule.confirmedSlots / selectedSchedule.totalSlots) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {selectedSchedule.missingRoles.length > 0 ? (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs">
                    <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold mb-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Buracos Críticos na Escala:</span>
                    </div>
                    <ul className="list-disc list-inside text-rose-600 dark:text-rose-300 space-y-0.5">
                      {selectedSchedule.missingRoles.map((role, rIdx) => (
                        <li key={rIdx}>{role}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Todas as posições obrigatórias preenchidas e confirmadas.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-8 text-center text-slate-400 text-xs">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Nenhum culto programado para esta data.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecione um dos dias destacados com ponto colorido.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard/schedules"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Gerenciar Escala deste Dia</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
