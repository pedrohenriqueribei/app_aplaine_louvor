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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Equipe', href: '/dashboard/members' },
  { icon: Music, label: 'Músicas', href: '/dashboard/songs' },
  { icon: Calendar, label: 'Escalas', href: '/dashboard/schedules' },
  { icon: Waves, label: 'Igrejas', href: '/dashboard/churches' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col p-8 shrink-0">
      <div className="flex items-center gap-4 mb-16">
        <div className="w-10 h-10 bg-blue-800 rounded-xl flex items-center justify-center text-white font-display font-black text-xl shadow-lg shadow-blue-800/20">
          A
        </div>
        <span className="font-display font-black text-2xl text-slate-800 tracking-tight">Aplaine</span>
      </div>

      <nav className="flex-1 space-y-3">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold group",
              pathname === item.href 
                ? "bg-blue-800 text-white shadow-xl shadow-blue-800/20" 
                : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5",
              pathname === item.href ? "text-white" : "text-slate-300 group-hover:text-blue-800 transition-colors"
            )} />
            {item.label}
          </Link>
        ))}
      </nav>

      <button 
        onClick={() => signOut(auth)}
        className="mt-auto flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all font-bold group"
      >
        <LogOut className="w-5 h-5 text-slate-300 group-hover:text-red-600 transition-colors" />
        Sair
      </button>
    </aside>
  );
}
