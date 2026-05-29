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
import { Search, Plus, UserPlus, FileText, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

interface Visitor {
  id: string;
  name: string;
  phone: string;
  email: string;
  firstVisit: string;
  followupStatus: "pending" | "contacted" | "member";
  churchId: string;
  notes: string;
}

export default function VisitorsPage() {
  const { userData, user } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    firstVisit: new Date().toISOString().split("T")[0],
    followupStatus: "pending" as "pending" | "contacted" | "member",
    notes: "",
  });

  useEffect(() => {
    fetchVisitors();
  }, [userData]);

  async function fetchVisitors() {
    const isLeader = userData?.role === "líder" || userData?.roles?.worship?.includes("leader") || userData?.roles?.multimedia?.includes("leader") || userData?.roles?.secretariat?.includes("leader");
    if (!userData?.churchId && !isLeader) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = userData?.churchId
        ? query(
            collection(db, "visitors"),
            where("churchId", "==", userData.churchId),
            orderBy("firstVisit", "desc"),
          )
        : query(collection(db, "visitors"), orderBy("firstVisit", "desc"));

      const snap = await getDocs(q);
      setVisitors(
        snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Visitor),
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "visitors");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.churchId || !user) {
      alert("Você precisa estar vinculado a uma igreja.");
      return;
    }

    try {
      if (editingVisitor) {
        await updateDoc(doc(db, "visitors", editingVisitor.id), {
          ...formData,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      } else {
        const newId = `visitor_${Date.now()}`;
        await setDoc(doc(db, "visitors", newId), {
          id: newId,
          churchId: userData.churchId,
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      }
      setIsModalOpen(false);
      setEditingVisitor(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        firstVisit: new Date().toISOString().split("T")[0],
        followupStatus: "pending",
        notes: "",
      });
      fetchVisitors();
    } catch (err) {
      handleFirestoreError(
        err,
        editingVisitor ? OperationType.UPDATE : OperationType.CREATE,
        "visitors",
      );
    }
  };

  const filteredVisitors = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.includes(searchTerm),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold uppercase">
            Pendente
          </span>
        );
      case "contacted":
        return (
          <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase">
            Contatado
          </span>
        );
      case "member":
        return (
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
            Tornou-se Membro
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-800 transition-colors" />
          <input
            type="text"
            placeholder="Buscar visitante..."
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-800 transition-all text-slate-700 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            setEditingVisitor(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95 w-full md:w-auto justify-center"
        >
          <UserPlus className="w-5 h-5" />
          Registrar Visitante
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 md:p-8">
        {loading ? (
          <div className="flex justify-center p-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="text-center p-20 text-slate-400">
            Nenhum visitante encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVisitors.map((visitor) => (
              <div
                key={visitor.id}
                className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative group transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {visitor.name}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      {new Date(
                        visitor.firstVisit + "T12:00:00",
                      ).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {getStatusBadge(visitor.followupStatus)}
                </div>

                <div className="space-y-2 mt-4 text-sm text-slate-600 dark:text-slate-400">
                  <p className="flex items-center gap-2">
                    <strong>📞</strong> {visitor.phone || "Sem telefone"}
                  </p>
                  {visitor.email && (
                    <p className="flex items-center gap-2">
                      <strong>📧</strong> {visitor.email}
                    </p>
                  )}
                </div>

                {visitor.notes && (
                  <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-medium text-slate-500 border border-slate-100 dark:border-slate-800 italic">
                    {visitor.notes}
                  </div>
                )}

                <button
                  onClick={() => {
                    setEditingVisitor(visitor);
                    setFormData({
                      name: visitor.name,
                      phone: visitor.phone || "",
                      email: visitor.email || "",
                      firstVisit: visitor.firstVisit,
                      followupStatus: visitor.followupStatus,
                      notes: visitor.notes || "",
                    });
                    setIsModalOpen(true);
                  }}
                  className="absolute bottom-4 right-4 p-2 bg-white dark:bg-slate-800 text-blue-800 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700 hover:bg-blue-50"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
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
              {editingVisitor ? "Editar Visitante" : "Novo Visitante"}
            </h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Nome Completo
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Nome do Visitante"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Data da 1ª Visita
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                    value={formData.firstVisit}
                    onChange={(e) =>
                      setFormData({ ...formData, firstVisit: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Status de Acompanhamento
                </label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                  value={formData.followupStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      followupStatus: e.target.value as any,
                    })
                  }
                >
                  <option value="pending">Pendente (Fazer Contato)</option>
                  <option value="contacted">Já Contatado</option>
                  <option value="member">Tornou-se Membro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Observações e Pedidos de Oração
                </label>
                <textarea
                  rows={3}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800 resize-none"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Detalhes sobre a visita, quem os convidou, etc."
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
