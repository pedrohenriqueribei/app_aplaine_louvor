'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { UserPlus, Search, Edit2, Shield, User, CheckCircle2, XCircle, Bell, Link2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/components/AuthProvider';

interface Member {
  uid: string;
  name: string;
  email: string;
  role: 'líder' | 'instrumentista';
  status: 'active' | 'inactive';
  instrument?: string;
  instruments?: string[];
  phone?: string;
  vocalRange?: string;
  level?: 'aprendiz' | 'intermediário' | 'experiente';
  churchId?: string;
}

export default function MembersPage() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [churches, setChurches] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ title: '', body: '', churchOnly: true });
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [searchUnlinkedTerm, setSearchUnlinkedTerm] = useState('');
  const [unlinkedUsers, setUnlinkedUsers] = useState<Member[]>([]);
  const [isSearchingUnlinked, setIsSearchingUnlinked] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    instrument: '',
    phone: '',
    instruments: [] as string[],
    vocalRange: '',
    level: '' as 'aprendiz' | 'intermediário' | 'experiente' | '',
    churchId: '',
    role: 'instrumentista' as 'líder' | 'instrumentista',
    status: 'active' as 'active' | 'inactive'
  });

  const instrumentsList = [
    'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Voz', 'Percussão'
  ];

  const vocalRanges = [
    'Soprano', 'Contralto', 'Mezzo', 'Baixo', 'Tenor', 'Barítono'
  ];

  const levelList = ['aprendiz', 'intermediário', 'experiente'];

  const toggleInstrument = (inst: string) => {
    setFormData(prev => ({
      ...prev,
      instruments: prev.instruments.includes(inst)
        ? prev.instruments.filter(i => i !== inst)
        : [...prev.instruments, inst]
    }));
  };

  useEffect(() => {
    async function init() {
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const profile = { uid: profileDoc.id, ...profileDoc.data() } as Member;
            setUserProfile(profile);
            // Only fetch members if we have a churchId or if we are a leader
            if (profile.churchId || profile.role === 'líder') {
              await fetchMembers(profile.churchId);
            } else {
              setMembers([]);
              setLoading(false);
            }
          } else {
            // Profile doesn't exist yet, fetchMembers will hit the list rule
            // which now handles missing docs by assuming churchId == ''
            await fetchMembers();
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          // If we fail to get profile, we might still want to try fetching unlinked members
          await fetchMembers();
        }
        await fetchChurches();
      }
    }
    init();
  }, [user]);

  async function fetchChurches() {
    try {
      const q = query(collection(db, 'churches'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setChurches(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    } catch (e) {
      console.error('Error fetching churches:', e);
    }
  }

  async function fetchMembers(churchId?: string) {
    setLoading(true);
    try {
      const targetChurchId = churchId || userProfile?.churchId;
      let q;
      
      if (userProfile?.role === 'líder') {
        if (targetChurchId) {
          q = query(collection(db, 'users'), where('churchId', '==', targetChurchId), orderBy('name', 'asc'));
        } else {
          q = query(collection(db, 'users'), orderBy('name', 'asc'));
        }
      } else {
        q = query(collection(db, 'users'), where('churchId', '==', targetChurchId || ''), orderBy('name', 'asc'));
      }

      const snap = await getDocs(q);
      setMembers(snap.docs.map(doc => ({ ...doc.data(), uid: doc.id }) as Member));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await updateDoc(doc(db, 'users', editingMember.uid), formData);
      } else {
        const newUid = `user_${Date.now()}`;
        await setDoc(doc(db, 'users', newUid), {
          uid: newUid,
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingMember(null);
      setFormData({ name: '', email: '', instrument: '', phone: '', instruments: [], vocalRange: '', level: '', churchId: '', role: 'instrumentista', status: 'active' });
      fetchMembers(userProfile?.churchId);
    } catch (err) {
      handleFirestoreError(err, editingMember ? OperationType.UPDATE : OperationType.CREATE, `users/${editingMember?.uid || 'new'}`);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.instrument && m.instrument.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.instruments && m.instruments.some(inst => inst.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'broadcast',
          title: broadcastData.title,
          body: broadcastData.body,
          churchId: broadcastData.churchOnly ? userProfile?.churchId : null
        })
      });
      setIsBroadcastModalOpen(false);
      setBroadcastData({ title: '', body: '', churchOnly: true });
      alert('Comunicado enviado com sucesso!');
    } catch (err) {
      console.error('Error sending broadcast:', err);
      alert('Erro ao enviar comunicado.');
    }
  };

  const searchUnlinked = async () => {
    if (!searchUnlinkedTerm.trim()) return;
    setIsSearchingUnlinked(true);
    try {
      const q = query(collection(db, 'users'), where('churchId', '==', ''));
      const snap = await getDocs(q);
      const results = snap.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as Member))
        .filter(m => m.name.toLowerCase().includes(searchUnlinkedTerm.toLowerCase()));
      
      setUnlinkedUsers(results);
    } catch (err) {
      console.error('Error searching unlinked users:', err);
    } finally {
      setIsSearchingUnlinked(false);
    }
  };

  const handleLinkUser = async (targetUser: Member) => {
    if (!userProfile?.churchId) {
      alert('Você precisa estar vinculado a uma igreja para vincular outros membros.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        churchId: userProfile.churchId,
        role: 'instrumentista',
        status: 'active'
      });
      setIsLinkModalOpen(false);
      setSearchUnlinkedTerm('');
      setUnlinkedUsers([]);
      fetchMembers(userProfile.churchId);
      alert(`${targetUser.name} foi vinculado com sucesso!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-800 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar integrante..." 
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-800 transition-all text-slate-700 dark:text-slate-200 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto relative">
          {userProfile?.role === 'líder' && (
            <>
              <button 
                onClick={() => setIsBroadcastModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex-1 md:flex-none justify-center"
              >
                <Bell className="w-5 h-5" />
                Comunicado
              </button>
              
              <div className="relative flex-1 md:flex-none">
                <button 
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95 w-full justify-center"
                >
                  <UserPlus className="w-5 h-5" />
                  Novo Integrante
                </button>

                <AnimatePresence>
                  {isAddMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsAddMenuOpen(false)}
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 z-20 overflow-hidden"
                      >
                        <button 
                          onClick={() => {
                            setEditingMember(null);
                            setFormData({ name: '', email: '', instrument: '', phone: '', instruments: [], vocalRange: '', level: '', churchId: userProfile?.churchId || '', role: 'instrumentista', status: 'active' });
                            setIsModalOpen(true);
                            setIsAddMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-6 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 rounded-2xl transition-colors text-left"
                        >
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-800">
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Registrar Novo</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Criar Cadastro</p>
                          </div>
                        </button>
                        
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-4" />

                        <button 
                          onClick={() => {
                            setIsLinkModalOpen(true);
                            setIsAddMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-6 py-4 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-700 dark:text-slate-200 rounded-2xl transition-colors text-left"
                        >
                          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600">
                            <Link2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Vincular Existente</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking_wider">Buscar por Nome</p>
                          </div>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50">
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Integrante</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Vocal / Instrumento</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Cargo</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filteredMembers.map((member) => (
                <motion.tr 
                  key={member.uid}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-10 py-6 border-b border-dashed border-slate-100 dark:border-slate-800">
                    <Link href={`/dashboard/members/${member.uid}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity group/link">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-800 dark:text-blue-400 font-black group-hover/link:bg-blue-100 dark:group-hover/link:bg-blue-900/50 transition-colors">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 group-hover/link:text-blue-800 dark:group-hover/link:text-blue-400 transition-colors">
                          {member.name}
                          {member.status === 'active' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                          )}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{member.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-10 py-6 border-b border-dashed border-slate-100 dark:border-slate-800 text-sm">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {(() => {
                          const vocal = member.vocalRange || '';
                          const insts = (member.instruments && member.instruments.length > 0) 
                            ? member.instruments 
                            : (member.instrument ? [member.instrument] : []);
                          
                          const hasVocal = vocal.trim().length > 0;
                          const numInst = insts.length;
                          let txt = '';
                          
                          if (hasVocal && numInst > 0) {
                            txt = `${vocal} e ${insts[0]}${numInst > 1 ? ` (+${numInst - 1})` : ''}`;
                          } else if (hasVocal) {
                            txt = vocal;
                          } else if (numInst > 0) {
                            txt = `${insts[0]}${numInst > 1 ? ` (+${numInst - 1})` : ''}`;
                          } else {
                            txt = '---';
                          }
                          
                          return txt !== '---' ? (
                            <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-lg text-[11px]">
                              {txt}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 font-bold">---</span>
                          );
                        })()}
                      </div>
                      {member.level && (
                        <span className="inline-block w-fit px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded text-[9px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-800">
                          {member.level}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 border-b border-dashed border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                        {member.role === 'líder' ? (
                          <Shield className="w-4 h-4 text-amber-500" />
                        ) : (
                          <User className="w-4 h-4 text-blue-400" />
                        )}
                        {member.role === 'líder' ? 'Líder' : 'Instrumentista'}
                      </div>
                      {member.churchId && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider pl-6">
                          {churches.find(c => c.id === member.churchId)?.name || '...'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 border-b border-dashed border-slate-100 dark:border-slate-800 text-right">
                    {userProfile?.role === 'líder' && (
                      <button 
                        onClick={() => {
                          setEditingMember(member);
                          setFormData({ 
                            name: member.name, 
                            email: member.email, 
                            instrument: member.instrument || '', 
                            phone: member.phone || '',
                            instruments: member.instruments || [],
                            vocalRange: member.vocalRange || '',
                            level: member.level || '',
                            churchId: member.churchId || '',
                            role: member.role, 
                            status: member.status 
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-3 text-slate-300 dark:text-slate-700 hover:text-blue-800 dark:hover:text-blue-400 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredMembers.length === 0 && !loading && (
          <div className="p-20 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum integrante encontrado</h3>
            <p className="text-slate-500">Tente buscar por outro nome ou instrumento.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-800/10 blur-[100px] -mr-32 -mt-32"></div>
              
              <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-10">
                {editingMember ? 'Editar Integrante' : 'Novo Integrante'}
              </h2>

              <form onSubmit={handleSave} className="space-y-6 relative z-10 text-sm max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-slate-100"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">E-mail</label>
                    <input 
                      required
                      type="email" 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-slate-100"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Telefone</label>
                    <input 
                      type="tel" 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-slate-100"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Vocal</label>
                    <div className="flex flex-wrap gap-1">
                      {vocalRanges.map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setFormData({...formData, vocalRange: formData.vocalRange === range ? '' : range})}
                          className={`py-2 px-3 rounded-xl text-[10px] font-bold transition-all border ${
                            formData.vocalRange === range 
                              ? 'bg-indigo-700 text-white border-indigo-700' 
                              : 'bg-slate-50 text-slate-600 border-transparent hover:border-indigo-300'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Instrumentos</label>
                  <div className="flex flex-wrap gap-2">
                    {instrumentsList.map((inst) => (
                      <button
                        key={inst}
                        type="button"
                        onClick={() => toggleInstrument(inst)}
                        className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border ${
                          formData.instruments.includes(inst) 
                            ? 'bg-blue-800 text-white border-blue-800 shadow-lg shadow-blue-800/20' 
                            : 'bg-slate-50 text-slate-600 border-transparent hover:border-blue-300'
                        }`}
                      >
                        {inst}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nível de Habilidade</label>
                  <div className="flex flex-wrap gap-2">
                    {levelList.map((lv) => (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => setFormData({...formData, level: formData.level === lv ? '' : lv as any})}
                        className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border capitalize ${
                          formData.level === lv 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20' 
                            : 'bg-slate-50 text-slate-600 border-transparent hover:border-emerald-300'
                        }`}
                      >
                        {lv}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Ministério de Louvor</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all font-medium appearance-none text-slate-800"
                    value={formData.churchId}
                    onChange={e => setFormData({...formData, churchId: e.target.value})}
                  >
                    <option value="">Selecione o ministério...</option>
                    {churches.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cargo</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all font-medium appearance-none text-slate-800"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as any})}
                    >
                      <option value="instrumentista">Instrumentista</option>
                      <option value="líder">Líder</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Status</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all font-medium appearance-none text-slate-800"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-8 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-[2rem] transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-8 py-5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-[2rem] transition-all shadow-xl shadow-blue-800/20"
                  >
                    {editingMember ? 'Salvar Mudanças' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLinkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLinkModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-6">Vincular Integrante</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Busque por pessoas cadastradas que ainda não fazem parte de nenhum ministério.</p>
              
              <div className="relative mb-8">
                <input 
                  type="text" 
                  placeholder="Nome do integrante..." 
                  className="w-full pl-6 pr-20 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all font-medium text-slate-800"
                  value={searchUnlinkedTerm}
                  onChange={e => setSearchUnlinkedTerm(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && searchUnlinked()}
                />
                <button 
                  onClick={searchUnlinked}
                  disabled={isSearchingUnlinked}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-blue-800 text-white rounded-xl font-bold text-xs hover:bg-blue-900 transition-all disabled:opacity-50"
                >
                  {isSearchingUnlinked ? '...' : 'Buscar'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {unlinkedUsers.length > 0 ? (
                  unlinkedUsers.map(u => (
                    <div key={u.uid} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                      <button 
                        onClick={() => handleLinkUser(u)}
                        className="px-4 py-2 bg-blue-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-lg shadow-blue-800/10"
                      >
                        Vincular
                      </button>
                    </div>
                  ))
                ) : (
                  searchUnlinkedTerm && !isSearchingUnlinked && (
                    <div className="text-center py-10 opacity-50">
                      <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm font-medium">Ninguém encontrado sem ministério.</p>
                    </div>
                  )
                )}
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setIsLinkModalOpen(false)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBroadcastModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 overflow-hidden"
            >
              <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8">Enviar Comunicado</h2>
              <form onSubmit={handleBroadcast} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Título da Notificação</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none transition-all font-medium text-slate-800"
                    value={broadcastData.title}
                    onChange={e => setBroadcastData({...broadcastData, title: e.target.value})}
                    placeholder="Ex: Ensaio Extra Cancelado"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Mensagem</label>
                  <textarea 
                    required
                    rows={4}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none transition-all font-medium resize-none text-slate-800"
                    value={broadcastData.body}
                    onChange={e => setBroadcastData({...broadcastData, body: e.target.value})}
                    placeholder="Escreva sua mensagem aqui..."
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-2 border-slate-200 text-amber-500 focus:ring-amber-500"
                      checked={broadcastData.churchOnly}
                      onChange={e => setBroadcastData({...broadcastData, churchOnly: e.target.checked})}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Enviar apenas para {userProfile?.churchId ? 'minha congregação' : 'todos'}</span>
                </label>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsBroadcastModalOpen(false)}
                    className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 font-bold rounded-[2rem] transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-8 py-5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-[2rem] transition-all shadow-xl shadow-amber-500/20"
                  >
                    Enviar Agora
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
