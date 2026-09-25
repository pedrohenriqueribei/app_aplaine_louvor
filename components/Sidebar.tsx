'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Music, 
  Calendar, 
  LayoutDashboard, 
  LogOut,
  Church,
  X,
  Clock,
  Bell,
  UserCheck,
  BookHeart,
  ShieldAlert,
  LayoutGrid,
  ChevronDown,
  Mic2,
  Monitor,
  Briefcase
} from 'lucide-react';
import { BallerinaIcon } from '@/components/BallerinaIcon';
import { cn } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc, collection, getDocs, query } from 'firebase/firestore';

const standardMenuItems = [
  { icon: Users, label: 'Membros', href: '/dashboard/members' },
  { icon: UserCheck, label: 'Visitantes', href: '/dashboard/visitors' },
  { icon: BookHeart, label: 'Atendimentos', href: '/dashboard/appointments' },
  { icon: Calendar, label: 'Escalas', href: '/dashboard/schedules' },
  { icon: Music, label: 'Repertório', href: '/dashboard/songs' },
  { icon: Clock, label: 'Disponibilidade', href: '/dashboard/availability' },
  { icon: Church, label: 'Igrejas', href: '/dashboard/churches' },
  { icon: Bell, label: 'Notificações', href: '/dashboard/notifications' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userData, isSuperAdmin } = useAuth();

  const isMinistryRoute = pathname.includes('/ministries');
  const [isMinistriesExpanded, setIsMinistriesExpanded] = useState<boolean>(isMinistryRoute);
  const [churchId, setChurchId] = useState<string>('');
  const [churchData, setChurchData] = useState<{
    name?: string;
    worshipMinistryName?: string;
    danceMinistryName?: string;
    customMinistries?: Array<{ id?: string; name: string }>;
  } | null>(null);

  // Automatically expand ministries sub-menu if user navigates to a ministry route
  useEffect(() => {
    if (isMinistryRoute) {
      setIsMinistriesExpanded(true);
    }
  }, [isMinistryRoute]);

  // Resolve active church context (from URL, userData or Firestore)
  useEffect(() => {
    let isMounted = true;
    async function resolveChurch() {
      const urlMatch = pathname?.match(/\/dashboard\/churches\/([^/]+)/);
      const targetId = urlMatch?.[1] || userData?.churchId;

      if (targetId) {
        if (isMounted) setChurchId(targetId);
        try {
          const churchDoc = await getDoc(doc(db, 'churches', targetId));
          if (churchDoc.exists() && isMounted) {
            setChurchData(churchDoc.data() as any);
          }
        } catch (err) {
          console.error('Error fetching church in sidebar:', err);
        }
      } else {
        try {
          const snap = await getDocs(query(collection(db, 'churches')));
          if (!snap.empty && isMounted) {
            const first = snap.docs[0];
            setChurchId(first.id);
            setChurchData(first.data() as any);
          }
        } catch (err) {
          console.error('Error fetching default church in sidebar:', err);
        }
      }
    }

    resolveChurch();
    return () => {
      isMounted = false;
    };
  }, [pathname, userData?.churchId]);

  // List of all church ministries
  const ministryList = useMemo(() => {
    const list = [
      {
        key: 'louvor',
        label: churchData?.worshipMinistryName?.trim() || 'Ministério de Louvor',
        icon: Mic2,
        iconColor: 'text-blue-600 dark:text-blue-400',
        activeClass: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold',
        href: churchId ? `/dashboard/churches/${churchId}/ministries/louvor` : '/dashboard/churches'
      },
      {
        key: 'multimidia',
        label: 'Ministério de Multimídia',
        icon: Monitor,
        iconColor: 'text-purple-600 dark:text-purple-400',
        activeClass: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold',
        href: churchId ? `/dashboard/churches/${churchId}/ministries/multimidia` : '/dashboard/churches'
      },
      {
        key: 'danca',
        label: churchData?.danceMinistryName?.trim() || 'Ministério de Dança',
        icon: BallerinaIcon,
        iconColor: 'text-rose-600 dark:text-rose-400',
        activeClass: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold',
        href: churchId ? `/dashboard/churches/${churchId}/ministries/danca` : '/dashboard/churches'
      },
      {
        key: 'secretaria',
        label: 'Secretaria',
        icon: Briefcase,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        activeClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold',
        href: churchId ? `/dashboard/churches/${churchId}/ministries/secretaria` : '/dashboard/churches'
      }
    ];

    if (Array.isArray(churchData?.customMinistries)) {
      churchData.customMinistries.forEach((cm) => {
        if (cm && cm.name) {
          const slug = cm.id || cm.name.toLowerCase().replace(/\s+/g, '-');
          list.push({
            key: slug,
            label: cm.name,
            icon: LayoutGrid,
            iconColor: 'text-indigo-600 dark:text-indigo-400',
            activeClass: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold',
            href: churchId ? `/dashboard/churches/${churchId}/ministries/${slug}` : '/dashboard/churches'
          });
        }
      });
    }

    return list;
  }, [churchData, churchId]);

  const allItems = useMemo(() => {
    const items = [...standardMenuItems];
    if (isSuperAdmin) {
      items.push({ icon: ShieldAlert, label: 'Admin', href: '/dashboard/admin' });
    }
    return items;
  }, [isSuperAdmin]);

  const renderSidebarContent = () => (
    <aside className={cn(
      "w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 flex flex-col p-8 transition-colors duration-300 z-50",
      !isOpen && "hidden lg:flex"
    )}>
      <div className="flex items-center justify-between mb-8">
        <Link 
          href="/" 
          id="logo-link"
          onClick={onClose} 
          className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="bg-white p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center">
            <img 
              src="/logo_aplane.png" 
              alt="Applane Logo" 
              className="h-8 w-auto object-contain" 
            />
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* 1. Dashboard Link */}
        <Link
          key="sidebar-item-/dashboard"
          href="/dashboard"
          onClick={onClose}
          className={cn(
            "flex items-center gap-4 px-5 py-3 rounded-2xl transition-all font-bold group",
            pathname === "/dashboard"
              ? "bg-blue-800 text-white shadow-lg shadow-blue-800/20" 
              : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          <LayoutDashboard className={cn(
            "w-5 h-5",
            pathname === "/dashboard" ? "text-white" : "text-slate-300 dark:text-slate-700 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors"
          )} />
          Dashboard
        </Link>

        {/* 2. Sub-menu Ministérios (logo após Dashboard) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setIsMinistriesExpanded((prev) => !prev)}
            className={cn(
              "w-full flex items-center justify-between px-5 py-3 rounded-2xl transition-all font-bold group text-left cursor-pointer",
              isMinistryRoute
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
            title="Expandir ministérios da igreja"
          >
            <div className="flex items-center gap-4">
              <LayoutGrid className={cn(
                "w-5 h-5 transition-colors",
                isMinistryRoute
                  ? "text-blue-800 dark:text-blue-400"
                  : "text-slate-300 dark:text-slate-700 group-hover:text-blue-800 dark:group-hover:text-blue-400"
              )} />
              <span>Ministérios</span>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200",
                isMinistriesExpanded ? "rotate-180 text-blue-800 dark:text-blue-400" : ""
              )}
            />
          </button>

          {/* Sub-menu expansível com todos os Ministérios da igreja */}
          {isMinistriesExpanded && (
            <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-6 my-1 animate-in fade-in slide-in-from-top-2 duration-200">
              {ministryList.map((ministry) => {
                const isItemActive = pathname === ministry.href || pathname.includes(`/ministries/${ministry.key}`);
                const IconComponent = ministry.icon;

                return (
                  <Link
                    key={`sidebar-ministry-${ministry.key}`}
                    href={ministry.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all font-semibold group",
                      isItemActive
                        ? ministry.activeClass
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <IconComponent className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", ministry.iconColor)} />
                    <span className="truncate">{ministry.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Demais Itens do Menu */}
        {allItems.map((item) => (
          <Link
            key={`sidebar-item-${item.href}`}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-4 px-5 py-3 rounded-2xl transition-all font-bold group",
              pathname === item.href 
                ? "bg-blue-800 text-white shadow-lg shadow-blue-800/20" 
                : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5",
              pathname === item.href ? "text-white" : "text-slate-300 dark:text-slate-700 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors"
            )} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="pt-4 mt-auto">
        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-4 px-5 py-3 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold group cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
          Sair
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div key="sidebar-desktop-view" className="hidden lg:block shrink-0">
        {renderSidebarContent()}
      </div>
      {isOpen && (
        <div key="sidebar-mobile-view" className="fixed inset-0 z-50 lg:hidden">
          <div
            key="sidebar-mobile-overlay"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <div
            key="sidebar-mobile-container"
            className="relative w-72 h-full"
          >
            {renderSidebarContent()}
          </div>
        </div>
      )}
    </>
  );
}
