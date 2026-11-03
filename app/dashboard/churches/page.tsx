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
import { db, handleFirestoreError, OperationType, auth } from "@/lib/firebase";
import { auditCreate, auditUpdate } from "@/lib/audit";
import {
  Plus,
  Search,
  Edit2,
  MapPin,
  Church,
  User as PastorIcon,
  Waves,
  ArrowRight,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Copy,
  Check,
  Phone,
  Mail,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

interface ChurchType {
  id: string;
  name: string;
  address: string;
  pastor: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  pastors?: {
    uid: string;
    name: string;
    email: string;
    phone?: string;
    title?: string;
    createdAt?: string;
  }[];
  ministries?: any[];
}

export default function ChurchesPage() {
  const router = useRouter();
  const { userData, isSuperAdmin, user } = useAuth();
  const [churches, setChurches] = useState<ChurchType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<ChurchType | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    pastor: "",
    phone: "",
    email: "",
    cnpj: "",
    // Optional pastor account creation
    createPastorAccount: false,
    pastorEmail: "",
    pastorPassword: "",
    pastorPhone: "",
    pastorTitle: "Pastor Titular",
  });

  const [showPastorPass, setShowPastorPass] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    churchName: string;
    pastorName: string;
    pastorEmail: string;
    pastorPass: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

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
          where(documentId(), "==", userData?.churchId)
        );
      }
      const snap = await getDocs(q);
      setChurches(
        snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as ChurchType)
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "churches");
    } finally {
      setLoading(false);
    }
  }

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "Pr@";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, pastorPassword: pass }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingLoading(true);

    try {
      let targetChurchId = editingChurch?.id;

      if (editingChurch) {
        const updatePayload = {
          name: formData.name,
          address: formData.address,
          pastor: formData.pastor,
          phone: formData.phone,
          email: formData.email,
          cnpj: formData.cnpj,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };

        await updateDoc(doc(db, "churches", editingChurch.id), updatePayload);

        auditUpdate(
          "Church",
          editingChurch.id,
          formData.name || editingChurch.name,
          editingChurch,
          updatePayload,
          { churchId: editingChurch.id }
        ).catch(console.warn);
      } else {
        const newId = `church_${Date.now()}`;
        targetChurchId = newId;

        const newRecord = {
          id: newId,
          name: formData.name,
          address: formData.address,
          pastor: formData.pastor,
          phone: formData.phone,
          email: formData.email,
          cnpj: formData.cnpj,
          pastors: [],
          ministries: [],
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };

        await setDoc(doc(db, "churches", newId), newRecord);

        auditCreate("Church", newId, formData.name, newRecord, {
          churchId: newId,
        }).catch(console.warn);

        // Sync with server cache for visitor forms
        fetch("/api/visitors/church-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newId, name: formData.name, pastor: formData.pastor, address: formData.address }),
        }).catch(() => {});
      }

      // If pastor account creation was requested
      if (
        formData.createPastorAccount &&
        formData.pastorEmail &&
        formData.pastorPassword &&
        formData.pastor &&
        targetChurchId
      ) {
        try {
          const token = await auth.currentUser?.getIdToken();
          const res = await fetch("/api/admin/create-pastor", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: formData.pastor,
              title: formData.pastorTitle || "Pastor Titular",
              email: formData.pastorEmail,
              password: formData.pastorPassword,
              phone: formData.pastorPhone || formData.phone,
              churchId: targetChurchId,
            }),
          });

          if (res.ok) {
            setCreatedCredentials({
              churchName: formData.name,
              pastorName: formData.pastor,
              pastorEmail: formData.pastorEmail,
              pastorPass: formData.pastorPassword,
            });
          }
        } catch (pastorErr) {
          console.warn("Erro ao provisionar conta pastoral:", pastorErr);
        }
      }

      setIsModalOpen(false);
      setEditingChurch(null);
      setFormData({
        name: "",
        address: "",
        pastor: "",
        phone: "",
        email: "",
        cnpj: "",
        createPastorAccount: false,
        pastorEmail: "",
        pastorPassword: "",
        pastorPhone: "",
        pastorTitle: "Pastor Titular",
      });
      fetchChurches();
    } catch (err: any) {
      console.error("Erro ao salvar igreja:", err);
      alert("Erro ao salvar igreja: " + (err.message || err));
    } finally {
      setSavingLoading(false);
    }
  };

  const filteredChurches = churches.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.pastor && c.pastor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Governança Ministerial
          </span>
          <h1 className="text-3xl md:text-4xl font-display font-black text-slate-800 dark:text-slate-100">
            Gerenciamento de Igrejas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Gestão completa das congregações cristãs, liderança pastoral, cultos e ministérios.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => {
              setEditingChurch(null);
              setFormData({
                name: "",
                address: "",
                pastor: "",
                phone: "",
                email: "",
                cnpj: "",
                createPastorAccount: true,
                pastorEmail: "",
                pastorPassword: "",
                pastorPhone: "",
                pastorTitle: "Pastor Titular",
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-7 py-3.5 rounded-2xl font-bold flex items-center gap-2.5 transition-all shadow-xl shadow-blue-800/20 active:scale-95 w-full md:w-auto justify-center text-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Cadastrar Nova Igreja
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative w-full md:w-96 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-800 transition-colors" />
        <input
          type="text"
          placeholder="Buscar por igreja, pastor ou endereço..."
          className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-800 transition-all text-slate-700 dark:text-slate-200 outline-none shadow-sm text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Churches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChurches.map((church) => {
          const hasPastors = (church.pastors && church.pastors.length > 0) || Boolean(church.pastor);
          return (
            <div
              key={church.id}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all relative group overflow-hidden flex flex-col justify-between"
            >
              <div
                className="p-8 cursor-pointer"
                onClick={() => router.push(`/dashboard/churches/${church.id}`)}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-800 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    <Church className="w-7 h-7" />
                  </div>

                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-200/60 dark:border-emerald-800/60">
                    Ativa
                  </span>
                </div>

                <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 mb-3 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                  {church.name}
                </h3>

                <div className="space-y-2.5 mb-6 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <PastorIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {church.pastor || "Pastor não cadastrado"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">
                      {church.address || "Endereço não informado"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-blue-800 dark:text-blue-400 text-xs font-bold">
                  <span>Gerenciar Ministérios & Cultos</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {(isSuperAdmin || userData?.churchId === church.id) && (
                <div className="px-8 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    ID: {church.id.substring(0, 10)}
                  </span>
                  <button
                    onClick={() => {
                      setEditingChurch(church);
                      setFormData({
                        name: church.name,
                        address: church.address,
                        pastor: church.pastor,
                        phone: church.phone || "",
                        email: church.email || "",
                        cnpj: church.cnpj || "",
                        createPastorAccount: false,
                        pastorEmail: "",
                        pastorPassword: "",
                        pastorPhone: "",
                        pastorTitle: "Pastor Titular",
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-800 dark:hover:text-blue-400 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl cursor-pointer"
                    title="Editar Informações da Igreja"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredChurches.length === 0 && !loading && (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700">
            <Waves size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Nenhuma igreja encontrada
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm">
            Cadastre congregações cristãs e pastores responsáveis para iniciar o gerenciamento completo.
          </p>
        </div>
      )}

      {/* MODAL: CADASTRAR OU EDITAR IGREJA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-8 md:p-12 overflow-hidden my-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                  {editingChurch ? "Atualização" : "Novo Registro"}
                </span>
                <h2 className="text-2xl md:text-3xl font-display font-black text-slate-800 dark:text-slate-100">
                  {editingChurch ? "Editar Igreja" : "Cadastrar Igreja"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Igreja *
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Igreja Central da Fé"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Pastor Responsável / Titular *
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                  value={formData.pastor}
                  onChange={(e) => setFormData({ ...formData, pastor: e.target.value })}
                  placeholder="Ex: Pr. Marcos Oliveira"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Endereço da Igreja
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>

              {/* OPÇÃO DE CRIAR CONTA PARA PASTOR */}
              {!editingChurch && (
                <div className="pt-2">
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                        <span className="font-bold text-xs text-blue-900 dark:text-blue-200">
                          Criar Conta de Login para o Pastor Agora
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.createPastorAccount}
                        onChange={(e) => setFormData({ ...formData, createPastorAccount: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    {formData.createPastorAccount && (
                      <div className="space-y-3 pt-2 border-t border-blue-200 dark:border-blue-800">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            E-mail de Login do Pastor *
                          </label>
                          <input
                            required={formData.createPastorAccount}
                            type="email"
                            placeholder="pastor@igreja.com"
                            value={formData.pastorEmail}
                            onChange={(e) => setFormData({ ...formData, pastorEmail: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:border-blue-600"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              Senha de Acesso *
                            </label>
                            <button
                              type="button"
                              onClick={handleGeneratePassword}
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              Gerar Senha
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              required={formData.createPastorAccount}
                              type={showPastorPass ? "text" : "password"}
                              placeholder="Mínimo 6 caracteres"
                              value={formData.pastorPassword}
                              onChange={(e) => setFormData({ ...formData, pastorPassword: e.target.value })}
                              className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:border-blue-600"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPastorPass(!showPastorPass)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                              {showPastorPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLoading}
                  className="flex-1 px-6 py-3.5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-800/20 cursor-pointer text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingChurch ? "Salvar Mudanças" : "Cadastrar Igreja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUCESSO CREDENCIAIS CRIADAS */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2.8rem] w-full max-w-md p-8 shadow-2xl text-center border border-slate-100 dark:border-slate-800">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 mb-1">
              Igreja & Conta Pastoral Criadas!
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              A congregação <strong>{createdCredentials.churchName}</strong> e a conta do pastor <strong>{createdCredentials.pastorName}</strong> estão prontas para acesso.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-left space-y-2 mb-6 border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">E-mail de Login</span>
                <p className="font-mono font-bold text-blue-700 dark:text-blue-400">{createdCredentials.pastorEmail}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Senha</span>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{createdCredentials.pastorPass}</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  const text = `Acesso Pastoral Applaine:\nIgreja: ${createdCredentials.churchName}\nPastor: ${createdCredentials.pastorName}\nLogin: ${createdCredentials.pastorEmail}\nSenha: ${createdCredentials.pastorPass}\nLink: ${window.location.origin}/login`;
                  navigator.clipboard.writeText(text);
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 2500);
                }}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all",
                  copiedCreds ? "bg-emerald-600 text-white" : "bg-blue-800 text-white hover:bg-blue-900"
                )}
              >
                {copiedCreds ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedCreds ? "Copiado!" : "Copiar Credenciais"}
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
