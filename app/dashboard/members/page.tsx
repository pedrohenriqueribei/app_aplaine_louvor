'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { UserPlus, Search, Edit2, Shield, User, CheckCircle2, XCircle, MoreHorizontal } from 'lucide-react';
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
            await fetchMembers(profile.churchId);
          } else {
            // Fallback for new user without profile yet
            await fetchMembers();
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
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
      // Use filtered query for non-leaders to satisfy security rules
      const targetChurchId = churchId || userProfile?.churchId;
      let q;
      
      if (userProfile?.role === 'líder') {
        // Leaders can potentially see all, but usually we want to filter by church if provided
        if (targetChurchId) {
          q = query(collection(db, 'users'), where('churchId', '==', targetChurchId), orderBy('name', 'asc'));
        } else {
          q = query(collection(db, 'users'), orderBy('name', 'asc'));
        }
      } else {
        // Non-leaders MUST filter by churchId
        q = query(collection(db, 'users'), where('churchId', '==', targetChurchId || ''), orderBy('name', 'asc'));
      }

      const snap = await getDocs(q);
      setMembers(snap.docs.map(doc => ({ ...doc.data() }) as Member));
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

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-800 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar integrante..." 
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-800 transition-all text-slate-700 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {userProfile?.role === 'líder' && (
          <button 
            onClick={() => {
              setEditingMember(null);
              setFormData({ name: '', email: '', instrument: '', phone: '', instruments: [], vocalRange: '', level: '', churchId: userProfile?.churchId || '', role: 'instrumentista', status: 'active' });
              setIsModalOpen(true);
            }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95 w-full md:w-auto justify-center"
          >
            <UserPlus className="w-5 h-5" />
            Novo Integrante
          </button>
        )}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Integrante</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Instrumento</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Cargo</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Ações</th>
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
                  className="group hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-10 py-6 border-b border-dashed border-slate-100">
                    <Link href={`/dashboard/members/${member.uid}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity group/link">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-800 font-black group-hover/link:bg-blue-100 transition-colors">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 flex items-center gap-2 group-hover/link:text-blue-800 transition-colors">
                          {member.name}
                          {member.status === 'active' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">{member.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-10 py-6 border-b border-dashed border-slate-100 text-sm">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1">
                        {member.instruments && member.instruments.length > 0 ? (
                          member.instruments.map(inst => (
                            <span key={inst} className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs">
                              {inst}
                            </span>
                          ))
                        ) : (
                          <span className="font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg text-xs">
                            {member.instrument || '---'}
                          </span>
                        )}
                      </div>
                      {member.level && (
                        <span className="inline-block w-fit px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                          {member.level}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 border-b border-dashed border-slate-100">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                        {member.role === 'líder' ? (
                          <Shield className="w-4 h-4 text-amber-500" />
                        ) : (
                          <User className="w-4 h-4 text-blue-400" />
                        )}
                        {member.role === 'líder' ? 'Líder' : 'Instrumentista'}
                      </div>
                      {member.churchId && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-6">
                          {churches.find(c => c.id === member.churchId)?.name || '...'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 border-b border-dashed border-slate-100 text-right">
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
                        className="p-3 text-slate-300 hover:text-blue-800 transition-colors hover:bg-blue-50 rounded-2xl"
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
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl p-12 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-800/10 blur-[100px] -mr-32 -mt-32"></div>
              
              <h2 className="text-3xl font-display font-bold text-slate-800 mb-10">
                {editingMember ? 'Editar Integrante' : 'Novo Integrante'}
              </h2>

              <form onSubmit={handleSave} className="space-y-6 relative z-10 text-sm max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">E-mail</label>
                    <input 
                      required
                      type="email" 
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Telefone</label>
                    <input 
                      type="tel" 
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
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
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all font-medium appearance-none"
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
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all font-medium appearance-none"
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
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-800 focus:bg-white outline-none transition-all font-medium appearance-none"
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
    </div>
  );
}
