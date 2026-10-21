"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { FloatingTopBar } from "@/components/FloatingTopBar";
import { UserAvatar } from "@/components/UserAvatar";
import { PremiumPageHeader } from "@/components/PremiumPageHeader";
import { QuickSearchModal } from "@/components/QuickSearchModal";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = React.useRef<HTMLElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [detectedDeptTitle, setDetectedDeptTitle] = React.useState<string | null>(null);
  const [resolvedChurchName, setResolvedChurchName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function fetchChurchName() {
      const churchId = userData?.churchId;
      if (!churchId) return;
      try {
        const cSnap = await getDoc(doc(db, "churches", String(churchId)));
        if (cSnap.exists() && isMounted) {
          setResolvedChurchName(cSnap.data().name || null);
        }
      } catch (e) {
        // quiet fallback
      }
    }
    fetchChurchName();
    return () => {
      isMounted = false;
    };
  }, [userData?.churchId]);

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
    const currentUid = user?.uid;
    const churchId = userData?.churchId;
    if (!currentUid || !churchId) return;

    const hasSpecificRoles =
      (userData.roles?.dance?.length ?? 0) > 0 ||
      (userData.danceStyles?.length ?? 0) > 0 ||
      (userData.danceGroups?.length ?? 0) > 0 ||
      (userData.roles?.worship?.length ?? 0) > 0 ||
      (userData.instruments?.length ?? 0) > 0 ||
      Boolean(userData.vocalRange?.trim()) ||
      (userData.roles?.multimedia?.length ?? 0) > 0 ||
      (userData.roles?.secretariat?.length ?? 0) > 0;

    if (hasSpecificRoles) return;

    let isMounted = true;
    async function checkDeptMembership() {
      const depts = [
        { id: "dance", label: "Ministério de Dança" },
        { id: "worship", label: "Ministério de Louvor" },
        { id: "multimedia", label: "Multimídia" },
        { id: "secretariat", label: "Secretaria" },
      ];

      const targetChurchId = String(churchId);
      const targetUid = String(currentUid);

      for (const d of depts) {
        try {
          const memberDoc = await getDoc(
            doc(db, "churches", targetChurchId, "departments", d.id, "members", targetUid)
          );
          if (memberDoc.exists() && isMounted) {
            setDetectedDeptTitle(d.label);
            return;
          }
        } catch (err) {
          // ignore error if subcollection is not readable
        }
      }
    }

    checkDeptMembership();
    return () => {
      isMounted = false;
    };
  }, [
    user?.uid,
    userData?.churchId,
    userData?.roles,
    userData?.danceStyles,
    userData?.danceGroups,
    userData?.instruments,
    userData?.vocalRange,
  ]);

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (userData) {
        const isLeader =
          userData?.roles?.worship?.includes("leader") ||
          userData?.roles?.multimedia?.includes("leader") ||
          userData?.roles?.secretariat?.includes("leader") ||
          userData?.roles?.dance?.includes("leader") ||
          userData?.roles?.dance?.includes("dance_leader");
        const hasLegacyRole = [
          "líder",
          "instrumentista",
          "admin",
          "member",
          "super_admin",
          "multimídia",
          "dança",
        ].includes(userData?.role);
        const isWorshipMember =
          userData?.roles?.worship && userData.roles.worship.length > 0;
        const isMultimediaMember =
          userData?.roles?.multimedia && userData.roles.multimedia.length > 0;
        const isSecretariatMember =
          userData?.roles?.secretariat && userData.roles.secretariat.length > 0;
        const isDanceMember =
          (userData?.roles?.dance && userData.roles.dance.length > 0) ||
          (userData?.danceStyles && userData.danceStyles.length > 0);
        const hasActiveStatus = userData?.status === "active";

        if (
          !isSuperAdmin &&
          !hasLegacyRole &&
          !isLeader &&
          !isWorshipMember &&
          !isMultimediaMember &&
          !isSecretariatMember &&
          !isDanceMember &&
          !hasActiveStatus
        ) {
          console.warn("Redirecionando usuario sem permissao valida:", userData);
          router.push("/");
        }
      }
    }
  }, [user, userData, loading, router, pathname, isSuperAdmin]);

  const isLeaderAuth =
    userData?.roles?.worship?.includes("leader") ||
    userData?.roles?.multimedia?.includes("leader") ||
    userData?.roles?.secretariat?.includes("leader") ||
    userData?.roles?.dance?.includes("leader") ||
    userData?.roles?.dance?.includes("dance_leader");
  const hasLegacyRoleAuth = [
    "líder",
    "instrumentista",
    "admin",
    "member",
    "super_admin",
    "multimídia",
    "dança",
  ].includes(userData?.role);
  const isWorshipMemberAuth =
    userData?.roles?.worship && userData.roles.worship.length > 0;
  const isMultimediaMemberAuth =
    userData?.roles?.multimedia && userData.roles.multimedia.length > 0;
  const isSecretariatMemberAuth =
    userData?.roles?.secretariat && userData.roles.secretariat.length > 0;
  const isDanceMemberAuth =
    (userData?.roles?.dance && userData.roles.dance.length > 0) ||
    (userData?.danceStyles && userData.danceStyles.length > 0);
  const hasActiveStatusAuth = userData?.status === "active";

  if (loading || (user && !userData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (
    !user ||
    (!isSuperAdmin &&
      !hasLegacyRoleAuth &&
      !isLeaderAuth &&
      !isWorshipMemberAuth &&
      !isMultimediaMemberAuth &&
      !isSecretariatMemberAuth &&
      !isDanceMemberAuth &&
      !hasActiveStatusAuth)
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

  const getUserRoleTitle = () => {
    if (!userData) {
      return loading ? "Carregando..." : "Visitante";
    }

    // 1. Super Admin & Admin
    if (userData.role === "super_admin" || userData.super_admin === true || isSuperAdmin) {
      return "Super Admin";
    }
    if (userData.role === "admin") {
      return "Administrador";
    }

    // 2. Leadership checks
    const roleStr = String(userData.role || "").toLowerCase();
    const isWorshipLeader = Boolean(
      userData.roles?.worship?.includes("leader") ||
      userData.roles?.worship?.includes("lider") ||
      userData.roles?.worship?.includes("worship_leader") ||
      roleStr.includes("líder de louvor") ||
      roleStr.includes("lider de louvor")
    );
    const isDanceLeader = Boolean(
      userData.roles?.dance?.includes("leader") ||
      userData.roles?.dance?.includes("lider") ||
      userData.roles?.dance?.includes("dance_leader") ||
      roleStr.includes("líder de dança") ||
      roleStr.includes("lider de dança") ||
      roleStr.includes("líder de danca") ||
      roleStr.includes("lider de danca")
    );
    const isMultimediaLeader = Boolean(
      userData.roles?.multimedia?.includes("leader") ||
      userData.roles?.multimedia?.includes("lider") ||
      userData.roles?.multimedia?.includes("multimedia_leader") ||
      roleStr.includes("líder de multimídia") ||
      roleStr.includes("lider de multimidia") ||
      roleStr.includes("líder de mídia") ||
      roleStr.includes("lider de midia")
    );
    const isSecretariatLeader = Boolean(
      userData.roles?.secretariat?.includes("leader") ||
      userData.roles?.secretariat?.includes("lider") ||
      userData.roles?.secretariat?.includes("secretariat_leader") ||
      roleStr.includes("líder de secretaria") ||
      roleStr.includes("lider de secretaria")
    );
    const isKidsLeader = Boolean(
      userData.roles?.kids?.includes("leader") ||
      userData.roles?.kids?.includes("lider") ||
      userData.roles?.kids?.includes("kids_leader") ||
      roleStr.includes("líder infantil") ||
      roleStr.includes("lider infantil")
    );
    const isGlobalLeader = roleStr === "líder" || roleStr === "lider" || roleStr === "pastor";

    if (isGlobalLeader) {
      return "Líder Geral";
    }

    // Ministry-specific leaders
    if (isDanceLeader && isWorshipLeader) return "Líder de Louvor e Dança";
    if (isDanceLeader) return "Líder de Dança";
    if (isWorshipLeader) return "Líder de Louvor";
    if (isMultimediaLeader) return "Líder de Multimídia";
    if (isSecretariatLeader) return "Líder de Secretaria";
    if (isKidsLeader) return "Líder Infantil";

    // 3. Dance Ministry
    const danceRoles = userData.roles?.dance || [];
    const danceStyles = userData.danceStyles || [];
    const isDance =
      danceRoles.length > 0 ||
      danceStyles.length > 0 ||
      (userData.danceGroups && userData.danceGroups.length > 0) ||
      userData.role === "dança" ||
      userData.role === "danca" ||
      userData.role === "bailarina" ||
      userData.role === "dançarina";

    // 4. Worship Ministry
    const vocal = (userData.vocalRange || "").trim();
    const insts = userData.instruments || [];
    const worshipRoles = userData.roles?.worship || [];
    const hasVocal = vocal.length > 0 || insts.includes("Voz") || worshipRoles.includes("vocal");
    const numInst = insts.length;
    const isWorship =
      worshipRoles.length > 0 ||
      hasVocal ||
      numInst > 0 ||
      userData.role === "instrumentista" ||
      userData.role === "músico" ||
      userData.role === "musico";

    // 5. Multimedia Ministry
    const multimediaRoles = userData.roles?.multimedia || [];
    const isMultimedia =
      multimediaRoles.length > 0 ||
      userData.role === "multimídia" ||
      userData.role === "multimidia";

    // 6. Secretariat
    const secretariatRoles = userData.roles?.secretariat || [];
    const isSecretariat =
      secretariatRoles.length > 0 ||
      userData.role === "secretaria" ||
      userData.role === "secretariado";

    // Resolve titles based on detected ministries:

    // If Dance only or primarily Dance:
    if (isDance && !isWorship) {
      if (danceStyles.length > 0) {
        return `Dança • ${danceStyles[0]}`;
      }
      if (danceRoles.includes("dancer") || danceRoles.includes("bailarina")) {
        return "Bailarina";
      }
      return "Ministério de Dança";
    }

    // If Worship:
    if (isWorship) {
      if (hasVocal && numInst > 0) {
        return `${vocal || "Vocal"} e ${insts[0]}${numInst > 1 ? ` (+${numInst - 1})` : ""}`;
      }
      if (hasVocal && !numInst) {
        return vocal || "Vocal";
      }
      if (numInst > 0) {
        return `${insts[0]}${numInst > 1 ? ` (+${numInst - 1})` : ""}`;
      }
      if (worshipRoles.length > 0) {
        const roleMap: Record<string, string> = {
          vocal: "Vocal",
          violao: "Violão",
          violão: "Violão",
          guitarra: "Guitarra",
          baixo: "Baixo",
          bateria: "Bateria",
          teclado: "Teclado",
          piano: "Piano",
          ministro: "Ministro de Louvor",
          musician: "Instrumentista",
        };
        const firstRole = worshipRoles[0];
        return roleMap[firstRole] || firstRole.charAt(0).toUpperCase() + firstRole.slice(1);
      }
      return "Ministério de Louvor";
    }

    // If Multimedia:
    if (isMultimedia) {
      const mediaMap: Record<string, string> = {
        audio_operator: "Operador de Áudio",
        pc_operator: "Operador de PC",
        social_media_operator: "Redes Sociais",
        camera_operator: "Câmera",
        photography_operator: "Fotografia",
        projection_operator: "Projeção",
        audio_tech: "Técnico de Áudio",
        media_creator: "Mídia / Foto",
        social_media_manager: "Social Media",
      };
      const firstMedia = multimediaRoles[0];
      return mediaMap[firstMedia] || "Multimídia";
    }

    // If Secretariat:
    if (isSecretariat) {
      return "Secretaria";
    }

    // If both Dance and Worship:
    if (isDance && isWorship) {
      return "Louvor e Dança";
    }

    // Detected from church department subcollection:
    if (detectedDeptTitle) {
      return detectedDeptTitle;
    }

    // If user has department or ministry field directly on profile:
    if (userData.department) {
      const deptMap: Record<string, string> = {
        dance: "Ministério de Dança",
        worship: "Ministério de Louvor",
        multimedia: "Multimídia",
        secretariat: "Secretaria",
      };
      if (deptMap[userData.department]) return deptMap[userData.department];
    }
    if (userData.ministry) {
      return userData.ministry;
    }

    // Explicit role from user profile:
    if (userData.role && !["visitante", "visitor"].includes(userData.role.toLowerCase())) {
      if (["member", "membro"].includes(userData.role.toLowerCase())) {
        return "Integrante";
      }
      return userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    }

    // If user belongs to a church or has active status, they are an Integrante, never Visitante
    if (userData.churchId || userData.status === "active") {
      return "Integrante";
    }

    return "Visitante";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500 animate-pulse">Carregando Applane...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div key="dashboard-root" className="flex bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
      <FloatingTopBar
        title={getPageTitle()}
        subtitle={getPageSubtitle()}
        unreadCount={unreadCount}
        user={user}
        userData={userData}
        userRoleTitle={getUserRoleTitle()}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        containerRef={mainRef}
      />
      <Sidebar
        key="dashboard-sidebar"
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <main key="dashboard-main" ref={mainRef} className="flex-1 p-4 sm:p-6 md:p-10 lg:p-12 overflow-y-auto">
        <PremiumPageHeader
          user={user}
          userData={userData}
          userRoleTitle={getUserRoleTitle()}
          unreadCount={unreadCount}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          churchName={resolvedChurchName}
        />

        <div key="dashboard-page-content" className="w-full">
          {children}
        </div>
      </main>

      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        churchId={userData?.churchId}
        userUid={userData?.uid || user?.uid}
      />
    </div>
  );
}
