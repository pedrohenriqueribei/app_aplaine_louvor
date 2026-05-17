'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Music, 
  Calendar, 
  LayoutDashboard, 
  LogOut,
  Waves,
  X,
  Clock,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Equipe', href: '/dashboard/members' },
  { icon: Music, label: 'Repertório', href: '/dashboard/songs' },
  { icon: Calendar, label: 'Escalas', href: '/dashboard/schedules' },
  { icon: Clock, label: 'Disponibilidade', href: '/dashboard/availability' },
  { icon: Waves, label: 'Igrejas', href: '/dashboard/churches' },
  { icon: Bell, label: 'Notificações', href: '/dashboard/notifications' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const SidebarContent = (
    <aside className={cn(
      "w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 flex flex-col p-8 transition-colors duration-300 z-50",
      !isOpen && "hidden lg:flex"
    )}>
      <div className="flex items-center justify-between mb-16">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-800 rounded-xl flex items-center justify-center text-white font-display font-black text-xl shadow-lg shadow-blue-800/20">
            A
          </div>
          <span className="font-display font-black text-2xl text-slate-800 dark:text-slate-100 tracking-tight">Aplaine</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400">
            <X size={24} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-3">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold group",
              pathname === item.href 
                ? "bg-blue-800 text-white shadow-xl shadow-blue-800/20" 
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

      <button 
        onClick={() => signOut(auth)}
        className="mt-auto flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold group"
      >
        <LogOut className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
        Sair
      </button>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block shrink-0">
        {SidebarContent}
      </div>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <div
            className="relative w-72 h-full"
          >
            {SidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
