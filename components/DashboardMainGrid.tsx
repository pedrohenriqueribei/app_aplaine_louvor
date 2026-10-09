"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Users,
  Music,
  Calendar,
} from "lucide-react";
import { SundayReadinessBar } from "./SundayReadinessBar";
import { CompactCalendarHeatmap, ScheduledDayHeatmap } from "./CompactCalendarHeatmap";
import { BirthdayCarousel } from "./BirthdayCarousel";
import { MonthlyAvailabilityWidget } from "./MonthlyAvailabilityWidget";
import { TopPlayedSongsWidget } from "./TopPlayedSongsWidget";
import { ChurchAnnouncementsFeed } from "./ChurchAnnouncementsFeed";

export interface PredictiveAlertItem {
  id: string;
  type: "urgency" | "attention" | "goal" | "critical" | "warning" | "opportunity" | "celebration" | string;
  badge: string;
  title: string;
  description: string;
  category?: "all" | "urgency" | "attention" | "goal" | "schedules" | "reminders" | string;
  actionLabel?: string;
  actionType?: "substitute" | "rested" | "burnout" | "repertoire" | "reminder" | "visitors" | "link";
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  date?: string;
}

export interface UpcomingScheduleItem {
  id: string;
  date: string;
  ministry?: "worship" | "multimedia" | "dance" | string;
  locationName?: string;
  membersCount: number;
  songsCount: number;
  missingRoles: string[];
  hasRehearsal?: boolean;
}

interface DashboardMainGridProps {
  predictiveAlerts: PredictiveAlertItem[];
  upcomingSchedules: UpcomingScheduleItem[];
  filteredUpcomingSchedules: UpcomingScheduleItem[];
  calendarHeatmapSchedules: ScheduledDayHeatmap[];
  kpiMetrics: {
    healthScore: number;
  };
  monthBirthdays: any[];
  loadingBirthdays: boolean;
  currentMonthName: string;
  churchName: string;
  deptAvailabilityStats: {
    percentage: number;
    respondedCount: number;
    totalCount: number;
    deptDisplayName?: string;
    loading?: boolean;
  };
  onAlertAction: (alert: PredictiveAlertItem) => void;
  onNudgeAvailability: () => void;
  onOpenForgottenSongs: () => void;
  onCopyBirthdayToast: (name: string) => void;
}

export function DashboardMainGrid({
  predictiveAlerts,
  upcomingSchedules,
  filteredUpcomingSchedules,
  calendarHeatmapSchedules,
  kpiMetrics,
  monthBirthdays,
  loadingBirthdays,
  currentMonthName,
  churchName,
  deptAvailabilityStats,
  onAlertAction,
  onNudgeAvailability,
  onOpenForgottenSongs,
  onCopyBirthdayToast,
}: DashboardMainGridProps) {
  const router = useRouter();
  const [alertsFilter, setAlertsFilter] = useState<"all" | "urgency" | "attention" | "goal">("all");
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Helpers
  const formatScheduleDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const weekdays = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];
    return `${weekdays[d.getDay()]}, ${day}/${month}`;
  };

  const activeAlerts = useMemo(() => {
    return predictiveAlerts.filter((a) => !dismissedAlerts.includes(a.id));
  }, [predictiveAlerts, dismissedAlerts]);

  const filteredAlerts = useMemo(() => {
    if (alertsFilter === "all") return activeAlerts;
    if (alertsFilter === "urgency") return activeAlerts.filter((a) => a.type === "urgency" || a.type === "critical");
    if (alertsFilter === "attention") return activeAlerts.filter((a) => a.type === "attention" || a.type === "warning");
    if (alertsFilter === "goal") return activeAlerts.filter((a) => a.type === "goal" || a.type === "celebration" || a.type === "opportunity");
    return activeAlerts;
  }, [activeAlerts, alertsFilter]);

  const countUrgency = activeAlerts.filter((a) => a.type === "urgency" || a.type === "critical").length;
  const countAttention = activeAlerts.filter((a) => a.type === "attention" || a.type === "warning").length;
  const countGoal = activeAlerts.filter((a) => a.type === "goal" || a.type === "celebration" || a.type === "opportunity").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* ===================================================================== */}
      {/* COLUNA PRINCIPAL (2/3 da largura, lg:col-span-8) */}
      {/* • Central de Alertas e Insights */}
      {/* • Status do Próximo Culto (Linha do Tempo das Equipes + Setlist) */}
      {/* • Próximas Atividades / Ensaios */}
      {/* ===================================================================== */}
      <div className="lg:col-span-8 space-y-8 min-w-0">
        
        {/* 1. CENTRAL DE ALERTAS E INSIGHTS */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    Central de Alertas e Insights
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Antecipação Ativa
                  </span>
                  {activeAlerts.length > 0 && (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      ({activeAlerts.length} identificados)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Previsões automatizadas para agir antes que o culto seja impactado
                </p>
              </div>
            </div>

            {/* FILTROS DE ALERTAS POR PRIORIDADE */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl self-start sm:self-auto flex-wrap">
              <button
                onClick={() => setAlertsFilter("all")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  alertsFilter === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Todos ({activeAlerts.length})
              </button>
              <button
                onClick={() => setAlertsFilter("urgency")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  alertsFilter === "urgency"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Urgência ({countUrgency})
              </button>
              <button
                onClick={() => setAlertsFilter("attention")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  alertsFilter === "attention"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                }`}
              >
                Atenção ({countAttention})
              </button>
              <button
                onClick={() => setAlertsFilter("goal")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  alertsFilter === "goal"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
              >
                Metas ({countGoal})
              </button>
            </div>
          </div>

          {/* LISTAGEM DOS ALERTAS EM CARDS COM CORES CONTEXTUAIS */}
          {filteredAlerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredAlerts.map((alert) => {
                  const isUrgent = alert.type === "urgency";
                  const isAttention = alert.type === "attention";

                  const containerBorder = isUrgent
                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                    : isAttention
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                      : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50";

                  const badgeStyle = isUrgent
                    ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                    : isAttention
                      ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";

                  const iconBox = isUrgent
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : isAttention
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

                  const btnStyle = isUrgent
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 shadow-md"
                    : isAttention
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 shadow-md"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 shadow-md";

                  return (
                    <motion.div
                      key={alert.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-5 rounded-[2rem] border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${containerBorder}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeStyle}`}>
                            {alert.badge}
                          </span>
                          <button
                            onClick={() => setDismissedAlerts((prev) => [...prev, alert.id])}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            title="Dispensar alerta"
                          >
                            Dispensar
                          </button>
                        </div>

                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconBox}`}>
                            {isUrgent ? (
                              <ShieldAlert className="w-4 h-4" />
                            ) : isAttention ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                              {alert.title}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                              {alert.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* AÇÕES SUGERIDAS (1 CLIQUE OU ATALHO) */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2 flex items-center justify-between gap-2 flex-wrap">
                        {alert.secondaryActionLabel && alert.secondaryActionHref ? (
                          <Link
                            href={alert.secondaryActionHref}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
                          >
                            <span>{alert.secondaryActionLabel}</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <div />
                        )}

                        {alert.actionLabel && (
                          alert.actionType && alert.actionType !== "link" ? (
                            <button
                              onClick={() => onAlertAction(alert)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${btnStyle}`}
                            >
                              <span>{alert.actionLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : alert.actionHref ? (
                            <Link
                              href={alert.actionHref}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${btnStyle}`}
                            >
                              <span>{alert.actionLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : null
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-[2.5rem] p-6 sm:p-8 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Nenhum alerta pendente nesta categoria!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Todas as metas estão em ordem ou você filtrou por uma prioridade sem pendências ativas.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 2. STATUS DO PRÓXIMO CULTO (LINHA DO TEMPO DAS EQUIPES + SETLIST) */}
        <section className="space-y-4">
          <SundayReadinessBar
            serviceTitle={
              upcomingSchedules[0]
                ? `Culto de ${formatScheduleDate(upcomingSchedules[0].date)}`
                : "Culto de Domingo 19h (Celebração)"
            }
            serviceDateFormatted={
              upcomingSchedules[0]
                ? formatScheduleDate(upcomingSchedules[0].date)
                : "Próximo Domingo • 19:00"
            }
            overallScore={kpiMetrics.healthScore}
            scheduleId={upcomingSchedules[0]?.id}
            onRemindPendingWhatsApp={(deptName) => {
              const text = `Olá equipe de ${deptName}! Graça e paz! Lembrando de confirmar sua presença na escala deste domingo no app da igreja. Que Deus abençoe! 🙏`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
            }}
          />
        </section>

        {/* 3. PRÓXIMAS ATIVIDADES / ENSAIOS & MAPA DE CALOR */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Próximas Atividades & Ensaios
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Cultos agendados, ensaios marcados e mapa de calor do mês
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/dashboard/availability")}
                className="flex items-center gap-1.5 text-xs font-bold bg-blue-800 text-white px-3.5 py-2 rounded-xl hover:bg-blue-900 transition-all shadow-xs active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Disponibilidade</span>
              </button>
              <button
                onClick={() => router.push("/dashboard/schedules")}
                className="text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
              >
                Ver todas
              </button>
            </div>
          </div>

          {/* VISÃO DE CALENDÁRIO COMPACTO COM HEATMAP */}
          <CompactCalendarHeatmap
            schedules={calendarHeatmapSchedules}
          />

          {/* LISTAGEM DAS PRÓXIMAS ESCALAS */}
          {filteredUpcomingSchedules.length > 0 ? (
            <div className="space-y-3">
              {filteredUpcomingSchedules.map((schedule) => {
                const ministryLabel =
                  schedule.ministry === "dance"
                    ? "Dança"
                    : schedule.ministry === "multimedia"
                      ? "Multimídia"
                      : "Louvor";

                const ministryBadgeColor =
                  schedule.ministry === "dance"
                    ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                    : schedule.ministry === "multimedia"
                      ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                      : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300";

                return (
                  <div
                    key={schedule.id}
                    className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-800 dark:text-slate-100 shrink-0 font-bold">
                        <span className="text-[10px] uppercase text-slate-400">Dia</span>
                        <span className="text-sm font-black">{schedule.date.split("-")[2]}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                            {formatScheduleDate(schedule.date)}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${ministryBadgeColor}`}>
                            {ministryLabel}
                          </span>
                          {schedule.hasRehearsal && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                              Ensaio marcado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3.5 text-xs text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {schedule.membersCount} integrantes
                          </span>
                          {schedule.ministry === "worship" && (
                            <span className="flex items-center gap-1">
                              <Music className="w-3.5 h-3.5" />
                              {schedule.songsCount} músicas
                            </span>
                          )}
                          {schedule.missingRoles.length > 0 && (
                            <span className="text-rose-500 font-bold">
                              Falta: {schedule.missingRoles.slice(0, 2).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/dashboard/schedules"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-800 hover:text-white dark:hover:bg-blue-700 text-slate-700 dark:text-slate-200 transition-all self-start sm:self-auto"
                    >
                      <span>Abrir Escala</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xs text-center">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                Nenhuma escala para os próximos dias
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 max-w-sm mx-auto">
                Crie uma nova escala e convoque os voluntários da igreja.
              </p>
              <button
                onClick={() => router.push("/dashboard/schedules")}
                className="px-4 py-2 rounded-xl bg-blue-800 text-white font-bold text-xs hover:bg-blue-900 transition-all shadow-md"
              >
                Criar Nova Escala
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ===================================================================== */}
      {/* COLUNA LATERAL (1/3 da largura, lg:col-span-4) */}
      {/* • Aniversariantes (com botão ZAP) */}
      {/* • Aderência de Disponibilidade do Mês */}
      {/* • Músicas mais tocadas no Mês */}
      {/* • Feed de Últimos Avisos da Igreja */}
      {/* ===================================================================== */}
      <aside className="lg:col-span-4 space-y-6 min-w-0">
        
        {/* 1. ANIVERSARIANTES (COM BOTÃO ZAP) */}
        <section id="aniversariantes-do-mes">
          <BirthdayCarousel
            birthdays={monthBirthdays}
            loading={loadingBirthdays}
            currentMonthName={currentMonthName}
            churchName={churchName || "Nossa Igreja"}
            onCopyToast={onCopyBirthdayToast}
          />
        </section>

        {/* 2. ADERÊNCIA DE DISPONIBILIDADE DO MÊS */}
        <MonthlyAvailabilityWidget
          percentage={deptAvailabilityStats.percentage}
          respondedCount={deptAvailabilityStats.respondedCount}
          totalCount={deptAvailabilityStats.totalCount}
          currentMonthName={currentMonthName}
          deptDisplayName={deptAvailabilityStats.deptDisplayName}
          loading={deptAvailabilityStats.loading}
          onNudgeWhatsApp={onNudgeAvailability}
        />

        {/* 3. MÚSICAS MAIS TOCADAS NO MÊS */}
        <TopPlayedSongsWidget
          forgottenSongsCount={12}
          onOpenForgottenSongs={onOpenForgottenSongs}
        />

        {/* 4. FEED DE ÚLTIMOS AVISOS DA IGREJA */}
        <ChurchAnnouncementsFeed />

      </aside>
    </div>
  );
}
