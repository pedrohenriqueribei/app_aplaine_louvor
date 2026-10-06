"use client";

import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Eye,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  UserCheck,
  UserX,
} from "lucide-react";
import { BallerinaIcon } from "@/components/BallerinaIcon";
import { useRouter } from "next/navigation";

interface AvailabilityRecord {
  userId: string;
  churchId: string;
  month: number;
  year: number;
  days: number[];
  userName?: string;
  memberInfo?: any;
}

export default function AvailabilityPage() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [showTeamView, setShowTeamView] = useState(false);
  const [teamAvailability, setTeamAvailability] = useState<
    AvailabilityRecord[]
  >([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showMembersBreakdown, setShowMembersBreakdown] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<number | null>(
    null,
  );

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");

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

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) =>
    new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const isDanceLeader = Boolean(
    userData?.roles?.dance?.includes("leader") ||
    userData?.roles?.dance?.includes("dance_leader")
  );
  const isWorshipLeader = Boolean(userData?.roles?.worship?.includes("leader"));
  const isMultimediaLeader = Boolean(userData?.roles?.multimedia?.includes("leader"));
  const isSecretariatLeader = Boolean(userData?.roles?.secretariat?.includes("leader"));

  const isLeader =
    isWorshipLeader ||
    isMultimediaLeader ||
    isSecretariatLeader ||
    isDanceLeader;
  const isAdmin = userData?.role === "líder" || isLeader;

  const isDanceOnlyLeader =
    isDanceLeader &&
    !isWorshipLeader &&
    !isMultimediaLeader &&
    !isSecretariatLeader &&
    userData?.role !== "líder" &&
    userData?.role !== "super_admin" &&
    userData?.super_admin !== true;

  const allowedDepartmentsList = (
    userData?.role === "super_admin" || userData?.super_admin === true || userData?.role === "líder"
  )
    ? ["worship", "dance", "multimedia", "secretariat"]
    : ["worship", "dance", "multimedia", "secretariat"].filter((deptId) => {
        if (deptId === "dance") return isDanceLeader;
        return userData?.roles?.[deptId]?.includes("leader");
      });

  useEffect(() => {
    async function loadAvailability() {
      if (!userData) return;
      setSelectedDays([]); // Reset state early when month changes
      setLoading(true);
      try {
        const docId = `${userData.uid}_${year}_${month}`;
        const docRef = doc(db, "availability", docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSelectedDays(snap.data().days || []);
        } else {
          setSelectedDays([]);
        }
      } catch (err: any) {
        console.error("Error loading availability:", err);
        handleFirestoreError(err, OperationType.GET, "availability");
      } finally {
        setLoading(false);
      }
    }
    loadAvailability();
    if (showTeamView) {
      loadTeamAvailability();
    }
  }, [userData, year, month, showTeamView]);

  async function loadTeamAvailability() {
    if (!userData?.churchId) return;
    setTeamAvailability([]); // Reset state early when month changes
    setTeamMembers([]);
    setTeamLoading(true);
    try {
      const isSuperAdmin =
        userData?.role === "super_admin" || userData?.super_admin === true;
      const isGlobalLeader = userData?.role === "líder";
      const hasFullAccess = isSuperAdmin || isGlobalLeader;

      const myLedDepts = ["worship", "multimedia", "secretariat", "dance"].filter(
        (deptId) => {
          if (deptId === "dance") {
            return (
              userData?.roles?.dance?.includes("leader") ||
              userData?.roles?.dance?.includes("dance_leader")
            );
          }
          return userData?.roles?.[deptId]?.includes("leader");
        }
      );

      const allowedDepts = hasFullAccess
        ? ["worship", "dance", "multimedia", "secretariat"]
        : myLedDepts;

      if (allowedDepts.length === 0) {
        setTeamAvailability([]);
        setTeamLoading(false);
        return;
      }

      // 1. Fetch users associated via allowed department members subcollections
      const deptMembersUids = new Set<string>();
      for (const dept of allowedDepts) {
        try {
          const deptSnap = await getDocs(
            collection(
              db,
              "churches",
              userData.churchId,
              "departments",
              dept,
              "members"
            )
          );
          for (const docSnap of deptSnap.docs) {
            deptMembersUids.add(docSnap.id);
          }
        } catch (err) {
          console.error(`Error loading department members for ${dept}:`, err);
        }
      }

      // 2. Fetch users directly associated with the church via their profile
      const membersQ = query(
        collection(db, "users"),
        where("churchId", "==", userData.churchId)
      );
      const membersSnap = await getDocs(membersQ);
      const membersMap = new Map<string, any>();
      membersSnap.docs.forEach((d) => {
        const uData = d.data();
        const hasDeptRole = allowedDepts.some((dept) => {
          if (dept === "dance") {
            return (
              (uData.roles?.dance && uData.roles.dance.length > 0) ||
              (uData.danceStyles && uData.danceStyles.length > 0) ||
              (uData.danceGroups && uData.danceGroups.length > 0)
            );
          }
          return uData.roles?.[dept] && uData.roles[dept].length > 0;
        });
        if (hasDeptRole || deptMembersUids.has(d.id)) {
          membersMap.set(d.id, { uid: d.id, ...uData });
        }
      });

      // 3. Ensure all members found in subcollections are fully loaded
      for (const memberUid of Array.from(deptMembersUids)) {
        if (!membersMap.has(memberUid)) {
          try {
            const userProfileSnap = await getDoc(doc(db, "users", memberUid));
            if (userProfileSnap.exists()) {
              membersMap.set(memberUid, { uid: memberUid, ...userProfileSnap.data() });
            }
          } catch (err) {
            console.error(`Error loading profile for ${memberUid}:`, err);
          }
        }
      }

      const members = Array.from(membersMap.values());
      setTeamMembers(members);

      const availabilityPromises = members.map(async (member) => {
        const docId = `${member.uid}_${year}_${month}`;
        try {
          const snap = await getDoc(doc(db, "availability", docId));
          if (snap.exists()) {
            return {
              id: docId,
              userId: member.uid,
              churchId: member.churchId || userData.churchId || "",
              month,
              year,
              days: snap.data().days || [],
              userName: member.name || "Integrante",
              memberInfo: member,
            };
          }
        } catch (err) {
          console.warn(`Could not load availability for user ${member.uid}:`, err);
        }
        return null;
      });

      const availabilityResults = await Promise.all(availabilityPromises);
      const enrichedRecords = availabilityResults.filter(Boolean) as AvailabilityRecord[];

      setTeamAvailability(enrichedRecords);
    } catch (err: any) {
      console.error("Error loading team availability:", err);
    } finally {
      setTeamLoading(false);
    }
  }

  const toggleDay = (day: number) => {
    if (showTeamView) {
      setSelectedDayDetail((prev) => (prev === day ? null : day));
      return;
    }
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSave = async () => {
    if (!userData) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const docId = `${userData.uid}_${year}_${month}`;
      await setDoc(doc(db, "availability", docId), {
        id: docId,
        userId: userData.uid,
        churchId: userData.churchId || "",
        month,
        year,
        days: selectedDays,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
      }, { merge: true });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "availability");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    setCurrentDate(next);
    setSelectedDayDetail(null);
  };

  const prevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    setCurrentDate(prev);
    setSelectedDayDetail(null);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const getMemberSkillsText = (member: any) => {
    const vocal = member?.vocalRange || "";
    const insts = member?.instruments || [];
    const danceStyles = member?.danceStyles || [];
    const danceRoles = member?.roles?.dance || [];

    const hasVocal = vocal.trim().length > 0;
    const numInst = insts.length;
    const numDance = danceStyles.length;
    const isDanceLead =
      danceRoles.includes("leader") || danceRoles.includes("dance_leader");

    let txt = "";

    if (danceRoles.length > 0 || numDance > 0) {
      const parts: string[] = [];
      if (isDanceLead) {
        parts.push("Líder de Dança");
      } else if (danceRoles.includes("dancer") || danceRoles.includes("bailarina")) {
        parts.push("Dançarina");
      }
      if (numDance > 0) {
        parts.push(danceStyles.slice(0, 2).join(", "));
        if (numDance > 2) parts.push(`(+${numDance - 2})`);
      }
      txt = parts.join(" • ") || "Ministério de Dança";
    } else if (hasVocal && numInst > 0) {
      txt = `${vocal} e ${insts[0]}`;
      if (numInst > 1) {
        txt += ` (+${numInst - 1})`;
      }
    } else if (hasVocal) {
      txt = vocal;
    } else if (numInst > 0) {
      txt = insts[0];
      if (numInst > 1) {
        txt += ` (+${numInst - 1})`;
      }
    } else if (member?.roles?.multimedia?.length > 0) {
      txt = "Multimídia";
    } else if (member?.roles?.secretariat?.length > 0) {
      txt = "Secretaria";
    }

    return txt;
  };

  const isMemberInDept = (m: any, dept: string) => {
    if (dept === "all") return true;
    if (dept === "dance") {
      return (
        (m?.roles?.dance && m.roles.dance.length > 0) ||
        (m?.danceStyles && m.danceStyles.length > 0) ||
        (m?.danceGroups && m.danceGroups.length > 0)
      );
    }
    if (dept === "worship") {
      return (
        (m?.roles?.worship && m.roles.worship.length > 0) ||
        (m?.instruments && m.instruments.length > 0) ||
        (m?.vocalRange && m.vocalRange.trim().length > 0)
      );
    }
    if (dept === "multimedia") {
      return m?.roles?.multimedia && m.roles.multimedia.length > 0;
    }
    if (dept === "secretariat") {
      return m?.roles?.secretariat && m.roles.secretariat.length > 0;
    }
    return true;
  };

  const filteredTeamAvailability = teamAvailability.filter((rec) => {
    if (selectedDeptFilter === "all") return true;
    const m = rec.memberInfo as any;
    return isMemberInDept(m, selectedDeptFilter);
  });

  const filteredTotalMembers = teamMembers.filter((m) =>
    isMemberInDept(m, selectedDeptFilter)
  );

  const teamAvailabilityMap = new Map<string, AvailabilityRecord>();
  teamAvailability.forEach((rec) => {
    teamAvailabilityMap.set(rec.userId, rec);
  });

  const respondedMembers = filteredTotalMembers.filter((m) =>
    teamAvailabilityMap.has(m.uid)
  );
  const pendingMembers = filteredTotalMembers.filter(
    (m) => !teamAvailabilityMap.has(m.uid)
  );

  const totalMembersCount = filteredTotalMembers.length;
  const respondedMembersCount = respondedMembers.length;
  const availabilityPercentage =
    totalMembersCount > 0
      ? Math.round((respondedMembersCount / totalMembersCount) * 100)
      : 0;

  const currentDeptDisplayName = (() => {
    if (selectedDeptFilter === "dance") return "Dança";
    if (selectedDeptFilter === "worship") return "Louvor";
    if (selectedDeptFilter === "multimedia") return "Multimídia";
    if (selectedDeptFilter === "secretariat") return "Secretaria";
    if (isDanceOnlyLeader) return "Dança";
    return "Equipe Geral";
  })();

  const getAvailableCount = (day: number) => {
    return filteredTeamAvailability.filter((rec) => rec.days.includes(day)).length;
  };

  const getAvailableMembersDetails = (day: number) => {
    return filteredTeamAvailability
      .filter((rec) => rec.days.includes(day))
      .map((rec) => {
        const member = rec.memberInfo as any;
        const txt = getMemberSkillsText(member);
        const danceStyles = member?.danceStyles || [];
        const danceRoles = member?.roles?.dance || [];

        return {
          name: rec.userName || "Integrante",
          skills: txt,
          isDance: danceRoles.length > 0 || danceStyles.length > 0,
        };
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
            {showTeamView && (isDanceOnlyLeader || selectedDeptFilter === "dance") ? (
              <BallerinaIcon className="w-10 h-10 text-rose-600" />
            ) : (
              <CalendarIcon className="w-10 h-10 text-blue-800 dark:text-blue-500" />
            )}
            {showTeamView
              ? isDanceOnlyLeader || selectedDeptFilter === "dance"
                ? "Disponibilidade da Dança"
                : "Disponibilidade da Equipe"
              : "Minha Disponibilidade"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
            {showTeamView
              ? isDanceOnlyLeader || selectedDeptFilter === "dance"
                ? "Veja quais integrantes da Dança estão disponíveis para ministrar em cada dia do mês."
                : "Veja quem está disponível para servir em cada dia do mês."
              : "Selecione os dias em que você está disponível para servir neste mês."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {isAdmin && (
            <button
              id="btn-ver-equipe"
              onClick={() => setShowTeamView(!showTeamView)}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all border-2 cursor-pointer shadow-sm active:scale-95 ${
                showTeamView
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300"
                  : isDanceOnlyLeader
                    ? "bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-50/50 dark:hover:bg-rose-950/30"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-200 hover:bg-slate-50 dark:hover:bg-slate-750"
              }`}
            >
              {showTeamView ? (
                <Eye className="w-4 h-4" />
              ) : isDanceOnlyLeader ? (
                <BallerinaIcon className="w-4 h-4 text-rose-600" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              {showTeamView ? "Minha Agenda" : isDanceOnlyLeader ? "Ver Equipe de Dança" : "Ver Equipe"}
            </button>
          )}

          <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              onClick={prevMonth}
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-6 flex items-center justify-center min-w-[160px]">
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {monthNames[month]} {year}
              </span>
            </div>
            <button
              onClick={nextMonth}
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {showTeamView && allowedDepartmentsList.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 -mt-4 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-2">
            <Filter className="w-3.5 h-3.5" /> Filtrar Equipe:
          </span>
          <button
            type="button"
            onClick={() => setSelectedDeptFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDeptFilter === "all"
                ? "bg-blue-800 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Todos ({teamMembers.length > 0 ? teamMembers.length : teamAvailability.length})
          </button>
          {allowedDepartmentsList.includes("dance") && (
            <button
              type="button"
              onClick={() => setSelectedDeptFilter("dance")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedDeptFilter === "dance"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/60 dark:border-rose-900/40"
              }`}
            >
              <BallerinaIcon className="w-3.5 h-3.5" /> Dança
            </button>
          )}
          {allowedDepartmentsList.includes("worship") && (
            <button
              type="button"
              onClick={() => setSelectedDeptFilter("worship")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDeptFilter === "worship"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/60 dark:border-indigo-900/40"
              }`}
            >
              Louvor
            </button>
          )}
          {allowedDepartmentsList.includes("multimedia") && (
            <button
              type="button"
              onClick={() => setSelectedDeptFilter("multimedia")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDeptFilter === "multimedia"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/60 dark:border-purple-900/40"
              }`}
            >
              Multimídia
            </button>
          )}
          {allowedDepartmentsList.includes("secretariat") && (
            <button
              type="button"
              onClick={() => setSelectedDeptFilter("secretariat")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDeptFilter === "secretariat"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200/60 dark:border-teal-900/40"
              }`}
            >
              Secretaria
            </button>
          )}
        </div>
      )}

      {showTeamView && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm relative overflow-hidden transition-all">
          <div
            className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full opacity-20 pointer-events-none -mr-20 -mt-20 ${
              selectedDeptFilter === "dance" || isDanceOnlyLeader
                ? "bg-rose-500"
                : "bg-emerald-500"
            }`}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    selectedDeptFilter === "dance" || isDanceOnlyLeader
                      ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {selectedDeptFilter === "dance" || isDanceOnlyLeader ? (
                    <BallerinaIcon className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  {currentDeptDisplayName} • {monthNames[month]} {year}
                </span>

                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  Status de Preenchimento do Mês
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {teamLoading
                  ? "Calculando disponibilidade..."
                  : `${respondedMembersCount} de ${totalMembersCount} integrantes marcaram presença`}
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {teamLoading
                  ? "Buscando respostas do mês selecionado..."
                  : totalMembersCount === 0
                    ? "Nenhum integrante cadastrado neste ministério."
                    : availabilityPercentage === 100
                      ? `Excelente! 100% da equipe já respondeu a disponibilidade para ${monthNames[month]} de ${year}.`
                      : availabilityPercentage >= 50
                        ? `Mais da metade da equipe (${availabilityPercentage}%) já informou sua disponibilidade em ${monthNames[month]} de ${year}.`
                        : `${availabilityPercentage}% da equipe marcou disponibilidade em ${monthNames[month]} de ${year}. Faltam ${pendingMembers.length} integrantes.`}
              </p>
            </div>

            <div className="flex items-center gap-5 bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
              <div className="text-right">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Preenchimento
                </span>
                <span className="text-4xl sm:text-5xl font-display font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {teamLoading ? "..." : `${availabilityPercentage}%`}
                </span>
              </div>
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs border ${
                  selectedDeptFilter === "dance" || isDanceOnlyLeader
                    ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 border-rose-200 dark:border-rose-800"
                    : availabilityPercentage === 100
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                      : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 border-blue-200 dark:border-blue-800"
                }`}
              >
                {teamLoading ? (
                  <div className="w-6 h-6 border-3 border-current border-t-transparent rounded-full animate-spin" />
                ) : availabilityPercentage === 100 ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <TrendingUp className="w-8 h-8" />
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 mb-4">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  selectedDeptFilter === "dance" || isDanceOnlyLeader
                    ? "bg-rose-500 shadow-sm shadow-rose-500/50"
                    : availabilityPercentage === 100
                      ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                      : availabilityPercentage >= 50
                        ? "bg-blue-600 shadow-sm shadow-blue-500/50"
                        : "bg-amber-500 shadow-sm shadow-amber-500/50"
                }`}
                style={{ width: `${teamLoading ? 0 : availabilityPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/50">
                <UserCheck className="w-3.5 h-3.5" />
                {respondedMembersCount} responderam
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800/50">
                <UserX className="w-3.5 h-3.5" />
                {pendingMembers.length} pendentes
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                <Users className="w-3.5 h-3.5" />
                {totalMembersCount} total
              </span>
            </div>

            {totalMembersCount > 0 && (
              <button
                type="button"
                onClick={() => setShowMembersBreakdown(!showMembersBreakdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <span>{showMembersBreakdown ? "Ocultar lista detalhada" : "Ver quem já marcou"}</span>
                {showMembersBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>

          {showMembersBreakdown && totalMembersCount > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredTotalMembers.map((member) => {
                const rec = teamAvailabilityMap.get(member.uid);
                const hasResponded = Boolean(rec);
                const daysCount = rec?.days?.length || 0;
                const skills = getMemberSkillsText(member);
                const isDance =
                  (member?.roles?.dance && member.roles.dance.length > 0) ||
                  (member?.danceStyles && member.danceStyles.length > 0);

                return (
                  <div
                    key={member.uid}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                      hasResponded
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isDance && <BallerinaIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                            {member.name || "Integrante"}
                          </p>
                        </div>
                        {skills && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {skills}
                          </p>
                        )}
                      </div>

                      {hasResponded ? (
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {daysCount} {daysCount === 1 ? "dia" : "dias"}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Pendente
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {hasResponded
                        ? daysCount > 0
                          ? `Marcou ${daysCount} ${daysCount === 1 ? "dia disponível" : "dias disponíveis"}`
                          : "Marcou como indisponível no mês"
                        : `Ainda não preencheu em ${monthNames[month]}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="p-8 md:p-12 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 dark:bg-blue-900/10 blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>

        {loading || (showTeamView && teamLoading) ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Carregando Dados...
            </p>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="grid grid-cols-7 mb-4">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest py-4"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-3 md:gap-4">
              {Array.from({ length: firstDay }).map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const isSelected = !showTeamView && selectedDays.includes(day);
                const today = isToday(day);
                const availableCount = showTeamView
                  ? getAvailableCount(day)
                  : 0;
                const isDetailSelected = selectedDayDetail === day;

                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`
                      aspect-square rounded-2xl md:rounded-[1.25rem] flex flex-col items-center justify-center gap-1 transition-all border-2 relative group
                      ${
                        showTeamView
                          ? availableCount > 0
                            ? isDetailSelected
                              ? "bg-indigo-700 border-indigo-700 text-white shadow-lg"
                              : "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100"
                            : "bg-slate-50 border-slate-100 text-slate-300"
                          : isSelected
                            ? "bg-blue-800 border-blue-800 text-white shadow-lg shadow-blue-800/30"
                            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-blue-200 hover:bg-blue-50/30"
                      }
                      ${today ? "ring-2 ring-blue-400 ring-offset-4 ring-offset-white dark:ring-offset-slate-900" : ""}
                    `}
                  >
                    <span
                      className={`text-xl font-black ${isSelected || isDetailSelected ? "text-white" : "text-slate-800 dark:text-slate-100"}`}
                    >
                      {day}
                    </span>
                    {showTeamView && availableCount > 0 && (
                      <span
                        className={`text-[10px] font-black ${isDetailSelected ? "text-white/80" : "text-indigo-400"}`}
                      >
                        {availableCount}
                      </span>
                    )}
                    {!showTeamView && isSelected && (
                      <CheckCircle2 size={12} className="text-blue-200" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDayDetail && showTeamView && (
              <div className="mt-12 p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-display font-black text-indigo-900 tracking-tight">
                    Disponíveis no dia {selectedDayDetail} de{" "}
                    {monthNames[month]}
                  </h4>
                  <button
                    onClick={() => setSelectedDayDetail(null)}
                    className="text-indigo-400 hover:text-indigo-600 font-bold text-xs"
                  >
                    Fechar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getAvailableMembersDetails(selectedDayDetail).length > 0 ? (
                    getAvailableMembersDetails(selectedDayDetail).map(
                      (member, i) => (
                        <div
                          key={i}
                          className={`flex flex-col px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-xs border transition-all ${
                            member.isDance
                              ? "border-rose-200 dark:border-rose-900/60"
                              : "border-indigo-100 dark:border-indigo-900/50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {member.isDance && (
                              <BallerinaIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {member.name}
                            </span>
                          </div>
                          {member.skills && (
                            <span
                              className={`text-xs font-medium mt-0.5 ${
                                member.isDance
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-indigo-500 dark:text-indigo-400"
                              }`}
                            >
                              {member.skills}
                            </span>
                          )}
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-slate-400 italic text-sm">
                      Nenhum integrante disponível para este dia.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!showTeamView && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-4">
          <div className="flex items-center gap-6 bg-slate-100/50 dark:bg-slate-800/30 px-8 py-4 rounded-3xl border border-white dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-800 rounded-md"></div>
              <span className="text-xs font-bold text-slate-500">
                Disponível
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-md"></div>
              <span className="text-xs font-bold text-slate-500">
                Indisponível
              </span>
            </div>
            <p className="text-xs font-bold text-blue-800 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800/50 ml-4">
              {selectedDays.length} dias selecionados
            </p>
          </div>

          <button
            disabled={saving}
            onClick={handleSave}
            className={`
              w-full md:w-auto px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3
              ${
                saveStatus === "success"
                  ? "bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-blue-800 hover:bg-blue-900 text-white shadow-blue-800/20"
              }
              disabled:opacity-50
            `}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </>
            ) : saveStatus === "success" ? (
              <>
                <CheckCircle2 size={18} />
                Salvo com Sucesso!
              </>
            ) : saveStatus === "error" ? (
              <>
                <AlertCircle size={18} />
                Erro ao Salvar
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar Minha Agenda
              </>
            )}
          </button>
        </div>
      )}

      {showTeamView && (
        <div
          className={`p-8 rounded-[2.5rem] flex gap-6 border ${
            isDanceOnlyLeader || selectedDeptFilter === "dance"
              ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40"
              : "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs border shrink-0 ${
              isDanceOnlyLeader || selectedDeptFilter === "dance"
                ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                : "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40"
            }`}
          >
            {isDanceOnlyLeader || selectedDeptFilter === "dance" ? (
              <BallerinaIcon className="w-6 h-6 text-rose-600" />
            ) : (
              <Users size={24} />
            )}
          </div>
          <div>
            <h4
              className={`font-bold mb-1 tracking-tight ${
                isDanceOnlyLeader || selectedDeptFilter === "dance"
                  ? "text-rose-950 dark:text-rose-200"
                  : "text-indigo-900 dark:text-indigo-200"
              }`}
            >
              {isDanceOnlyLeader || selectedDeptFilter === "dance"
                ? "Visão Geral da Equipe de Dança"
                : "Visão Geral da Equipe"}
            </h4>
            <p
              className={`text-sm leading-relaxed ${
                isDanceOnlyLeader || selectedDeptFilter === "dance"
                  ? "text-rose-800/80 dark:text-rose-300/80"
                  : "text-indigo-700/80 dark:text-indigo-300/80"
              }`}
            >
              Clique em um dia destacado para ver quais integrantes estão
              disponíveis. Isso facilita a montagem das escalas de cada culto, ensaio e apresentação.
            </p>
          </div>
        </div>
      )}

      {!showTeamView && (
        <div className="p-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-[2.5rem] flex gap-6">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-1 tracking-tight">
              Lembrete Importante
            </h4>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/60 leading-relaxed">
              Sua disponibilidade ajuda os líderes a planejarem as escalas de
              forma justa e organizada. Tente atualizar seus dias sempre que
              houver mudanças em sua rotina mensal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
