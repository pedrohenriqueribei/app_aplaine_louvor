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
} from "lucide-react";
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
  const [teamLoading, setTeamLoading] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<number | null>(
    null,
  );

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

  const isLeader = userData?.roles?.worship?.includes("leader") || userData?.roles?.multimedia?.includes("leader") || userData?.roles?.secretariat?.includes("leader");
  const isAdmin = userData?.role === "líder" || isLeader;

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
    setTeamLoading(true);
    try {
      const isSuperAdmin =
        userData?.role === "super_admin" || userData?.super_admin === true;
      const isGlobalLeader = userData?.role === "líder";
      const hasFullAccess = isSuperAdmin || isGlobalLeader;

      const myLedDepts = ["worship", "multimedia", "secretariat"].filter(
        (deptId) => userData?.roles?.[deptId]?.includes("leader")
      );

      const allowedDepts = hasFullAccess
        ? ["worship", "multimedia", "secretariat"]
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
        const hasDeptRole = allowedDepts.some(
          (dept) => uData.roles?.[dept] && uData.roles[dept].length > 0
        );
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

  const getAvailableCount = (day: number) => {
    return teamAvailability.filter((rec) => rec.days.includes(day)).length;
  };

  const getAvailableMembersDetails = (day: number) => {
    return teamAvailability
      .filter((rec) => rec.days.includes(day))
      .map((rec) => {
        const member = rec.memberInfo as any;
        const vocal = member?.vocalRange || "";
        const insts = member?.instruments || [];

        const hasVocal = vocal.trim().length > 0;
        const numInst = insts.length;

        let txt = "";

        if (hasVocal && numInst > 0) {
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
        }

        return {
          name: rec.userName || "Integrante",
          skills: txt,
        };
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <CalendarIcon className="w-10 h-10 text-blue-800" />
            {showTeamView
              ? "Disponibilidade da Equipe"
              : "Minha Disponibilidade"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
            {showTeamView
              ? "Veja quem está disponível para servir em cada dia do mês."
              : "Selecione os dias em que você está disponível para servir neste mês."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {isAdmin && (
            <button
              onClick={() => setShowTeamView(!showTeamView)}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                showTeamView
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"
              }`}
            >
              {showTeamView ? (
                <Eye className="w-4 h-4" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              {showTeamView ? "Minha Agenda" : "Ver Equipe"}
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
                          className="flex flex-col px-4 py-2 bg-white rounded-xl shadow-sm border border-indigo-100"
                        >
                          <span className="text-sm font-bold text-slate-700">
                            {member.name}
                          </span>
                          {member.skills && (
                            <span className="text-xs font-medium text-indigo-500 mt-0.5">
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
        <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] flex gap-6">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h4 className="font-bold text-indigo-900 mb-1 tracking-tight">
              Visão Geral da Equipe
            </h4>
            <p className="text-sm text-indigo-700/80 leading-relaxed">
              Clique em um dia destacado para ver quais integrantes estão
              disponíveis. Isso facilita a montagem das escalas de cada final de
              semana.
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
