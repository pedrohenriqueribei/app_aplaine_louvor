'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Building2, Users, Loader2, Plus, Edit2, ShieldCheck, CheckCircle2, AlertTriangle, Play, Pause, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface Church {
  id: string;
  name: string;
  address?: string;
  active: boolean;
  createdAt: any;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isChurchModalOpen, setIsChurchModalOpen] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [churchAddress, setChurchAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const churchesSnap = await getDocs(collection(db, 'churches'));
      const churchesData = churchesSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Church[];
      console.log('Churches fetched:', churchesData);
      setChurches(churchesData);
    } catch (error) {
      console.error('Error fetching churches data:', error);
    }

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      setUsersCount(usersSnap.size);
    } catch (error) {
      console.error('Error fetching users data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchName || !user) return;

    setIsSaving(true);
    try {
      const newRef = doc(collection(db, 'churches'));
      await setDoc(newRef, {
        id: newRef.id,
        name: churchName,
        address: churchAddress,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setIsChurchModalOpen(false);
      setChurchName('');
      setChurchAddress('');
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating church:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleChurchStatus = async (churchId: string, currentStatus: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'churches', churchId), {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error toggling church status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const activeChurches = churches.filter(c => c.active).length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Visão Geral
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
          Estatísticas e gestão global da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Total de Igrejas
            </p>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{churches.length}</p>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Igrejas Ativas
            </p>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{activeChurches}</p>
          </div>
        </div>

        <Link href="/admin/dashboard/users" className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer block group">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Usuários Cadastrados
            </p>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{usersCount}</p>
          </div>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestão de Igrejas</h2>
          <button
            onClick={() => setIsChurchModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Igreja
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4 text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Igreja</th>
                <th className="py-3 px-4 text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {churches.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma igreja cadastrada ainda.
                  </td>
                </tr>
              ) : (
                churches.map(church => (
                  <tr key={church.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{church.name}</p>
                          <p className="text-xs text-slate-500">{church.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {church.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                          Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                          Inativa
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleChurchStatus(church.id, church.active)}
                          className={`p-2 rounded-lg transition-colors ${
                            church.active 
                              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                              : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={church.active ? 'Desativar Igreja' : 'Ativar Igreja'}
                        >
                          {church.active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <Link
                          href={`/admin/dashboard/churches/${church.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Gerenciar Igreja"
                        >
                          <Settings className="w-5 h-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isChurchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Adicionar Nova Igreja</h3>
            </div>
            
            <form onSubmit={handleCreateChurch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome da Igreja</label>
                <input
                  type="text"
                  required
                  value={churchName}
                  onChange={e => setChurchName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Primeira Igreja Batista"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Endereço (opcional)</label>
                <input
                  type="text"
                  value={churchAddress}
                  onChange={e => setChurchAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Cidade, Estado"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsChurchModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex justify-center items-center"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
