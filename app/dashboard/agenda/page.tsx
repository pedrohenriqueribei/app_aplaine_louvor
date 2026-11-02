"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { extractBirthDayAndMonth } from "@/lib/utils";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Sparkles,
  Cake,
  Users,
  Shield,
  MessageCircle,
  Copy,
  Check,
  Edit2,
  Trash2,
  X,
  Church,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Flame,
  Music,
  Briefcase,
  List,
  Grid,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { motion, AnimatePresence } from "motion/react";

export type EventCategory =
  | "culto"
  | "ensaio"
  | "reuniao"
  | "vigilia"
  | "especial"
  | "outro";

export interface ChurchEvent {
  id: string;
  churchId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  endTime?: string; // HH:mm
  category: EventCategory;
  location?: string;
  description?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface BirthdayMember {
  uid: string;
  name: string;
  phone?: string;
  day: number;
  month: number;
  formattedDate: string;
  photoURL?: string | null;
  roleBadge?: string;
}

const MONTH_NAMES = [
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

const WEEKDAY_NAMES = [
  { short: "DOM", full: "Domingo" },
  { short: "SEG", full: "Segunda-feira" },
  { short: "TER", full: "Terça-feira" },
  { short: "QUA", full: "Quarta-feira" },
  { short: "QUI", full: "Quinta-feira" },
  { short: "SEX", full: "Sexta-feira" },
  { short: "SÁB", full: "Sábado" },
];

const CATEGORY_CONFIG: Record<
  EventCategory,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    icon: any;
  }
> = {
  culto: {
    label: "Culto / Celebração",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/60",
    dot: "bg-blue-600",
    icon: Church,
  },
  ensaio: {
    label: "Ensaio",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800/60",
    dot: "bg-purple-600",
    icon: Music,
  },
  reuniao: {
    label: "Reunião / Liderança",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/60",
    dot: "bg-amber-600",
    icon: Users,
  },
  vigilia: {
    label: "Vigília / Oração",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800/60",
    dot: "bg-indigo-600",
    icon: Flame,
  },
  especial: {
    label: "Evento Especial",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/60",
    dot: "bg-emerald-600",
    icon: Sparkles,
  },
  outro: {
    label: "Outro Evento",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-600",
    icon: CalendarIcon,
  },
};

export default function AgendaPage() {
  const { user, userData, isSuperAdmin } = useAuth();

  // Permissão exclusiva da Secretaria e SuperAdmin para cadastrar/editar/excluir eventos
  const isSecretariat = useMemo(() => {
    if (isSuperAdmin) return true;
    const roleStr = (userData?.role || "").toLowerCase();
    if (
      roleStr === "secretária" ||
      roleStr === "secretaria" ||
      roleStr === "secretariat" ||
      roleStr === "admin"
    ) {
      return true;
    }
    const secRoles = userData?.roles?.secretariat;
    if (Array.isArray(secRoles) && secRoles.length > 0) return true;
    if (
      userData?.department === "secretariat" ||
      userData?.department === "secretaria"
    ) {
      return true;
    }
    if (userData?.ministry && userData.ministry.toLowerCase().includes("secretar")) {
      return true;
    }
    return false;
  }, [isSuperAdmin, userData]);

  // Data atual de referência
  const today = useMemo(() => new Date(), []);
  const todayDateString = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  // Estado da visualização do calendário (Ano e Mês) - Inicia no MÊS ATUAL
  const [currentYear, setCurrentYear] = useState<number>(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => today.getMonth()); // 0-indexado
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Estado dos Dados
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [birthdays, setBirthdays] = useState<BirthdayMember[]>([]);
  const [churchName, setChurchName] = useState<string>("Carregando congregação...");
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [selectedDayString, setSelectedDayString] = useState<string | null>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<ChurchEvent | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Formulário do Evento
  const [formData, setFormData] = useState({
    title: "",
    date: todayDateString,
    time: "19:30",
    endTime: "",
    category: "culto" as EventCategory,
    location: "Templo Principal",
    description: "",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Navegação de Meses
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Carregar Nome da Igreja e Dados
  useEffect(() => {
    let isMounted = true;
    async function fetchChurchData() {
      const churchId = userData?.churchId;
      if (!churchId) {
        if (isMounted) setChurchName("Todas as Congregações");
        return;
      }
      try {
        const cSnap = await getDoc(doc(db, "churches", String(churchId)));
        if (cSnap.exists() && isMounted) {
          setChurchName(cSnap.data().name || "Igreja Local");
        } else if (isMounted) {
          setChurchName("Igreja Local");
        }
      } catch {
        if (isMounted) setChurchName("Igreja Local");
      }
    }
    fetchChurchData();
    return () => {
      isMounted = false;
    };
  }, [userData?.churchId]);

  // Carregar Eventos e Aniversariantes
  const loadAgendaData = async () => {
    setLoading(true);
    try {
      const churchId = userData?.churchId || "";

      // 1. Carregar Eventos via API de alta disponibilidade
      let loadedEvents: ChurchEvent[] = [];
      try {
        const res = await fetch(`/api/agenda/events?churchId=${encodeURIComponent(churchId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.events)) {
            loadedEvents = data.events;
          }
        }
      } catch (apiErr) {
        console.warn("[Agenda] API notice (attempting client fallback):", apiErr);
      }

      // Se a API não retornou registros, tenta Firestore cliente como salvaguarda
      if (loadedEvents.length === 0) {
        try {
          let eventsQuery;
          if (churchId) {
            eventsQuery = query(
              collection(db, "events"),
              where("churchId", "==", churchId)
            );
          } else {
            eventsQuery = query(collection(db, "events"));
          }

          const eventsSnap = await getDocs(eventsQuery);
          eventsSnap.forEach((d) => {
            const data = d.data();
            loadedEvents.push({
              id: d.id,
              churchId: data.churchId || churchId || "",
              title: data.title || "Evento sem título",
              date: data.date || "",
              time: data.time || "",
              endTime: data.endTime || "",
              category: data.category || "outro",
              location: data.location || "",
              description: data.description || "",
              createdBy: data.createdBy || "",
              createdByName: data.createdByName || "",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
          });
        } catch (clientDbErr) {
          console.warn("[Agenda] Client Firestore query notice:", clientDbErr);
        }
      }

      // Ordenação cronológica por data e hora
      loadedEvents.sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return (a.time || "").localeCompare(b.time || "");
      });
      setEvents(loadedEvents);

      // 2. Carregar Aniversariantes do cadastro de membros com segurança e isolamento de erros
      const loadedBirthdays: BirthdayMember[] = [];
      try {
        const hasChurch = Boolean(churchId && churchId.trim() !== "");
        let usersQuery;
        if (hasChurch) {
          usersQuery = query(
            collection(db, "users"),
            where("churchId", "==", churchId)
          );
        } else if (isSuperAdmin) {
          usersQuery = query(collection(db, "users"));
        } else if (user?.uid) {
          usersQuery = query(collection(db, "users"), where("uid", "==", user.uid));
        }

        if (usersQuery) {
          const usersSnap = await getDocs(usersQuery);
          usersSnap.forEach((d) => {
            const u = d.data();
            if (u.dataNascimento) {
              const extracted = extractBirthDayAndMonth(u.dataNascimento);
              if (extracted) {
                let roleBadge = "";
                const wRoles = u.roles?.worship || [];
                const dRoles = u.roles?.dance || [];
                const mRoles = u.roles?.multimedia || [];
                const sRoles = u.roles?.secretariat || [];

                if (
                  wRoles.includes("leader") ||
                  dRoles.includes("leader") ||
                  dRoles.includes("dance_leader") ||
                  mRoles.includes("leader") ||
                  sRoles.includes("leader") ||
                  u.role === "líder"
                ) {
                  roleBadge = "Líder";
                } else if (dRoles.length > 0 || (u.danceStyles && u.danceStyles.length > 0)) {
                  roleBadge = "Dança";
                } else if (mRoles.length > 0) {
                  roleBadge = "Multimídia";
                } else if (sRoles.length > 0) {
                  roleBadge = "Secretaria";
                } else if (u.vocalRange && u.vocalRange.trim().length > 0) {
                  roleBadge = u.vocalRange;
                } else if (Array.isArray(u.instruments) && u.instruments.length > 0) {
                  roleBadge = u.instruments[0];
                }

                loadedBirthdays.push({
                  uid: d.id,
                  name: u.name || "Integrante",
                  phone: u.phone || "",
                  day: extracted.day,
                  month: extracted.month,
                  formattedDate: `${String(extracted.day).padStart(2, "0")}/${String(extracted.month + 1).padStart(2, "0")}`,
                  photoURL: u.photoURL || null,
                  roleBadge,
                });
              }
            }
          });

          loadedBirthdays.sort((a, b) => a.day - b.day);
          setBirthdays(loadedBirthdays);
        }
      } catch (usersErr) {
        console.warn("[Agenda] Notice: could not load member birthdays:", usersErr);
      }
    } catch (err: any) {
      console.warn("[Agenda] Notice during agenda data load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgendaData();
  }, [userData?.churchId]);

  // Estrutura de Dias do Calendário para o Mês Ativo
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const totalDays = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo, 6 = Sábado

    const daysArray: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Dias do mês anterior para preencher a primeira semana
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateString = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      daysArray.push({
        dateString,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateString === todayDateString,
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      daysArray.push({
        dateString,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateString === todayDateString,
      });
    }

    // Dias do próximo mês para completar semanas de 7 colunas (até múltiplos de 7)
    const remainingCells = (7 - (daysArray.length % 7)) % 7;
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateString = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      daysArray.push({
        dateString,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateString === todayDateString,
      });
    }

    return daysArray;
  }, [currentYear, currentMonth, todayDateString]);

  // Indexação de Eventos por Data (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ChurchEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [events]);

  // Indexação de Aniversariantes do Mês Ativo por Dia do Mês (1..31)
  const birthdaysByDay = useMemo(() => {
    const map = new Map<number, BirthdayMember[]>();
    birthdays.forEach((b) => {
      if (b.month === currentMonth) {
        const list = map.get(b.day) || [];
        list.push(b);
        map.set(b.day, list);
      }
    });
    return map;
  }, [birthdays, currentMonth]);

  // Total de eventos e aniversariantes do mês atual exibido
  const currentMonthStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const monthEvents = events.filter((e) => e.date.startsWith(monthPrefix));
    const monthBirthdays = birthdays.filter((b) => b.month === currentMonth);
    return {
      eventsCount: monthEvents.length,
      birthdaysCount: monthBirthdays.length,
      monthEvents,
      monthBirthdays,
    };
  }, [events, birthdays, currentYear, currentMonth]);

  // Gestão de Eventos (Secretaria)
  const handleOpenNewEvent = (presetDate?: string) => {
    if (!isSecretariat) {
      showToast("Apenas usuários com perfil de secretaria podem cadastrar eventos na agenda.");
      return;
    }
    const targetDate = presetDate || todayDateString;
    setEditingEvent(null);
    setFormData({
      title: "",
      date: targetDate,
      time: "19:30",
      endTime: "",
      category: "culto",
      location: "Templo Principal",
      description: "",
    });
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (ev: ChurchEvent) => {
    if (!isSecretariat) {
      showToast("Apenas usuários com perfil de secretaria podem editar eventos na agenda.");
      return;
    }
    setEditingEvent(ev);
    setFormData({
      title: ev.title,
      date: ev.date,
      time: ev.time || "",
      endTime: ev.endTime || "",
      category: ev.category,
      location: ev.location || "",
      description: ev.description || "",
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSecretariat) {
      showToast("Permissão negada. Apenas a secretaria pode gerenciar eventos.");
      return;
    }

    if (!formData.title.trim() || !formData.date) {
      showToast("Preencha o título e a data do evento.");
      return;
    }

    setSavingEvent(true);
    try {
      const churchId = userData?.churchId || "";
      const eventId = editingEvent ? editingEvent.id : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const payload = {
        id: eventId,
        churchId,
        title: formData.title.trim(),
        date: formData.date,
        time: formData.time.trim(),
        endTime: formData.endTime.trim(),
        category: formData.category,
        location: formData.location.trim(),
        description: formData.description.trim(),
      };

      if (editingEvent) {
        // Enviar para API (adminDb + fallback resiliente)
        await fetch("/api/agenda/events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // Tentar Firestore cliente em paralelo (salvaguarda)
        try {
          await updateDoc(doc(db, "events", eventId), {
            ...payload,
            updatedAt: serverTimestamp(),
          });
        } catch (dbErr) {
          console.warn("[Agenda] Client update notice:", dbErr);
        }

        await auditUpdate("Event", eventId, formData.title.trim(), editingEvent, payload, churchId);
        showToast("Evento atualizado com sucesso!");
      } else {
        const createPayload = {
          ...payload,
          createdBy: user?.uid || "",
          createdByName: userData?.name || user?.displayName || "Secretaria",
          createdAt: new Date().toISOString(),
        };

        // Enviar para API (adminDb + fallback resiliente)
        await fetch("/api/agenda/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });

        // Tentar Firestore cliente em paralelo (salvaguarda)
        try {
          await setDoc(doc(db, "events", eventId), {
            ...createPayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (dbErr) {
          console.warn("[Agenda] Client create notice:", dbErr);
        }

        await auditCreate("Event", eventId, formData.title.trim(), createPayload, churchId);
        showToast("Novo evento adicionado à agenda!");
      }

      setIsEventModalOpen(false);
      setEditingEvent(null);
      await loadAgendaData();
    } catch (err: any) {
      console.error("Erro ao salvar evento:", err);
      showToast(err?.message || "Erro ao salvar o evento.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleConfirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    if (!isSecretariat) {
      showToast("Apenas usuários com perfil de secretaria podem excluir eventos.");
      return;
    }

    try {
      // Excluir via API (adminDb + fallback resiliente)
      await fetch(`/api/agenda/events?id=${encodeURIComponent(eventToDelete.id)}`, {
        method: "DELETE",
      });

      // Tentar Firestore cliente em paralelo (salvaguarda)
      try {
        await deleteDoc(doc(db, "events", eventToDelete.id));
      } catch (dbErr) {
        console.warn("[Agenda] Client delete notice:", dbErr);
      }

      await auditDelete("Event", eventToDelete.id, eventToDelete.title, eventToDelete, userData?.churchId);
      showToast("Evento excluído da agenda.");
      setEventToDelete(null);
      if (selectedDayString === eventToDelete.date) {
        setIsDayDetailOpen(false);
      }
      await loadAgendaData();
    } catch (err: any) {
      console.error("Erro ao excluir evento:", err);
      showToast("Falha ao excluir o evento.");
    }
  };

  // Clique em um dia do calendário
  const handleDayClick = (dateString: string) => {
    setSelectedDayString(dateString);
    setIsDayDetailOpen(true);
  };

  // Mensagem e WhatsApp para aniversariantes
  const getGreetingMessage = (b: BirthdayMember) => {
    const firstName = b.name.split(" ")[0];
    const rolePart = b.roleBadge ? ` e por sua bênção no ministério (${b.roleBadge})` : "";
    return `Olá ${firstName}! A família ${churchName} deseja a você um Feliz Aniversário! 🎉🎂 Louvamos a Deus por sua vida${rolePart}. Que o Senhor te abençoe ricamente com paz, saúde e unção! Tenha um dia muito especial! 🙏✨`;
  };

  const handleWhatsApp = (b: BirthdayMember) => {
    if (!b.phone) return;
    let clean = b.phone.replace(/\D/g, "");
    if (clean.length === 10 || clean.length === 11) {
      clean = "55" + clean;
    }
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(getGreetingMessage(b))}`;
    window.open(url, "_blank");
  };

  const handleCopyGreeting = (b: BirthdayMember) => {
    const text = getGreetingMessage(b);
    navigator.clipboard.writeText(text);
    setCopiedUid(b.uid);
    showToast(`Mensagem copiada para parabenizar ${b.name.split(" ")[0]}!`);
    setTimeout(() => setCopiedUid(null), 2500);
  };

  // Eventos e Aniversariantes do Dia Selecionado
  const selectedDayData = useMemo(() => {
    if (!selectedDayString) return { events: [], birthdays: [], formatted: "" };
    const dayEvents = eventsByDate.get(selectedDayString) || [];

    // Parse dia do mês
    const parts = selectedDayString.split("-");
    const dNum = parseInt(parts[2], 10);
    const mNum = parseInt(parts[1], 10) - 1;
    const yNum = parseInt(parts[0], 10);

    const dayBirthdays = birthdays.filter((b) => b.day === dNum && b.month === mNum);

    const dateObj = new Date(yNum, mNum, dNum);
    const weekday = WEEKDAY_NAMES[dateObj.getDay()]?.full || "";
    const formatted = `${weekday}, ${dNum} de ${MONTH_NAMES[mNum]} de ${yNum}`;

    return {
      events: dayEvents,
      birthdays: dayBirthdays,
      formatted,
      dNum,
      mNum,
      yNum,
    };
  }, [selectedDayString, eventsByDate, birthdays]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-slate-900/95 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 dark:border-slate-200 text-sm font-bold backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-blue-400 dark:text-blue-600 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner / Secretariat Role Status */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/50 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Agenda Oficial & Aniversariantes
              </h1>
              {isSecretariat ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                  <Briefcase className="w-3 h-3" />
                  Perfil Secretaria Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-medium">
                  <Shield className="w-3 h-3" />
                  Apenas Leitura
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {churchName} · Planejamento integrado de cultos, ensaios, reuniões e aniversários da comunidade.
            </p>
          </div>
        </div>

        {/* Action Button: Secretaria Only */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Visualização em Calendário"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Visualização em Lista"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {isSecretariat && (
            <button
              type="button"
              onClick={() => handleOpenNewEvent()}
              className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-800/20 text-xs sm:text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Evento</span>
            </button>
          )}
        </div>
      </div>

      {/* Navegação de Mês & Controles */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Controles do Mês */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Mês Anterior"
              aria-label="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Próximo Mês"
              aria-label="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-display font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
              <span>{MONTH_NAMES[currentMonth]}</span>
              <span className="text-blue-700 dark:text-blue-400 font-extrabold">{currentYear}</span>
            </h2>
          </div>

          {/* Botão para voltar ao mês atual */}
          {(currentMonth !== today.getMonth() || currentYear !== today.getFullYear()) && (
            <button
              type="button"
              onClick={handleGoToToday}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-bold transition-all border border-blue-200/70 dark:border-blue-900/50 cursor-pointer ml-1"
            >
              Hoje
            </button>
          )}
        </div>

        {/* Estatísticas Rápidas do Mês */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-slate-100">{currentMonthStats.eventsCount}</strong> eventos
            </span>
          </div>

          <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 rounded-2xl border border-rose-200/60 dark:border-rose-900/40">
            <Cake className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span className="text-rose-800 dark:text-rose-300">
              <strong className="text-rose-950 dark:text-rose-100">{currentMonthStats.birthdaysCount}</strong> aniversariantes
            </span>
          </div>
        </div>
      </div>

      {/* Visualização: Calendário Grid */}
      {viewMode === "calendar" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850/60">
            {WEEKDAY_NAMES.map((w, idx) => (
              <div
                key={w.short}
                className={`py-3 text-center text-xs font-extrabold uppercase tracking-wider ${
                  idx === 0 || idx === 6
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <span className="hidden sm:inline">{w.full}</span>
                <span className="sm:hidden">{w.short}</span>
              </div>
            ))}
          </div>

          {/* Grid de Células de Dias */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
            {calendarDays.map((dayObj) => {
              const dayEvents = eventsByDate.get(dayObj.dateString) || [];
              const dayBirthdays = dayObj.isCurrentMonth
                ? birthdaysByDay.get(dayObj.dayNumber) || []
                : [];

              const totalItems = dayEvents.length + dayBirthdays.length;

              return (
                <div
                  key={dayObj.dateString}
                  onClick={() => handleDayClick(dayObj.dateString)}
                  className={`min-h-[95px] sm:min-h-[125px] p-2 sm:p-2.5 transition-all flex flex-col justify-between group cursor-pointer ${
                    dayObj.isCurrentMonth
                      ? "bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
                      : "bg-slate-50/60 dark:bg-slate-950/40 text-slate-300 dark:text-slate-600 hover:bg-slate-100/50"
                  } ${
                    dayObj.isToday
                      ? "ring-2 ring-inset ring-blue-600 bg-blue-50/15 dark:bg-blue-950/30"
                      : ""
                  }`}
                >
                  {/* Topo do Card: Número do Dia + Indicador "Hoje" */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className={`text-xs sm:text-sm font-bold flex items-center justify-center rounded-xl w-6 h-6 sm:w-7 sm:h-7 transition-colors ${
                        dayObj.isToday
                          ? "bg-blue-700 text-white shadow-xs font-black"
                          : dayObj.isCurrentMonth
                          ? "text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {dayObj.dayNumber}
                    </span>

                    {dayObj.isToday && (
                      <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                        Hoje
                      </span>
                    )}

                    {isSecretariat && dayObj.isCurrentMonth && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNewEvent(dayObj.dateString);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Adicionar evento neste dia"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Conteúdo: Lista compacta de eventos e aniversariantes */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {/* Eventos do Dia */}
                    {dayEvents.slice(0, 2).map((ev) => {
                      const cfg = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.outro;
                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-1.5 px-1.5 py-0.5 sm:py-1 rounded-lg border text-[10px] sm:text-[11px] font-bold truncate transition-colors ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          title={`${ev.time ? ev.time + " - " : ""}${ev.title}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          {ev.time && <span className="opacity-75 shrink-0 hidden sm:inline">{ev.time}</span>}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}

                    {/* Aniversariantes do Dia */}
                    {dayBirthdays.slice(0, 1).map((b) => (
                      <div
                        key={b.uid}
                        className="flex items-center gap-1.5 px-1.5 py-0.5 sm:py-1 rounded-lg border bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50 text-[10px] sm:text-[11px] font-bold truncate"
                        title={`Aniversariante: ${b.name}`}
                      >
                        <Cake className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{b.name.split(" ")[0]}</span>
                      </div>
                    ))}

                    {/* Indicador de mais itens se ultrapassar o limite visual */}
                    {totalItems > 3 && (
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 text-center pt-0.5">
                        +{totalItems - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visualização: Lista Cronológica do Mês */}
      {viewMode === "list" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Programação Completa de {MONTH_NAMES[currentMonth]}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {currentMonthStats.eventsCount} eventos · {currentMonthStats.birthdaysCount} aniversariantes
            </span>
          </div>

          {currentMonthStats.eventsCount === 0 && currentMonthStats.birthdaysCount === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">Nenhum evento ou aniversário registrado neste mês.</p>
              {isSecretariat && (
                <button
                  type="button"
                  onClick={() => handleOpenNewEvent()}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar Primeiro Evento
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Eventos do Mês */}
              {currentMonthStats.monthEvents.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Eventos & Cultos ({currentMonthStats.monthEvents.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentMonthStats.monthEvents.map((ev) => {
                      const cfg = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.outro;
                      const Icon = cfg.icon;
                      const parts = ev.date.split("-");
                      const formattedDate = `${parts[2]}/${parts[1]}`;

                      return (
                        <div
                          key={ev.id}
                          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-500/40 transition-all flex items-start justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md mb-1 ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}
                              </span>
                              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {ev.title}
                              </h5>
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                                  {formattedDate}
                                </span>
                                {ev.time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    {ev.time} {ev.endTime ? `às ${ev.endTime}` : ""}
                                  </span>
                                )}
                                {ev.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {ev.location}
                                  </span>
                                )}
                              </div>
                              {ev.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {isSecretariat && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditEvent(ev)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                title="Editar Evento"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEventToDelete(ev)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Excluir Evento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Aniversariantes do Mês */}
              {currentMonthStats.monthBirthdays.length > 0 && (
                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                    <Cake className="w-4 h-4" />
                    <span>Aniversariantes de {MONTH_NAMES[currentMonth]} ({currentMonthStats.monthBirthdays.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {currentMonthStats.monthBirthdays.map((b) => (
                      <div
                        key={b.uid}
                        className="p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            photoURL={b.photoURL}
                            name={b.name}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {b.name}
                            </p>
                            <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                              Dia {b.day} ({b.formattedDate})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {b.phone && (
                            <button
                              type="button"
                              onClick={() => handleWhatsApp(b)}
                              className="p-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
                              title="Felicitar no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyGreeting(b)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
                            title="Copiar Mensagem"
                          >
                            {copiedUid === b.uid ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Detalhes do Dia Selecionado */}
      <AnimatePresence>
        {isDayDetailOpen && selectedDayString && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDayDetailOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                      Programação do Dia
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {selectedDayData.formatted}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDayDetailOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Botão para Secretaria cadastrar neste dia */}
              {isSecretariat && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDayDetailOpen(false);
                      handleOpenNewEvent(selectedDayString);
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Novo Evento para este Dia</span>
                  </button>
                </div>
              )}

              {/* Seção 1: Eventos do Dia */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Eventos ({selectedDayData.events.length})</span>
                </h4>

                {selectedDayData.events.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl text-center">
                    Nenhum evento agendado para esta data.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDayData.events.map((ev) => {
                      const cfg = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.outro;
                      const Icon = cfg.icon;

                      return (
                        <div
                          key={ev.id}
                          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md mb-1 ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}
                              </span>
                              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {ev.title}
                              </h5>
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                {ev.time && (
                                  <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    {ev.time} {ev.endTime ? `às ${ev.endTime}` : ""}
                                  </span>
                                )}
                                {ev.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {ev.location}
                                  </span>
                                )}
                              </div>
                              {ev.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/60">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {isSecretariat && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDayDetailOpen(false);
                                  handleOpenEditEvent(ev);
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:text-blue-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                title="Editar Evento"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEventToDelete(ev)}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Excluir Evento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seção 2: Aniversariantes do Dia */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  <Cake className="w-4 h-4" />
                  <span>Aniversariantes do Dia ({selectedDayData.birthdays.length})</span>
                </h4>

                {selectedDayData.birthdays.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl text-center">
                    Nenhum membro faz aniversário nesta data.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDayData.birthdays.map((b) => (
                      <div
                        key={b.uid}
                        className="p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            photoURL={b.photoURL}
                            name={b.name}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {b.name}
                            </p>
                            {b.roleBadge && (
                              <span className="inline-block text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                {b.roleBadge}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {b.phone && (
                            <button
                              type="button"
                              onClick={() => handleWhatsApp(b)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                              title="Enviar felicitações no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyGreeting(b)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
                            title="Copiar Mensagem"
                          >
                            {copiedUid === b.uid ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Cadastro & Edição de Evento (Exclusivo Secretaria) */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !savingEvent && setIsEventModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 z-10 max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                      {editingEvent ? "Editar Evento" : "Cadastrar Novo Evento"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Permissão oficial da Secretaria da Igreja
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  disabled={savingEvent}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                {/* Título do Evento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Título do Evento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Culto da Família, Ensaio Geral, Reunião de Líderes"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Categoria do Evento *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as EventCategory })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="culto">Culto / Celebração</option>
                    <option value="ensaio">Ensaio</option>
                    <option value="reuniao">Reunião / Alinhamento de Liderança</option>
                    <option value="vigilia">Vigília / Oração</option>
                    <option value="especial">Evento Especial / Conferência</option>
                    <option value="outro">Outro Evento</option>
                  </select>
                </div>

                {/* Data e Horário */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Início
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Término (opcional)
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Local */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Localização / Espaço
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Templo Principal, Salão Social, Sala 3, Online"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Descrição / Observações */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Detalhes ou Observações
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Orientações aos membros, pregador convidado, tema, etc."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>

                {/* Ações */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    disabled={savingEvent}
                    className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEvent}
                    className="px-6 py-2.5 rounded-2xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-md shadow-blue-800/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {savingEvent ? "Salvando..." : editingEvent ? "Salvar Alterações" : "Cadastrar Evento"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão (In-App Dialog, sem window.confirm) */}
      <AnimatePresence>
        {eventToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEventToDelete(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 z-10"
            >
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h4 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
                  Confirmar Exclusão
                </h4>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                Tem certeza que deseja remover o evento{" "}
                <strong className="text-slate-900 dark:text-slate-100">
                  &ldquo;{eventToDelete.title}&rdquo;
                </strong>{" "}
                da agenda oficial da igreja?
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEventToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteEvent}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 cursor-pointer"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
