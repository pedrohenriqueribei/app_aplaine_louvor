'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, User as UserIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!['líder', 'instrumentista', 'admin', 'member'].includes(userData?.role)) {
        router.push('/');
      }
    }
  }, [user, userData, loading, router]);

  if (loading) return null;
  if (!user || !['líder', 'instrumentista', 'admin', 'member'].includes(userData?.role)) return null;

  const getPageTitle = () => {
    if (pathname.includes('/members')) return 'Equipe';
    if (pathname.includes('/songs')) return 'Repertório';
    if (pathname.includes('/schedules')) return 'Escalas';
    if (pathname.includes('/churches')) return 'Igrejas';
    return 'Dashboard';
  };

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10 md:mb-16">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">{getPageTitle()}</h1>
              <p className="text-slate-400 dark:text-slate-500 font-medium mt-1 text-sm md:text-base">Bem-vindo ao centro de comando</p>
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
            <button className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-800 dark:hover:text-blue-400 transition-all shadow-sm relative shrink-0">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            
            <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 shrink-0"></div>

            <div className="flex items-center gap-4 py-2 pl-2 pr-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-800 dark:text-blue-400 font-bold transition-all">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">{user.displayName || 'Usuário'}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.email}</p>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
