"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Music,
  Video,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  MapPin,
  List,
  CalendarDays,
  Filter,
  Search,
  Check,
  X,
  UserCheck,
  Sparkle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

export interface ChurchScale {
  id: string;
  date: string;
  churchId: string;
  ministry?: "worship" | "multimedia" | "dance" | string;
  locationName?: string;
  locationType?: "internal" | "external";
  serviceId?: string;
  bandId?: string;
  songs?: string[];
  playlist?: string[];
  members?: string[];
  roles?: Record<string, any>;
  rehearsalDate?: string;
  rehearsalTime?: string;
  confirmations?: Record<string, { status: "confirmed" | "declined"; confirmedAt?: string; userName?: string }>;
  confirmedMembers?: string[];
  declinedMembers?: string[];
  notes?: string;
  multimediaNotes?: string;
  danceNotes?: string;
  [key: string]: any;
}

interface ChurchScalesCalendarWidgetProps {
  churchId: string;
  churchName?: string;
  allUsersList?: Array<{ id: string; name?: string; email?: string }>;
}

const roleNameMap: Record<string, string> = {
  mainMinister: "Ministro",
  soprano: "Soprano",
  contralto: "Contralto",
  mezzoSoprano: "Mezzo",
  baritone: "Barítono",
  keyboardist: "Teclado",
  acousticGuitarist: "Violão",
  electricGuitarist: "Guitarra",
  bassist: "Baixo",
  drummer: "Bateria",
  audioTech: "Som",
  projectionOperator: "Projeção",
  pcOperators: "Projeção",
  audioOperators: "Áudio",
  socialMediaOperators: "Transmissão",
  photographyOperators: "Foto",
  cameraOperators: "Câmera",
  danceLeader: "Líder Dança",
  dancers: "Dançarino(a)",
  choreographer: "Coreógrafo",
  choreographers: "Coreógrafo",
  costume: "Figurino",
  costumeManagers: "Figurino",
  rehearsalDirector: "Direção Ensaio",
  rehearsalDirectors: "Direção Ensaio",
};

export function ChurchScalesCalendarWidget({
  churchId,
  churchName = "Igreja",
  allUsersList = [],
}: ChurchScalesCalendarWidgetProps) {
  const [schedules, setSchedules] = useState<ChurchScale[]>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedMinistry, setSelectedMinistry] = useState<"all" | "worship" | "multimedia" | "dance">("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedScaleDetails, setSelectedScaleDetails] = useState<ChurchScale | null>(null);

  // Mês e ano do calendário
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    async function fetchChurchSchedules() {
      if (!churchId) return;
      setLoading(true);
      try {
        const [schedSnap, servSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "schedules"),
              where("churchId", "==", churchId)
            )
          ),
          getDocs(
            query(
              collection(db, "services"),
              where("churchId", "==", churchId)
            )
          ),
        ]);

        const loadedSchedules: ChurchScale[] = schedSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any),
        }));

        const loadedServices = servSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name || "Culto",
        }));

        setSchedules(loadedSchedules);
        setServices(loadedServices);
      } catch (err) {
        console.error("Erro ao carregar escalas da igreja:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchChurchSchedules();
  }, [churchId]);

  // Escalas filtradas por ministério
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedMinistry === "all") return true;
      const sMinistry = s.ministry || "worship";
      return sMinistry === selectedMinistry;
    });
  }, [schedules, selectedMinistry]);

  // Escalas futuras a partir de hoje
  const upcomingSchedules = useMemo(() => {
    return filteredSchedules
      .filter((s) => s.date && s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSchedules, todayStr]);

  // Mapa de escalas por data (YYYY-MM-DD -> ChurchScale[])
  const schedulesByDate = useMemo(() => {
    const map: Record<string, ChurchScale[]> = {};
    filteredSchedules.forEach((s) => {
      if (!s.date) return;
      const dateKey = s.date.split("T")[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(s);
    });
    return map;
  }, [filteredSchedules]);

  // Dias do mês atual no grid de calendário
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Dom) to 6 (Sáb)
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
      schedules: ChurchScale[];
    }> = [];

    // Dias do mês anterior para preencher a primeira semana
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        schedules: schedulesByDate[dateStr] || [],
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        schedules: schedulesByDate[dateStr] || [],
      });
    }

    // Dias do próximo mês para completar semanas (42 slots para grade perfeita 6x7)
    const remainingSlots = 42 - days.length;
    for (let day = 1; day <= remainingSlots; day++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        schedules: schedulesByDate[dateStr] || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr, schedulesByDate]);

  // Navegação no calendário
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleTodayMonth = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const weekDayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Helper para nome do usuário
  const getUserDisplayName = (userId: string) => {
    const userFound = allUsersList.find((u) => u.id === userId);
    return userFound?.name || userFound?.email?.split("@")[0] || "Voluntário";
  };

  // Helper para papéis resumidos
  const getScaleRolesSummary = (scale: ChurchScale) => {
    const r = scale.roles || {};
    const items: Array<{ role: string; user: string }> = [];

    Object.entries(r).forEach(([key, val]) => {
      if (typeof val === "string" && val.trim()) {
        items.push({
          role: roleNameMap[key] || key,
          user: getUserDisplayName(val),
        });
      } else if (Array.isArray(val)) {
        val.forEach((v) => {
          if (typeof v === "string" && v.trim()) {
            items.push({
              role: roleNameMap[key] || key,
              user: getUserDisplayName(v),
            });
          }
        });
      }
    });

    return items;
  };

  function formatDisplayDate(dateStr: string) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 12);
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      return `${dayNames[dateObj.getDay()]}, ${day}/${month}`;
    }
    return dateStr;
  }

  // Estatísticas rápidas
  const totalUpcoming = upcomingSchedules.length;
  const totalVolunteersScheduled = useMemo(() => {
    const setUids = new Set<string>();
    upcomingSchedules.forEach((s) => {
      if (Array.isArray(s.members)) {
        s.members.forEach((m) => setUids.add(m));
      }
    });
    return setUids.size;
  }, [upcomingSchedules]);

  const activeDaySchedules = selectedDate ? schedulesByDate[selectedDate] || [] : [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
      {/* HEADER DO WIDGET */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0 shadow-xs">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Calendário de Escalas da Igreja
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                {totalUpcoming} Futuras
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visão integrada de cultos, ensaios e voluntários escalados em {churchName}
            </p>
          </div>
        </div>

        {/* CONTROLES: FILTROS & MODO DE VISUALIZAÇÃO */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Ministério */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSelectedMinistry("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedMinistry === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedMinistry("worship")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                selectedMinistry === "worship"
                  ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-amber-600"
              }`}
            >
              <Music className="w-3 h-3" />
              <span>Louvor</span>
            </button>
            <button
              onClick={() => setSelectedMinistry("multimedia")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                selectedMinistry === "multimedia"
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-blue-600"
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Mídia</span>
            </button>
            <button
              onClick={() => setSelectedMinistry("dance")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                selectedMinistry === "dance"
                  ? "bg-white dark:bg-slate-900 text-fuchsia-700 dark:text-fuchsia-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-fuchsia-600"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Dança</span>
            </button>
          </div>

          {/* Alternância Grade / Lista */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode("calendar")}
              title="Visão Mensal em Grade"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Visão em Lista / Linha do Tempo"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Atalho de Criação de Escala */}
          <Link
            href="/dashboard/schedules"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-black transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Escala</span>
          </Link>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
            Escalas Futuras
          </span>
          <span className="text-xl font-display font-black text-slate-800 dark:text-slate-100">
            {totalUpcoming}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
            Voluntários Ativos
          </span>
          <span className="text-xl font-display font-black text-slate-800 dark:text-slate-100">
            {totalVolunteersScheduled}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
            Mês Visualizado
          </span>
          <span className="text-base font-bold text-blue-800 dark:text-blue-400">
            {monthNames[currentMonth]} {currentYear}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
            Filtro Ativo
          </span>
          <span className="text-base font-bold text-slate-700 dark:text-slate-300 capitalize">
            {selectedMinistry === "all" ? "Todos os Ministérios" : selectedMinistry}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-800 rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-bold">Carregando calendário de escalas...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="py-16 px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center flex flex-col items-center">
          <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-base">
            Nenhuma escala encontrada para esta igreja
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            Crie a primeira escala de louvor, multimídia ou dança para visualizar aqui no calendário interativo.
          </p>
          <Link
            href="/dashboard/schedules"
            className="px-4 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Escala Agora</span>
          </Link>
        </div>
      ) : viewMode === "calendar" ? (
        /* ================================================================= */
        /* MODO 1: GRADE DO CALENDÁRIO MENSAL                              */
        /* ================================================================= */
        <div className="space-y-4">
          {/* Barra de Navegação do Mês */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <h4 className="text-lg font-display font-black text-slate-800 dark:text-slate-100 capitalize">
                {monthNames[currentMonth]} {currentYear}
              </h4>
              <button
                onClick={handleTodayMonth}
                className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-2xs cursor-pointer"
              >
                Hoje
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grade 7 Dias da Semana */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekDayNames.map((dName, idx) => (
              <div
                key={dName}
                className={`py-2 text-center text-[11px] font-black uppercase tracking-wider ${
                  idx === 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {dName}
              </div>
            ))}

            {/* Células de Dias */}
            {calendarDays.map((cell) => {
              const hasScales = cell.schedules.length > 0;
              const isSelected = selectedDate === cell.dateStr;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => {
                    if (hasScales) {
                      setSelectedDate(isSelected ? null : cell.dateStr);
                    }
                  }}
                  className={`min-h-[75px] sm:min-h-[92px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? "ring-2 ring-blue-600 border-blue-400 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm"
                      : cell.isToday
                      ? "border-blue-400 dark:border-blue-700 bg-blue-50/20 dark:bg-blue-950/20 font-black"
                      : cell.isCurrentMonth
                      ? "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/40 opacity-40"
                  } ${hasScales ? "cursor-pointer hover:shadow-xs" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday
                          ? "w-6 h-6 rounded-full bg-blue-800 text-white flex items-center justify-center font-black shadow-xs"
                          : cell.isCurrentMonth
                          ? "text-slate-800 dark:text-slate-200"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasScales && (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-slate-900 text-white dark:bg-slate-800 shadow-2xs">
                        {cell.schedules.length}
                      </span>
                    )}
                  </div>

                  {/* Badges de Escala no Dia */}
                  <div className="space-y-1 mt-1">
                    {cell.schedules.slice(0, 2).map((sched) => {
                      const m = sched.ministry || "worship";
                      const colorClass =
                        m === "dance"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900"
                          : m === "multimedia"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900";

                      const mIcon =
                        m === "dance" ? (
                          <Sparkles className="w-2.5 h-2.5" />
                        ) : m === "multimedia" ? (
                          <Video className="w-2.5 h-2.5" />
                        ) : (
                          <Music className="w-2.5 h-2.5" />
                        );

                      return (
                        <div
                          key={sched.id}
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border truncate flex items-center gap-1 ${colorClass}`}
                        >
                          {mIcon}
                          <span className="truncate">
                            {sched.locationName || (m === "dance" ? "Dança" : m === "multimedia" ? "Mídia" : "Louvor")}
                          </span>
                        </div>
                      );
                    })}

                    {cell.schedules.length > 2 && (
                      <span className="text-[9px] text-slate-400 block text-right font-bold">
                        +{cell.schedules.length - 2} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAINEL INFERIOR SE UM DIA FOR SELECIONADO NA GRADE */}
          <AnimatePresence>
            {selectedDate && activeDaySchedules.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-black text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-800 dark:text-blue-400" />
                    <span>Escalas em {formatDisplayDate(selectedDate)}</span>
                    <span className="text-xs font-normal text-slate-400">
                      ({activeDaySchedules.length} {activeDaySchedules.length === 1 ? "escala" : "escalas"})
                    </span>
                  </h4>

                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Fechar Detalhes
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeDaySchedules.map((scale) => {
                    const ministry = scale.ministry || "worship";
                    const rolesSummary = getScaleRolesSummary(scale);
                    const confirmedCount =
                      scale.confirmedMembers?.length ||
                      (scale.confirmations ? Object.values(scale.confirmations).filter((c) => c.status === "confirmed").length : 0);
                    const totalMembers = Array.isArray(scale.members) ? scale.members.length : 0;

                    return (
                      <div
                        key={scale.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              ministry === "dance"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : ministry === "multimedia"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {ministry === "dance" ? "Ministério de Dança" : ministry === "multimedia" ? "Multimídia & Som" : "Ministério de Louvor"}
                          </span>

                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{confirmedCount}/{totalMembers} confirmados</span>
                          </span>
                        </div>

                        {scale.locationName && (
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{scale.locationName}</span>
                          </p>
                        )}

                        {/* Músicas ou ensaio */}
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                          {scale.rehearsalTime && (
                            <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Ensaio: {scale.rehearsalTime}</span>
                            </span>
                          )}
                          {(scale.songs?.length || scale.playlist?.length) ? (
                            <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              <Music className="w-3 h-3 text-slate-400" />
                              <span>{(scale.songs?.length || scale.playlist?.length)} músicas</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Integrantes com cargos */}
                        {rolesSummary.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {rolesSummary.slice(0, 6).map((item, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              >
                                <strong className="text-slate-900 dark:text-slate-100">{item.role}:</strong> {item.user}
                              </span>
                            ))}
                            {rolesSummary.length > 6 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{rolesSummary.length - 6} outros
                              </span>
                            )}
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <Link
                            href="/dashboard/schedules"
                            className="text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <span>Abrir no Módulo de Escalas</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ================================================================= */
        /* MODO 2: LINHA DO TEMPO / LISTA DE PRÓXIMAS ESCALAS                */
        /* ================================================================= */
        <div className="space-y-3">
          {upcomingSchedules.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs font-bold">Nenhuma escala futura agendada para os próximos dias.</p>
            </div>
          ) : (
            upcomingSchedules.map((scale) => {
              const ministry = scale.ministry || "worship";
              const rolesSummary = getScaleRolesSummary(scale);
              const confirmedCount =
                scale.confirmedMembers?.length ||
                (scale.confirmations ? Object.values(scale.confirmations).filter((c) => c.status === "confirmed").length : 0);
              const totalMembers = Array.isArray(scale.members) ? scale.members.length : 0;
              const percent = totalMembers > 0 ? Math.round((confirmedCount / totalMembers) * 100) : 100;

              return (
                <div
                  key={scale.id}
                  className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          ministry === "dance"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : ministry === "multimedia"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {ministry === "dance" ? "Dança" : ministry === "multimedia" ? "Multimídia" : "Louvor"}
                      </span>

                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400" />
                        <span>{formatDisplayDate(scale.date)}</span>
                      </span>

                      {scale.locationName && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{scale.locationName}</span>
                        </span>
                      )}
                    </div>

                    {/* Resumo de Voluntários */}
                    {rolesSummary.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
                        {rolesSummary.slice(0, 5).map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.role}:</span> {item.user}
                          </span>
                        ))}
                        {rolesSummary.length > 5 && (
                          <span className="text-[11px] text-slate-400 font-semibold self-center">
                            +{rolesSummary.length - 5}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Nenhum voluntário escalado ainda.</p>
                    )}
                  </div>

                  {/* Confirmação e Ação */}
                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 block leading-tight">
                        Confirmação
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {confirmedCount}/{totalMembers} ({percent}%)
                      </span>
                    </div>

                    <Link
                      href="/dashboard/schedules"
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span>Ver Escala</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
