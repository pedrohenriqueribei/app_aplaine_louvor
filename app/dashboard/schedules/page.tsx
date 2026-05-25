"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  Clock,
  Music,
  Users,
  X,
  Bell,
  MapPin,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

interface Schedule {
  id: string;
  date: string;
  churchId: string;
  bandId?: string; // Added bandId
  serviceId?: string;
  songs: string[];
  members: string[];
  locationType?: "internal" | "external";
  locationName?: string;
  roles?: {
    mainMinister: string;
    drummer: string;
    bassist: string;
    keyboardist: string;
    acousticGuitarist: string;
    electricGuitarist: string;
    baritone: string;
    contralto: string;
    soprano: string;
    mezzoSoprano: string;
    audioTech?: string;
    projectionOperator?: string;
    mediaCreator?: string;
    socialMediaManager?: string;
  };
  notes?: string;
  createdAt?: any;
}

interface Church {
  id: string;
  name: string;
}

interface ServiceType {
  id: string;
  churchId: string;
  name: string;
  dayOfWeek: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
}

interface Band {
  id: string;
  name: string;
  churchId: string;
  leaderId?: string;
  memberIds?: string[];
}

interface Member {
  uid: string;
  name: string;
  role?: string;
  churchId?: string;
  instruments?: string[];
  vocalRange?: string;
  roles?: {
    worship?: string[];
    multimedia?: string[];
    secretariat?: string[];
  };
}

export default function SchedulesPage() {
  const { user, userData } = useAuth();
  const { token } = useNotifications(); // Initialize notifications for the current user

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [churches, setChurches] = useState<Church[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teamAvailability, setTeamAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [dateError, setDateError] = useState("");

  const [formData, setFormData] = useState({
    date: "",
    churchId: "",
    bandId: "", // Default placeholder
    serviceId: "",
    songs: [] as string[],
    roles: {
      mainMinister: "",
      drummer: "",
      bassist: "",
      keyboardist: "",
      acousticGuitarist: "",
      electricGuitarist: "",
      baritone: "",
      contralto: "",
      soprano: "",
      mezzoSoprano: "",
      audioTech: "",
      projectionOperator: "",
      mediaCreator: "",
      socialMediaManager: "",
    },
    notes: "",
    locationType: "internal" as "internal" | "external",
    locationName: "",
  });

  useEffect(() => {
    async function init() {
      if (!userData?.churchId) return;

      setLoading(true);
      try {
        await Promise.all([
          fetchSchedules(),
          fetchChurches(),
          fetchBands(),
          fetchServices(),
          fetchSongs(),
          fetchMembers(),
        ]);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [userData?.churchId]);

  useEffect(() => {
    setDateError("");
    if (formData.date) {
      fetchTeamAvailability(formData.date);

      // Auto-select service based on day of week
      const selectedDate = new Date(`${formData.date}T12:00:00`);
      const dayNames = [
        "Domingo",
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
      ];
      const dayOfWeek = dayNames[selectedDate.getDay()];

      const matchingService = services.find(
        (s) => s.dayOfWeek === dayOfWeek && s.churchId === formData.churchId,
      );
      const currentService = services.find((s) => s.id === formData.serviceId);

      // Change service if none is selected OR if the selected one doesn't match the new day
      if (
        matchingService &&
        (!currentService || currentService.dayOfWeek !== dayOfWeek)
      ) {
        setFormData((prev) => ({ ...prev, serviceId: matchingService.id }));
      }
    } else {
      setTeamAvailability([]);
    }
  }, [formData.date, formData.churchId, isModalOpen, services]);

  async function fetchTeamAvailability(dateString: string) {
    if (!userData?.churchId || !dateString) return;

    setAvailabilityLoading(true);
    try {
      const selectedDate = new Date(`${dateString}T12:00:00`);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();

      const q = query(
        collection(db, "availability"),
        where("churchId", "==", userData.churchId),
        where("month", "==", month),
        where("year", "==", year),
      );

      const snap = await getDocs(q);
      const records = snap.docs.map((doc) => doc.data());

      // Filter records to only those who are available on the specific day
      const availableUserIds = records
        .filter((rec: any) => rec.days.includes(day))
        .map((rec: any) => rec.userId);

      setTeamAvailability(availableUserIds);
    } catch (err) {
      console.error("Error fetching team availability:", err);
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function fetchSchedules() {
    if (!userData?.churchId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "schedules"),
        where("churchId", "==", userData.churchId),
        // Removed orderBy temporarily to test if it's an index issue or rule issue
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ ...doc.data() }) as Schedule);
      // Sort in memory to avoid index requirements for now if that's the issue
      data.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setSchedules(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "schedules");
    } finally {
      setLoading(false);
    }
  }

  async function fetchChurches() {
    if (!userData?.churchId) return;
    const snap = await getDoc(doc(db, "churches", userData.churchId));
    if (snap.exists()) {
      setChurches([{ id: snap.id, name: snap.data().name }]);
    }
  }

  async function fetchBands() {
    if (!userData?.churchId) return;
    const q = query(
      collection(db, "bands"),
      where("churchId", "==", userData.churchId),
    );
    const snap = await getDocs(q);
    setBands(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Band));
  }

  async function fetchServices() {
    if (!userData?.churchId) return;
    const q = query(
      collection(db, "services"),
      where("churchId", "==", userData.churchId),
    );
    const snap = await getDocs(q);
    setServices(
      snap.docs.map((doc) => ({
        id: doc.id,
        churchId: doc.data().churchId,
        name: doc.data().name,
        dayOfWeek: doc.data().dayOfWeek,
      })),
    );
  }

  async function fetchSongs() {
    if (!userData?.churchId) return;
    const q = query(
      collection(db, "songs"),
      where("churchId", "==", userData.churchId),
    );
    const snap = await getDocs(q);
    setSongs(
      snap.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        artist: doc.data().artist,
      })),
    );
  }

  async function fetchMembers() {
    if (!userData?.churchId) return;
    const q = query(
      collection(db, "users"),
      where("churchId", "==", userData.churchId),
    );
    const snap = await getDocs(q);
    setMembers(
      snap.docs.map((doc) => ({
        uid: doc.id,
        name: doc.data().name,
        role: doc.data().role,
        churchId: doc.data().churchId,
        instruments: doc.data().instruments,
        vocalRange: doc.data().vocalRange,
      })),
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError("");

    const isInternal = formData.locationType === "internal";

    if (isInternal && !formData.serviceId) {
      setDateError("Por favor, selecione um culto para a escala interna.");
      return;
    }

    if (formData.locationType === "external" && !formData.locationName.trim()) {
      setDateError("Por favor, digite o local da escala externa.");
      return;
    }

    // Uniqueness check: only for internal schedules, check day & service conflicts
    const isDuplicate =
      isInternal &&
      schedules.some(
        (s) =>
          s.date === formData.date &&
          s.churchId === formData.churchId &&
          s.serviceId === formData.serviceId &&
          (s.locationType === "internal" || !s.locationType) &&
          s.id !== (editingSchedule?.id || ""),
      );

    if (isDuplicate) {
      setDateError(
        "Já existe uma escala criada para esta data, igreja e culto.",
      );
      return;
    }

    if (isInternal && formData.serviceId) {
      const selectedService = services.find((s) => s.id === formData.serviceId);
      if (selectedService && selectedService.dayOfWeek) {
        const selectedDate = new Date(`${formData.date}T12:00:00`);
        const dayMap: { [key: string]: number } = {
          Domingo: 0,
          "Segunda-feira": 1,
          "Terça-feira": 2,
          "Quarta-feira": 3,
          "Quinta-feira": 4,
          "Sexta-feira": 5,
          Sábado: 6,
        };
        const expectedDay = dayMap[selectedService.dayOfWeek];
        if (
          expectedDay !== undefined &&
          selectedDate.getDay() !== expectedDay
        ) {
          setDateError(
            `A data escolhida não corresponde ao dia do culto (${selectedService.dayOfWeek}).`,
          );
          return;
        }
      }
    }

    try {
      const scheduleId = editingSchedule
        ? editingSchedule.id
        : `schedule_${Date.now()}`;

      const membersList = Object.values(formData.roles).filter(Boolean);

      const scheduleData = {
        id: scheduleId,
        date: formData.date,
        churchId: formData.churchId,
        bandId: formData.bandId || "master",
        serviceId: formData.serviceId || "",
        songs: formData.songs,
        roles: formData.roles,
        members: membersList,
        notes: formData.notes,
        locationType: formData.locationType,
        locationName:
          formData.locationType === "external" ? formData.locationName : "",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
        ...(editingSchedule ? {} : { createdAt: serverTimestamp(), createdBy: user?.uid }),
      };

      if (editingSchedule) {
        await updateDoc(doc(db, "schedules", scheduleId), scheduleData);
      } else {
        await setDoc(doc(db, "schedules", scheduleId), scheduleData);
      }

      // Save internal notifications for each member via client SDK (runs under user's permissions)
      try {
        const churchName =
          churches.find((c) => c.id === formData.churchId)?.name ||
          "sua igreja";
        const formattedDate = new Date(formData.date).toLocaleDateString(
          "pt-BR",
        );
        const notifTitle = editingSchedule
          ? "Escala Atualizada!"
          : "Nova Escala!";
        const notifBody =
          formData.locationType === "external"
            ? `Você foi escalado para o evento externo em ${formData.locationName} no dia ${formattedDate}.`
            : `Você foi escalado para o dia ${formattedDate} na ${churchName}.`;

        const savePromises = membersList.map(async (mid) => {
          const notifId = `notif_${Date.now()}_${mid}`;
          return setDoc(doc(db, "notifications", notifId), {
            id: notifId,
            userId: mid,
            title: notifTitle,
            body: notifBody,
            type: "schedule",
            read: false,
            createdAt: serverTimestamp(),
          });
        });
        await Promise.all(savePromises);

        // Trigger Push Notification via API
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "schedule",
            title: notifTitle,
            body: notifBody,
            memberIds: membersList,
          }),
        });
      } catch (notifErr) {
        console.error("Failed to handle notifications:", notifErr);
      }

      setIsModalOpen(false);
      setEditingSchedule(null);
      setFormData({
        date: "",
        churchId: "",
        bandId: "master",
        serviceId: "",
        songs: [],
        roles: {
          mainMinister: "",
          drummer: "",
          bassist: "",
          keyboardist: "",
          acousticGuitarist: "",
          electricGuitarist: "",
          baritone: "",
          contralto: "",
          soprano: "",
          mezzoSoprano: "",
          audioTech: "",
          projectionOperator: "",
          mediaCreator: "",
          socialMediaManager: "",
        },
        notes: "",
        locationType: "internal",
        locationName: "",
      });
      fetchSchedules();
    } catch (err) {
      handleFirestoreError(
        err,
        editingSchedule ? OperationType.UPDATE : OperationType.CREATE,
        `schedules/${editingSchedule?.id || "new"}`,
      );
    }
  };

  const toggleSelection = (id: string, field: "songs") => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((x) => x !== id)
        : [...prev[field], id],
    }));
  };

  const handleRoleChange = (
    role: keyof typeof formData.roles,
    memberId: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      roles: {
        ...prev.roles,
        [role]: memberId,
      },
    }));
  };

  const filterMembersForRole = (
    membersToFilter: Member[],
    roleKey: string,
    churchId: string,
  ) => {
    let filtered = membersToFilter;

    // 1. Filter by band membership if a specific band is selected
    if (formData.bandId && formData.bandId !== "master") {
      const selectedBand = bands.find((b) => b.id === formData.bandId);
      const bandMemberIds = selectedBand?.memberIds || [];
      filtered = filtered.filter((m) => bandMemberIds.includes(m.uid));
    }

    // 2. Filter by availability if a date is selected
    if (formData.date) {
      if (teamAvailability.length > 0) {
        filtered = filtered.filter((m) => teamAvailability.includes(m.uid));
      } else if (!availabilityLoading) {
        filtered = [];
      }
    }

    return filtered.filter((m) => {
      if (churchId && m.churchId !== churchId) return false;
      const insts = m.instruments || [];
      const vocal = m.vocalRange || "";
      switch (roleKey) {
        case "mainMinister":
          return (
            insts.includes("Voz") ||
            [
              "Baixo",
              "Tenor",
              "Barítono",
              "Soprano",
              "Contralto",
              "Mezzo",
            ].includes(vocal)
          );
        case "drummer":
          return insts.includes("Bateria");
        case "bassist":
          return insts.includes("Baixo");
        case "keyboardist":
          return insts.includes("Teclado");
        case "acousticGuitarist":
          return insts.includes("Violão") || insts.includes("Violino");
        case "electricGuitarist":
          return insts.includes("Guitarra");
        case "baritone":
          return ["Tenor", "Baixo", "Barítono"].includes(vocal);
        case "contralto":
          return vocal === "Contralto";
        case "soprano":
          return vocal === "Soprano";
        case "mezzoSoprano":
          return vocal === "Mezzo";
        case "audioTech":
          return (
            m.roles?.multimedia?.includes("audio_tech") ||
            m.roles?.multimedia?.includes("audio_operator") ||
            false
          );
        case "projectionOperator":
          return (
            m.roles?.multimedia?.includes("projection_operator") ||
            m.roles?.multimedia?.includes("pc_operator") ||
            false
          );
        case "mediaCreator":
          return (
            m.roles?.multimedia?.includes("media_creator") ||
            m.roles?.multimedia?.includes("camera_operator") ||
            m.roles?.multimedia?.includes("photography_operator") ||
            false
          );
        case "socialMediaManager":
          return (
            m.roles?.multimedia?.includes("social_media_manager") ||
            m.roles?.multimedia?.includes("social_media_operator") ||
            false
          );
        default:
          return true;
      }
    });
  };

  const groupSchedules = () => {
    if (viewMode === "month") {
      const groups: { [key: string]: Schedule[] } = {};
      schedules.forEach((s) => {
        const date = new Date(
          s.date.includes("T") ? s.date : `${s.date}T12:00:00`,
        );
        const key = date.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });
      return Object.entries(groups).sort((a, b) => {
        // Sort keys by actual date descending
        const dateA = new Date(a[1][0].date);
        const dateB = new Date(b[1][0].date);
        return dateB.getTime() - dateA.getTime();
      });
    } else {
      // Group by week
      const groups: { [key: string]: Schedule[] } = {};
      schedules.forEach((s) => {
        const date = new Date(
          s.date.includes("T") ? s.date : `${s.date}T12:00:00`,
        );
        // Get start of week (Sunday)
        const day = date.getDay();
        const diff = date.getDate() - day;
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - day);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const key = `${startOfWeek.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} à ${endOfWeek.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });
      return Object.entries(groups).sort((a, b) => {
        const dateA = new Date(a[1][0].date);
        const dateB = new Date(b[1][0].date);
        return dateB.getTime() - dateA.getTime();
      });
    }
  };

  const groupedData = groupSchedules();

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-slate-900 dark:text-slate-100 italic tracking-tight">
            Escalas de Louvor
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            Organize e visualize o cronograma do seu ministério.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setViewMode("week")}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "week" ? "bg-white dark:bg-slate-700 text-blue-800 dark:text-blue-200 shadow-md transform scale-105" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Semanal
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === "month" ? "bg-white dark:bg-slate-700 text-blue-800 dark:text-blue-200 shadow-md transform scale-105" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Mensal
          </button>
        </div>

        {(userData?.roles?.worship?.includes("leader") || userData?.roles?.multimedia?.includes("leader") || userData?.roles?.secretariat?.includes("leader")) && (
          <button
            onClick={() => {
              setEditingSchedule(null);
              setFormData({
                date: "",
                churchId: userData?.churchId || "",
                bandId: "master",
                serviceId: "",
                songs: [],
                roles: {
                  mainMinister: "",
                  drummer: "",
                  bassist: "",
                  keyboardist: "",
                  acousticGuitarist: "",
                  electricGuitarist: "",
                  baritone: "",
                  contralto: "",
                  soprano: "",
                  mezzoSoprano: "",
                  audioTech: "",
                  projectionOperator: "",
                  mediaCreator: "",
                  socialMediaManager: "",
                },
                notes: "",
                locationType: "internal",
                locationName: "",
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95 ml-auto"
          >
            <Plus className="w-5 h-5" />
            Nova Escala
          </button>
        )}
      </div>

      <div className="space-y-12">
        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
          </div>
        ) : (
          groupedData.map(([groupTitle, items]) => (
            <div key={groupTitle} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <h3 className="text-sm font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] whitespace-nowrap">
                  {viewMode === "week" ? `Semana: ${groupTitle}` : groupTitle}
                </h3>
                <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800" />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {items.map((schedule) => {
                  const serviceName = schedule.serviceId
                    ? services.find((s) => s.id === schedule.serviceId)?.name
                    : null;
                  const safeDate = schedule.date.includes("T")
                    ? schedule.date
                    : `${schedule.date}T12:00:00`;
                  return (
                    <div
                      key={schedule.id}
                      className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/30 transition-all flex flex-col md:flex-row md:items-center gap-8 relative group"
                    >
                      <div className="flex-shrink-0 flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex flex-col items-center justify-center text-blue-800 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 shadow-inner">
                          <span className="text-[10px] uppercase font-black tracking-widest">
                            {new Date(safeDate)
                              .toLocaleDateString("pt-BR", { month: "short" })
                              .replace(".", "")}
                          </span>
                          <span className="text-3xl font-black">
                            {new Date(safeDate).getDate()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 italic">
                            {churches.find((c) => c.id === schedule.churchId)
                              ?.name || "Igreja"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800/50">
                              {schedule.bandId === "master" || !schedule.bandId
                                ? "Ministério Principal"
                                : bands.find((b) => b.id === schedule.bandId)
                                    ?.name || "Banda Extra"}
                            </span>
                            {schedule.locationType === "external" ? (
                              <span className="px-2.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-rose-200 dark:border-rose-800/50 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-500" />{" "}
                                Externo:{" "}
                                {schedule.locationName || "Local Externo"}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-500" />{" "}
                                Interno (Igreja)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 text-xs font-medium mt-2">
                            {serviceName && (
                              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md">
                                <Clock className="w-3.5 h-3.5" /> {serviceName}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5" />{" "}
                              {new Date(safeDate).toLocaleDateString("pt-BR", {
                                weekday: "long",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 border-y md:border-y-0 md:border-x border-slate-100 dark:border-slate-800 py-6 md:py-0 md:px-10 flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                            <Music className="w-3 h-3" /> Repertório
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {schedule.songs.length > 0 ? (
                              schedule.songs.map((songId, sIdx) => (
                                <span
                                  key={`${songId}-${sIdx}`}
                                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-800"
                                >
                                  {songs.find((s) => s.id === songId)?.title ||
                                    "..."}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Nenhuma música selecionada
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                            <Users className="w-3 h-3" /> Time Escalado
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(schedule.members || [])).map(
                              (mid) => (
                                <div
                                  key={mid}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-900/30"
                                >
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                  {members
                                    .find((m) => m.uid === mid)
                                    ?.name.split(" ")[0] || "..."}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-4">
                        {(userData?.roles?.worship?.includes("leader") || userData?.roles?.multimedia?.includes("leader") || userData?.roles?.secretariat?.includes("leader")) && (
                          <button
                            onClick={() => {
                              setEditingSchedule(schedule);
                              setFormData({
                                date: schedule.date.split("T")[0],
                                churchId: schedule.churchId,
                                bandId: schedule.bandId || "master",
                                serviceId: schedule.serviceId || "",
                                songs: schedule.songs,
                                roles: {
                                  mainMinister:
                                    schedule.roles?.mainMinister || "",
                                  drummer: schedule.roles?.drummer || "",
                                  bassist: schedule.roles?.bassist || "",
                                  keyboardist:
                                    schedule.roles?.keyboardist || "",
                                  acousticGuitarist:
                                    schedule.roles?.acousticGuitarist || "",
                                  electricGuitarist:
                                    schedule.roles?.electricGuitarist || "",
                                  baritone: schedule.roles?.baritone || "",
                                  contralto: schedule.roles?.contralto || "",
                                  soprano: schedule.roles?.soprano || "",
                                  mezzoSoprano:
                                    schedule.roles?.mezzoSoprano || "",
                                  audioTech: schedule.roles?.audioTech || "",
                                  projectionOperator:
                                    schedule.roles?.projectionOperator || "",
                                  mediaCreator:
                                    schedule.roles?.mediaCreator || "",
                                  socialMediaManager:
                                    schedule.roles?.socialMediaManager || "",
                                },
                                notes: schedule.notes || "",
                                locationType:
                                  schedule.locationType || "internal",
                                locationName: schedule.locationName || "",
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-4 text-slate-300 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all bg-slate-50 dark:bg-slate-800/50 rounded-2xl"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {!loading && groupedData.length === 0 && (
          <div className="p-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center text-center bg-white/50 dark:bg-slate-900/50">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 italic tracking-tight">
              Nenhuma escala programada
            </h3>
            <p className="text-slate-500 max-w-xs mt-2 font-medium">
              Comece planejando o próximo louvor clicando em &quot;Nova Escala&quot;.
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 overflow-hidden flex flex-col max-h-[90vh]">
            <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8">
              {editingSchedule ? "Editar Escala" : "Nova Escala"}
            </h2>

            <form
              onSubmit={handleSave}
              className="space-y-10 overflow-y-auto pr-4 custom-scrollbar max-h-[70vh]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CalendarIcon size={12} /> Data *
                    </label>
                    <input
                      required
                      type="date"
                      className={`w-full bg-transparent border-b-2 py-3 outline-none transition-colors text-slate-800 dark:text-slate-100 font-bold ${dateError ? "border-red-500 focus:border-red-600" : "border-slate-200 dark:border-slate-800 focus:border-blue-800"}`}
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                    {dateError && (
                      <p className="text-xs text-red-500 mt-2 font-medium">
                        {dateError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={12} /> Local de Escala *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, locationType: "internal" })
                        }
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          formData.locationType === "internal"
                            ? "bg-blue-800 border-blue-800 text-white shadow-md"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-100"
                        }`}
                      >
                        Interna (Igreja)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, locationType: "external" })
                        }
                        className={`py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          formData.locationType === "external"
                            ? "bg-rose-800 border-rose-800 text-white shadow-md"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-100"
                        }`}
                      >
                        Externa (Evento)
                      </button>
                    </div>
                  </div>

                  {formData.locationType === "external" && (
                    <div className="space-y-1 animate-[fadeIn_0.2s_ease-out]">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nome do Local Externo *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 py-3 outline-none focus:border-blue-800 transition-colors text-slate-800 dark:text-slate-100 font-bold"
                        placeholder="Ex: Praça Central, Ginásio, Casamento, etc."
                        value={formData.locationName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            locationName: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Igreja / Ministério *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {churches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, churchId: c.id })
                          }
                          disabled={true}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                            formData.churchId === c.id
                              ? "bg-blue-800 border-blue-800 text-white shadow-lg"
                              : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Banda / Equipe *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, bandId: "master" })
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                          formData.bandId === "master" || !formData.bandId
                            ? "bg-amber-600 border-amber-600 text-white shadow-lg"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-200"
                        }`}
                      >
                        Ministério Principal
                      </button>
                      {bands.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, bandId: b.id })
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                            formData.bandId === b.id
                              ? "bg-blue-800 border-blue-800 text-white shadow-lg"
                              : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                          }`}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.churchId && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Culto{" "}
                        {formData.locationType === "internal"
                          ? "*"
                          : "(Opcional)"}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {formData.locationType === "external" &&
                          formData.serviceId && (
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, serviceId: "" })
                              }
                              className="px-4 py-2 rounded-xl text-xs font-bold border-2 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:border-slate-700 hover:border-blue-200"
                            >
                              Limpar Culto
                            </button>
                          )}
                        {services
                          .filter((s) => s.churchId === formData.churchId)
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, serviceId: s.id })
                              }
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                formData.serviceId === s.id
                                  ? "bg-blue-800 border-blue-800 text-white shadow-lg"
                                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                              }`}
                            >
                              {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-12 transition-opacity ${!formData.date ? "opacity-40 pointer-events-none" : "opacity-100"}`}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                      Vocais
                    </h3>
                    {availabilityLoading && (
                      <div className="w-3 h-3 border-2 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: "mainMinister", label: "Ministro Principal" },
                      { key: "soprano", label: "Soprano" },
                      { key: "contralto", label: "Contralto" },
                      { key: "mezzoSoprano", label: "Mezzo" },
                      { key: "baritone", label: "Tenor / Baixo / Barítono" },
                    ].map((role) => {
                      const availableMembers = filterMembersForRole(
                        members,
                        role.key,
                        formData.churchId,
                      );
                      const selectedId =
                        formData.roles[role.key as keyof typeof formData.roles];

                      return (
                        <div key={role.key} className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {role.label}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {availableMembers.length === 0 ? (
                              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-wider border border-dashed border-slate-200 dark:border-slate-800">
                                Nenhum disponível
                              </div>
                            ) : (
                              availableMembers.map((m) => (
                                <button
                                  key={m.uid}
                                  type="button"
                                  onClick={() =>
                                    handleRoleChange(
                                      role.key as any,
                                      selectedId === m.uid ? "" : m.uid,
                                    )
                                  }
                                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                    selectedId === m.uid
                                      ? "bg-blue-800 border-blue-800 text-white shadow-lg shadow-blue-800/20 active:scale-95"
                                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-900/30"
                                  }`}
                                >
                                  {m.name}{" "}
                                  {m.vocalRange ? `(${m.vocalRange})` : ""}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                      Banda
                    </h3>
                    {availabilityLoading && (
                      <div className="w-3 h-3 border-2 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: "keyboardist", label: "Teclado" },
                      { key: "acousticGuitarist", label: "Violão / Violino" },
                      { key: "electricGuitarist", label: "Guitarra" },
                      { key: "bassist", label: "Baixo" },
                      { key: "drummer", label: "Bateria" },
                    ].map((role) => {
                      const availableMembers = filterMembersForRole(
                        members,
                        role.key,
                        formData.churchId,
                      );
                      const selectedId =
                        formData.roles[role.key as keyof typeof formData.roles];

                      return (
                        <div key={role.key} className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {role.label}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {availableMembers.length === 0 ? (
                              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-wider border border-dashed border-slate-200 dark:border-slate-800">
                                Nenhum disponível
                              </div>
                            ) : (
                              availableMembers.map((m) => (
                                <button
                                  key={m.uid}
                                  type="button"
                                  onClick={() =>
                                    handleRoleChange(
                                      role.key as any,
                                      selectedId === m.uid ? "" : m.uid,
                                    )
                                  }
                                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                    selectedId === m.uid
                                      ? "bg-blue-800 border-blue-800 text-white shadow-lg shadow-blue-800/20 active:scale-95"
                                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-900/30"
                                  }`}
                                >
                                  {m.name}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                      Multimídia
                    </h3>
                    {availabilityLoading && (
                      <div className="w-3 h-3 border-2 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { key: "audioTech", label: "Técnico de Áudio" },
                      { key: "projectionOperator", label: "Projeção (Letras)" },
                      { key: "mediaCreator", label: "Mídia / Câmeras" },
                      { key: "socialMediaManager", label: "Social Media" },
                    ].map((role) => {
                      const availableMembers = filterMembersForRole(
                        members,
                        role.key,
                        formData.churchId,
                      );
                      const selectedId =
                        formData.roles[role.key as keyof typeof formData.roles];

                      return (
                        <div key={role.key} className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {role.label}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {availableMembers.length === 0 ? (
                              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-wider border border-dashed border-slate-200 dark:border-slate-800">
                                Nenhum disponível
                              </div>
                            ) : (
                              availableMembers.map((m) => (
                                <button
                                  key={m.uid}
                                  type="button"
                                  onClick={() =>
                                    handleRoleChange(
                                      role.key as any,
                                      selectedId === m.uid ? "" : m.uid,
                                    )
                                  }
                                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                    selectedId === m.uid
                                      ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20 active:scale-95"
                                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-200 dark:hover:border-amber-900/30"
                                  }`}
                                >
                                  {m.name}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Observações Extras
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 py-3 outline-none focus:border-blue-800 transition-colors text-slate-800 dark:text-slate-100 font-medium resize-none"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Link da partitura, dinâmica do culto, etc."
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-[2rem] transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-[2rem] transition-all shadow-xl shadow-blue-800/20 flex items-center justify-center gap-2"
                >
                  <Bell className="w-5 h-5" />
                  {editingSchedule
                    ? "Salvar e Notificar"
                    : "Criar Escala e Notificar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
