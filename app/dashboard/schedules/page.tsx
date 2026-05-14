'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Edit2, 
  CheckCircle2, 
  Clock, 
  Music, 
  Users, 
  X,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '@/hooks/useNotifications';

interface Schedule {
  id: string;
  date: string;
  churchId: string;
  songs: string[];
  members: string[];
  notes?: string;
  createdAt?: any;
}

interface Church {
  id: string;
  name: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
}

interface Member {
  uid: string;
  name: string;
  role: string;
}

export default function SchedulesPage() {
  const { user } = useAuth();
  const { token } = useNotifications(); // Initialize notifications for the current user
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  
  const [formData, setFormData] = useState({
    date: '',
    churchId: '',
    songs: [] as string[],
    members: [] as string[],
    notes: ''
  });

  useEffect(() => {
    async function init() {
      await Promise.all([
        fetchSchedules(),
        fetchChurches(),
        fetchSongs(),
        fetchMembers()
      ]);
    }
    init();
  }, []);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const q = query(collection(db, 'schedules'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setSchedules(snap.docs.map(doc => ({ ...doc.data() }) as Schedule));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'schedules');
    } finally {
      setLoading(false);
    }
  }

  async function fetchChurches() {
    const snap = await getDocs(collection(db, 'churches'));
    setChurches(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
  }

  async function fetchSongs() {
    const snap = await getDocs(collection(db, 'songs'));
    setSongs(snap.docs.map(doc => ({ id: doc.id, title: doc.data().title, artist: doc.data().artist })));
  }

  async function fetchMembers() {
    const snap = await getDocs(collection(db, 'users'));
    setMembers(snap.docs.map(doc => ({ uid: doc.id, name: doc.data().name, role: doc.data().role })));
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const scheduleId = editingSchedule ? editingSchedule.id : `schedule_${Date.now()}`;
      
      const scheduleData = {
        id: scheduleId,
        ...formData,
        updatedAt: serverTimestamp(),
        ...(editingSchedule ? {} : { createdAt: serverTimestamp() })
      };

      if (editingSchedule) {
        await updateDoc(doc(db, 'schedules', scheduleId), scheduleData);
      } else {
        await setDoc(doc(db, 'schedules', scheduleId), scheduleData);
      }

      // Trigger Notification
      try {
        const churchName = churches.find(c => c.id === formData.churchId)?.name || 'sua igreja';
        const formattedDate = new Date(formData.date).toLocaleDateString('pt-BR');
        
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'schedule',
            title: editingSchedule ? 'Escala Atualizada!' : 'Nova Escala!',
            body: `Você foi escalado para o dia ${formattedDate} na ${churchName}.`,
            memberIds: formData.members
          })
        });
      } catch (notifErr) {
        console.error('Failed to send notification:', notifErr);
      }

      setIsModalOpen(false);
      setEditingSchedule(null);
      setFormData({ date: '', churchId: '', songs: [], members: [], notes: '' });
      fetchSchedules();
    } catch (err) {
      handleFirestoreError(err, editingSchedule ? OperationType.UPDATE : OperationType.CREATE, `schedules/${editingSchedule?.id || 'new'}`);
    }
  };

  const toggleSelection = (id: string, field: 'songs' | 'members') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(id) 
        ? prev[field].filter(x => x !== id) 
        : [...prev[field], id]
    }));
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100">Escalas de Louvor</h2>
        <button 
          onClick={() => {
            setEditingSchedule(null);
            setFormData({ date: '', churchId: '', songs: [], members: [], notes: '' });
            setIsModalOpen(true);
          }}
          className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nova Escala
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
          </div>
        ) : schedules.map(schedule => (
          <div key={schedule.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-8 relative group">
            <div className="flex-shrink-0 flex items-center gap-6">
               <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex flex-col items-center justify-center text-blue-800 dark:text-blue-400">
                  <span className="text-[10px] uppercase font-black tracking-widest">{new Date(schedule.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                  <span className="text-3xl font-black">{new Date(schedule.date).getDate() + 1}</span>
               </div>
               <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{churches.find(c => c.id === schedule.churchId)?.name || 'Igreja'}</h3>
                  <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 text-xs font-medium mt-1">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(schedule.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> {new Date(schedule.date).toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 border-y md:border-y-0 md:border-x border-slate-100 dark:border-slate-800 py-6 md:py-0 md:px-10 flex flex-col md:flex-row gap-8">
               <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                    <Music className="w-3 h-3" /> Repertório
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {schedule.songs.map(songId => (
                      <span key={songId} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-800">
                        {songs.find(s => s.id === songId)?.title || '...'}
                      </span>
                    ))}
                  </div>
               </div>
               <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                    <Users className="w-3 h-3" /> Time Escalado
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {schedule.members.map(mid => (
                      <div key={mid} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-900/30">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        {members.find(m => m.uid === mid)?.name.split(' ')[0] || '...'}
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-4">
              <button 
                onClick={() => {
                  setEditingSchedule(schedule);
                  setFormData({
                    date: schedule.date,
                    churchId: schedule.churchId,
                    songs: schedule.songs,
                    members: schedule.members,
                    notes: schedule.notes || ''
                  });
                  setIsModalOpen(true);
                }}
                className="p-4 text-slate-300 hover:text-blue-800 transition-colors bg-slate-50 dark:bg-slate-800/50 rounded-2xl"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {!loading && schedules.length === 0 && (
          <div className="p-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center text-center">
            <CalendarIcon className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-6" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Nenhuma escala programada</h3>
            <p className="text-slate-500 mt-2">Comece planejando o próximo louvor.</p>
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
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 mb-8">
                {editingSchedule ? 'Editar Escala' : 'Nova Escala'}
              </h2>

              <form onSubmit={handleSave} className="space-y-8 overflow-y-auto pr-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CalendarIcon size={12}/> Data e Hora *</label>
                    <input 
                      required
                      type="datetime-local" 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-bold"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Igreja / Ministério *</label>
                    <select 
                      required
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-bold"
                      value={formData.churchId}
                      onChange={e => setFormData({...formData, churchId: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {churches.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Escolher Repertório ({formData.songs.length})</label>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                      {songs.map(song => (
                        <button
                          key={song.id}
                          type="button"
                          onClick={() => toggleSelection(song.id, 'songs')}
                          className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                            formData.songs.includes(song.id)
                              ? 'bg-blue-50 border-blue-800 text-blue-800 dark:bg-blue-900/20'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-bold text-sm">{song.title}</p>
                            <p className="text-[10px] opacity-70">{song.artist}</p>
                          </div>
                          {formData.songs.includes(song.id) && <CheckCircle2 className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Escolher Equipe ({formData.members.length})</label>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                      {members.map(member => (
                        <button
                          key={member.uid}
                          type="button"
                          onClick={() => toggleSelection(member.uid, 'members')}
                          className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                            formData.members.includes(member.uid)
                              ? 'bg-blue-50 border-blue-800 text-blue-800 dark:bg-blue-900/20'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-bold text-sm">{member.name}</p>
                            <p className="text-[10px] opacity-70 uppercase tracking-widest">{member.role}</p>
                          </div>
                          {formData.members.includes(member.uid) && <CheckCircle2 className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações Extras</label>
                  <textarea 
                    rows={3}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-medium resize-none"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="Link da partitura, dinâmica do culto, etc."
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-[2rem] transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-8 py-5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-[2rem] transition-all shadow-xl shadow-blue-800/20 flex items-center justify-center gap-2"
                  >
                    <Bell className="w-5 h-5" />
                    {editingSchedule ? 'Salvar e Notificar' : 'Criar Escala e Notificar'}
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
