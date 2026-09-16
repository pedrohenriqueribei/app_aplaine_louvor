'use client';

import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard, Settings, Building2, Users } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/admin/login');
      } else if (!isSuperAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, isSuperAdmin, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  if (loading || !user || !isSuperAdmin) return null;

  const navItems = [
    { label: 'Visão Geral', icon: <LayoutDashboard className="w-5 h-5" />, href: '/admin/dashboard' },
    { label: 'Usuários', icon: <Users className="w-5 h-5" />, href: '/admin/dashboard/users' },
  ];

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
      {/* Sidebar Admin */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 mb-2">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="bg-white p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center">
              <img src="/logo_aplane.png" alt="Applane Logo" className="h-7 w-auto object-contain" />
            </div>
            <span className="text-[10px] uppercase tracking-widest bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold px-2 py-0.5 rounded-md">Admin</span>
          </Link>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-2">Painel de Controle</p>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex justify-end mb-8 md:mb-12">
          <ThemeToggle />
        </header>
        {children}
      </main>
    </div>
  );
}
