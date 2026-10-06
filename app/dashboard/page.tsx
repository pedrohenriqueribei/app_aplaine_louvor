"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, getDoc, doc, query, where, documentId } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  Calendar,
  Users,
  Music,
  Clock as ClockIcon,
  MapPin,
  Link as LinkIcon,
  BarChart3,
  Waves,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { BallerinaIcon } from "@/components/BallerinaIcon";
import { motion } from "motion/react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NotificationSettings } from "@/components/NotificationSettings";

export default function DashboardPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    members: 0,
    songs: 0,
    schedules: 0,
    churches: 0,
  });
  const [deptAvailabilityStats, setDeptAvailabilityStats] = useState<{
    percentage: number;
    respondedCount: number;
    totalCount: number;
    deptDisplayName: string;
    loading: boolean;
  }>({
    percentage: 0,
    respondedCount: 0,
    totalCount: 0,
    deptDisplayName: "Equipe",
    loading: true,
  });
  const [resetSent, setResetSent] = useState(false);

  const isWorshipLeader = Boolean(userData?.roles?.worship?.includes("leader"));
  const isDanceLeader = Boolean(
    userData?.roles?.dance?.includes("leader") ||
    userData?.roles?.dance?.includes("dance_leader")
  );
  const isMultimediaLeader = Boolean(userData?.roles?.multimedia?.includes("leader"));
  const isSecretariatLeader = Boolean(userData?.roles?.secretariat?.includes("leader"));
  const isGlobalLeader = userData?.role === "líder";
  const isSuperAdmin = userData?.role === "super_admin" || userData?.super_admin === true;

  const isLeader =
    isWorshipLeader ||
    isDanceLeader ||
    isMultimediaLeader ||
    isSecretariatLeader ||
    isGlobalLeader ||
    isSuperAdmin;

  const handleResetPassword = async () => {
    if (!auth.currentUser?.email) return;
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      alert("Erro ao enviar e-mail de redefinição: " + err.message);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!userData) return;

      try {
        const hasChurch = Boolean(userData.churchId && userData.churchId.trim() !== "");

        const [membersSnap, songsSnap, schedulesSnap, churchesSnap] =
          await Promise.all([
            hasChurch
              ? getDocs(
                  query(
                    collection(db, "users"),
                    where("churchId", "==", userData.churchId),
                  ),
                )
              : Promise.resolve({ size: 0, docs: [] }),
            getDocs(
              query(
                collection(db, "songs"),
                where("ownerId", "==", userData.uid || ""),
              ),
            ),
            hasChurch
              ? getDocs(
                  query(
                    collection(db, "schedules"),
                    where("churchId", "==", userData.churchId),
                  ),
                )
              : Promise.resolve({ size: 0 }),
            hasChurch
              ? getDocs(
                  query(
                    collection(db, "churches"),
                    where(documentId(), "==", userData.churchId),
                  ),
                )
              : getDocs(collection(db, "churches")),
          ]);

        setStats({
          members: membersSnap.size,
          songs: songsSnap.size,
          schedules: schedulesSnap.size,
          churches: churchesSnap.size,
        });

        // Availability Calculation for Ministry Leaders
        if (isLeader && hasChurch && userData.churchId) {
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();

          const myLedDepts: string[] = [];
          if (isDanceLeader) myLedDepts.push("dance");
          if (isWorshipLeader) myLedDepts.push("worship");
          if (isMultimediaLeader) myLedDepts.push("multimedia");
          if (isSecretariatLeader) myLedDepts.push("secretariat");

          const allowedDepts =
            isGlobalLeader || isSuperAdmin
              ? myLedDepts.length > 0
                ? myLedDepts
                : ["worship", "dance", "multimedia", "secretariat"]
              : myLedDepts;

          let displayName = "Equipe";
          if (allowedDepts.length === 1) {
            if (allowedDepts[0] === "dance") displayName = "Dança";
            else if (allowedDepts[0] === "worship") displayName = "Louvor";
            else if (allowedDepts[0] === "multimedia") displayName = "Multimídia";
            else if (allowedDepts[0] === "secretariat") displayName = "Secretaria";
          } else if (allowedDepts.length > 1) {
            displayName = isGlobalLeader || isSuperAdmin ? "Equipe Geral" : "Departamentos";
          }

          // 1. Fetch subcollection members for leader's departments
          const deptMembersUids = new Set<string>();
          for (const dept of allowedDepts) {
            try {
              const deptSnap = await getDocs(
                collection(db, "churches", userData.churchId, "departments", dept, "members")
              );
              for (const docSnap of deptSnap.docs) {
                deptMembersUids.add(docSnap.id);
              }
            } catch (e) {
              console.warn(`Could not load subcollection members for ${dept}:`, e);
            }
          }

          // 2. Fetch users in church matching leader's departments
          const matchedUids = new Set<string>(deptMembersUids);
          if (membersSnap && "docs" in membersSnap && Array.isArray((membersSnap as any).docs)) {
            (membersSnap as any).docs.forEach((d: any) => {
              const uData = d.data();
              const hasDeptRole = allowedDepts.some((dept) => {
                if (dept === "dance") {
                  return (
                    (uData.roles?.dance && uData.roles.dance.length > 0) ||
                    (uData.danceStyles && uData.danceStyles.length > 0) ||
                    (uData.danceGroups && uData.danceGroups.length > 0)
                  );
                }
                if (dept === "worship") {
                  return (
                    (uData.roles?.worship && uData.roles.worship.length > 0) ||
                    (uData.instruments && uData.instruments.length > 0) ||
                    (uData.vocalRange && uData.vocalRange.trim().length > 0)
                  );
                }
                if (dept === "multimedia") {
                  return uData.roles?.multimedia && uData.roles.multimedia.length > 0;
                }
                if (dept === "secretariat") {
                  return uData.roles?.secretariat && uData.roles.secretariat.length > 0;
                }
                return false;
              });
              if (hasDeptRole) {
                matchedUids.add(d.id);
              }
            });
          }

          const memberUidsList = Array.from(matchedUids);
          const totalMembers = memberUidsList.length;

          // 3. Check availability documents in current month
          const availPromises = memberUidsList.map(async (uid) => {
            try {
              const docId = `${uid}_${currentYear}_${currentMonth}`;
              const snap = await getDoc(doc(db, "availability", docId));
              if (snap.exists() && Array.isArray(snap.data()?.days) && snap.data().days.length > 0) {
                return true;
              }
            } catch (e) {
              console.warn(`Could not load availability for ${uid}:`, e);
            }
            return false;
          });

          const availResults = await Promise.all(availPromises);
          const respondedMembers = availResults.filter(Boolean).length;
          const percentage = totalMembers > 0 ? Math.round((respondedMembers / totalMembers) * 100) : 0;

          setDeptAvailabilityStats({
            percentage,
            respondedCount: respondedMembers,
            totalCount: totalMembers,
            deptDisplayName: displayName,
            loading: false,
          });
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, "dashboard");
      }
    }
    fetchData();
  }, [
    userData,
    isLeader,
    isDanceLeader,
    isWorshipLeader,
    isMultimediaLeader,
    isSecretariatLeader,
    isGlobalLeader,
    isSuperAdmin,
  ]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const currentMonthName = monthNames[new Date().getMonth()];

  const cards: any[] = [
    {
      label: "Integrantes",
      value: stats.members,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/dashboard/members",
    },
    {
      label: "Músicas",
      value: stats.songs,
      icon: Music,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/dashboard/songs",
    },
    {
      label: "Escalas",
      value: stats.schedules,
      icon: Calendar,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/dashboard/schedules",
    },
    {
      label: "Igrejas",
      value: stats.churches,
      icon: Waves,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/dashboard/churches",
    },
  ];

  if (isLeader) {
    const isDanceOnly = isDanceLeader && !isWorshipLeader && !isMultimediaLeader && !isSecretariatLeader;
    cards.push({
      label: `Disponibilidade • ${deptAvailabilityStats.deptDisplayName}`,
      value: deptAvailabilityStats.loading ? "..." : `${deptAvailabilityStats.percentage}%`,
      subtext: deptAvailabilityStats.loading
        ? "Calculando dados do mês..."
        : `${deptAvailabilityStats.respondedCount} de ${deptAvailabilityStats.totalCount} integrantes responderam em ${currentMonthName}`,
      badge: deptAvailabilityStats.loading ? undefined : `${currentMonthName}`,
      progress: deptAvailabilityStats.loading ? 0 : deptAvailabilityStats.percentage,
      icon: isDanceOnly ? BallerinaIcon : CheckCircle2,
      color: isDanceOnly ? "text-rose-600" : "text-emerald-600",
      bg: isDanceOnly ? "bg-rose-50" : "bg-emerald-50",
      href: "/dashboard/availability",
    });
  }

  return (
    <div className="space-y-12 pb-20">
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${
          isLeader ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4"
        } gap-8`}
      >
        {cards.map((card, idx) => (
          <Link href={card.href} key={card.label} className="block">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group h-full flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`w-14 h-14 ${card.bg} dark:bg-opacity-20 rounded-2xl flex items-center justify-center ${card.color} dark:text-opacity-90 group-hover:scale-110 transition-transform`}
                  >
                    <card.icon className="w-7 h-7" />
                  </div>
                  {card.badge && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-1">
                  {card.label}
                </p>
                <h3 className="text-4xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {card.value}
                </h3>
              </div>

              {(card.subtext || typeof card.progress === "number") && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {typeof card.progress === "number" && (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          card.color.includes("rose") ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }}
                      />
                    </div>
                  )}
                  {card.subtext && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight">
                      {card.subtext}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Próximas Escalas
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/dashboard/availability")}
                className="flex items-center gap-2 text-sm font-black uppercase tracking-widest bg-blue-800 text-white px-6 py-2.5 rounded-xl hover:bg-blue-900 transition-all shadow-lg shadow-blue-800/20 active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                Lançar Disponibilidade
              </button>
              <button
                onClick={() => router.push("/dashboard/schedules")}
                className="text-sm font-bold text-blue-800 dark:text-blue-400 hover:underline px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
              >
                Ver todas
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                <Calendar size={32} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Nenhuma escala para os próximos dias.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Novidades
          </h2>
          <div className="bg-gradient-to-br from-blue-800 to-indigo-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
            <BarChart3 className="w-12 h-12 mb-6 text-blue-200" />
            <h4 className="text-xl font-bold mb-2">Relatórios Mensais</h4>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              Em breve você poderá visualizar relatórios de frequência e
              repertório mais tocado.
            </p>
            <button className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all">
              Saber mais
            </button>
          </div>
        </div>
      </div>

      {/* Configurações de Notificações de Escala via FCM */}
      <section id="configuracoes-notificacao" className="space-y-4 pt-4">
        <NotificationSettings />
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 mt-20">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-12 flex flex-col md:flex-row items-center justify-between gap-8 border border-white dark:border-slate-800">
          <div className="space-y-4 text-center md:text-left">
            <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Segurança da Conta
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
              Mantenha sua conta segura. Se você deseja alterar sua senha,
              clicando no botão ao lado enviaremos um link de redefinição para o
              seu e-mail cadastrado.
            </p>
          </div>
          <button
            disabled={resetSent}
            onClick={handleResetPassword}
            className={`flex items-center gap-3 px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 ${
              resetSent
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10"
                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white shadow-slate-200 dark:shadow-none"
            }`}
          >
            {resetSent ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                E-mail Enviado
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                Alterar Senha
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
