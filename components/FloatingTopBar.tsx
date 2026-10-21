"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, User as UserIcon, Menu, ArrowUp, Camera } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfilePhotoCropModal } from "@/components/ProfilePhotoCropModal";
import { useAuth } from "@/components/AuthProvider";

export interface FloatingTopBarProps {
  title: string;
  subtitle?: string;
  unreadCount?: number;
  user?: any;
  userData?: any;
  userRoleTitle?: string;
  onOpenSearch?: () => void;
  onOpenMobileMenu?: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
  profileHref?: string;
  isAdmin?: boolean;
}

export function FloatingTopBar({
  title,
  subtitle,
  unreadCount = 0,
  user,
  userData,
  userRoleTitle,
  onOpenSearch,
  onOpenMobileMenu,
  containerRef,
  profileHref,
  isAdmin = false,
}: FloatingTopBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const router = useRouter();
  const { updateUserProfilePhoto } = useAuth();

  useEffect(() => {
    const checkScroll = (e?: Event) => {
      let targetScroll = 0;
      if (e && e.target && (e.target as any).scrollTop !== undefined) {
        targetScroll = Number((e.target as any).scrollTop) || 0;
      }
      const winScroll =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      const containerScroll = containerRef?.current
        ? containerRef.current.scrollTop
        : 0;
      const currentScroll = Math.max(winScroll, containerScroll, targetScroll);
      setIsScrolled(currentScroll > 20);
    };

    const container = containerRef?.current;
    if (container) {
      container.addEventListener("scroll", checkScroll, { passive: true });
    }

    // Capture phase listener ensures that scrolling on window or any inner element triggers checkScroll
    window.addEventListener("scroll", checkScroll, { capture: true, passive: true });
    document.addEventListener("scroll", checkScroll, { capture: true, passive: true });
    window.addEventListener("resize", () => checkScroll(), { passive: true });

    // Initial check
    checkScroll();

    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScroll);
      }
      window.removeEventListener("scroll", checkScroll, { capture: true } as any);
      document.removeEventListener("scroll", checkScroll, { capture: true } as any);
      window.removeEventListener("resize", () => checkScroll());
    };
  }, [containerRef]);

  const handleScrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const defaultProfileHref = profileHref || (
    isAdmin
      ? "/admin/dashboard"
      : `/dashboard/members/${userData?.uid || user?.uid || ""}`
  );

  return (
    <aside
      aria-label="Barra de navegação superior rápida"
      aria-hidden={!isScrolled}
      className={`fixed top-3 z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isAdmin
          ? "left-3 right-3 sm:left-4 sm:right-4 md:left-[17.5rem] md:right-8 xl:left-[18rem] xl:right-12"
          : "left-3 right-3 sm:left-4 sm:right-4 lg:left-[19.5rem] lg:right-8 xl:left-[20rem] xl:right-12"
      } ${
        isScrolled
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 -translate-y-5 scale-95 pointer-events-none"
      }`}
    >
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/10 dark:shadow-black/40 rounded-2xl px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
          {/* Zona Esquerda: Logo / Título e Atalho para topo */}
          <div className="flex items-center gap-2.5 min-w-0">
            {onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Abrir menu"
                aria-label="Abrir menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleScrollToTop}
              className="flex items-center gap-2 text-left group hover:opacity-85 transition-opacity min-w-0"
              title="Voltar ao topo da página"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                <img
                  src="/icon_applane.png"
                  alt="Applane"
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    // Fallback to logo if icon fails
                    (e.target as HTMLImageElement).src = "/logo_aplane.png";
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                    {title}
                  </span>
                  <ArrowUp className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                {subtitle && (
                  <p className="hidden md:block text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate leading-none">
                    {subtitle}
                  </p>
                )}
              </div>
            </button>
          </div>

          {/* Zona Direita: Ações Rápidas (Busca, Tema, Notificações e Perfil Compacto) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all shadow-xs"
                title="Pesquisar"
                aria-label="Pesquisar"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <ThemeToggle
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all shadow-xs"
              iconClassName="w-4 h-4"
            />

            {!isAdmin && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/notifications")}
                className={`p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all shadow-xs relative ${
                  unreadCount > 0 ? "ring-2 ring-blue-500/20" : ""
                }`}
                title="Notificações"
                aria-label="Notificações"
              >
                <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-bold shadow-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}

            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-1 shrink-0" />

            {/* Perfil Compacto */}
            {user && (
              <div className="flex items-center gap-1.5 py-0.5 px-1 sm:pr-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all shadow-xs">
                {/* Avatar com gatilho direto para alterar foto */}
                <div className="relative group/avatar">
                  <UserAvatar
                    photoURL={userData?.photoURL || user?.photoURL}
                    name={userData?.name || user?.displayName || "Usuário"}
                    size="sm"
                    editable={true}
                    onEditClick={() => setIsPhotoModalOpen(true)}
                    onClick={() => setIsPhotoModalOpen(true)}
                    title="Clique para alterar a foto de perfil"
                  />
                </div>

                <Link
                  href={defaultProfileHref}
                  className="hidden sm:block text-left max-w-[120px] md:max-w-[160px] pl-1 group/name cursor-pointer"
                  title="Meu Perfil"
                >
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight group-hover/name:text-blue-700 dark:group-hover/name:text-blue-400">
                      {userData?.name || user?.displayName || "Usuário"}
                    </p>
                    <VerifiedBadge
                      verified={Boolean(
                        userData?.emailVerified ||
                          userData?.email_verified ||
                          user?.emailVerified
                      )}
                      size="xs"
                    />
                  </div>
                  {userRoleTitle && (
                    <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate leading-tight mt-0.5">
                      {userRoleTitle}
                    </p>
                  )}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Foto de Perfil */}
        {user && (
          <ProfilePhotoCropModal
            isOpen={isPhotoModalOpen}
            onClose={() => setIsPhotoModalOpen(false)}
            currentPhotoURL={userData?.photoURL || user?.photoURL}
            userName={userData?.name || user?.displayName || "Meu Perfil"}
            onSavePhoto={async (newPhotoURL) => {
              await updateUserProfilePhoto(newPhotoURL);
            }}
          />
        )}
      </aside>
    );
  }
