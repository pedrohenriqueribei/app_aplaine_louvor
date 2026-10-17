"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Music,
  Video,
  Sparkles,
  AlertCircle,
  X,
  Check,
  Users,
  MessageCircle,
  Bell,
  Zap,
  ThumbsUp,
  MapPin,
  Loader2,
  ChevronRight,
  UserCheck,
  UserX,
  Share2,
  RotateCcw,
  Sparkle,
} from "lucide-react";
import { doc, updateDoc, arrayUnion, arrayRemove, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auditUpdate } from "@/lib/audit";

export interface ScheduleConfirmationData {
  status: "confirmed" | "declined";
  confirmedAt?: string;
  declinedAt?: string;
  userName?: string;
  reason?: string;
}

export interface QuickScheduleItem {
  id: string;
  date: string;
  churchId: string;
  ministry?: "worship" | "multimedia" | "dance" | string;
  locationName?: string;
  members: string[];
  roles?: Record<string, any>;
  songs?: string[];
  playlist?: string[];
  rehearsalDate?: string;
  rehearsalTime?: string;
  confirmations?: Record<string, ScheduleConfirmationData>;
  confirmedMembers?: string[];
  declinedMembers?: string[];
  [key: string]: any;
}

interface QuickScheduleConfirmationBannerProps {
  schedules: QuickScheduleItem[];
  currentUserId?: string;
  currentUserName?: string;
  churchName?: string;
  allMembers?: Array<{ id: string; name: string; phone?: string; role?: string }>;
  onConfirmationSuccess?: (scheduleId: string, status: "confirmed" | "declined") => void;
  isLeader?: boolean;
}

const roleNameMap: Record<string, string> = {
  mainMinister: "Ministro(a) Principal",
  soprano: "Vocal (Soprano)",
  contralto: "Vocal (Contralto)",
  mezzoSoprano: "Vocal (Mezzo)",
  baritone: "Vocal (Barítono)",
  keyboardist: "Tecladista",
  acousticGuitarist: "Violão",
  electricGuitarist: "Guitarrista",
  bassist: "Baixista",
  drummer: "Baterista",
  audioTech: "Técnico de Som",
  projectionOperator: "Projeção",
  pcOperators: "Operador de Projeção",
  audioOperators: "Operador de Áudio",
  socialMediaOperators: "Transmissão & Redes",
  photographyOperators: "Fotografia",
  cameraOperators: "Câmera / Vídeo",
  danceLeader: "Líder de Dança",
  dancers: "Dançarino(a)",
  choreographer: "Coreógrafo(a)",
  choreographers: "Coreógrafo(a)",
  costume: "Figurino",
  costumeManagers: "Figurino",
  rehearsalDirector: "Direção de Ensaio",
  rehearsalDirectors: "Direção de Ensaio",
};

export function getUserRoleInSchedule(schedule: QuickScheduleItem, userId: string): string[] {
  const rolesFound: string[] = [];
  const r = schedule.roles || {};

  for (const [key, val] of Object.entries(r)) {
    if (val === userId) {
      rolesFound.push(roleNameMap[key] || key);
    } else if (Array.isArray(val) && val.includes(userId)) {
      rolesFound.push(roleNameMap[key] || key);
    }
  }

  if (rolesFound.length === 0 && Array.isArray(schedule.members) && schedule.members.includes(userId)) {
    rolesFound.push(
      schedule.ministry === "dance"
        ? "Integrante (Dança)"
        : schedule.ministry === "multimedia"
        ? "Equipe de Mídia"
        : "Equipe de Louvor"
    );
  }

  return rolesFound;
}

export function QuickScheduleConfirmationBanner({
  schedules = [],
  currentUserId,
  currentUserName = "Voluntário",
  churchName = "Nossa Igreja",
  allMembers = [],
  onConfirmationSuccess,
  isLeader = false,
}: QuickScheduleConfirmationBannerProps) {
  const [loadingScheduleId, setLoadingScheduleId] = useState<string | null>(null);
  const [declineModalSchedule, setDeclineModalSchedule] = useState<QuickScheduleItem | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedDeclineOption, setSelectedDeclineOption] = useState<string>("");
  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    type: "success" | "warning";
  } | null>(null);
  const [simulatedVolunteerMode, setSimulatedVolunteerMode] = useState(false);
  const [activeTabScheduleId, setActiveTabScheduleId] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Escalas futuras a partir de hoje
  const upcomingSchedules = useMemo(() => {
    return schedules
      .filter((s) => s.date && s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [schedules, todayStr]);

  // Escalas em que o voluntário atual está escalado
  const myUpcomingSchedules = useMemo(() => {
    if (!currentUserId) return [];

    return upcomingSchedules.filter((s) => {
      // Se estiver em modo de teste/simulação e não estiver escalado em nenhuma, permite interagir na primeira
      const inMembers = Array.isArray(s.members) && s.members.includes(currentUserId);
      const inRoles = s.roles && typeof s.roles === "object" && Object.values(s.roles).some((val) => {
        if (val === currentUserId) return true;
        if (Array.isArray(val) && val.includes(currentUserId)) return true;
        return false;
      });

      return inMembers || inRoles;
    });
  }, [upcomingSchedules, currentUserId]);

  // Se o usuário não tiver escalas diretas mas ativou simulação ou for líder testando
  const targetSchedules = useMemo(() => {
    if (myUpcomingSchedules.length > 0) {
      return myUpcomingSchedules;
    }
    if (simulatedVolunteerMode && upcomingSchedules.length > 0) {
      return [upcomingSchedules[0]];
    }
    return [];
  }, [myUpcomingSchedules, simulatedVolunteerMode, upcomingSchedules]);

  // Escala ativa para visualização se houver mais de uma
  const activeSchedule = useMemo(() => {
    if (!targetSchedules.length) return null;
    if (activeTabScheduleId) {
      const found = targetSchedules.find((s) => s.id === activeTabScheduleId);
      if (found) return found;
    }
    // Prioriza escalas pendentes de confirmação
    const firstPending = targetSchedules.find((s) => {
      const status = getConfirmationStatus(s, currentUserId || "test-user");
      return status === "pending";
    });
    return firstPending || targetSchedules[0];
  }, [targetSchedules, activeTabScheduleId, currentUserId]);

  function getConfirmationStatus(
    schedule: QuickScheduleItem,
    userId: string
  ): "confirmed" | "declined" | "pending" {
    if (schedule.confirmations && schedule.confirmations[userId]) {
      return schedule.confirmations[userId].status;
    }
    if (Array.isArray(schedule.confirmedMembers) && schedule.confirmedMembers.includes(userId)) {
      return "confirmed";
    }
    if (Array.isArray(schedule.declinedMembers) && schedule.declinedMembers.includes(userId)) {
      return "declined";
    }
    return "pending";
  }

  const showToast = (message: string, type: "success" | "warning" = "success") => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4500);
  };

  // CONFIRMAÇÃO EM 1 CLIQUE!
  const handleQuickConfirm = async (schedule: QuickScheduleItem) => {
    const userId = currentUserId || "user-temp";
    setLoadingScheduleId(schedule.id);

    try {
      const confirmedAt = new Date().toISOString();
      const userName = currentUserName || "Voluntário";

      // Atualiza documento no Firestore
      await updateDoc(doc(db, "schedules", schedule.id), {
        [`confirmations.${userId}`]: {
          status: "confirmed",
          confirmedAt,
          userName,
        },
        confirmedMembers: arrayUnion(userId),
        declinedMembers: arrayRemove(userId),
      });

      // Record Audit Log for Attendance Confirmation
      auditUpdate(
        "Schedule",
        schedule.id,
        `Confirmação de Presença - ${schedule.date}`,
        { [`confirmations.${userId}`]: { status: "pending" } },
        { [`confirmations.${userId}`]: { status: "confirmed", confirmedAt, userName } },
        { churchId: schedule.churchId, departmentId: schedule.ministry || null }
      ).catch((err) => console.warn("Audit schedule confirmation error:", err));

      // Cria ou atualiza notificação de registro para o usuário
      try {
        const notifId = `conf_${schedule.id}_${userId}`;
        await setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          userId,
          title: "Presença Confirmada!",
          body: `Você confirmou presença na escala de ${formatScheduleDate(schedule.date)}. Que Deus abençoe seu ministério!`,
          type: "schedule_confirmed",
          scheduleId: schedule.id,
          status: "confirmed",
          read: true,
          createdAt: serverTimestamp(),
        });
      } catch (notifErr) {
        console.warn("Notificação secundária ignorada:", notifErr);
      }

      showToast("🎉 Presença confirmada com sucesso! O ministério conta com você!");
      if (onConfirmationSuccess) {
        onConfirmationSuccess(schedule.id, "confirmed");
      }
    } catch (err: any) {
      console.error("Erro ao confirmar presença na escala:", err);
      showToast("Erro ao confirmar presença. Tente novamente.", "warning");
    } finally {
      setLoadingScheduleId(null);
    }
  };

  // INFORMAR AUSÊNCIA
  const handleConfirmDecline = async () => {
    if (!declineModalSchedule) return;
    const schedule = declineModalSchedule;
    const userId = currentUserId || "user-temp";
    setLoadingScheduleId(schedule.id);

    try {
      const declinedAt = new Date().toISOString();
      const userName = currentUserName || "Voluntário";
      const finalReason = selectedDeclineOption || declineReason || "Imprevisto pessoal informado";

      await updateDoc(doc(db, "schedules", schedule.id), {
        [`confirmations.${userId}`]: {
          status: "declined",
          declinedAt,
          reason: finalReason,
          userName,
        },
        declinedMembers: arrayUnion(userId),
        confirmedMembers: arrayRemove(userId),
      });

      // Record Audit Log for Attendance Decline
      auditUpdate(
        "Schedule",
        schedule.id,
        `Ausência Informada - ${schedule.date}`,
        { [`confirmations.${userId}`]: { status: "pending" } },
        { [`confirmations.${userId}`]: { status: "declined", declinedAt, reason: finalReason, userName } },
        { churchId: schedule.churchId, departmentId: schedule.ministry || null }
      ).catch((err) => console.warn("Audit schedule decline error:", err));

      // Notificação de ausência
      try {
        const notifId = `decl_${schedule.id}_${userId}`;
        await setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          userId,
          title: "Ausência Registrada",
          body: `Você informou impossibilidade para a escala de ${formatScheduleDate(schedule.date)}: "${finalReason}". A liderança foi comunicada.`,
          type: "schedule_declined",
          scheduleId: schedule.id,
          status: "declined",
          read: true,
          createdAt: serverTimestamp(),
        });
      } catch {
        // ignore
      }

      showToast("Ausência registrada. A liderança foi notificada para providenciar substituição.", "warning");
      setDeclineModalSchedule(null);
      setDeclineReason("");
      setSelectedDeclineOption("");
      if (onConfirmationSuccess) {
        onConfirmationSuccess(schedule.id, "declined");
      }
    } catch (err) {
      console.error("Erro ao registrar ausência:", err);
      showToast("Erro ao registrar ausência. Tente novamente.", "warning");
    } finally {
      setLoadingScheduleId(null);
    }
  };

  // RECONFIRMAR (Caso queira reverter para confirmado)
  const handleReconfirm = (schedule: QuickScheduleItem) => {
    handleQuickConfirm(schedule);
  };

  // CONFIRMAR TODAS AS ESCALAS PENDENTES COM 1 CLIQUE!
  const handleConfirmAllPending = async () => {
    const pendingSchedules = targetSchedules.filter(
      (s) => getConfirmationStatus(s, currentUserId || "user-temp") === "pending"
    );
    if (!pendingSchedules.length) return;

    setLoadingScheduleId("all");
    try {
      for (const s of pendingSchedules) {
        await handleQuickConfirm(s);
      }
      showToast(`🎉 Todas as suas ${pendingSchedules.length} escalas foram confirmadas com 1 clique!`);
    } catch (e) {
      console.error("Erro ao confirmar todas:", e);
    } finally {
      setLoadingScheduleId(null);
    }
  };

  function formatScheduleDate(dateStr: string) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 12);
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const dayName = dayNames[dateObj.getDay()] || "";
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      return `${dayName}, ${day} de ${monthNames[dateObj.getMonth()]}`;
    }
    return dateStr;
  }

  // Estatísticas de confirmação do próximo culto para visão de liderança
  const nextGeneralSchedule = upcomingSchedules[0];
  const generalConfirmedCount = useMemo(() => {
    if (!nextGeneralSchedule) return 0;
    const explicit = nextGeneralSchedule.confirmedMembers?.length || 0;
    const fromMap = nextGeneralSchedule.confirmations
      ? Object.values(nextGeneralSchedule.confirmations).filter((c) => c.status === "confirmed").length
      : 0;
    return Math.max(explicit, fromMap);
  }, [nextGeneralSchedule]);

  const generalTotalCount = useMemo(() => {
    if (!nextGeneralSchedule) return 0;
    return Array.isArray(nextGeneralSchedule.members) ? nextGeneralSchedule.members.length : 0;
  }, [nextGeneralSchedule]);

  const generalPercentage = generalTotalCount > 0
    ? Math.round((generalConfirmedCount / generalTotalCount) * 100)
    : 100;

  // CASO 1: O voluntário tem escalas (ou ativou modo simulação)
  if (activeSchedule) {
    const status = getConfirmationStatus(activeSchedule, currentUserId || "test-user");
    const userRoles = getUserRoleInSchedule(activeSchedule, currentUserId || "test-user");
    const roleBadgeText = userRoles.join(" • ") || "Voluntário";
    const pendingCount = targetSchedules.filter(
      (s) => getConfirmationStatus(s, currentUserId || "test-user") === "pending"
    ).length;
    const isSinglePending = pendingCount === 1;

    const ministry = activeSchedule.ministry || "worship";
    const ministryIcon =
      ministry === "dance" ? Sparkles : ministry === "multimedia" ? Video : Music;
    const ministryColor =
      ministry === "dance"
        ? "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-900/60"
        : ministry === "multimedia"
        ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60"
        : "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60";

    const MinistryIconComponent = ministryIcon;

    return (
      <div className="relative overflow-hidden mb-6">
        {/* Toast de Feedback */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`absolute top-3 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold text-white border ${
                feedbackToast.type === "success"
                  ? "bg-emerald-600 border-emerald-500 shadow-emerald-600/20"
                  : "bg-amber-600 border-amber-500 shadow-amber-600/20"
              }`}
            >
              {feedbackToast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`relative rounded-3xl border transition-all shadow-md overflow-hidden ${
            status === "confirmed"
              ? "bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 dark:from-emerald-950/25 dark:via-slate-900 dark:to-teal-950/20 border-emerald-300/80 dark:border-emerald-800/60 shadow-emerald-500/5"
              : status === "declined"
              ? "bg-gradient-to-r from-rose-50/90 via-white to-orange-50/70 dark:from-rose-950/25 dark:via-slate-900 dark:to-orange-950/20 border-rose-300/80 dark:border-rose-800/60 shadow-rose-500/5"
              : "bg-gradient-to-r from-blue-50/95 via-white to-amber-50/80 dark:from-blue-950/30 dark:via-slate-900 dark:to-amber-950/20 border-blue-300/90 dark:border-blue-700/60 shadow-blue-600/10 ring-2 ring-blue-500/20"
          }`}
        >
          {/* Barra superior de status & abas se houver múltiplas escalas */}
          <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {status === "pending" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    status === "confirmed"
                      ? "bg-emerald-500"
                      : status === "declined"
                      ? "bg-rose-500"
                      : "bg-blue-600"
                  }`}
                ></span>
              </span>

              <span className="text-xs font-black tracking-wider uppercase text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400" />
                {status === "pending"
                  ? "Notificação Rápida de Escala"
                  : status === "confirmed"
                  ? "Presença Confirmada"
                  : "Ausência Informada"}
              </span>

              {status === "pending" && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-700/60 uppercase">
                  Ação em 1 Clique
                </span>
              )}
            </div>

            {/* Múltiplas escalas do voluntário */}
            {targetSchedules.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1">
                  Suas Escalas:
                </span>
                {targetSchedules.map((s, idx) => {
                  const sStatus = getConfirmationStatus(s, currentUserId || "test-user");
                  const isCurrent = activeSchedule.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveTabScheduleId(s.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isCurrent
                          ? "bg-blue-800 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>
                        {s.date ? s.date.split("-").slice(1).reverse().join("/") : `Escala ${idx + 1}`}
                      </span>
                      {sStatus === "confirmed" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : sStatus === "declined" ? (
                        <X className="w-3 h-3 text-rose-400" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </button>
                  );
                })}

                {pendingCount > 1 && (
                  <button
                    onClick={handleConfirmAllPending}
                    disabled={loadingScheduleId === "all"}
                    className="ml-2 px-3 py-1 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {loadingScheduleId === "all" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    <span>Confirmar Todas ({pendingCount})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Conteúdo Central */}
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {/* Badge de Ministério */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${ministryColor}`}
                >
                  <MinistryIconComponent className="w-3.5 h-3.5" />
                  <span className="capitalize">{ministry === "worship" ? "Louvor" : ministry === "multimedia" ? "Multimídia" : "Dança"}</span>
                </div>

                {/* Função Escalada */}
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-slate-900 text-white dark:bg-slate-800 shadow-xs">
                  <span>Função:</span>
                  <span className="text-blue-300 dark:text-blue-400 font-extrabold">
                    {roleBadgeText}
                  </span>
                </div>

                {activeSchedule.locationName && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                    <MapPin className="w-3 h-3" />
                    <span>{activeSchedule.locationName}</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {status === "pending"
                    ? `Olá, ${currentUserName.split(" ")[0]}! Você foi escalado(a) para o culto:`
                    : status === "confirmed"
                    ? `Presença garantida para o culto:`
                    : `Você informou impossibilidade para:`}
                </h3>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-400 mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-800 dark:text-blue-400" />
                  <span>{formatScheduleDate(activeSchedule.date)}</span>
                  {activeSchedule.rehearsalTime && (
                    <span className="text-slate-400 dark:text-slate-500 font-normal">
                      • Ensaio às {activeSchedule.rehearsalTime}
                    </span>
                  )}
                </p>
              </div>

              {/* Informações complementares de repertório ou ensaio */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                {(activeSchedule.songs?.length || activeSchedule.playlist?.length) ? (
                  <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                    <Music className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    <span>
                      {(activeSchedule.songs?.length || activeSchedule.playlist?.length || 0)} músicas na escala
                    </span>
                  </span>
                ) : null}

                {activeSchedule.rehearsalDate && (
                  <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    <span>
                      Ensaio: {formatScheduleDate(activeSchedule.rehearsalDate)}
                      {activeSchedule.rehearsalTime ? ` às ${activeSchedule.rehearsalTime}` : ""}
                    </span>
                  </span>
                )}

                {status === "confirmed" && activeSchedule.confirmations?.[currentUserId || ""]?.confirmedAt && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmado em{" "}
                    {new Date(
                      activeSchedule.confirmations[currentUserId || ""].confirmedAt!
                    ).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}

                {status === "declined" && (
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <UserX className="w-3.5 h-3.5" />
                    Motivo:{" "}
                    {activeSchedule.confirmations?.[currentUserId || ""]?.reason || "Não informado"}
                  </span>
                )}
              </div>
            </div>

            {/* BOTÕES DE AÇÃO RÁPIDA (1 CLIQUE!) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              {status === "pending" ? (
                <>
                  {/* BOTÃO PRINCIPAL: 1 CLIQUE PARA CONFIRMAR */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickConfirm(activeSchedule)}
                    disabled={loadingScheduleId === activeSchedule.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-600/25 transition-all cursor-pointer group disabled:opacity-60"
                  >
                    {loadingScheduleId === activeSchedule.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                    <span>Confirmar Presença (1 Clique)</span>
                  </motion.button>

                  {/* BOTÃO SECUNDÁRIO: NÃO PODEREI IR */}
                  <button
                    onClick={() => setDeclineModalSchedule(activeSchedule)}
                    disabled={loadingScheduleId === activeSchedule.id}
                    className="flex items-center justify-center gap-1.5 px-4 py-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Não poderei ir</span>
                  </button>
                </>
              ) : status === "confirmed" ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300/70 dark:border-emerald-800 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Presença Garantida</span>
                  </div>

                  <button
                    onClick={() => setDeclineModalSchedule(activeSchedule)}
                    className="px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
                    title="Teve um imprevisto? Clique para alterar para ausência"
                  >
                    Alterar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border border-rose-300/70 dark:border-rose-800 text-xs font-black">
                    <X className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Ausência Informada</span>
                  </div>

                  <button
                    onClick={() => handleReconfirm(activeSchedule)}
                    disabled={loadingScheduleId === activeSchedule.id}
                    className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reverter & Confirmar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* MODAL DE JUSTIFICATIVA RÁPIDA DE AUSÊNCIA */}
        <AnimatePresence>
          {declineModalSchedule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center">
                      <UserX className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-slate-800 dark:text-slate-100 text-base">
                        Informar Impossibilidade
                      </h4>
                      <p className="text-xs text-slate-400">
                        {formatScheduleDate(declineModalSchedule.date)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeclineModalSchedule(null)}
                    className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sentiremos sua falta! Para ajudar a liderança a acionar um substituto a tempo, selecione ou descreva o motivo:
                </p>

                {/* Opções de 1 clique */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Compromisso de Trabalho",
                    "Viagem / Fora da Cidade",
                    "Motivo de Saúde",
                    "Compromisso Familiar",
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSelectedDeclineOption(opt);
                        setDeclineReason("");
                      }}
                      className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                        selectedDeclineOption === opt
                          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Outro motivo (opcional):
                  </label>
                  <input
                    type="text"
                    value={declineReason}
                    onChange={(e) => {
                      setDeclineReason(e.target.value);
                      setSelectedDeclineOption("");
                    }}
                    placeholder="Ex: Prova da faculdade, plantão..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeclineModalSchedule(null)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDecline}
                    disabled={loadingScheduleId === declineModalSchedule.id}
                    className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {loadingScheduleId === declineModalSchedule.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserX className="w-4 h-4" />
                    )}
                    <span>Registrar Ausência</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // CASO 2: O usuário não está escalado neste momento (ou é líder visualizando o status geral)
  return (
    <div className="relative overflow-hidden mb-6">
      {/* Toast de Feedback */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-3 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold text-white bg-emerald-600 border border-emerald-500"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Status de Confirmação Rápida de Presença
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Sistema Ativo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {nextGeneralSchedule ? (
                  <>
                    Próximo culto:{" "}
                    <strong className="text-slate-700 dark:text-slate-300 font-bold">
                      {formatScheduleDate(nextGeneralSchedule.date)}
                    </strong>{" "}
                    •{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {generalConfirmedCount} de {generalTotalCount} confirmados ({generalPercentage}%)
                    </span>
                  </>
                ) : (
                  "Nenhuma escala futura agendada para os próximos dias."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {nextGeneralSchedule && (
              <button
                onClick={() => setSimulatedVolunteerMode(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Experimente o banner de confirmação de 1 clique"
              >
                <Zap className="w-3.5 h-3.5 text-blue-600 fill-current" />
                <span>Testar como Voluntário Escalado</span>
              </button>
            )}

            {nextGeneralSchedule && generalTotalCount > generalConfirmedCount && (
              <button
                onClick={() => {
                  const text = `Graça e paz, equipe! 🙏 Lembrando de confirmar presença na escala deste domingo no aplicativo. Basta abrir o dashboard e clicar em "Confirmar Presença"! Deus abençoe! 🙌`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Enviar lembrete amigável no WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Cobrar no WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
