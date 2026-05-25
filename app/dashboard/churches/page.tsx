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
  documentId,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  Plus,
  Search,
  Edit2,
  MapPin,
  Church,
  User as PastorIcon,
  Waves,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

interface ChurchType {
  id: string;
  name: string;
  address: string;
  pastor: string;
}

export default function ChurchesPage() {
  const router = useRouter();
  const { userData, isSuperAdmin, user } = useAuth();
  const [churches, setChurches] = useState<ChurchType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<ChurchType | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    pastor: "",
  });

  useEffect(() => {
    if (userData !== undefined || isSuperAdmin) {
      fetchChurches();
    }
  }, [userData?.churchId, isSuperAdmin, userData]);

  async function fetchChurches() {
    if (!isSuperAdmin && !userData?.churchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let q;
      if (isSuperAdmin) {
        q = query(collection(db, "churches"));
      } else {
        q = query(
          collection(db, "churches"),
          where(documentId(), "==", userData?.churchId),
        );
      }
      const snap = await getDocs(q);
      setChurches(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ChurchType));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "churches");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingChurch) {
        await updateDoc(doc(db, "churches", editingChurch.id), {
          ...formData,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      } else {
        const newId = `church_${Date.now()}`;
        await setDoc(doc(db, "churches", newId), {
          id: newId,
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      }
      setIsModalOpen(false);
      setEditingChurch(null);
      setFormData({ name: "", address: "", pastor: "" });
      fetchChurches();
    } catch (err) {
      handleFirestoreError(
        err,
        editingChurch ? OperationType.UPDATE : OperationType.CREATE,
        `churches/${editingChurch?.id || "new"}`,
      );
    }
  };

  const filteredChurches = churches.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.pastor.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-800 transition-colors" />
          <input
            type="text"
            placeholder="Buscar igreja..."
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-800 transition-all text-slate-700 dark:text-slate-200 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => {
              setEditingChurch(null);
              setFormData({ name: "", address: "", pastor: "" });
              setIsModalOpen(true);
            }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95 w-full md:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Cadastrar Igreja
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChurches.map((church) => (
          <div
            key={church.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative group overflow-hidden"
          >
            <div
              className="p-6 cursor-pointer"
              onClick={() => router.push(`/dashboard/churches/${church.id}`)}
            >
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-800 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <Church className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100 mb-4">
                {church.name}
              </h3>

              <div className="space-y-3 mb-2">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
                  <PastorIcon className="w-4 h-4 text-blue-400 dark:text-blue-500" />
                  <span className="font-medium">
                    {church.pastor || "Pastor não informado"}
                  </span>
                </div>
                <div className="flex items-start gap-3 text-slate-400 dark:text-slate-500 text-xs">
                  <MapPin className="w-4 h-4 text-slate-300 dark:text-slate-700 mt-0.5 shrink-0" />
                  <span className="leading-relaxed line-clamp-2">
                    {church.address || "Endereço não informado"}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-blue-800 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Ver detalhes <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {(isSuperAdmin || userData?.churchId === church.id) && (
              <div className="flex items-center justify-end p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-50 dark:border-slate-800">
                <button
                  onClick={() => {
                    setEditingChurch(church);
                    setFormData({
                      name: church.name,
                      address: church.address,
                      pastor: church.pastor,
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-300 hover:text-blue-800 transition-colors hover:bg-blue-50 rounded-xl"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredChurches.length === 0 && !loading && (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700">
            <Waves size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Nenhuma igreja cadastrada
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm">
            Comece cadastrando as congregações do seu ministério.
          </p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-800/10 blur-[100px] -mr-32 -mt-32"></div>

            <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-10">
              {editingChurch ? "Editar Igreja" : "Nova Igreja"}
            </h2>

            <form
              onSubmit={handleSave}
              className="space-y-8 relative z-10 text-sm"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  Nome da Igreja
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-slate-100"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Assembleia de Deus Central"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  Pastor Resposável
                </label>
                <input
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-slate-100"
                  value={formData.pastor}
                  onChange={(e) =>
                    setFormData({ ...formData, pastor: e.target.value })
                  }
                  placeholder="Nome do pastor"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  Endereço
                </label>
                <textarea
                  rows={3}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium resize-none text-slate-800 dark:text-slate-100"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Rua, Número, Bairro, Cidade"
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
                  {editingChurch ? "Salvar Mudanças" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
