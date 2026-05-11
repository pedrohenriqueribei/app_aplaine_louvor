'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Calendar, Users, Music, Clock as ClockIcon, MapPin, Link as LinkIcon, BarChart3, Waves, KeyRound, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardPage() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    members: 0,
    songs: 0,
    schedules: 0,
    churches: 0
  });
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!auth.currentUser?.email) return;
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      alert('Erro ao enviar e-mail de redefinição: ' + err.message);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!userData) return;

      try {
        // Members query is restricted by church for non-leaders
        const membersQuery = userData.role === 'líder' 
          ? collection(db, 'users')
          : query(collection(db, 'users'), where('churchId', '==', userData.churchId));

        const [membersSnap, songsSnap, schedulesSnap, churchesSnap] = await Promise.all([
          getDocs(membersQuery),
          getDocs(collection(db, 'songs')),
          getDocs(collection(db, 'schedules')),
          getDocs(collection(db, 'churches'))
        ]);

        setStats({
          members: membersSnap.size,
          songs: songsSnap.size,
          schedules: schedulesSnap.size,
          churches: churchesSnap.size
        });
      } catch (err: any) {
        console.error('Dashboard Data Fetch Error:', err);
      }
    }
    fetchData();
  }, [userData]);

  const cards = [
    { label: 'Integrantes', value: stats.members, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Músicas', value: stats.songs, icon: Music, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Escalas', value: stats.schedules, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Igrejas', value: stats.churches, icon: Waves, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center ${card.color} mb-6 group-hover:scale-110 transition-transform`}>
              <card.icon className="w-7 h-7" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">{card.label}</p>
            <h3 className="text-4xl font-display font-black text-slate-800 tracking-tight">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">Próximas Escalas</h2>
            <button className="text-sm font-bold text-blue-800 hover:underline px-4 py-2 hover:bg-blue-50 rounded-lg transition-all">Ver todas</button>
          </div>
          
          <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-sm">
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                  <Calendar size={32} />
                </div>
                <p className="text-slate-500 font-medium">Nenhuma escala para os próximos dias.</p>
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">Novidades</h2>
          <div className="bg-gradient-to-br from-blue-800 to-indigo-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
            <BarChart3 className="w-12 h-12 mb-6 text-blue-200" />
            <h4 className="text-xl font-bold mb-2">Relatórios Mensais</h4>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">Em breve você poderá visualizar relatórios de frequência e repertório mais tocado.</p>
            <button className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all">Saber mais</button>
          </div>
        </div>
      </div>

      <div className="pt-12 border-t border-slate-100 mt-20">
        <div className="bg-slate-50 rounded-[3rem] p-12 flex flex-col md:flex-row items-center justify-between gap-8 border border-white">
          <div className="space-y-4 text-center md:text-left">
            <h3 className="text-2xl font-display font-black text-slate-800 tracking-tight">Segurança da Conta</h3>
            <p className="text-slate-500 text-sm max-w-md">
              Mantenha sua conta segura. Se você deseja alterar sua senha, clicando no botão ao lado enviaremos um link de redefinição para o seu e-mail cadastrado.
            </p>
          </div>
          <button 
            disabled={resetSent}
            onClick={handleResetPassword}
            className={`flex items-center gap-3 px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 ${
              resetSent 
                ? 'bg-emerald-100 text-emerald-600 shadow-emerald-500/10' 
                : 'bg-white text-slate-800 hover:bg-slate-800 hover:text-white shadow-slate-200'
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
