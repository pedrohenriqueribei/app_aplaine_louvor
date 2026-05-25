"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
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
  Search,
  Calendar as CalendarIcon,
  Clock,
  Edit2,
  PlayCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Appointment {
  id: string;
  churchId: string;
  personName: string;
  personId?: string;
  pastorId: string;
  type: "counseling" | "prayer" | "visit" | "other";
  scheduledAt: string;
  status: "scheduled" | "completed" | "cancelled";
  notes: string;
}

export default function AppointmentsPage() {
  const { userData, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  const [formData, setFormData] = useState({
    personName: "",
    type: "counseling" as "counseling" | "prayer" | "visit" | "other",
    scheduledAt: "",
    status: "scheduled" as "scheduled" | "completed" | "cancelled",
    notes: "",
  });

  useEffect(() => {
    fetchAppointments();
  }, [userData]);

  async function fetchAppointments() {
    if (!userData?.churchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, "appointments"),
        where("churchId", "==", userData.churchId),
        orderBy("scheduledAt", "asc"),
      );

      const snap = await getDocs(q);
      setAppointments(
        snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Appointment),
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "appointments");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.churchId || !user) return;

    try {
      if (editingAppointment) {
        await updateDoc(
          doc(db, "appointments", editingAppointment.id),
          { ...formData, updatedAt: serverTimestamp(), updatedBy: user.uid }
        );
      } else {
        const newId = `appt_${Date.now()}`;
        await setDoc(doc(db, "appointments", newId), {
          id: newId,
          churchId: userData.churchId,
          pastorId: user.uid,
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      }
      setIsModalOpen(false);
      setEditingAppointment(null);
      setFormData({
        personName: "",
        type: "counseling",
        scheduledAt: "",
        status: "scheduled",
        notes: "",
      });
      fetchAppointments();
    } catch (err) {
      handleFirestoreError(
        err,
        editingAppointment ? OperationType.UPDATE : OperationType.CREATE,
        "appointments",
      );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "counseling":
        return "Aconselhamento";
      case "prayer":
        return "Oração / Orientação";
      case "visit":
        return "Visita Lar / Hospital";
      case "other":
        return "Outros";
      default:
        return type;
    }
  };

  const filtered = appointments.filter((a) =>
    a.personName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-800 transition-colors" />
          <input
            type="text"
            placeholder="Buscar nome..."
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-800 transition-all text-slate-700 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            setEditingAppointment(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95 w-full md:w-auto justify-center"
        >
          <CalendarIcon className="w-5 h-5" />
          Agendar Atendimento
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full p-20 text-center">
            <div className="animate-spin inline-block rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 p-20 rounded-[3rem] border border-slate-200 dark:border-slate-800 border-dashed text-center">
            Nenhum atendimento encontrado.
          </div>
        ) : (
          filtered.map((app) => (
            <div
              key={app.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 relative group overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  {getTypeLabel(app.type)}
                </div>
                {app.status === "scheduled" && (
                  <span className="text-amber-500 flex items-center gap-1 text-[10px] font-bold">
                    <Clock className="w-3 h-3" /> AGENDADO
                  </span>
                )}
                {app.status === "completed" && (
                  <span className="text-emerald-500 flex items-center gap-1 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> CONCLUÍDO
                  </span>
                )}
                {app.status === "cancelled" && (
                  <span className="text-red-500 flex items-center gap-1 text-[10px] font-bold">
                    <XCircle className="w-3 h-3" /> CANCELADO
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {app.personName}
              </h3>
              <p className="text-sm text-slate-500 font-medium mb-4 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                {new Date(app.scheduledAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
              {app.notes && (
                <p className="text-xs text-slate-400 italic line-clamp-2">
                  {app.notes}
                </p>
              )}

              <button
                onClick={() => {
                  setEditingAppointment(app);
                  setFormData({
                    personName: app.personName,
                    type: app.type,
                    scheduledAt: app.scheduledAt,
                    status: app.status,
                    notes: app.notes || "",
                  });
                  setIsModalOpen(true);
                }}
                className="absolute bottom-4 right-4 p-2 text-slate-400 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-slate-800 rounded-xl"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 overflow-hidden">
            <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8">
              {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
            </h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Irmão / Visitante
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                  value={formData.personName}
                  onChange={(e) =>
                    setFormData({ ...formData, personName: e.target.value })
                  }
                  placeholder="Nome da pessoa"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Data e Hora
                  </label>
                  <input
                    required
                    type="datetime-local"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                    value={formData.scheduledAt}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Tipo de Gabinete
                  </label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any })
                    }
                  >
                    <option value="counseling">Aconselhamento</option>
                    <option value="prayer">Oração / Orientação</option>
                    <option value="visit">Visita (Lar / Hospital)</option>
                    <option value="other">Outros</option>
                  </select>
                </div>
              </div>

              {editingAppointment && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Status
                  </label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                  >
                    <option value="scheduled">Agendado</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Observações Privadas
                </label>
                <textarea
                  rows={3}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800 resize-none"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Motivo confidencial curvo, etc."
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-[2rem] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-[2rem] transition-all shadow-xl shadow-blue-800/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
