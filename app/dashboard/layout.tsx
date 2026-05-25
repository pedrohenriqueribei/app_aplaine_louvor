"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading, isSuperAdmin } = useAuth();
  const { token } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setUnreadCount(snap.size);
      },
      (err) => {
        console.error("Error listening for unread notifications:", err);
      },
    );

    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (
        !isSuperAdmin &&
        !["líder", "instrumentista", "admin", "member", "super_admin", "multimídia"].includes(
          userData?.role
        )
      ) {
        router.push("/");
      }
    }
  }, [user, userData, loading, router, pathname, isSuperAdmin]);

  if (loading) return null;
  if (
    !user ||
    (!isSuperAdmin &&
      !["líder", "instrumentista", "admin", "member", "super_admin", "multimídia"].includes(
        userData?.role
      ))
  )
    return null;

  const getPageTitle = () => {
    if (pathname.includes("/members")) return "Membros";
    if (pathname.includes("/visitors")) return "Visitantes";
    if (pathname.includes("/appointments")) return "Atendimentos";
    if (pathname.includes("/songs")) return "Repertório";
    if (pathname.includes("/schedules")) return "Escalas";
    if (pathname.includes("/availability")) return "Disponibilidade";
    if (pathname.includes("/churches")) return "Igrejas";
    return "Dashboard";
  };

  const getPageSubtitle = () => {
    if (pathname.includes("/members"))
      return "Gerencie os integrantes, instrumentos e funções.";
    if (pathname.includes("/visitors"))
      return "Acompanhe e integre novas pessoas à comunidade.";
    if (pathname.includes("/appointments"))
      return "Gestão de aconselhamentos e atendimentos pastorais.";
    if (pathname.includes("/songs"))
      return "Explore o repertório, cifras e guias de áudio.";
    if (pathname.includes("/schedules"))
      return "Gerencie a organização dos cultos, bandas e integrantes.";
    if (pathname.includes("/availability"))
      return "Gerencie as datas disponíveis dos seus integrantes.";
    if (pathname.includes("/churches"))
      return "Configurações e detalhes da sua igreja local.";
    return "Visualize informações gerais e estatísticas do seu ministério.";
  };

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10 md:mb-16">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {getPageTitle()}
              </h1>
              <p className="text-slate-400 dark:text-slate-500 font-medium mt-1 text-sm md:text-base">
                {getPageSubtitle()}
              </p>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 md:gap-6 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex items-center justify-center font-bold"
            >
              Menu
            </button>
            <div className="hidden md:flex items-center gap-3">
              <button className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-800 dark:hover:text-blue-400 transition-all shadow-sm">
                <Search className="w-5 h-5" />
              </button>
            </div>
            <ThemeToggle />
            <button
              onClick={() => router.push("/dashboard/notifications")}
              className={`p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-800 dark:hover:text-blue-400 transition-all shadow-sm relative shrink-0 ${unreadCount > 0 ? "ring-2 ring-blue-500/20" : ""}`}
            >
              <Bell className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75"></span>
                </>
              )}
            </button>

            <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 shrink-0"></div>

            <Link
              href={`/dashboard/members/${userData?.uid || user.uid}`}
              className="flex items-center gap-4 py-2 pl-2 pr-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 hover:border-blue-500/50 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-800 dark:text-blue-400 font-bold transition-all">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <UserIcon className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight">
                  {userData?.name || user.displayName || "Usuário"}
                </p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">
                  {(() => {
                    if (!userData) return "Visitante";
                    
                    const isLeader = userData.roles?.worship?.includes("leader") || userData.roles?.multimedia?.includes("leader") || userData.roles?.secretariat?.includes("leader");
                    if (isLeader) return "Líder";
                    
                    const isMultimedia = (userData.roles?.multimedia?.length ?? 0) > 0;
                    if (isMultimedia && (userData.roles?.worship?.length ?? 0) === 0 && (userData.roles?.secretariat?.length ?? 0) === 0) return "Multimídia";
                    
                    if ((userData.roles?.secretariat?.length ?? 0) > 0) return "Secretaria";

                    const vocal = userData.vocalRange || "";
                    const insts = userData.instruments || [];

                    const hasVocal = vocal.trim().length > 0;
                    const numInst = insts.length;

                    if (hasVocal && numInst > 0) {
                      return `${vocal} e ${insts[0]}${numInst > 1 ? ` (+${numInst - 1})` : ""}`;
                    } else if (hasVocal) {
                      return vocal;
                    } else if (numInst > 0) {
                      return `${insts[0]}${numInst > 1 ? ` (+${numInst - 1})` : ""}`;
                    }
                    return "Visitante";
                  })()}
                </p>
              </div>
            </Link>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
