"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Music,
  Users,
  Plus,
  X,
  Shield,
  Trash2,
  UserPlus,
  Info,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Member {
  uid: string;
  name: string;
  instruments?: string[];
  instrument?: string;
  vocalRange?: string;
  role: string;
}

interface Band {
  id: string;
  name: string;
  churchId: string;
  memberIds: string[];
  leaderId: string;
}

export default function BandDetailPage() {
  const { id, bandId } = useParams();
  const router = useRouter();
  const { userData, isSuperAdmin } = useAuth();
  const [band, setBand] = useState<Band | null>(null);
  const [churchName, setChurchName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [churchMembers, setChurchMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Band
        const bandDoc = await getDoc(doc(db, "bands", bandId as string));
        if (!bandDoc.exists()) {
          router.push(`/dashboard/churches/${id}`);
          return;
        }
        const bandData = { id: bandDoc.id, ...bandDoc.data() } as Band;
        setBand(bandData);

        // Fetch Church Name
        const churchDoc = await getDoc(doc(db, "churches", id as string));
        if (churchDoc.exists()) {
          setChurchName(churchDoc.data().name);
        }

        // Fetch All Musicians in this Church
        const q = query(collection(db, "users"), where("churchId", "==", id));
        const querySnapshot = await getDocs(q);
        const allMembers = querySnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        })) as Member[];

        setChurchMembers(allMembers);

        // Filter members that are in this band
        setMembers(
          allMembers.filter((m) => bandData.memberIds.includes(m.uid)),
        );
      } catch (error) {
        console.error("Error fetching band data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (id && bandId) {
      fetchData();
    }
  }, [id, bandId, router]);

  const handleUpdateMembers = async (newMemberIds: string[]) => {
    if (!band) return;
    setUpdating(true);
    try {
      const updateData: any = { memberIds: newMemberIds };

      // If the current leader is removed, pick the first member as the new leader
      // since every band requires a leader
      let newLeaderId = band.leaderId;
      if (!newMemberIds.includes(band.leaderId) && newMemberIds.length > 0) {
        newLeaderId = newMemberIds[0];
        updateData.leaderId = newLeaderId;
      }

      await updateDoc(doc(db, "bands", band.id), updateData);
      setBand({ ...band, memberIds: newMemberIds, leaderId: newLeaderId });
      setMembers(churchMembers.filter((m) => newMemberIds.includes(m.uid)));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bands/${band.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleSetLeader = async (memberId: string) => {
    if (!band) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "bands", band.id), {
        leaderId: memberId,
      });
      setBand({ ...band, leaderId: memberId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bands/${band.id}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!band) return null;

  const isLeader = isSuperAdmin || band.leaderId === userData?.uid;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 md:px-8 lg:px-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold text-sm"
          >
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Voltar para o Ministério
          </button>
        </div>

        {/* Band Hero Section */}
        <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>

          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-end">
            <div className="w-32 h-32 bg-blue-800 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-800/30">
              <Music size={56} />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100 dark:border-blue-800/50">
                  Banda da Igreja
                </span>
                <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 dark:border-slate-700">
                  {churchName}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">
                {band.name}
              </h1>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: Members List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                  <Users className="w-6 h-6 text-blue-600" />
                  Integrantes ({members.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {members.length > 0 ? (
                  members.map((member) => (
                    <motion.div
                      key={member.uid}
                      layout
                      className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 group transition-all hover:border-blue-200 dark:hover:border-blue-800"
                    >
                      <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-700 shadow-sm">
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-display font-black text-slate-800 dark:text-slate-100 text-lg leading-tight mb-1 flex items-center gap-2">
                          {member.name}
                          {band.leaderId === member.uid && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md text-[9px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800/50">
                              <Shield className="w-2.5 h-2.5" />
                              Líder da Banda
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">
                          {member.instruments?.join(" • ") ||
                            member.instrument ||
                            member.vocalRange ||
                            "Vocal"}
                        </div>
                      </div>

                      {isLeader && (
                        <div className="flex items-center gap-2">
                          {band.leaderId !== member.uid && (
                            <button
                              onClick={() => handleSetLeader(member.uid)}
                              disabled={updating}
                              title="Promover a Líder"
                              className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-amber-500 hover:text-white disabled:opacity-30"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleUpdateMembers(
                                band.memberIds.filter(
                                  (id) => id !== member.uid,
                                ),
                              )
                            }
                            disabled={updating}
                            className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-500 hover:text-white disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 dark:text-slate-700">
                      <Users size={32} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      Esta banda ainda não possui integrantes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Add Members */}
          {isLeader && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm sticky top-8">
                <div className="flex items-center gap-3 mb-8">
                  <UserPlus className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">
                    Adicionar Integrante
                  </h3>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {churchMembers
                    .filter((m) => !band.memberIds.includes(m.uid))
                    .map((member) => (
                      <button
                        key={member.uid}
                        disabled={updating}
                        onClick={() =>
                          handleUpdateMembers([...band.memberIds, member.uid])
                        }
                        className="w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-100 dark:border-slate-700 transition-all group disabled:opacity-50"
                      >
                        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-black group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                          <Plus className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                            {member.name}
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase font-black truncate tracking-widest mt-0.5">
                            {member.instruments?.[0] ||
                              member.instrument ||
                              member.vocalRange ||
                              "Musician"}
                          </div>
                        </div>
                      </button>
                    ))}

                  {churchMembers.filter((m) => !band.memberIds.includes(m.uid))
                    .length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-slate-400 italic">
                        Todos os músicos da igreja já estão nesta banda.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Info className="w-5 h-5 opacity-50" />
                  <h4 className="text-xs font-black uppercase tracking-widest">
                    Dica do Líder
                  </h4>
                </div>
                <p className="text-sm font-medium opacity-90 leading-relaxed">
                  Você pode organizar as bandas de acordo com as escalas dos
                  cultos. Adicione os músicos que ensaiam juntos regularmente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
