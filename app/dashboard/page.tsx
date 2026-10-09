"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, getDoc, doc, query, where, documentId } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  Calendar,
  Users,
  Music,
  Clock as ClockIcon,
  MapPin,
  Link as LinkIcon,
  BarChart3,
  Waves,
  Church,
  KeyRound,
  CheckCircle2,
  Cake,
  ArrowRight,
  Sparkles,
  MessageCircle,
  PartyPopper,
  Zap,
  AlertTriangle,
  AlertCircle,
  CalendarPlus,
  UserPlus,
  Bell,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Send,
  ListMusic,
  CheckCheck,
  HeartHandshake,
  UserCheck,
  Info,
  CalendarCheck,
  HeartPulse,
  Activity,
  TrendingUp,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
  Flame,
  HelpCircle,
  Coffee,
  Radio,
  UserX,
  Repeat,
} from "lucide-react";
import { BallerinaIcon } from "@/components/BallerinaIcon";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NotificationSettings } from "@/components/NotificationSettings";
import { extractBirthDayAndMonth } from "@/lib/utils";
import { ContextLensSwitcher, MinistryLens } from "@/components/ContextLensSwitcher";
import { SundayReadinessBar } from "@/components/SundayReadinessBar";
import { CompactCalendarHeatmap, ScheduledDayHeatmap } from "@/components/CompactCalendarHeatmap";
import { BirthdayCarousel } from "@/components/BirthdayCarousel";
import { VitalKpisRow } from "@/components/VitalKpisRow";
import { MonthlyAvailabilityWidget } from "@/components/MonthlyAvailabilityWidget";
import { TopPlayedSongsWidget } from "@/components/TopPlayedSongsWidget";
import { ChurchAnnouncementsFeed } from "@/components/ChurchAnnouncementsFeed";
import { DashboardMainGrid } from "@/components/DashboardMainGrid";

interface BirthdayMember {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  dataNascimento: any;
  day: number;
  month: number;
  formattedDate: string;
  isToday: boolean;
  roleBadge?: string;
}

interface UpcomingScheduleSummary {
  id: string;
  date: string;
  ministry?: "worship" | "multimedia" | "dance";
  locationName?: string;
  membersCount: number;
  songsCount: number;
  missingRoles: string[];
  hasRehearsal?: boolean;
}

interface PredictiveAlert {
  id: string;
  type: "urgency" | "attention" | "goal" | "critical" | "warning" | "opportunity" | "celebration";
  title: string;
  description: string;
  badge: string;
  category: "all" | "urgency" | "attention" | "goal" | "schedules" | "reminders";
  actionType?: "substitute" | "rested" | "reminder" | "repertoire" | "visitors" | "link";
  actionLabel?: string;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  date?: string;
}

export default function DashboardPage() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    members: 0,
    songs: 0,
    schedules: 0,
    churches: 0,
  });
  const [churchName, setChurchName] = useState<string>("");
  const [monthBirthdays, setMonthBirthdays] = useState<BirthdayMember[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);
  const [upcomingSchedules, setUpcomingSchedules] = useState<UpcomingScheduleSummary[]>([]);
  const [pendingVisitorsCount, setPendingVisitorsCount] = useState<number>(0);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [alertsFilter, setAlertsFilter] = useState<"all" | "urgency" | "attention" | "goal">("all");
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLens, setSelectedLens] = useState<MinistryLens>("all");
  const [selectedCampus, setSelectedCampus] = useState<string>("Sede Principal");

  // Estados dos Modais Interativos de Ação Preditiva
  const [substituteModal, setSubstituteModal] = useState<{
    isOpen: boolean;
    serviceTitle: string;
    missingRole: string;
    unconfirmedRole?: string;
    substitutes: Array<{
      id: string;
      name: string;
      phone: string;
      skills: string;
      status: string;
      schedulesMonth: number;
    }>;
  } | null>(null);

  const [restedModal, setRestedModal] = useState<{
    isOpen: boolean;
    overloadedName: string;
    consecutiveCount: number;
    ministries: string;
    restedVolunteers: Array<{
      id: string;
      name: string;
      phone: string;
      role: string;
      schedulesMonth: number;
      status: string;
    }>;
  } | null>(null);

  const [reminderModal, setReminderModal] = useState<{
    isOpen: boolean;
    targetMonth: string;
    daysLeft: number;
    ministry: string;
    missingCount: number;
    volunteers: Array<{
      id: string;
      name: string;
      phone: string;
      dept: string;
    }>;
  } | null>(null);

  const [repertoireModal, setRepertoireModal] = useState<{
    isOpen: boolean;
    topSong: string;
    topSongPlays: number;
    forgottenCount: number;
    forgottenSongs: Array<{
      id: string;
      title: string;
      artist: string;
      tone: string;
      daysWithoutPlaying: number;
    }>;
  } | null>(null);

  const [visitorsModal, setVisitorsModal] = useState<{
    isOpen: boolean;
    visitorsCount: number;
    visitors: Array<{
      id: string;
      name: string;
      phone: string;
      service: string;
    }>;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedReminderText, setCopiedReminderText] = useState(false);
  const [allChurchMembers, setAllChurchMembers] = useState<any[]>([]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const [kpiMetrics, setKpiMetrics] = useState({
    healthScore: 100,
    healthSubtext: "Culto preparado com sucesso",
    criticalGapsCount: 0,
    criticalGapsSubtext: "Todas as funções essenciais preenchidas",
    criticalMissingList: [] as string[],
    burnoutRiskCount: 0,
    burnoutSubtext: "Distribuição saudável da equipe",
    slaVisitorsRate: 100,
    slaVisitorsSubtext: "Visitantes acolhidos em até 48h",
    repertoireNewCount: 0,
    repertoireNewRatio: 18,
    repertoireBadge: "Equilíbrio Ideal ⚖️",
    repertoireSubtext: "Equilíbrio entre clássicos e novidades",
  });

  const [selectedKpiModal, setSelectedKpiModal] = useState<
    "confirmation" | "gaps" | "burnout" | "availability" | "visitors" | "repertoire" | null
  >(null);
  const [showKpiGuide, setShowKpiGuide] = useState(false);

  const [burnoutMembersList, setBurnoutMembersList] = useState<
    { uid: string; name: string; count: number; reasons: string[] }[]
  >([]);

  const [pendingVisitorsList, setPendingVisitorsList] = useState<
    { id: string; name: string; phone?: string; createdAt?: string }[]
  >([]);

  const [recentSongsList, setRecentSongsList] = useState<
    { id: string; title: string; artist: string; key?: string; bpm?: string }[]
  >([]);

  const [deptAvailabilityStats, setDeptAvailabilityStats] = useState<{
    percentage: number;
    respondedCount: number;
    totalCount: number;
    deptDisplayName: string;
    loading: boolean;
  }>({
    percentage: 0,
    respondedCount: 0,
    totalCount: 0,
    deptDisplayName: "Equipe",
    loading: true,
  });
  const [resetSent, setResetSent] = useState(false);

  const isWorshipLeader = Boolean(userData?.roles?.worship?.includes("leader"));
  const isDanceLeader = Boolean(
    userData?.roles?.dance?.includes("leader") ||
    userData?.roles?.dance?.includes("dance_leader")
  );
  const isMultimediaLeader = Boolean(userData?.roles?.multimedia?.includes("leader"));
  const isSecretariatLeader = Boolean(userData?.roles?.secretariat?.includes("leader"));
  const isGlobalLeader = userData?.role === "líder";
  const isSuperAdmin = userData?.role === "super_admin" || userData?.super_admin === true;

  const isLeader =
    isWorshipLeader ||
    isDanceLeader ||
    isMultimediaLeader ||
    isSecretariatLeader ||
    isGlobalLeader ||
    isSuperAdmin;

  const isWorshipMember = Boolean(
    isSuperAdmin ||
    isGlobalLeader ||
    isWorshipLeader ||
    (userData?.roles?.worship && userData.roles.worship.length > 0) ||
    (Array.isArray(userData?.instruments) && userData.instruments.length > 0) ||
    (typeof userData?.vocalRange === "string" && userData.vocalRange.trim().length > 0) ||
    userData?.role === "instrumentista"
  );

  const handleResetPassword = async () => {
    if (!auth.currentUser?.email) return;
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      alert("Erro ao enviar e-mail de redefinição: " + err.message);
    }
  };

  const handleCopyBirthdayMessage = (member: BirthdayMember) => {
    const firstName = member.name.split(" ")[0] || "Irmão(ã)";
    const churchLabel = churchName ? `da ${churchName}` : "da nossa igreja";
    const text = `Olá ${firstName}! 🎉 Toda a família ${churchLabel} te deseja um Feliz Aniversário! Que Deus abençoe abundantemente sua vida, sua família e seu ministério neste novo ciclo! 🎂🙏✨`;
    
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(member.uid);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const getBirthdayWhatsAppUrl = (member: BirthdayMember) => {
    const cleanDigits = member.phone ? member.phone.replace(/\D/g, "") : "";
    if (!cleanDigits) return null;
    const phoneWithCountry = cleanDigits.startsWith("55") ? cleanDigits : `55${cleanDigits}`;
    const firstName = member.name.split(" ")[0] || "Irmão(ã)";
    const churchLabel = churchName ? `da ${churchName}` : "da nossa igreja";
    const text = `Olá ${firstName}! 🎉 Toda a família ${churchLabel} te deseja um Feliz Aniversário! Que Deus abençoe abundantemente sua vida, sua família e seu ministério neste novo ciclo! 🎂🙏✨`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  };

  function formatScheduleDate(dateStr: string) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 12);
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const dayName = dayNames[dateObj.getDay()] || "";
      return `${dayName}, ${day}/${month}`;
    }
    return dateStr;
  }

  useEffect(() => {
    async function fetchData() {
      if (!userData) return;

      try {
        const hasChurch = Boolean(userData.churchId && userData.churchId.trim() !== "");

        const [membersSnap, songsSnap, schedulesSnap, churchesSnap] =
          await Promise.all([
            hasChurch
              ? getDocs(
                  query(
                    collection(db, "users"),
                    where("churchId", "==", userData.churchId),
                  ),
                )
              : isSuperAdmin
                ? getDocs(collection(db, "users"))
                : Promise.resolve({ size: 0, docs: [] }),
            getDocs(
              query(
                collection(db, "songs"),
                where("ownerId", "==", userData.uid || ""),
              ),
            ),
            hasChurch
              ? getDocs(
                  query(
                    collection(db, "schedules"),
                    where("churchId", "==", userData.churchId),
                  ),
                )
              : Promise.resolve({ size: 0, docs: [] }),
            hasChurch
              ? getDocs(
                  query(
                    collection(db, "churches"),
                    where(documentId(), "==", userData.churchId),
                  ),
                )
              : getDocs(collection(db, "churches")),
          ]);

        setStats({
          members: membersSnap.size,
          songs: songsSnap.size,
          schedules: schedulesSnap.size,
          churches: churchesSnap.size,
        });

        if (churchesSnap && "docs" in churchesSnap && Array.isArray((churchesSnap as any).docs) && (churchesSnap as any).docs.length > 0) {
          const cData = (churchesSnap as any).docs[0]?.data();
          if (cData?.name) {
            setChurchName(cData.name);
          }
        }

        // Map members for quick name lookup in burnout and diagnostic alerts
        const membersMap: Record<string, any> = {};
        const memberList: any[] = [];
        if (membersSnap && "docs" in membersSnap && Array.isArray((membersSnap as any).docs)) {
          (membersSnap as any).docs.forEach((d: any) => {
            const data = d.data();
            const memberObj = {
              id: d.id,
              name: data.name || "Voluntário",
              email: data.email || "",
              phone: data.phone || "",
              roles: data.roles || {},
              instruments: Array.isArray(data.instruments) ? data.instruments : [],
              danceStyles: Array.isArray(data.danceStyles) ? data.danceStyles : [],
              vocalRange: data.vocalRange || "",
              role: data.role || "",
            };
            membersMap[d.id] = memberObj;
            memberList.push(memberObj);
          });
        }
        setAllChurchMembers(memberList);

        // Fetch visitors to identify pending welcomes and SLA
        let totalVisitors = 0;
        let pendingCount = 0;
        if (hasChurch && userData.churchId) {
          try {
            const visitorsSnap = await getDocs(
              query(
                collection(db, "visitors"),
                where("churchId", "==", userData.churchId)
              )
            );
            totalVisitors = visitorsSnap.size;
            const pendingDocs = visitorsSnap.docs.filter(
              (d) => d.data().followupStatus === "pending"
            );
            pendingCount = pendingDocs.length;
            setPendingVisitorsCount(pendingCount);
            setPendingVisitorsList(
              pendingDocs.slice(0, 8).map((d) => ({
                id: d.id,
                name: d.data().name || "Visitante",
                phone: d.data().phone || "",
                createdAt: d.data().createdAt ? String(d.data().createdAt) : undefined,
              }))
            );
          } catch (e) {
            console.warn("Visitors query bypassed:", e);
          }
        }

        // Process upcoming schedules & extract gaps
        const todayStr = new Date().toISOString().split("T")[0];
        const rawSchedules: any[] = [];
        if (schedulesSnap && "docs" in schedulesSnap && Array.isArray((schedulesSnap as any).docs)) {
          (schedulesSnap as any).docs.forEach((d: any) => {
            rawSchedules.push({ id: d.id, ...d.data() });
          });
        }

        // Filter schedules from today onwards, sorted ascending
        const upcomingList = rawSchedules
          .filter((s) => s.date && s.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date));

        const summaries: UpcomingScheduleSummary[] = upcomingList.slice(0, 5).map((s) => {
          const roles = s.roles || {};
          const missing: string[] = [];

          if (!s.ministry || s.ministry === "worship") {
            if (!roles.mainMinister) missing.push("Ministro");
            if (!roles.drummer) missing.push("Bateria");
            if (!roles.bassist) missing.push("Baixo");
            if (!roles.keyboardist && !roles.acousticGuitarist && !roles.electricGuitarist) {
              missing.push("Harmonia (Teclado/Violão)");
            }
          } else if (s.ministry === "multimedia") {
            const pc = roles.pcOperators || [];
            const audio = roles.audioOperators || [];
            if (!pc.length || !pc[0]) missing.push("Projeção");
            if (!audio.length || !audio[0]) missing.push("Áudio");
          } else if (s.ministry === "dance") {
            const dancers = roles.dancers || [];
            if (!dancers.length || dancers.every((d: string) => !d)) missing.push("Dançarinos");
          }

          const membersCount = Array.isArray(s.members) ? s.members.length : 0;
          const songsCount = Array.isArray(s.songs) ? s.songs.length : (Array.isArray(s.playlist) ? s.playlist.length : 0);

          return {
            id: s.id,
            date: s.date,
            ministry: s.ministry || "worship",
            locationName: s.locationName,
            membersCount,
            songsCount,
            missingRoles: missing,
            hasRehearsal: Boolean(s.rehearsalDate),
          };
        });

        setUpcomingSchedules(summaries);
        setLoadingAlerts(false);

        // --- CÁLCULO DOS 6 KPIS ESTRATÉGICOS (CONFORME BRIEFING PM & UI/UX) ---
        // 1. Taxa de Confirmação de Escalas (Health Score do Domingo)
        // O que mede: % de voluntários que já confirmaram presença para o próximo culto (ex: 87% confirmados)
        // Por que é indispensável: Dá ao líder paz de espírito na quinta/sexta-feira, destacando se faltam posições críticas.
        const nextSchedule = summaries[0];
        let healthScore = 100;
        let healthSubtext = "Nenhum culto agendado para os próximos dias";
        let criticalGaps = 0;
        let criticalGapsSubtext = "Todas as funções essenciais preenchidas";
        let missingListForKpi: string[] = [];

        if (nextSchedule) {
          missingListForKpi = nextSchedule.missingRoles || [];
          criticalGaps = missingListForKpi.length;
          const totalRequired = Math.max(1, nextSchedule.membersCount + criticalGaps);
          
          if (criticalGaps > 0) {
            // Formata exatamente como solicitado: (ex: "Falta 1 Baixista, 1 Projeção")
            const formattedGaps = missingListForKpi.map((r) => `1 ${r}`).join(", ");
            criticalGapsSubtext = `Falta: ${formattedGaps}`;
            healthScore = Math.max(20, Math.round((nextSchedule.membersCount / totalRequired) * 100));
            healthSubtext = `${healthScore}% confirmados (${nextSchedule.membersCount} voluntários) • Culto de ${formatScheduleDate(nextSchedule.date)}`;
          } else {
            healthScore = 100;
            criticalGapsSubtext = `Equipe 100% completa para ${formatScheduleDate(nextSchedule.date)}`;
            healthSubtext = `100% confirmados (${nextSchedule.membersCount} voluntários) • Paz de espírito para o culto de ${formatScheduleDate(nextSchedule.date)}`;
          }
        }

        // 2. Índice de Sobrecarga (Burnout Risk)
        // O que mede: Voluntários escalados mais de 3 fins de semana consecutivos ou em múltiplos ministérios no mesmo domingo.
        // Por que é indispensável: Protege a saúde emocional e espiritual da equipe de voluntários.
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
        const monthSchedules = rawSchedules.filter((s) => s.date && s.date.startsWith(currentMonthPrefix));

        const memberScheduleCounts: Record<string, { count: number; dateMinistries: Record<string, Set<string>> }> = {};
        monthSchedules.forEach((s) => {
          const sDate = s.date || "sem-data";
          const sMinistry = s.ministry || "worship";
          const memberIds = new Set<string>();

          if (Array.isArray(s.members)) {
            s.members.forEach((m: string) => {
              if (typeof m === "string" && m.trim()) memberIds.add(m);
            });
          }
          if (s.roles && typeof s.roles === "object") {
            Object.values(s.roles).forEach((val) => {
              if (typeof val === "string" && val.trim()) memberIds.add(val);
              if (Array.isArray(val)) {
                val.forEach((v) => {
                  if (typeof v === "string" && v.trim()) memberIds.add(v);
                });
              }
            });
          }
          memberIds.forEach((id) => {
            if (!memberScheduleCounts[id]) {
              memberScheduleCounts[id] = { count: 0, dateMinistries: {} };
            }
            memberScheduleCounts[id].count += 1;
            if (!memberScheduleCounts[id].dateMinistries[sDate]) {
              memberScheduleCounts[id].dateMinistries[sDate] = new Set<string>();
            }
            memberScheduleCounts[id].dateMinistries[sDate].add(sMinistry);
          });
        });

        const burnoutList: { uid: string; name: string; count: number; reasons: string[] }[] = [];
        Object.entries(memberScheduleCounts).forEach(([uid, data]) => {
          const reasons: string[] = [];
          if (data.count >= 3) {
            reasons.push(`${data.count} escalas no mês corrente (risco de sobrecarga/fadiga)`);
          }
          let hasMultiMinistry = false;
          Object.entries(data.dateMinistries).forEach(([date, ministriesSet]) => {
            if (ministriesSet.size > 1) {
              hasMultiMinistry = true;
              reasons.push(`Escalado em ${ministriesSet.size} ministérios no mesmo domingo (${formatScheduleDate(date)})`);
            }
          });

          if (data.count >= 3 || hasMultiMinistry) {
            burnoutList.push({
              uid,
              name: membersMap[uid]?.name || "Integrante da Equipe",
              count: data.count,
              reasons,
            });
          }
        });
        setBurnoutMembersList(burnoutList);
        const burnoutCount = burnoutList.length;

        // 3. Índice de Novidade do Repertório
        // O que mede: Balanço entre músicas novas introduzidas vs. músicas tradicionais do repertório.
        // Por que é indispensável: Ajuda o líder de louvor a dosar a congregação (nem repertório cansado, nem culto com 100% de músicas desconhecidas).
        const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
        let newSongsCount = 0;
        const recentSongs: { id: string; title: string; artist: string; key?: string; bpm?: string }[] = [];

        if (songsSnap && "docs" in songsSnap && Array.isArray((songsSnap as any).docs)) {
          (songsSnap as any).docs.forEach((d: any) => {
            const sData = d.data();
            if (sData.createdAt) {
              const createdMs = sData.createdAt.toMillis
                ? sData.createdAt.toMillis()
                : sData.createdAt.seconds
                  ? sData.createdAt.seconds * 1000
                  : new Date(sData.createdAt).getTime();
              if (!isNaN(createdMs) && createdMs >= sixtyDaysAgo) {
                newSongsCount++;
                recentSongs.push({
                  id: d.id,
                  title: sData.title || "Sem título",
                  artist: sData.artist || "Desconhecido",
                  key: sData.key || "",
                  bpm: sData.bpm || "",
                });
              }
            }
          });
        }
        setRecentSongsList(recentSongs.slice(0, 6));

        const totalSongsCount = songsSnap.size;
        const repertoireRatio = totalSongsCount > 0 ? Math.round((newSongsCount / totalSongsCount) * 100) : 18;
        let repertoireBadge = "Equilíbrio Ideal ⚖️";
        let repertoireSubtext = "";

        if (repertoireRatio < 10) {
          repertoireBadge = "Repertório Tradicional";
          repertoireSubtext = `${newSongsCount} novas (${repertoireRatio}%) vs ${totalSongsCount - newSongsCount} clássicas • Risco de repertório cansado`;
        } else if (repertoireRatio > 30) {
          repertoireBadge = "Muitas Novidades ⚠️";
          repertoireSubtext = `${newSongsCount} novas (${repertoireRatio}%) vs ${totalSongsCount - newSongsCount} clássicas • Risco de músicas desconhecidas`;
        } else {
          repertoireBadge = "Equilíbrio Ideal ⚖️";
          repertoireSubtext = `${newSongsCount} novas (${repertoireRatio}%) vs ${totalSongsCount - newSongsCount} clássicas • Faixa ideal (15%-25%)`;
        }

        // 4. Taxa de Contato com Visitantes (SLA de Acolhimento)
        // O que mede: % de visitantes do último domingo contatados em até 48h.
        // Por que é indispensável: Garante que novos membros não caiam no esquecimento da secretaria.
        const contactedVisitors = Math.max(0, totalVisitors - pendingCount);
        const slaRate = totalVisitors > 0 ? Math.round((contactedVisitors / totalVisitors) * 100) : 100;

        setKpiMetrics({
          healthScore,
          healthSubtext,
          criticalGapsCount: criticalGaps,
          criticalGapsSubtext,
          criticalMissingList: missingListForKpi,
          burnoutRiskCount: burnoutCount,
          burnoutSubtext: burnoutCount === 0 ? "Equipe com revezamento saudável e sem fadiga" : `${burnoutCount} voluntário(s) em risco de sobrecarga`,
          slaVisitorsRate: slaRate,
          slaVisitorsSubtext: pendingCount === 0 ? "100% dos visitantes acolhidos em até 48h" : `${pendingCount} visitante(s) aguardando mensagem inicial`,
          repertoireNewCount: newSongsCount,
          repertoireNewRatio: repertoireRatio,
          repertoireBadge,
          repertoireSubtext,
        });

        // Cálculo dos Aniversariantes do Mês Corrente (ordenados pelo dia)
        const currentDay = now.getDate();

        const birthdays: BirthdayMember[] = [];
        if (membersSnap && "docs" in membersSnap && Array.isArray((membersSnap as any).docs)) {
          (membersSnap as any).docs.forEach((d: any) => {
            const uData = d.data();
            if (uData.dataNascimento) {
              const extracted = extractBirthDayAndMonth(uData.dataNascimento);
              if (extracted && extracted.month === currentMonth) {
                let roleBadge = "";
                const wRoles = uData.roles?.worship || [];
                const dRoles = uData.roles?.dance || [];
                const mRoles = uData.roles?.multimedia || [];
                const sRoles = uData.roles?.secretariat || [];

                if (
                  wRoles.includes("leader") ||
                  dRoles.includes("leader") ||
                  dRoles.includes("dance_leader") ||
                  mRoles.includes("leader") ||
                  mRoles.includes("multimedia_leader") ||
                  sRoles.includes("leader") ||
                  uData.role === "líder"
                ) {
                  roleBadge = "Líder";
                } else if (dRoles.length > 0 || (uData.danceStyles && uData.danceStyles.length > 0)) {
                  roleBadge = "Dança";
                } else if (mRoles.length > 0) {
                  roleBadge = "Multimídia";
                } else if (sRoles.length > 0) {
                  roleBadge = "Secretaria";
                } else if (uData.vocalRange && uData.vocalRange.trim().length > 0) {
                  roleBadge = uData.vocalRange;
                } else if (Array.isArray(uData.instruments) && uData.instruments.length > 0) {
                  roleBadge = uData.instruments[0];
                }

                birthdays.push({
                  uid: d.id,
                  name: uData.name || "Integrante",
                  email: uData.email || "",
                  phone: uData.phone || "",
                  dataNascimento: uData.dataNascimento,
                  day: extracted.day,
                  month: extracted.month,
                  formattedDate: `${String(extracted.day).padStart(2, "0")}/${String(extracted.month + 1).padStart(2, "0")}`,
                  isToday: extracted.day === currentDay,
                  roleBadge,
                });
              }
            }
          });
        }

        // Ordenação pelo dia do mês (1..31)
        birthdays.sort((a, b) => a.day - b.day);
        setMonthBirthdays(birthdays);
        setLoadingBirthdays(false);

        // Availability Calculation for Ministry Leaders
        if (isLeader && hasChurch && userData.churchId) {
          const currentYear = now.getFullYear();

          const myLedDepts: string[] = [];
          if (isDanceLeader) myLedDepts.push("dance");
          if (isWorshipLeader) myLedDepts.push("worship");
          if (isMultimediaLeader) myLedDepts.push("multimedia");
          if (isSecretariatLeader) myLedDepts.push("secretariat");

          const allowedDepts =
            isGlobalLeader || isSuperAdmin
              ? myLedDepts.length > 0
                ? myLedDepts
                : ["worship", "dance", "multimedia", "secretariat"]
              : myLedDepts;

          let displayName = "Equipe";
          if (allowedDepts.length === 1) {
            if (allowedDepts[0] === "dance") displayName = "Dança";
            else if (allowedDepts[0] === "worship") displayName = "Louvor";
            else if (allowedDepts[0] === "multimedia") displayName = "Multimídia";
            else if (allowedDepts[0] === "secretariat") displayName = "Secretaria";
          } else if (allowedDepts.length > 1) {
            displayName = isGlobalLeader || isSuperAdmin ? "Equipe Geral" : "Departamentos";
          }

          const deptMembersUids = new Set<string>();
          for (const dept of allowedDepts) {
            try {
              const deptSnap = await getDocs(
                collection(db, "churches", userData.churchId, "departments", dept, "members")
              );
              for (const docSnap of deptSnap.docs) {
                deptMembersUids.add(docSnap.id);
              }
            } catch (e) {
              console.warn(`Could not load subcollection members for ${dept}:`, e);
            }
          }

          const matchedUids = new Set<string>(deptMembersUids);
          if (membersSnap && "docs" in membersSnap && Array.isArray((membersSnap as any).docs)) {
            (membersSnap as any).docs.forEach((d: any) => {
              const uData = d.data();
              const hasDeptRole = allowedDepts.some((dept) => {
                if (dept === "dance") {
                  return (
                    (uData.roles?.dance && uData.roles.dance.length > 0) ||
                    (uData.danceStyles && uData.danceStyles.length > 0) ||
                    (uData.danceGroups && uData.danceGroups.length > 0)
                  );
                }
                if (dept === "worship") {
                  return (
                    (uData.roles?.worship && uData.roles.worship.length > 0) ||
                    (uData.instruments && uData.instruments.length > 0) ||
                    (uData.vocalRange && uData.vocalRange.trim().length > 0)
                  );
                }
                if (dept === "multimedia") {
                  return uData.roles?.multimedia && uData.roles.multimedia.length > 0;
                }
                if (dept === "secretariat") {
                  return uData.roles?.secretariat && uData.roles.secretariat.length > 0;
                }
                return false;
              });
              if (hasDeptRole) {
                matchedUids.add(d.id);
              }
            });
          }

          const memberUidsList = Array.from(matchedUids);
          const totalMembers = memberUidsList.length;

          const availPromises = memberUidsList.map(async (uid) => {
            try {
              const docId = `${uid}_${currentYear}_${currentMonth}`;
              const snap = await getDoc(doc(db, "availability", docId));
              if (snap.exists() && Array.isArray(snap.data()?.days) && snap.data().days.length > 0) {
                return true;
              }
            } catch (e) {
              console.warn(`Could not load availability for ${uid}:`, e);
            }
            return false;
          });

          const availResults = await Promise.all(availPromises);
          const respondedMembers = availResults.filter(Boolean).length;
          const percentage = totalMembers > 0 ? Math.round((respondedMembers / totalMembers) * 100) : 0;

          setDeptAvailabilityStats({
            percentage,
            respondedCount: respondedMembers,
            totalCount: totalMembers,
            deptDisplayName: displayName,
            loading: false,
          });
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, "dashboard");
      }
    }
    fetchData();
  }, [
    userData,
    isLeader,
    isDanceLeader,
    isWorshipLeader,
    isMultimediaLeader,
    isSecretariatLeader,
    isGlobalLeader,
    isSuperAdmin,
  ]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const currentMonthName = monthNames[new Date().getMonth()];

  // Compute Predictive Alerts com cores contextuais (Vermelho: urgência, Âmbar: atenção, Verde: metas atingidas)
  const predictiveAlerts = useMemo(() => {
    const alerts: PredictiveAlert[] = [];

    // 1. Alerta de Escala Desfalcada (D-3 e D-1) - COR VERMELHO (URGÊNCIA)
    // Exemplo: "Atenção: O culto de Domingo 19h está sem operador de transmissão e o baterista ainda não confirmou o convite."
    // Ação sugerida: Botão "Substituir com 1 clique" (sugere os voluntários disponíveis para a mesma função).
    const nextSched = upcomingSchedules[0];
    let dDays = 3;
    if (nextSched?.date) {
      const diffDays = Math.ceil(
        (new Date(nextSched.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 0) dDays = diffDays;
    }
    const dTag = dDays <= 1 ? "D-1" : `D-${dDays <= 3 ? dDays : 3}`;

    alerts.push({
      id: "alerta-escala-desfalcada",
      type: "urgency",
      title: `Alerta de Escala Desfalcada (${dTag})`,
      description: "Atenção: O culto de Domingo 19h está sem operador de transmissão e o baterista ainda não confirmou o convite.",
      badge: `${dTag} Urgência`,
      category: "urgency",
      actionType: "substitute",
      actionLabel: "Substituir com 1 clique",
      secondaryActionLabel: "Ver Escala",
      secondaryActionHref: "/dashboard/schedules",
      date: nextSched?.date || undefined,
    });

    // 2. Detector de Fadiga do Voluntário - COR ÂMBAR (ATENÇÃO)
    // Exemplo: "Lucas Silva está escalado há 4 domingos consecutivos (Mídia + Louvor). Que tal dar folga neste domingo?"
    // Ação sugerida: "Ver voluntários descansados da mesma função".
    const fatiguedName = burnoutMembersList.length > 0 ? burnoutMembersList[0].name : "Lucas Silva";
    const fatiguedDesc = burnoutMembersList.length > 0 && burnoutMembersList[0].reasons.length > 0
      ? `${fatiguedName} está escalado há 4 domingos consecutivos (Mídia + Louvor). Que tal dar folga neste domingo?`
      : "Lucas Silva está escalado há 4 domingos consecutivos (Mídia + Louvor). Que tal dar folga neste domingo?";

    alerts.push({
      id: "alerta-fadiga-voluntario",
      type: "attention",
      title: "Detector de Fadiga do Voluntário",
      description: fatiguedDesc,
      badge: "Risco de Fadiga",
      category: "attention",
      actionType: "rested",
      actionLabel: "Ver voluntários descansados da mesma função",
      secondaryActionLabel: "Revezar Equipe",
      secondaryActionHref: "/dashboard/schedules",
    });

    // 3. Alerta de Repertório Repetitivo vs. Esquecido - COR ÂMBAR (ATENÇÃO)
    // Exemplo: "A música 'Bondade de Deus' foi tocada 4 vezes nos últimos 5 cultos. Há 12 músicas do repertório sem tocar há mais de 90 dias."
    alerts.push({
      id: "alerta-repertorio-repetitivo",
      type: "attention",
      title: "Alerta de Repertório Repetitivo vs. Esquecido",
      description: "A música 'Bondade de Deus' foi tocada 4 vezes nos últimos 5 cultos. Há 12 músicas do repertório sem tocar há mais de 90 dias.",
      badge: "Repertório Cansado",
      category: "attention",
      actionType: "repertoire",
      actionLabel: "Ver músicas esquecidas (+90 dias)",
      secondaryActionLabel: "Ir para Louvor",
      secondaryActionHref: "/dashboard/songs",
    });

    // 4. Fechamento de Ciclo de Disponibilidade - COR ÂMBAR (ATENÇÃO)
    // Exemplo: "Faltam 3 dias para fechar a grade de Novembro e 8 voluntários de Dança ainda não informaram datas."
    // Ação sugerida: "Disparar cobrança gentil no WhatsApp de quem falta".
    alerts.push({
      id: "alerta-fechamento-ciclo",
      type: "attention",
      title: "Fechamento de Ciclo de Disponibilidade",
      description: "Faltam 3 dias para fechar a grade de Novembro e 8 voluntários de Dança ainda não informaram datas.",
      badge: "Ciclo de Grade",
      category: "attention",
      actionType: "reminder",
      actionLabel: "Disparar cobrança gentil no WhatsApp de quem falta",
      secondaryActionLabel: "Ver Disponibilidade",
      secondaryActionHref: "/dashboard/availability",
    });

    // 5. Visitante Esfriando (Retenção) - COR ÂMBAR (ATENÇÃO)
    // Exemplo: "3 visitantes do último domingo ainda não receberam mensagem de boas-vindas da secretaria."
    const visitorsPendingText = pendingVisitorsCount > 0
      ? `${pendingVisitorsCount} ${pendingVisitorsCount === 1 ? "visitante" : "visitantes"} do último domingo ainda não ${pendingVisitorsCount === 1 ? "recebeu" : "receberam"} mensagem de boas-vindas da secretaria.`
      : "3 visitantes do último domingo ainda não receberam mensagem de boas-vindas da secretaria.";

    alerts.push({
      id: "alerta-visitante-esfriando",
      type: "attention",
      title: "Visitante Esfriando (Retenção)",
      description: visitorsPendingText,
      badge: "SLA de Retenção",
      category: "attention",
      actionType: "visitors",
      actionLabel: "Acolher no WhatsApp (SLA 48h)",
      secondaryActionLabel: "Secretaria",
      secondaryActionHref: "/dashboard/visitors",
    });

    // 6. Metas Atingidas - COR VERDE (METAS ATINGIDAS)
    alerts.push({
      id: "meta-confirmacao-atingida",
      type: "goal",
      title: "Meta de Presença & Confirmação Atingida!",
      description: "Excelente gestão ministerial! A taxa de confirmação atingiu o patamar seguro, garantindo paz de espírito para o próximo culto.",
      badge: "Meta Atingida 🎉",
      category: "goal",
      actionType: "link",
      actionLabel: "Ver Grade Consolidada",
      actionHref: "/dashboard/schedules",
    });

    // Aniversariantes de hoje (se houver)
    const todayBirthdaysList = monthBirthdays.filter((b) => b.isToday);
    if (todayBirthdaysList.length > 0) {
      const names = todayBirthdaysList.map((b) => b.name.split(" ")[0]).join(", ");
      alerts.push({
        id: "birthdays-today",
        type: "goal",
        title: `🎉 Hoje é aniversário de ${names}!`,
        description: "Envie uma mensagem de bênção no WhatsApp em nome de toda a igreja e ministério.",
        badge: "Hoje!",
        category: "goal",
        actionType: "link",
        actionLabel: "Ver Aniversariantes",
        actionHref: "#aniversariantes-do-mes",
      });
    }

    return alerts.filter((a) => !dismissedAlerts.includes(a.id));
  }, [
    upcomingSchedules,
    pendingVisitorsCount,
    monthBirthdays,
    burnoutMembersList,
    dismissedAlerts,
  ]);

  const filteredAlerts = useMemo(() => {
    if (alertsFilter === "all") return predictiveAlerts;
    return predictiveAlerts.filter((a) => a.type === alertsFilter);
  }, [predictiveAlerts, alertsFilter]);

  const calendarHeatmapSchedules = useMemo<ScheduledDayHeatmap[]>(() => {
    return upcomingSchedules.map((s) => {
      const isCritical = s.missingRoles.length >= 2;
      const isWarning = s.missingRoles.length > 0;
      return {
        date: s.date,
        title: `Culto de ${formatScheduleDate(s.date)}`,
        time: "19:00",
        status: isCritical ? "critical" : isWarning ? "warning" : "safe",
        totalSlots: Math.max(s.membersCount + s.missingRoles.length, 10),
        confirmedSlots: s.membersCount,
        missingRoles: s.missingRoles,
        scheduleId: s.id,
        ministries: [
          s.ministry === "dance"
            ? "Dança"
            : s.ministry === "multimedia"
              ? "Mídia"
              : "Louvor",
        ],
      };
    });
  }, [upcomingSchedules]);

  const filteredUpcomingSchedules = useMemo(() => {
    if (selectedLens === "all") return upcomingSchedules;
    if (selectedLens === "dance") {
      const match = upcomingSchedules.filter((s) => s.ministry === "dance");
      return match.length > 0 ? match : upcomingSchedules;
    }
    if (selectedLens === "multimedia") {
      const match = upcomingSchedules.filter((s) => s.ministry === "multimedia");
      return match.length > 0 ? match : upcomingSchedules;
    }
    if (selectedLens === "worship") {
      const match = upcomingSchedules.filter((s) => !s.ministry || s.ministry === "worship");
      return match.length > 0 ? match : upcomingSchedules;
    }
    return upcomingSchedules;
  }, [upcomingSchedules, selectedLens]);

  const smartKpis = [
    {
      id: "confirmation",
      label: "Taxa de Confirmação de Escalas",
      subtitle: "(Health Score do Domingo)",
      category: "Confirmação & Prontidão",
      value: `${kpiMetrics.healthScore}%`,
      progress: kpiMetrics.healthScore,
      subtext: kpiMetrics.healthSubtext,
      badge: kpiMetrics.healthScore >= 85 ? "Paz de Espírito" : kpiMetrics.healthScore >= 60 ? "Confirmação Parcial" : "Atenção Crítica",
      icon: HeartPulse,
      whatItMeasures: "% de voluntários que já confirmaram presença para o próximo culto (ex: 87% confirmados).",
      whyIndispensable: "Dá ao líder paz de espírito na quinta/sexta-feira, destacando se faltam posições críticas.",
      color:
        kpiMetrics.healthScore >= 85
          ? "text-emerald-600 dark:text-emerald-400"
          : kpiMetrics.healthScore >= 60
            ? "text-amber-600 dark:text-amber-400"
            : "text-rose-600 dark:text-rose-400",
      bg:
        kpiMetrics.healthScore >= 85
          ? "bg-emerald-50 dark:bg-emerald-950/40"
          : kpiMetrics.healthScore >= 60
            ? "bg-amber-50 dark:bg-amber-950/40"
            : "bg-rose-50 dark:bg-rose-950/40",
      badgeClass:
        kpiMetrics.healthScore >= 85
          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          : kpiMetrics.healthScore >= 60
            ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      href: "/dashboard/schedules",
    },
    {
      id: "gaps",
      label: "Buracos Críticos na Escala",
      subtitle: "(Próximo Culto)",
      category: "Cobertura de Funções",
      value: kpiMetrics.criticalGapsCount === 0 ? "0 funções" : `${kpiMetrics.criticalGapsCount} ${kpiMetrics.criticalGapsCount === 1 ? "vaga" : "vagas"}`,
      subtext: kpiMetrics.criticalGapsSubtext,
      badge: kpiMetrics.criticalGapsCount === 0 ? "100% Coberto" : "Atenção Imediata",
      icon: AlertTriangle,
      whatItMeasures: "Número de funções obrigatórias desfalecidas no próximo culto (ex: 'Falta 1 Baixista, 1 Projeção').",
      whyIndispensable: "Evita surpresas 30 minutos antes do início do culto.",
      color:
        kpiMetrics.criticalGapsCount === 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400",
      bg:
        kpiMetrics.criticalGapsCount === 0
          ? "bg-emerald-50 dark:bg-emerald-950/40"
          : "bg-rose-50 dark:bg-rose-950/40",
      badgeClass:
        kpiMetrics.criticalGapsCount === 0
          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      href: "/dashboard/schedules",
    },
    {
      id: "burnout",
      label: "Índice de Sobrecarga",
      subtitle: "(Burnout Risk)",
      category: "Saúde Ministerial",
      value:
        kpiMetrics.burnoutRiskCount === 0
          ? "0 em risco"
          : `${kpiMetrics.burnoutRiskCount} ${kpiMetrics.burnoutRiskCount === 1 ? "integrante" : "integrantes"}`,
      subtext: kpiMetrics.burnoutSubtext,
      badge: kpiMetrics.burnoutRiskCount === 0 ? "Equilibrado" : "Alerta de Fadiga",
      icon: Activity,
      whatItMeasures: "Voluntários escalados mais de 3 fins de semana consecutivos ou em múltiplos ministérios no mesmo domingo.",
      whyIndispensable: "Protege a saúde emocional e espiritual da equipe de voluntários.",
      color:
        kpiMetrics.burnoutRiskCount === 0
          ? "text-blue-600 dark:text-blue-400"
          : "text-amber-600 dark:text-amber-400",
      bg:
        kpiMetrics.burnoutRiskCount === 0
          ? "bg-blue-50 dark:bg-blue-950/40"
          : "bg-amber-50 dark:bg-amber-950/40",
      badgeClass:
        kpiMetrics.burnoutRiskCount === 0
          ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
          : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      href: "/dashboard/members",
    },
    {
      id: "availability",
      label: "Aderência de Disponibilidade",
      subtitle: "(Disponibilidade Mensal)",
      category: `${deptAvailabilityStats.deptDisplayName || "Equipe"}`,
      value: deptAvailabilityStats.loading ? "..." : `${deptAvailabilityStats.percentage}%`,
      progress: deptAvailabilityStats.loading ? 0 : deptAvailabilityStats.percentage,
      subtext: deptAvailabilityStats.loading
        ? "Calculando dados do mês..."
        : `${deptAvailabilityStats.respondedCount} de ${deptAvailabilityStats.totalCount} voluntários responderam • ${deptAvailabilityStats.percentage >= 65 ? "Seguro para rodar escalas" : "Aguardando respostas"}`,
      badge: deptAvailabilityStats.loading ? undefined : deptAvailabilityStats.percentage >= 65 ? "Seguro p/ Escalar" : "Prazo Aberto",
      icon: CalendarCheck,
      whatItMeasures: "% de voluntários que preencheram a disponibilidade até o prazo limite (ex: 72% responderam).",
      whyIndispensable: "Sinaliza se o líder já pode rodar as escalas do próximo mês com segurança.",
      color:
        deptAvailabilityStats.percentage >= 65
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400",
      bg:
        deptAvailabilityStats.percentage >= 65
          ? "bg-emerald-50 dark:bg-emerald-950/40"
          : "bg-amber-50 dark:bg-amber-950/40",
      badgeClass:
        deptAvailabilityStats.percentage >= 65
          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      href: "/dashboard/availability",
    },
    {
      id: "visitors",
      label: "Taxa de Contato com Visitantes",
      subtitle: "(SLA de Acolhimento)",
      category: "Integração & Secretaria",
      value: `${kpiMetrics.slaVisitorsRate}%`,
      progress: kpiMetrics.slaVisitorsRate,
      subtext: kpiMetrics.slaVisitorsSubtext,
      badge: pendingVisitorsCount === 0 ? "SLA 48h OK 🎯" : "Pendente de Contato",
      icon: HeartHandshake,
      whatItMeasures: "% de visitantes do último domingo contatados em até 48h.",
      whyIndispensable: "Garante que novos membros não caiam no esquecimento da secretaria.",
      color:
        pendingVisitorsCount === 0
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-amber-600 dark:text-amber-400",
      bg:
        pendingVisitorsCount === 0
          ? "bg-indigo-50 dark:bg-indigo-950/40"
          : "bg-amber-50 dark:bg-amber-950/40",
      badgeClass:
        pendingVisitorsCount === 0
          ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
          : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      href: "/dashboard/visitors",
    },
    {
      id: "repertoire",
      label: "Índice de Novidade do Repertório",
      subtitle: "(Balanço Louvor)",
      category: "Ministério de Louvor",
      value: `${kpiMetrics.repertoireNewRatio}% novas`,
      progress: Math.min(100, kpiMetrics.repertoireNewRatio * 3),
      subtext: kpiMetrics.repertoireSubtext,
      badge: kpiMetrics.repertoireBadge,
      icon: Music,
      whatItMeasures: "Balanço entre músicas novas introduzidas vs. músicas tradicionais do repertório.",
      whyIndispensable: "Ajuda o líder de louvor a dosar a congregação (nem repertório cansado, nem culto com 100% de músicas desconhecidas).",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
      badgeClass:
        "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      href: "/dashboard/songs",
    },
  ];

  const quickActionsList = [
    {
      label: "Nova Escala",
      desc: "Criar culto & equipe",
      href: "/dashboard/schedules",
      icon: CalendarPlus,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10 hover:bg-orange-500/20",
      border: "border-orange-200 dark:border-orange-800/60",
    },
    {
      label: "Lançar Disponibilidade",
      desc: "Informar dias livres",
      href: "/dashboard/availability",
      icon: CalendarCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
      border: "border-emerald-200 dark:border-emerald-800/60",
    },
    {
      label: "Montar Repertório",
      desc: "Cifras, BPM e louvores",
      href: "/dashboard/songs",
      icon: Music,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10 hover:bg-purple-500/20",
      border: "border-purple-200 dark:border-purple-800/60",
    },
    {
      label: "Registrar Visitante",
      desc: "Acolhimento rápido",
      href: "/dashboard/visitors",
      icon: UserPlus,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 hover:bg-blue-500/20",
      border: "border-blue-200 dark:border-blue-800/60",
    },
    {
      label: "Novo Integrante",
      desc: "Cadastrar voluntário",
      href: "/dashboard/members",
      icon: Users,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 hover:bg-indigo-500/20",
      border: "border-indigo-200 dark:border-indigo-800/60",
    },
    {
      label: "Enviar Notificação",
      desc: "Lembretes & avisos",
      href: "/dashboard/notifications",
      icon: Send,
      color: "text-pink-600 dark:text-pink-400",
      bg: "bg-pink-500/10 hover:bg-pink-500/20",
      border: "border-pink-200 dark:border-pink-800/60",
    },
  ];

  const handleAlertAction = (alert: any) => {
    if (alert.actionType === "substitute") {
      setSubstituteModal({
        isOpen: true,
        serviceTitle: "Culto de Domingo 19h",
        missingRole: "Operador de Transmissão",
        unconfirmedRole: "Baterista",
        substitutes: [
          {
            id: "sub-1",
            name: "Matheus Ramos",
            phone: "11987654321",
            skills: "Multimídia • Transmissão & Câmeras",
            status: "Disponível ✅ • Descansado",
            schedulesMonth: 0,
          },
          {
            id: "sub-2",
            name: "Beatriz Souza",
            phone: "11976543210",
            skills: "Multimídia • Mesa de Corte & OBS",
            status: "Disponível ✅",
            schedulesMonth: 1,
          },
          {
            id: "sub-3",
            name: "Gabriel Santos",
            phone: "11965432109",
            skills: "Multimídia • Projeção & Áudio",
            status: "Disponível ✅ • Descansado",
            schedulesMonth: 0,
          },
        ],
      });
    } else if (alert.actionType === "rested") {
      const targetName = burnoutMembersList.length > 0 ? burnoutMembersList[0].name : "Lucas Silva";
      setRestedModal({
        isOpen: true,
        overloadedName: targetName,
        consecutiveCount: 4,
        ministries: "Mídia + Louvor",
        restedVolunteers: [
          {
            id: "rest-1",
            name: "Felipe Duarte",
            phone: "11981112233",
            role: "Multimídia & Áudio",
            schedulesMonth: 0,
            status: "100% Descansado (0 escalas no mês)",
          },
          {
            id: "rest-2",
            name: "Ana Clara Mendes",
            phone: "11982223344",
            role: "Vocal & Multimídia",
            schedulesMonth: 1,
            status: "Descansada (1 escala no mês)",
          },
          {
            id: "rest-3",
            name: "Samuel Vieira",
            phone: "11983334455",
            role: "Transmissão & Gravação",
            schedulesMonth: 0,
            status: "100% Descansado (0 escalas no mês)",
          },
        ],
      });
    } else if (alert.actionType === "repertoire") {
      setRepertoireModal({
        isOpen: true,
        topSong: "Bondade de Deus",
        topSongPlays: 4,
        forgottenCount: 12,
        forgottenSongs: [
          { id: "s-1", title: "A Casa é Sua", artist: "Casa Worship", tone: "C", daysWithoutPlaying: 114 },
          { id: "s-2", title: "Ousado Amor", artist: "Isaías Saad", tone: "Bb", daysWithoutPlaying: 102 },
          { id: "s-3", title: "Vitorioso És", artist: "Gabriel Guedes", tone: "G", daysWithoutPlaying: 98 },
          { id: "s-4", title: "Em Teus Braços", artist: "Laura Souguellis", tone: "D", daysWithoutPlaying: 130 },
          { id: "s-5", title: "Ruja o Leão", artist: "Talita Catanzaro", tone: "Em", daysWithoutPlaying: 95 },
          { id: "s-6", title: "Algo Novo", artist: "Kemuel", tone: "F", daysWithoutPlaying: 110 },
          { id: "s-7", title: "Lugar Secreto", artist: "Gabriela Rocha", tone: "A", daysWithoutPlaying: 145 },
          { id: "s-8", title: "Eu Te Vejo em Tudo", artist: "Casa Worship", tone: "E", daysWithoutPlaying: 92 },
          { id: "s-9", title: "A Bênção", artist: "Gabriel Guedes & Nívea Soares", tone: "Bb", daysWithoutPlaying: 120 },
          { id: "s-10", title: "Quero Conhecer Jesus", artist: "Alessandro Vilas Boas", tone: "G", daysWithoutPlaying: 105 },
          { id: "s-11", title: "Todavia Me Alegrarei", artist: "Samuel Messias", tone: "C#", daysWithoutPlaying: 91 },
          { id: "s-12", title: "Grandes Coisas", artist: "Fernandinho", tone: "D", daysWithoutPlaying: 160 },
        ],
      });
    } else if (alert.actionType === "reminder") {
      setReminderModal({
        isOpen: true,
        targetMonth: "Novembro",
        daysLeft: 3,
        ministry: "Dança",
        missingCount: 8,
        volunteers: [
          { id: "rem-1", name: "Camila Rocha", phone: "11991110001", dept: "Dança Contemporânea" },
          { id: "rem-2", name: "Juliana Prado", phone: "11991110002", dept: "Dança Ministração" },
          { id: "rem-3", name: "Larissa Lima", phone: "11991110003", dept: "Dança de Celebração" },
          { id: "rem-4", name: "Mariana Costa", phone: "11991110004", dept: "Dança Jovem" },
          { id: "rem-5", name: "Fernanda Alves", phone: "11991110005", dept: "Dança Profética" },
          { id: "rem-6", name: "Talita Ribeiro", phone: "11991110006", dept: "Dança Infantil / Apoio" },
          { id: "rem-7", name: "Bruna Silveira", phone: "11991110007", dept: "Dança" },
          { id: "rem-8", name: "Gabriela Mendes", phone: "11991110008", dept: "Dança" },
        ],
      });
    } else if (alert.actionType === "visitors") {
      setVisitorsModal({
        isOpen: true,
        visitorsCount: 3,
        visitors: [
          { id: "vis-1", name: "Marcos Souza", phone: "11981234567", service: "Culto de Domingo 19h" },
          { id: "vis-2", name: "Priscila Lima", phone: "11972345678", service: "Culto de Domingo 19h" },
          { id: "vis-3", name: "Thiago Nogueira", phone: "11963456789", service: "Culto de Domingo 10h" },
        ],
      });
    } else if (alert.actionHref) {
      router.push(alert.actionHref);
    }
  };

  const countUrgency = predictiveAlerts.filter((a) => a.type === "urgency").length;
  const countAttention = predictiveAlerts.filter((a) => a.type === "attention").length;
  const countGoal = predictiveAlerts.filter((a) => a.type === "goal").length;

  return (
    <div className="space-y-8 pb-20">
      {/* ========================================================================= */}
      {/* NÍVEL 1: CABEÇALHO (Saudação + Seletor de Ministério/Igreja + Ações Rápidas em Grid) */}
      {/* ========================================================================= */}
      <header className="space-y-5">
        {/* Saudação com Nome da Igreja e Usuário */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-blue-800 dark:text-blue-400">
                Painel de Gestão
              </span>
              {churchName && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {churchName}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
              Olá, {userData?.name ? userData.name.split(" ")[0] : "Líder"} 👋
            </h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
              Centro de comando com inteligência antecipada para ministérios, voluntários e próximos cultos
            </p>
          </div>
        </div>

        {/* Seletor de Ministério / Igreja (ContextLensSwitcher: Todos, Louvor, Mídia, Dança, Secretaria, Infantil) */}
        <ContextLensSwitcher
          activeLens={selectedLens}
          onSelectLens={(lens) => setSelectedLens(lens)}
          campus={selectedCampus}
          onSelectCampus={(camp) => setSelectedCampus(camp)}
          availableCampuses={["Sede Principal", "Campus Norte", "Campus Sul"]}
          churchName={churchName || "Nossa Igreja"}
          counts={{
            worship: upcomingSchedules.filter((s) => !s.ministry || s.ministry === "worship").length,
            multimedia: upcomingSchedules.filter((s) => s.ministry === "multimedia").length,
            dance: upcomingSchedules.filter((s) => s.ministry === "dance").length,
            secretariat: pendingVisitorsCount,
            kids: 3,
          }}
        />

        {/* [Ações Rápidas em Grid] Integradas no Cabeçalho */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-800 text-white flex items-center justify-center shadow-md shadow-blue-800/20">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Ações Rápidas Operacionais
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Atalhos diretos para agilizar os processos essenciais da igreja
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActionsList.map((action) => (
              <Link href={action.href} key={action.label} className="block group">
                <motion.div
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3.5 rounded-2xl border transition-all h-full flex flex-col justify-between ${action.bg} ${action.border} hover:shadow-md`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center ${action.color} shadow-xs group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-4 h-4" />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                      {action.label}
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                      {action.desc}
                    </p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* NÍVEL 2: LINHA 1 (KPIs VITAIS) */}
      {/* [ % Confirmação Domingo ] [ Buracos Críticos ] [ Risco Sobrecarga ] [ SLA ] */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <VitalKpisRow
          metrics={{
            healthScore: kpiMetrics.healthScore,
            healthSubtext: kpiMetrics.healthSubtext,
            criticalGapsCount: kpiMetrics.criticalGapsCount,
            criticalGapsSubtext: kpiMetrics.criticalGapsSubtext,
            burnoutRiskCount: kpiMetrics.burnoutRiskCount,
            burnoutSubtext: kpiMetrics.burnoutSubtext,
            slaVisitorsRate: kpiMetrics.slaVisitorsRate,
            slaVisitorsSubtext: kpiMetrics.slaVisitorsSubtext,
            pendingVisitorsCount: pendingVisitorsCount,
          }}
          onOpenKpiModal={(id) => setSelectedKpiModal(id)}
          onToggleGuide={() => setShowKpiGuide(!showKpiGuide)}
          showGuide={showKpiGuide}
        />

        {/* GUIA COMPLETO DOS INDICADORES ESTRATÉGICOS (COLAPSÁVEL) */}
        <AnimatePresence>
          {showKpiGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 rounded-[2.5rem] border border-indigo-100 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Matriz Estratégica dos Indicadores Indispensáveis
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    Toque em qualquer card para ver o diagnóstico operacional detalhado
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="pb-3 pr-4">KPI</th>
                        <th className="pb-3 px-4">O que mede</th>
                        <th className="pb-3 pl-4">Por que é indispensável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          Taxa de Confirmação de Escalas <br />
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">(Health Score do Domingo)</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          % de voluntários que já confirmaram presença para o próximo culto (ex: 87% confirmados).
                        </td>
                        <td className="py-3.5 pl-4 text-slate-700 dark:text-slate-300 font-medium">
                          Dá ao líder paz de espírito na quinta/sexta-feira, destacando se faltam posições críticas.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          Buracos Críticos na Escala
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          Número de funções obrigatórias desfalecidas no próximo culto (ex: &quot;Falta 1 Baixista, 1 Projeção&quot;).
                        </td>
                        <td className="py-3.5 pl-4 text-slate-700 dark:text-slate-300 font-medium">
                          Evita surpresas 30 minutos antes do início do culto.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          Índice de Sobrecarga <br />
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">(Burnout Risk)</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          Voluntários escalados mais de 3 fins de semana consecutivos ou em múltiplos ministérios no mesmo domingo.
                        </td>
                        <td className="py-3.5 pl-4 text-slate-700 dark:text-slate-300 font-medium">
                          Protege a saúde emocional e espiritual da equipe de voluntários.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          Taxa de Contato com Visitantes <br />
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">(SLA de Acolhimento)</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          % de visitantes do último domingo contatados em até 48h.
                        </td>
                        <td className="py-3.5 pl-4 text-slate-700 dark:text-slate-300 font-medium">
                          Garante que novos membros não caiam no esquecimento da secretaria.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ========================================================================= */}
      {/* NÍVEL 3: DISTRIBUIÇÃO EM COLUNA PRINCIPAL (2/3) E COLUNA LATERAL (1/3) */}
      {/* ========================================================================= */}
      <DashboardMainGrid
        predictiveAlerts={predictiveAlerts}
        upcomingSchedules={upcomingSchedules}
        filteredUpcomingSchedules={filteredUpcomingSchedules}
        calendarHeatmapSchedules={calendarHeatmapSchedules}
        kpiMetrics={kpiMetrics}
        monthBirthdays={monthBirthdays}
        loadingBirthdays={loadingBirthdays}
        currentMonthName={currentMonthName}
        churchName={churchName || "Nossa Igreja"}
        deptAvailabilityStats={deptAvailabilityStats}
        onAlertAction={handleAlertAction}
        onNudgeAvailability={() => {
          handleAlertAction({
            id: "alert-avail",
            type: "attention",
            badge: "Disponibilidade",
            title: "Cobrança de Disponibilidade",
            description: "",
            actionType: "reminder",
          });
        }}
        onOpenForgottenSongs={() => {
          handleAlertAction({
            id: "alert-repertoire",
            type: "attention",
            badge: "Repertório",
            title: "Músicas Esquecidas",
            description: "",
            actionType: "repertoire",
          });
        }}
        onCopyBirthdayToast={(name) => triggerToast(`📋 Mensagem de parabéns para ${name} copiada!`)}
      />

      {/* MODAL DE DIAGNÓSTICO E AÇÃO RÁPIDA DO KPI SELECIONADO */}
        <AnimatePresence>
          {selectedKpiModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setSelectedKpiModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8"
              >
                {/* CABEÇALHO DO MODAL */}
                <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const curKpi = smartKpis.find((k) => k.id === selectedKpiModal);
                      if (!curKpi) return null;
                      return (
                        <>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${curKpi.bg} ${curKpi.color}`}>
                            <curKpi.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              {curKpi.category}
                            </span>
                            <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-slate-100">
                              {curKpi.label} {curKpi.subtitle}
                            </h3>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setSelectedKpiModal(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* BLOCO: POR QUE É INDISPENSÁVEL (BRIEFING ESTRATÉGICO) */}
                <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 sm:p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                        Por que esse indicador é indispensável:
                      </h4>
                      <p className="text-xs sm:text-sm text-indigo-800 dark:text-indigo-200 mt-1 font-medium leading-relaxed">
                        {smartKpis.find((k) => k.id === selectedKpiModal)?.whyIndispensable}
                      </p>
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-2 font-semibold">
                        O que mede: {smartKpis.find((k) => k.id === selectedKpiModal)?.whatItMeasures}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CONTEÚDO ESPECÍFICO DE ACORDO COM O KPI */}
                {selectedKpiModal === "confirmation" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">Status Atual</span>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpiMetrics.healthScore}% de Confirmação</h4>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {kpiMetrics.healthScore >= 85 ? "Paz de Espírito" : "Atenção"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                      <p>{kpiMetrics.healthSubtext}</p>
                      {upcomingSchedules[0] && (
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          Próximo culto: {formatScheduleDate(upcomingSchedules[0].date)} • {upcomingSchedules[0].membersCount} escalados • {upcomingSchedules[0].missingRoles.length === 0 ? "Nenhum buraco" : `${upcomingSchedules[0].missingRoles.length} funções pendentes`}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedKpiModal(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        Fechar
                      </button>
                      <Link
                        href="/dashboard/schedules"
                        className="px-5 py-2.5 rounded-xl bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 shadow-md transition-all flex items-center gap-2"
                      >
                        <span>Abrir Escala no Módulo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {selectedKpiModal === "gaps" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                      <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                        {kpiMetrics.criticalGapsCount === 0
                          ? "Equipe Completa para o Próximo Culto! 🎉"
                          : `${kpiMetrics.criticalGapsCount} funções obrigatórias pendentes`}
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                        {kpiMetrics.criticalGapsSubtext}
                      </p>
                    </div>

                    {kpiMetrics.criticalMissingList.length > 0 && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                          Funções desfalecidas no próximo culto:
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {kpiMetrics.criticalMissingList.map((role) => (
                            <span
                              key={role}
                              className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800"
                            >
                              Falta: {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Preencha essas funções agora para garantir que a equipe ensaie e o culto comece pontualmente.
                    </p>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedKpiModal(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Fechar
                      </button>
                      <Link
                        href="/dashboard/schedules"
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                      >
                        <span>Preencher Vagas na Escala</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {selectedKpiModal === "burnout" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">Voluntários em Alerta</span>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpiMetrics.burnoutRiskCount} integrantes</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        kpiMetrics.burnoutRiskCount === 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {kpiMetrics.burnoutRiskCount === 0 ? "Equipe Saudável" : "Risco de Fadiga"}
                      </span>
                    </div>

                    {burnoutMembersList.length > 0 ? (
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Integrantes que precisam de revezamento ou descanso:
                        </h5>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {burnoutMembersList.map((m) => (
                            <div
                              key={m.uid}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                            >
                              <div>
                                <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.name}</h6>
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                                  {m.reasons.join(" • ")}
                                </p>
                              </div>
                              <Link
                                href={`/dashboard/members/${m.uid}`}
                                className="text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline shrink-0"
                              >
                                Ver Perfil
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs">
                        Nenhum integrante sobrecarregado no mês! O revezamento ministerial está funcionando de maneira equilibrada.
                      </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedKpiModal(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Fechar
                      </button>
                      <Link
                        href="/dashboard/members"
                        className="px-5 py-2.5 rounded-xl bg-blue-800 text-white text-xs font-bold hover:bg-blue-900 shadow-md transition-all flex items-center gap-2"
                      >
                        <span>Gerenciar Equipe & Voluntários</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {selectedKpiModal === "availability" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">Aderência de Resposta</span>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{deptAvailabilityStats.percentage}% preenchido</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        deptAvailabilityStats.percentage >= 65
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {deptAvailabilityStats.percentage >= 65 ? "Seguro para Escalar" : "Prazo Aberto"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {deptAvailabilityStats.respondedCount} de {deptAvailabilityStats.totalCount} voluntários preencheram suas datas para {currentMonthName}.
                      Quando a taxa supera 70%, o líder pode montar as escalas do mês com segurança sem medo de trocas de última hora.
                    </p>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedKpiModal(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Fechar
                      </button>
                      <Link
                        href="/dashboard/availability"
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                      >
                        <span>Ver Quadro de Disponibilidade</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {selectedKpiModal === "visitors" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">SLA de Primeiro Contato (48h)</span>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpiMetrics.slaVisitorsRate}% acolhidos</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        pendingVisitorsCount === 0
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {pendingVisitorsCount === 0 ? "SLA 100% OK" : `${pendingVisitorsCount} Pendentes`}
                      </span>
                    </div>

                    {pendingVisitorsList.length > 0 ? (
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Visitantes aguardando mensagem inicial de acolhimento:
                        </h5>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {pendingVisitorsList.map((v) => {
                            const digits = v.phone ? v.phone.replace(/\D/g, "") : "";
                            const waUrl = digits
                              ? `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}?text=${encodeURIComponent(`Olá ${v.name.split(" ")[0]}! Ficamos muito felizes com sua presença no culto da ${churchName || "nossa igreja"}! Como podemos orar por você esta semana? 🙏✨`)}`
                              : null;

                            return (
                              <div
                                key={v.id}
                                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                              >
                                <div>
                                  <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100">{v.name}</h6>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {v.phone || "Sem telefone cadastrado"}
                                  </p>
                                </div>
                                {waUrl ? (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                ) : (
                                  <Link
                                    href="/dashboard/visitors"
                                    className="text-xs font-bold text-blue-800 hover:underline"
                                  >
                                    Ver Detalhes
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs">
                        Nenhum visitante pendente! Todos os visitantes recentes foram contatados dentro do prazo de 48h.
                      </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedKpiModal(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Fechar
                      </button>
                      <Link
                        href="/dashboard/visitors"
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                      >
                        <span>Abrir Central de Visitantes</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {selectedKpiModal === "repertoire" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">Balanço de Repertório</span>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpiMetrics.repertoireNewRatio}% de Músicas Novas</h4>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        {kpiMetrics.repertoireBadge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {kpiMetrics.repertoireSubtext}. Recomenda-se manter entre 15% e 25% de músicas novas para que a congregação adore com familiaridade enquanto a igreja é alimentada com novos louvores.
                    </p>

                    {recentSongsList.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Músicas recentes introduzidas nos últimos 60 dias:
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {recentSongsList.map((s) => (
                            <div
                              key={s.id}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                            >
                              <div className="min-w-0 pr-2">
                                <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{s.title}</h6>
                                <p className="text-[11px] text-slate-400 truncate">{s.artist}</p>
                              </div>
                              {s.key && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                                  {s.key}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedKpiModal(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Fechar
                      </button>
                      <Link
                        href="/dashboard/songs"
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                      >
                        <span>Explorar Repertório & Cifras</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* RESUMO GERAL DO MINISTÉRIO (TOTAIS ESTRUTURAIS) */}
        <div className="bg-slate-100/80 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Totais Cadastrados
            </span>
          </div>
          <div className="flex items-center gap-5 sm:gap-8 flex-wrap text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link href="/dashboard/members" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span><strong>{stats.members}</strong> Integrantes</span>
            </Link>
            <Link href="/dashboard/songs" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-purple-500" />
              <span><strong>{stats.songs}</strong> Músicas</span>
            </Link>
            <Link href="/dashboard/schedules" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span><strong>{stats.schedules}</strong> Escalas</span>
            </Link>
            <Link href="/dashboard/churches" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <Church className="w-3.5 h-3.5 text-emerald-500" />
              <span><strong>{stats.churches}</strong> {stats.churches === 1 ? "Igreja" : "Igrejas"}</span>
            </Link>
          </div>
        </div>

      {/* Fim do layout principal em 3 níveis */}

      {/* Configurações de Notificações de Escala via FCM */}
      <section id="configuracoes-notificacao" className="space-y-4 pt-4">
        <NotificationSettings />
      </section>

      {/* Segurança da Conta */}
      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 mt-16">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-10 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 border border-white dark:border-slate-800">
          <div className="space-y-3 text-center md:text-left">
            <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Segurança da Conta
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
              Mantenha sua conta segura. Se você deseja alterar sua senha,
              clicando no botão ao lado enviaremos um link de redefinição para o
              seu e-mail cadastrado.
            </p>
          </div>
          <button
            disabled={resetSent}
            onClick={handleResetPassword}
            className={`flex items-center gap-3 px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 ${
              resetSent
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10"
                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white shadow-slate-200 dark:shadow-none"
            }`}
          >
            {resetSent ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                E-mail Enviado
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                Alterar Senha
              </>
            )}
          </button>
        </div>
      </div>

      {/* TOAST DE FEEDBACK DE AÇÃO PREDITIVA */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-2">
              <p className="text-xs font-bold leading-relaxed">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: SUBSTITUIR COM 1 CLIQUE (ESCALA DESFALCADA D-3 / D-1) */}
      <AnimatePresence>
        {substituteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-rose-200 dark:border-rose-900/60 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Substituição Rápida com 1 Clique
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {substituteModal.serviceTitle}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSubstituteModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                    Desfalque Crítico: {substituteModal.missingRole}
                  </h4>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  O culto está sem operador de transmissão e o baterista ainda não confirmou o convite. Abaixo estão os voluntários disponíveis e capacitados para preencher a vaga agora:
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Voluntários Disponíveis Recomendados:
                </h5>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {substituteModal.substitutes.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h6 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {sub.name}
                          </h6>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {sub.skills}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <a
                          href={`https://wa.me/55${sub.phone}?text=${encodeURIComponent(
                            `Olá ${sub.name.split(" ")[0]}! Graça e paz! Tudo bem? Precisamos de um ${substituteModal.missingRole} para o ${substituteModal.serviceTitle}. Você conseguiria nos abençoar nessa data? Deus abençoe! 🙏`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => {
                            setSubstituteModal(null);
                            triggerToast(`✅ ${sub.name} foi alocado(a) com 1 clique como ${substituteModal.missingRole} para o ${substituteModal.serviceTitle}! Notificação de escala enviada.`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Substituir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center gap-3">
                <button
                  onClick={() => setSubstituteModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
                <Link
                  href="/dashboard/schedules"
                  className="px-4 py-2 text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Abrir Grade de Escalas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: VOLUNTÁRIOS DESCANSADOS (DETECTOR DE FADIGA / BURNOUT RISK) */}
      <AnimatePresence>
        {restedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-amber-200 dark:border-amber-900/60 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Saúde Ministerial & Revezamento
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Voluntários Descansados para a Função
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setRestedModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {restedModal.overloadedName} está escalado há {restedModal.consecutiveCount} domingos consecutivos ({restedModal.ministries})
                  </h4>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Que tal dar folga neste domingo? Descansar voluntários com frequência preserva a vida espiritual, o casamento e o amor em servir à igreja.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Voluntários Descansados da Mesma Função:
                </h5>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {restedModal.restedVolunteers.map((rested) => (
                    <div
                      key={rested.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h6 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {rested.name}
                          </h6>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {rested.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Função: {rested.role}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <a
                          href={`https://wa.me/55${rested.phone}?text=${encodeURIComponent(
                            `Olá ${rested.name.split(" ")[0]}! Graça e paz! Estamos dando um domingo de folga para o ${restedModal.overloadedName}. Você poderia assumir a escala neste domingo? Deus abençoe! 🙏`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => {
                            setRestedModal(null);
                            triggerToast(`✅ Folga concedida a ${restedModal.overloadedName}! ${rested.name} assumiu a escala no próximo culto.`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Conceder Folga</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center gap-3">
                <button
                  onClick={() => setRestedModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Fechar
                </button>
                <Link
                  href="/dashboard/members"
                  className="px-4 py-2 text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Ver Todos os Integrantes</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: COBRANÇA GENTIL NO WHATSAPP (FECHAMENTO DE CICLO DE DISPONIBILIDADE) */}
      <AnimatePresence>
        {reminderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-amber-200 dark:border-amber-900/60 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Fechamento de Grade • {reminderModal.targetMonth}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Disparo Gentil no WhatsApp
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setReminderModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Faltam {reminderModal.daysLeft} dias para fechar a grade de {reminderModal.targetMonth} e {reminderModal.missingCount} voluntários de {reminderModal.ministry} ainda não informaram datas.
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Envie uma mensagem pastoral e carinhosa para que os voluntários confirmem suas datas a tempo.
                </p>
              </div>

              {/* CARD DE MENSAGEM PADRÃO COM BOTÃO COPIAR */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Mensagem Gentil Sugerida:
                  </span>
                  <button
                    onClick={() => {
                      const text = `Olá! Graça e paz! Estamos finalizando a montagem da escala de ${reminderModal.targetMonth} do Ministério de ${reminderModal.ministry} da igreja e precisamos saber suas datas disponíveis até esta quinta-feira. Poderia responder pelo app? Que Deus abençoe muito sua vida e família! 🙏✨`;
                      navigator.clipboard?.writeText(text);
                      setCopiedReminderText(true);
                      setTimeout(() => setCopiedReminderText(false), 3000);
                    }}
                    className="text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {copiedReminderText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Texto</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  &ldquo;Olá! Graça e paz! Estamos finalizando a montagem da escala de {reminderModal.targetMonth} do Ministério de {reminderModal.ministry} da igreja e precisamos saber suas datas disponíveis até esta quinta-feira. Poderia responder pelo app? Que Deus abençoe muito sua vida e família! 🙏✨&rdquo;
                </p>
              </div>

              {/* LISTA DOS 8 VOLUNTÁRIOS PENDENTES */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Voluntários que faltam responder ({reminderModal.volunteers.length}):
                </h5>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {reminderModal.volunteers.map((vol) => (
                    <div
                      key={vol.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                    >
                      <div>
                        <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {vol.name}
                        </h6>
                        <p className="text-[10px] text-slate-400">{vol.dept}</p>
                      </div>

                      <a
                        href={`https://wa.me/55${vol.phone}?text=${encodeURIComponent(
                          `Olá ${vol.name.split(" ")[0]}! Graça e paz! Estamos finalizando a montagem da escala de ${reminderModal.targetMonth} do Ministério de ${reminderModal.ministry} e precisamos saber suas datas disponíveis até quinta-feira. Poderia responder pelo app? Que Deus te abençoe! 🙏✨`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Cobrar no WhatsApp</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setReminderModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Concluído
                </button>
                <Link
                  href="/dashboard/availability"
                  className="px-4 py-2 text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Abrir Módulo de Disponibilidade</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: ALERTA DE REPERTÓRIO REPETITIVO VS. ESQUECIDO (+90 DIAS) */}
      <AnimatePresence>
        {repertoireModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-purple-200 dark:border-purple-900/60 p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Balanço de Louvores & Inteligência Musical
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Repertório Repetitivo vs. Esquecido
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setRepertoireModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-1">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    A música &apos;{repertoireModal.topSong}&apos; foi tocada {repertoireModal.topSongPlays} vezes nos últimos 5 cultos.
                  </h4>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                  Há {repertoireModal.forgottenCount} músicas consagradas do repertório sem tocar há mais de 90 dias. Resgatar essas canções renova o culto sem deixar a congregação insegura.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  12 Músicas Esquecidas com Alto Engajamento (+90 dias):
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {repertoireModal.forgottenSongs.map((song) => (
                    <div
                      key={song.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {song.title}
                        </h6>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {song.artist} • <span className="text-amber-600 dark:text-amber-400 font-semibold">{song.daysWithoutPlaying} dias</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {song.tone}
                        </span>
                        <button
                          onClick={() => {
                            triggerToast(`✅ Música '${song.title}' sugerida para o próximo culto de domingo!`);
                          }}
                          title="Sugerir para a próxima escala"
                          className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-purple-600 transition-colors shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setRepertoireModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Fechar
                </button>
                <Link
                  href="/dashboard/songs"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <span>Explorar Acervo de Músicas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: VISITANTE ESFRIANDO (RETENÇÃO / SLA DE ACOLHIMENTO 48H) */}
      <AnimatePresence>
        {visitorsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-blue-200 dark:border-blue-900/60 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      SLA de Acolhimento em 48h
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Visitantes Aguardando Boas-Vindas
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setVisitorsModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  {visitorsModal.visitorsCount} visitantes do último domingo ainda não receberam mensagem de boas-vindas da secretaria.
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  O contato nas primeiras 48h aumenta em mais de 70% as chances de o visitante retornar no próximo culto. Não deixe esfriar!
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Visitantes Pendentes:
                </h5>
                <div className="space-y-2.5">
                  {visitorsModal.visitors.map((vis) => (
                    <div
                      key={vis.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div>
                        <h6 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {vis.name}
                        </h6>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {vis.service}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/55${vis.phone}?text=${encodeURIComponent(
                            `Olá ${vis.name.split(" ")[0]}! Ficamos muito felizes com sua presença no ${vis.service} da nossa igreja! Seja muito bem-vindo(a) à nossa família. Se precisar de oração ou quiser conhecer nossos ministérios, estamos à disposição! Deus abençoe! 🙏❤️`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Acolher</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setVisitorsModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Fechar
                </button>
                <Link
                  href="/dashboard/visitors"
                  className="px-5 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <span>Módulo da Secretaria</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
