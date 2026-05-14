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
  serviceId?: string;
  songs: string[];
  members: string[];
  roles?: {
    mainMinister: string;
    drummer: string;
    bassist: string;
    keyboardist: string;
    acousticGuitarist: string;
    electricGuitarist: string;
    baritone: string;
    contralto: string;
    soprano: string;
    mezzoSoprano: string;
  };
  notes?: string;
  createdAt?: any;
}

interface Church {
  id: string;
  name: string;
}

interface ServiceType {
  id: string;
  churchId: string;
  name: string;
  dayOfWeek: string;
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
  churchId?: string;
  instruments?: string[];
  vocalRange?: string;
}

export default function SchedulesPage() {
  const { user, userData } = useAuth();
  const { token } = useNotifications(); // Initialize notifications for the current user
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [dateError, setDateError] = useState('');
  
  const [formData, setFormData] = useState({
    date: '',
    churchId: '',
    serviceId: '',
    songs: [] as string[],
    roles: {
      mainMinister: '',
      drummer: '',
      bassist: '',
      keyboardist: '',
      acousticGuitarist: '',
      electricGuitarist: '',
      baritone: '',
      contralto: '',
      soprano: '',
      mezzoSoprano: ''
    },
    notes: ''
  });

  useEffect(() => {
    async function init() {
      await Promise.all([
        fetchSchedules(),
        fetchChurches(),
        fetchServices(),
        fetchSongs(),
        fetchMembers()
      ]);
    }
    init();
  }, []);

  useEffect(() => {
    setDateError('');
  }, [formData.date, formData.serviceId, isModalOpen]);

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

  async function fetchServices() {
    const snap = await getDocs(collection(db, 'services'));
    setServices(snap.docs.map(doc => ({ id: doc.id, churchId: doc.data().churchId, name: doc.data().name, dayOfWeek: doc.data().dayOfWeek })));
  }

  async function fetchSongs() {
    const snap = await getDocs(collection(db, 'songs'));
    setSongs(snap.docs.map(doc => ({ id: doc.id, title: doc.data().title, artist: doc.data().artist })));
  }

  async function fetchMembers() {
    const snap = await getDocs(collection(db, 'users'));
    setMembers(snap.docs.map(doc => ({ 
      uid: doc.id, 
      name: doc.data().name, 
      role: doc.data().role, 
      churchId: doc.data().churchId,
      instruments: doc.data().instruments,
      vocalRange: doc.data().vocalRange
    })));
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');

    if (formData.serviceId) {
      const selectedService = services.find(s => s.id === formData.serviceId);
      if (selectedService && selectedService.dayOfWeek) {
        const selectedDate = new Date(`${formData.date}T12:00:00`);
        const dayMap: { [key: string]: number } = {
          'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2, 'Quarta-feira': 3, 'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6
        };
        const expectedDay = dayMap[selectedService.dayOfWeek];
        if (expectedDay !== undefined && selectedDate.getDay() !== expectedDay) {
          setDateError(`A data escolhida não corresponde ao dia do culto (${selectedService.dayOfWeek}).`);
          return;
        }
      }
    }

    try {
      const scheduleId = editingSchedule ? editingSchedule.id : `schedule_${Date.now()}`;
      
      const membersList = Object.values(formData.roles).filter(Boolean);

      const scheduleData = {
        id: scheduleId,
        date: formData.date,
        churchId: formData.churchId,
        serviceId: formData.serviceId,
        songs: formData.songs,
        roles: formData.roles,
        members: membersList,
        notes: formData.notes,
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
            memberIds: membersList
          })
        });
      } catch (notifErr) {
        console.error('Failed to send notification:', notifErr);
      }

      setIsModalOpen(false);
      setEditingSchedule(null);
      setFormData({
        date: '',
        churchId: '',
        serviceId: '',
        songs: [],
        roles: {
          mainMinister: '', drummer: '', bassist: '', keyboardist: '', acousticGuitarist: '', electricGuitarist: '',
          baritone: '', contralto: '', soprano: '', mezzoSoprano: ''
        },
        notes: ''
      });
      fetchSchedules();
    } catch (err) {
      handleFirestoreError(err, editingSchedule ? OperationType.UPDATE : OperationType.CREATE, `schedules/${editingSchedule?.id || 'new'}`);
    }
  };

  const toggleSelection = (id: string, field: 'songs') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(id) 
        ? prev[field].filter(x => x !== id) 
        : [...prev[field], id]
    }));
  };

  const handleRoleChange = (role: keyof typeof formData.roles, memberId: string) => {
    setFormData(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [role]: memberId
      }
    }));
  };

  const filterMembersForRole = (membersToFilter: Member[], roleKey: string, churchId: string) => {
    return membersToFilter.filter(m => {
      if (churchId && m.churchId !== churchId) return false;
      const insts = m.instruments || [];
      const vocal = m.vocalRange || '';
      switch(roleKey) {
        case 'mainMinister': return insts.includes('Voz');
        case 'drummer': return insts.includes('Bateria');
        case 'bassist': return insts.includes('Baixo');
        case 'keyboardist': return insts.includes('Teclado');
        case 'acousticGuitarist': return insts.includes('Violão') || insts.includes('Violino');
        case 'electricGuitarist': return insts.includes('Guitarra');
        case 'baritone': return insts.includes('Voz') && ['Tenor', 'Baixo', 'Barítono'].includes(vocal);
        case 'contralto': return insts.includes('Voz') && vocal === 'Contralto';
        case 'soprano': return insts.includes('Voz') && vocal === 'Soprano';
        case 'mezzoSoprano': return insts.includes('Voz') && vocal === 'Mezzo';
        default: return true;
      }
    });
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100">Escalas de Louvor</h2>
        {userData?.role === 'líder' && (
          <button 
            onClick={() => {
              setEditingSchedule(null);
              setFormData({
                date: '',
                churchId: userData?.churchId || '',
                serviceId: '',
                songs: [],
                roles: {
                  mainMinister: '', drummer: '', bassist: '', keyboardist: '', acousticGuitarist: '', electricGuitarist: '',
                  baritone: '', contralto: '', soprano: '', mezzoSoprano: ''
                },
                notes: ''
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-800/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nova Escala
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
          </div>
        ) : schedules.map(schedule => {
          const serviceName = schedule.serviceId ? services.find(s => s.id === schedule.serviceId)?.name : null;
          const safeDate = schedule.date.includes('T') ? schedule.date : `${schedule.date}T12:00:00`;
          return (
          <div key={schedule.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-8 relative group">
            <div className="flex-shrink-0 flex items-center gap-6">
               <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex flex-col items-center justify-center text-blue-800 dark:text-blue-400">
                  <span className="text-[10px] uppercase font-black tracking-widest">{new Date(safeDate).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                  <span className="text-3xl font-black">{new Date(safeDate).getDate()}</span>
               </div>
               <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{churches.find(c => c.id === schedule.churchId)?.name || 'Igreja'}</h3>
                  <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 text-xs font-medium mt-1">
                    {serviceName && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {serviceName}</span>}
                    <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> {new Date(safeDate).toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
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
                    {schedule.members?.map(mid => (
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
                    date: schedule.date.split('T')[0],
                    churchId: schedule.churchId,
                    serviceId: schedule.serviceId || '',
                    songs: schedule.songs,
                    roles: schedule.roles || {
                      mainMinister: '', drummer: '', bassist: '', keyboardist: '', acousticGuitarist: '', electricGuitarist: '',
                      baritone: '', contralto: '', soprano: '', mezzoSoprano: ''
                    },
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
        )})}

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

              <form onSubmit={handleSave} className="space-y-10 overflow-y-auto pr-4 custom-scrollbar max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CalendarIcon size={12}/> Data *</label>
                    <input 
                      required
                      type="date" 
                      className={`w-full bg-transparent border-b-2 py-3 outline-none transition-colors text-slate-800 dark:text-slate-100 font-bold ${dateError ? 'border-red-500 focus:border-red-600' : 'border-slate-200 dark:border-slate-800 focus:border-blue-800'}`}
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                    {dateError && (
                      <p className="text-xs text-red-500 mt-2 font-medium">{dateError}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Igreja / Ministério *</label>
                      <select 
                        required
                        className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 py-3 outline-none focus:border-blue-800 transition-colors text-slate-800 dark:text-slate-100 font-bold disabled:opacity-50"
                        value={formData.churchId}
                        onChange={e => setFormData({...formData, churchId: e.target.value})}
                        disabled={userData?.role === 'líder' && !!userData?.churchId}
                      >
                        <option value="">Selecione...</option>
                        {churches.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {formData.churchId && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Culto *</label>
                      <select 
                        required
                        className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 py-3 outline-none focus:border-blue-800 transition-colors text-slate-800 dark:text-slate-100 font-bold"
                        value={formData.serviceId}
                        onChange={e => setFormData({...formData, serviceId: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        {services.filter(s => s.churchId === formData.churchId).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Vocais</h3>
                    <div className="space-y-4">
                      {[
                        { key: 'mainMinister', label: 'Ministro Principal' },
                        { key: 'soprano', label: 'Soprano' },
                        { key: 'contralto', label: 'Contralto' },
                        { key: 'mezzoSoprano', label: 'Mezzo' },
                        { key: 'baritone', label: 'Tenor / Baixo / Barítono' },
                      ].map(role => (
                        <div key={role.key} className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">{role.label}</label>
                          <select
                            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-2 outline-none focus:border-blue-500 text-sm font-medium transition-colors"
                            value={formData.roles[role.key as keyof typeof formData.roles]}
                            onChange={(e) => handleRoleChange(role.key as keyof typeof formData.roles, e.target.value)}
                          >
                            <option value="">Ninguém escalado</option>
                            {filterMembersForRole(members, role.key, formData.churchId).map(m => (
                              <option key={m.uid} value={m.uid}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Banda</h3>
                    <div className="space-y-4">
                      {[
                        { key: 'keyboardist', label: 'Teclado' },
                        { key: 'acousticGuitarist', label: 'Violão / Violino' },
                        { key: 'electricGuitarist', label: 'Guitarra' },
                        { key: 'bassist', label: 'Baixo' },
                        { key: 'drummer', label: 'Bateria' },
                      ].map(role => (
                        <div key={role.key} className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500">{role.label}</label>
                          <select
                            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-2 outline-none focus:border-blue-500 text-sm font-medium transition-colors"
                            value={formData.roles[role.key as keyof typeof formData.roles]}
                            onChange={(e) => handleRoleChange(role.key as keyof typeof formData.roles, e.target.value)}
                          >
                            <option value="">Ninguém escalado</option>
                            {filterMembersForRole(members, role.key, formData.churchId).map(m => (
                              <option key={m.uid} value={m.uid}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>


                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações Extras</label>
                  <textarea 
                    rows={2}
                    className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-800 py-3 outline-none focus:border-blue-800 transition-colors text-slate-800 dark:text-slate-100 font-medium resize-none"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="Link da partitura, dinâmica do culto, etc."
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-[2rem] transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
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
