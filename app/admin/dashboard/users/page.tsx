'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, serverTimestamp, getDocFromCache } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { Users, Loader2, Search, X, CheckCircle2, User as UserIcon, Save, Music, Mic2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface PlatformUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  churchId?: string;
  role?: string;
  status?: string;
  createdAt?: any;
  roles?: {
    worship?: string[];
    multimedia?: string[];
    secretariat?: string[];
  };
  instruments?: string[];
  vocalRange?: string;
  voice?: string;
  voices?: string[];
}

interface ChurchType {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<PlatformUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [allChurches, setAllChurches] = useState<ChurchType[]>([]);
  
  // Specific user details
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Edited values
  const [editChurchId, setEditChurchId] = useState<string>('');
  const [deptRoles, setDeptRoles] = useState<Record<string, string[]>>({
    worship: [],
    multimedia: [],
    secretariat: []
  });
  const [savingLoading, setSavingLoading] = useState(false);

  useEffect(() => {
    fetchUsersAndChurches();
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFilteredUsers(users.filter(u => 
      (u.name && u.name.toLowerCase().includes(term)) || 
      (u.email && u.email.toLowerCase().includes(term))
    ));
  }, [search, users]);

  async function fetchUsersAndChurches() {
    setLoading(true);
    try {
      // Fetch users
      const snap = await getDocs(collection(db, 'users'));
      const fetchedUsers = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlatformUser[];
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);
      
      // Fetch all churches
      const churchesSnap = await getDocs(collection(db, 'churches'));
      const churchesData = churchesSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Igreja sem nome'
      }));
      setAllChurches(churchesData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUserClick = async (u: PlatformUser) => {
    setSelectedUser(u);
    setEditChurchId(u.churchId || '');
    setDeptRoles({ worship: [], multimedia: [], secretariat: [] });
    
    // Fetch current department roles if the user has a church
    if (u.churchId) {
      const depts = ['worship', 'multimedia', 'secretariat'];
      const rolesData: Record<string, string[]> = { worship: [], multimedia: [], secretariat: [] };
      
      for (const dept of depts) {
        try {
          const memberDoc = await getDoc(doc(db, 'churches', u.churchId, 'departments', dept, 'members', u.id));
          if (memberDoc.exists()) {
            rolesData[dept] = memberDoc.data().roles || [];
          }
        } catch (error) {
          console.error(`Error loading roles for ${dept}:`, error);
        }
      }
      setDeptRoles(rolesData);
    }
    
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSavingLoading(true);
    try {
      // 1. Update user document and its internal roles
      const userRef = doc(db, 'users', selectedUser.id);
      const userSnap = await getDoc(userRef);
      let userRoles = { worship: [] as string[], multimedia: [] as string[], secretariat: [] as string[] };
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.roles) {
          userRoles = {
            worship: data.roles.worship || [],
            multimedia: data.roles.multimedia || [],
            secretariat: data.roles.secretariat || [],
          };
        }
      }

      // Update leader role based on the Super Admin's selection in deptRoles
      const isWorshipLeader = deptRoles['worship']?.includes('leader');
      if (isWorshipLeader) {
        if (!userRoles.worship.includes('leader')) {
          userRoles.worship = [...userRoles.worship, 'leader'];
        }
      } else {
        userRoles.worship = userRoles.worship.filter(r => r !== 'leader');
      }

      const isMultimediaLeader = deptRoles['multimedia']?.includes('leader');
      if (isMultimediaLeader) {
        if (!userRoles.multimedia.includes('leader')) {
          userRoles.multimedia = [...userRoles.multimedia, 'leader'];
        }
        if (!userRoles.multimedia.includes('multimedia_leader')) {
          userRoles.multimedia = [...userRoles.multimedia, 'multimedia_leader'];
        }
      } else {
        userRoles.multimedia = userRoles.multimedia.filter(r => r !== 'leader' && r !== 'multimedia_leader');
      }

      const isSecretariatLeader = deptRoles['secretariat']?.includes('leader');
      if (isSecretariatLeader) {
        if (!userRoles.secretariat.includes('leader')) {
          userRoles.secretariat = [...userRoles.secretariat, 'leader'];
        }
      } else {
        userRoles.secretariat = userRoles.secretariat.filter(r => r !== 'leader');
      }

      await updateDoc(userRef, {
        churchId: editChurchId,
        roles: userRoles,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || user?.uid || 'system'
      });
      
      // 2. Update roles for each department in the subcollection
      if (editChurchId) {
        const depts = ['worship', 'multimedia', 'secretariat'];
        for (const dept of depts) {
          const memberRef = doc(db, 'churches', editChurchId, 'departments', dept, 'members', selectedUser.id);
          const currentRoles = deptRoles[dept] || [];
          
          const memberSnap = await getDoc(memberRef);
          if (!memberSnap.exists()) {
            if (currentRoles.length > 0) {
              await setDoc(memberRef, {
                userId: selectedUser.id,
                roles: currentRoles,
                createdAt: serverTimestamp(),
                createdBy: user?.email || user?.uid || 'system',
                updatedAt: serverTimestamp(),
                updatedBy: user?.email || user?.uid || 'system',
                joinedAt: serverTimestamp()
              });
            }
          } else {
            await setDoc(memberRef, {
              roles: currentRoles,
              updatedAt: serverTimestamp(),
              updatedBy: user?.email || user?.uid || 'system',
              ...(currentRoles.length > 0 && !memberSnap.data().joinedAt ? { joinedAt: serverTimestamp() } : {})
            }, { merge: true });
          }
        }
      }
      
      // Update local state
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, churchId: editChurchId, roles: userRoles } : u));
      setSelectedUser({ ...selectedUser, churchId: editChurchId, roles: userRoles });
      setIsModalOpen(false);
      
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Erro ao salvar as informações do usuário.');
    } finally {
      setSavingLoading(false);
    }
  };

  const toggleLeaderRole = (dept: string) => {
    setDeptRoles(prev => {
      const current = prev[dept] || [];
      const isLeader = current.includes('leader');
      
      if (isLeader) {
        return { ...prev, [dept]: current.filter(r => r !== 'leader') };
      } else {
        return { ...prev, [dept]: [...current, 'leader'] };
      }
    });
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate().toLocaleDateString('pt-BR');
    }
    return new Date(dateValue).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Usuários do Sistema
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
          Gerencie e visualize todos os usuários cadastrados na plataforma.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuário por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
            {filteredUsers.length} usuários
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="py-4 px-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Igreja</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Papel</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data de Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <UserIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr 
                    key={u.id} 
                    onClick={() => handleUserClick(u)}
                    className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold uppercase shrink-0">
                          {u.name ? u.name.charAt(0) : <UserIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{u.name || 'Sem nome'}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">
                      {u.churchId ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          {allChurches.find(c => c.id === u.churchId)?.name || 'Igreja desconhecida'}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Sem vínculo</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-bold uppercase tracking-wide">
                        {u.role || 'Usuário'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Info Dialog */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl w-full max-w-2xl z-50 overflow-y-auto max-h-[90vh]">
            <Dialog.Title className="sr-only">Detalhes e Edição do Usuário</Dialog.Title>
            
            {selectedUser && (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-black uppercase shrink-0">
                      {selectedUser.name ? selectedUser.name.charAt(0) : <UserIcon className="w-8 h-8" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {selectedUser.name || 'Sem nome'}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400">{selectedUser.email}</p>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações Básicas */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                      Informações
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                          Telefone
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                          {selectedUser.phone || 'Não informado'}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                          Data de Cadastro
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                          {formatDate(selectedUser.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Habilidades Musicais se registradas */}
                    {((selectedUser.instruments && selectedUser.instruments.length > 0) || selectedUser.vocalRange || selectedUser.voice || (selectedUser.voices && selectedUser.voices.length > 0)) && (
                      <div className="mt-4 p-4 bg-blue-50/40 dark:bg-blue-950/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/35 space-y-3">
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                          Habilidades
                        </p>
                        
                        {selectedUser.instruments && selectedUser.instruments.length > 0 && (
                          <div>
                            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <Music className="w-3.5 h-3.5 text-blue-500" />
                              Instrumentos
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedUser.instruments.map((inst) => (
                                <span key={inst} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs font-bold capitalize">
                                  {inst}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(selectedUser.vocalRange || selectedUser.voice || (selectedUser.voices && selectedUser.voices.length > 0)) && (
                          <div className={selectedUser.instruments && selectedUser.instruments.length > 0 ? "pt-2 border-t border-blue-100/30 dark:border-blue-900/20" : ""}>
                            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <Mic2 className="w-3.5 h-3.5 text-indigo-500" />
                              Voz / Classificação
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedUser.vocalRange && (
                                <span className="px-2.5 py-1 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-lg text-xs font-bold capitalize">
                                  {selectedUser.vocalRange}
                                </span>
                              )}
                              {selectedUser.voice && selectedUser.voice !== selectedUser.vocalRange && (
                                <span className="px-2.5 py-1 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-lg text-xs font-bold capitalize">
                                  {selectedUser.voice}
                                </span>
                              )}
                              {selectedUser.voices && selectedUser.voices.map((vc) => (
                                <span key={vc} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-lg text-xs font-bold capitalize">
                                  {vc}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Roles do Usuário no Banco de Dados */}
                    <div className="mt-6 space-y-3">
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Atribuições e Papéis (roles do banco)
                      </p>
                      
                      <div className="space-y-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        {/* Louvor */}
                        <div>
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Ministério de Louvor / worship
                          </p>
                          {selectedUser.roles?.worship && selectedUser.roles.worship.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {selectedUser.roles.worship.map((r) => (
                                <span key={r} className="px-2.5 py-1 bg-blue-550/10 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 rounded-lg text-xs font-bold capitalize font-mono">
                                  {r === "leader" ? "Líder 👑" : r}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Nenhum papel atribuído neste ministérios</p>
                          )}
                        </div>

                        {/* Multimidia */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
                          <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Ministério de Multimídia / multimedia
                          </p>
                          {selectedUser.roles?.multimedia && selectedUser.roles.multimedia.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {selectedUser.roles.multimedia.map((r) => (
                                <span key={r} className="px-2.5 py-1 bg-purple-550/10 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50 rounded-lg text-xs font-bold capitalize font-mono">
                                  {r === "leader" || r === "multimedia_leader" ? "Líder 👑" : r}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Nenhum papel atribuído neste ministério</p>
                          )}
                        </div>

                        {/* Secretaria */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Secretaria / secretariat
                          </p>
                          {selectedUser.roles?.secretariat && selectedUser.roles.secretariat.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {selectedUser.roles.secretariat.map((r) => (
                                <span key={r} className="px-2.5 py-1 bg-emerald-550/10 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-xs font-bold capitalize font-mono">
                                  {r === "leader" || r === "admin" ? "Líder/Admin 👑" : r}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Nenhum papel atribuído neste ministério</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configurações Administrativas */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                      Administração
                    </h3>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        Igreja Vinculada
                      </label>
                      <select 
                        value={editChurchId}
                        onChange={(e) => {
                          setEditChurchId(e.target.value);
                          // Reset roles when changing church? Not strictly necessary but good.
                          if (e.target.value !== selectedUser.churchId) {
                            setDeptRoles({ worship: [], multimedia: [], secretariat: [] });
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm mb-4"
                      >
                        <option value="">Sem vínculo</option>
                        {allChurches.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {editChurchId && (
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          Liderança por Departamento
                        </label>
                        
                        {['worship', 'multimedia', 'secretariat'].map((dept) => {
                          const isLeader = deptRoles[dept]?.includes('leader');
                          const labels: Record<string, string> = {
                            worship: 'Ministério de Louvor',
                            multimedia: 'Multimídia',
                            secretariat: 'Secretaria'
                          };
                          
                          return (
                            <label key={dept} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {labels[dept]}
                              </span>
                              <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2" style={{ backgroundColor: isLeader ? '#3b82f6' : '#cbd5e1' }}>
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={isLeader}
                                  onChange={() => toggleLeaderRole(dept)}
                                />
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isLeader ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button className="px-6 py-2.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      Cancelar
                    </button>
                  </Dialog.Close>
                  <button 
                    onClick={handleSaveUser}
                    disabled={savingLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>

              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
