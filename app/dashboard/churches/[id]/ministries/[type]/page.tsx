"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Mic2,
  Monitor,
  Briefcase,
  Shield,
  Music,
  LayoutGrid,
  Plus,
  ExternalLink,
  X,
  Clock,
  Calendar,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";
import MultimediaWorkspace from "@/components/MultimediaWorkspace";

export const dynamic = "force-dynamic";

interface Musician {
  uid: string;
  name: string;
  email: string;
  instrument?: string;
  instruments?: string[];
  vocalRange?: string;
  level?: string;
  role: "líder" | "instrumentista";
  status: "active" | "inactive";
}

interface Band {
  id: string;
  name: string;
  churchId: string;
  memberIds: string[];
  leaderId: string;
}

interface ChurchType {
  id: string;
  name: string;
  pastor: string;
  worshipMinistryName?: string;
  worshipMinistryAcronym?: string;
}

export default function MinistryDetailPage() {
  const { id, type } = useParams();
  const router = useRouter();
  const { userData } = useAuth();

  const [church, setChurch] = useState<ChurchType | null>(null);
  const [members, setMembers] = useState<Musician[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditingWorship, setIsEditingWorship] = useState(false);
  const [worshipEditData, setWorshipEditData] = useState({
    name: "",
    acronym: "",
  });
  const [savingWorship, setSavingWorship] = useState(false);

  const [isBandModalOpen, setIsBandModalOpen] = useState(false);
  const [bandName, setBandName] = useState("");
  const [savingBand, setSavingBand] = useState(false);

  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/register?churchId=${id}&role=${type}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Church
        const churchDoc = await getDoc(doc(db, "churches", id as string));
        if (churchDoc.exists()) {
          const churchData = churchDoc.data() as ChurchType;
          setChurch(churchData);
          setWorshipEditData({
            name: churchData.worshipMinistryName || "",
            acronym: churchData.worshipMinistryAcronym || "",
          });
        }

        // Fetch Department Members and their user details
        const usersQ = query(
          collection(db, "users"),
          where("churchId", "==", id),
        );
        const usersSnap = await getDocs(usersQ);

        const membersData: Musician[] = usersSnap.docs.map((docSnap) => {
          const userData = docSnap.data();
          const primaryRole = userData.role === "líder" ? "líder" : "instrumentista";
          return {
            uid: docSnap.id,
            ...userData,
            role: primaryRole,
            departmentRoles: [primaryRole === "líder" ? "leader" : "instrumentista"],
          } as Musician & { departmentRoles: string[] };
        });
        
        membersData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setMembers(membersData);

        // Fetch Bands
        const bandsQ = query(
          collection(db, "bands"),
          where("churchId", "==", id),
        );
        const bandsSnap = await getDocs(bandsQ);
        setBands(
          bandsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Band),
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `ministries/${type}`);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id, type]);

  const handleUpdateWorshipInfo = async () => {
    if (!church) return;
    setSavingWorship(true);
    try {
      const churchRef = doc(db, "churches", id as string);
      await updateDoc(churchRef, {
        worshipMinistryName: worshipEditData.name,
        worshipMinistryAcronym: worshipEditData.acronym,
      });
      setChurch({
        ...church,
        worshipMinistryName: worshipEditData.name,
        worshipMinistryAcronym: worshipEditData.acronym,
      });
      setIsEditingWorship(false);
    } catch (err: any) {
      alert("Erro ao atualizar informações: " + err.message);
    } finally {
      setSavingWorship(false);
    }
  };

  const handleSaveBand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bandName.trim()) return;
    setSavingBand(true);
    try {
      const docRef = await addDoc(collection(db, "bands"), {
        name: bandName,
        churchId: id,
        memberIds: [],
        leaderId: userData?.uid || "",
        createdAt: serverTimestamp(),
      });
      const newBand: Band = {
        id: docRef.id,
        name: bandName,
        churchId: id as string,
        memberIds: [],
        leaderId: userData?.uid || "",
      };
      setBands([...bands, newBand]);
      setBandName("");
      setIsBandModalOpen(false);
    } catch (err: any) {
      alert("Erro ao salvar banda: " + err.message);
    } finally {
      setSavingBand(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!church) {
    return <div>Igreja não encontrada</div>;
  }

  const ministryTitle =
    type === "louvor"
      ? "Ministério de Louvor"
      : type === "multimidia"
        ? "Multimídia"
        : "Secretaria";

  const ministryColor =
    type === "louvor" ? "blue" : type === "multimidia" ? "purple" : "emerald";

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 text-slate-800 dark:text-slate-100">
      <header className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-blue-800 dark:hover:text-blue-400 font-bold transition-colors group"
        >
          <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover:border-blue-100 dark:group-hover:border-blue-900 group-hover:shadow-lg transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span>Voltar para a Igreja</span>
        </button>
      </header>

      <section className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div
          className={cn(
            "absolute top-0 right-0 w-96 h-96 blur-[120px] -mr-48 -mt-48 opacity-50",
            type === "louvor"
              ? "bg-blue-50 dark:bg-blue-900/10"
              : type === "multimidia"
                ? "bg-purple-50 dark:bg-purple-900/10"
                : "bg-emerald-50 dark:bg-emerald-900/10",
          )}
        ></div>

        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-start md:items-center">
          <div
            className={cn(
              "w-32 h-32 rounded-[3.5rem] flex items-center justify-center shadow-2xl transition-transform",
              type === "louvor"
                ? "bg-blue-800 shadow-blue-800/30"
                : type === "multimidia"
                  ? "bg-purple-800 shadow-purple-800/30"
                  : "bg-emerald-800 shadow-emerald-800/30",
            )}
          >
            {type === "louvor" && <Mic2 size={56} className="text-white" />}
            {type === "multimidia" && (
              <Monitor size={56} className="text-white" />
            )}
            {type === "secretaria" && (
              <Briefcase size={56} className="text-white" />
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-3">
              <span
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  type === "louvor"
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-100 dark:border-blue-900/50"
                    : type === "multimidia"
                      ? "bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-100 dark:border-purple-900/50"
                      : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
                )}
              >
                {ministryTitle}
              </span>
              {type === "louvor" && church.worshipMinistryAcronym && (
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-600">
                  {church.worshipMinistryAcronym}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-tight">
              {type === "louvor"
                ? church.worshipMinistryName || "Ministério de Louvor"
                : ministryTitle}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl">
              Equipe dedicada à{" "}
              {type === "louvor"
                ? "adoração através da música, instrumentos e vozes"
                : type === "multimidia"
                  ? "gestão de som, projeção e tecnologia"
                  : "organização administrativa e suporte pastoral"}{" "}
              em nossa comunidade.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          {type === "louvor" && (
            <>
              {members.find((m) => m.uid === userData?.uid)?.role ===
                "líder" && (
                <section className="bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-700">
                  {!isEditingWorship ? (
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">
                          Configurações do Ministério
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Personalize o nome e a sigla deste ministério.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsEditingWorship(true)}
                        className="bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-400 px-6 py-3 rounded-2xl font-bold shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-blue-50 transition-colors"
                      >
                        Alterar Nome/Sigla
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Nome Personalizado
                          </label>
                          <input
                            type="text"
                            value={worshipEditData.name}
                            onChange={(e) =>
                              setWorshipEditData({
                                ...worshipEditData,
                                name: e.target.value,
                              })
                            }
                            placeholder="Ex: Louvor Eterno"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Sigla
                          </label>
                          <input
                            type="text"
                            value={worshipEditData.acronym}
                            onChange={(e) =>
                              setWorshipEditData({
                                ...worshipEditData,
                                acronym: e.target.value,
                              })
                            }
                            placeholder="Ex: LE"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-center uppercase"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleUpdateWorshipInfo}
                          disabled={savingWorship}
                          className="bg-blue-800 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-900 transition-colors disabled:opacity-50"
                        >
                          {savingWorship ? "Salvando..." : "Salvar Alterações"}
                        </button>
                        <button
                          onClick={() => setIsEditingWorship(false)}
                          className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-8 py-3 rounded-2xl font-bold hover:bg-slate-300 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-4">
                    <Music className="w-6 h-6 text-blue-800 dark:text-blue-400" />
                    Bandas Internas
                  </h3>
                  {members.find((m) => m.uid === userData?.uid)?.role ===
                    "líder" && (
                    <button
                      onClick={() => setIsBandModalOpen(true)}
                      className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-blue-100 transition-colors border border-blue-100 dark:border-blue-900/50"
                    >
                      <Plus className="w-4 h-4" /> Nova Banda
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bands.length > 0 ? (
                    bands.map((band) => {
                      const leader = members.find(
                        (m) => m.uid === band.leaderId,
                      );
                      return (
                        <Link
                          key={band.id}
                          href={`/dashboard/churches/${id}/bands/${band.id}`}
                          className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-xl transition-all group flex items-center gap-6"
                        >
                          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                            <Music className="w-8 h-8" />
                          </div>
                          <div className="flex-1">
                            <div className="font-display font-black text-slate-800 dark:text-slate-100 text-xl group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                              {band.name}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              {band.memberIds.length} Integrantes • Led by{" "}
                              {leader?.name || "---"}
                            </div>
                          </div>
                          <ArrowLeft className="w-5 h-5 text-slate-200 dark:text-slate-700 rotate-180 group-hover:text-blue-400 transition-colors" />
                        </Link>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                      <Music className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Nenhuma banda cadastrada.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {type === "secretaria" && (
            <section className="bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] p-16 text-center border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200 dark:text-slate-800 shadow-sm">
                <Briefcase size={48} />
              </div>
              <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-4">
                Em Construção
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
                As ferramentas específicas para este departamento estão sendo
                preparadas para oferecer a melhor experiência operacional.
              </p>
            </section>
          )}

          {type === "multimidia" && (
            <MultimediaWorkspace churchId={id as string} />
          )}
        </div>

        <div className="space-y-8">
          <section className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] -mb-32 -mr-32"></div>

            <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-10 flex items-center gap-3">
              <Shield className="w-4 h-4" /> Liderança
            </h3>

            <div className="space-y-6">
              {members.filter((m) => m.role === "líder").length > 0 ? (
                members
                  .filter((m) => m.role === "líder")
                  .map((leader) => (
                    <div
                      key={leader.uid}
                      className="flex items-center gap-4 group"
                    >
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center font-black text-xl text-blue-400 border border-white/10 group-hover:bg-blue-800 group-hover:text-white transition-all">
                        {leader.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-lg leading-none mb-1">
                          {leader.name}
                        </div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Líder de {ministryTitle}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-slate-500 italic text-sm">
                  Nenhum líder registrado.
                </p>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-10 flex items-center gap-3">
              <Users className="w-4 h-4 text-blue-500" /> Integrantes
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {members.filter((m) => m.role !== "líder").length > 0 ? (
                members
                  .filter((m) => m.role !== "líder")
                  .map((member) => (
                    <div
                      key={member.uid}
                      className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                    >
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-700 dark:text-slate-200 truncate">
                          {member.name}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                          {member.instruments?.join(", ") ||
                            member.instrument ||
                            member.vocalRange ||
                            "Participante"}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-slate-400 italic text-sm py-4">
                  Nenhum integrante cadastrado.
                </p>
              )}
            </div>
          </section>

          {type === "multimidia" && (
            <section className="bg-purple-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-purple-500/20 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mb-32 -mr-32"></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-display font-black leading-tight mb-4">
                  Convite para
                  <br />
                  Integrantes
                </h3>
                <p className="text-purple-100 text-xs mb-8 leading-relaxed font-semibold">
                  Deseja adicionar mais integrantes para o ministério de
                  multimídia? Compartilhe o link de convite ou realize o
                  cadastro manual.
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/dashboard/members"
                    className="w-full inline-flex items-center justify-center gap-3 bg-white text-purple-800 py-4.5 rounded-2xl font-bold shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm text-center"
                  >
                    Cadastrar Manualmente
                  </Link>
                  <button
                    onClick={handleCopyLink}
                    className={`w-full inline-flex items-center justify-center gap-3 py-4.5 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] border text-sm cursor-pointer ${
                      copied
                        ? "bg-emerald-500 text-white border-emerald-400 shadow-xl shadow-emerald-500/20"
                        : "bg-purple-700/50 text-white border-white/20 hover:bg-purple-700 shadow-xl shadow-black/10"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" /> Link Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" /> Copiar Link Convite
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Modal Nova Banda */}
      {isBandModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative"
          >
            <button
              onClick={() => setIsBandModalOpen(false)}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-8">
              Criar Nova Banda
            </h3>
            <form onSubmit={handleSaveBand} className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Nome da Banda
                </label>
                <input
                  type="text"
                  required
                  value={bandName}
                  onChange={(e) => setBandName(e.target.value)}
                  placeholder="Ex: Banda Principal, Grupo Vocal..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={savingBand}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-800/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {savingBand ? "Criando..." : "Criar Banda"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
