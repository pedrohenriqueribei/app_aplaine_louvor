'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, User as UserIcon } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-4xl font-display font-black text-slate-800 tracking-tight">{getPageTitle()}</h1>
            <p className="text-slate-400 font-medium mt-1">Bem-vindo ao centro de comando</p>
          </div>

          <div className="flex items-center gap-6">
            <button className="p-3 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-blue-800 transition-all shadow-sm">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-3 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-blue-800 transition-all shadow-sm relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>

            <div className="flex items-center gap-4 py-2 pl-2 pr-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-800 font-bold group-hover:bg-blue-800 group-hover:text-white transition-all">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-black text-slate-800 leading-tight">{user.displayName || 'Usuário'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.email}</p>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
