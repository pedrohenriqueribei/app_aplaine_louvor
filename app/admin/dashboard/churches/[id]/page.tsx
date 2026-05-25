'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, setDoc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { use } from 'react';
import { Building2, Plus, Loader2, Save, Users, Settings2, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Department {
  id: string;
  name: string;
  acronym?: string;
  logo?: string;
  type: string;
}

interface Member {
  userId: string;
  roles: string[];
  joinedAt: string;
  // Denormalized details
  email?: string;
  name?: string;
}

export default function AdminChurchDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [churchName, setChurchName] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  
  // Department form
  const [deptName, setDeptName] = useState('');
  const [deptAcronym, setDeptAcronym] = useState('');
  const [deptLogo, setDeptLogo] = useState('');
  const [deptType, setDeptType] = useState('worship');

  const [savingDept, setSavingDept] = useState(false);

  // Users to search
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Members
  const [membersContent, setMembersContent] = useState<Record<string, Member[]>>({});
  const [addingMemberTo, setAddingMemberTo] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRoles, setNewMemberRoles] = useState<string>('member');
  const [savingMember, setSavingMember] = useState(false);

  useEffect(() => {
    fetchChurchData();
    fetchAllUsers();
  }, [resolvedParams.id]);

  async function fetchChurchData() {
    setLoading(true);
    try {
      const docRef = doc(db, 'churches', resolvedParams.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setChurchName(snap.data().name);
      }

      // Fetch departments
      const deptsRef = collection(db, 'churches', resolvedParams.id, 'departments');
      const deptsSnap = await getDocs(deptsRef);
      const depts = deptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department));
      setDepartments(depts);

      // Fetch members for each department
      const membersMap: Record<string, Member[]> = {};
      for (const dept of depts) {
        const membersRef = collection(db, 'churches', resolvedParams.id, 'departments', dept.id, 'members');
        const membersSnap = await getDocs(membersRef);
        membersMap[dept.id] = membersSnap.docs.map(d => ({ userId: d.id, ...d.data() } as Member));
      }
      setMembersContent(membersMap);

    } catch (error) {
      console.error('Error fetching church:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllUsers() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error(error);
    }
  }

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDept(true);
    
    try {
      let deptId = editingDept?.id;
      if (!deptId) {
        deptId = deptType; // e.g. 'worship', 'multimedia', 'secretariat'
      }

      const deptRef = doc(db, 'churches', resolvedParams.id, 'departments', deptId);
      await setDoc(deptRef, {
        name: deptName,
        acronym: deptAcronym,
        logo: deptLogo,
        type: deptType
      }, { merge: true });

      setEditingDept(null);
      setDeptName('');
      setDeptAcronym('');
      setDeptLogo('');
      setDeptType('worship');
      await fetchChurchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDept(false);
    }
  };

  const handleEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name || '');
    setDeptAcronym(dept.acronym || '');
    setDeptLogo(dept.logo || '');
    setDeptType(dept.type || dept.id);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingMemberTo || !newMemberEmail) return;

    setSavingMember(true);
    try {
      // Find user uid by email
      const user = allUsers.find(u => u.email === newMemberEmail);
      if (!user) {
        alert('Usuário não encontrado com este e-mail. Ele precisa estar logado/cadastrado no sistema global primeiro.');
        setSavingMember(false);
        return;
      }

      const rolesArray = newMemberRoles.split(',').map(s => s.trim()).filter(Boolean);

      const memberRef = doc(db, 'churches', resolvedParams.id, 'departments', addingMemberTo, 'members', user.id);
      
      await setDoc(memberRef, {
        userId: user.id,
        roles: rolesArray,
        joinedAt: new Date().toISOString()
      }, { merge: true });

      // Link the user to this church as well
      await updateDoc(doc(db, 'users', user.id), {
        churchId: resolvedParams.id
      });

      setAddingMemberTo(null);
      setNewMemberEmail('');
      setNewMemberRoles('member');
      await fetchChurchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async (deptId: string, userId: string) => {
    if (!confirm('Deseja realmente remover este integrante?')) return;
    try {
      await deleteDoc(doc(db, 'churches', resolvedParams.id, 'departments', deptId, 'members', userId));
      await fetchChurchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const deptTypesMap: Record<string, string> = {
    worship: 'Ministério de Louvor',
    multimedia: 'Ministério de Multimídia',
    secretariat: 'Secretaria'
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-10">
        <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
          <Link href="/admin/dashboard" className="hover:text-blue-600">Admin</Link>
          <span>/</span>
          <span>Igrejas</span>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">{churchName}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-4">
          <Building2 className="w-8 h-8 text-blue-600" />
          {churchName}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Gerenciamento de departamentos e integrantes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário de Departamento */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sticky top-24">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-600" />
              {editingDept ? 'Editar Departamento' : 'Novo Departamento'}
            </h2>

            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tipo de Ministério</label>
                <select
                  value={deptType}
                  onChange={e => setDeptType(e.target.value)}
                  disabled={!!editingDept}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="worship">Ministério de Louvor</option>
                  <option value="multimedia">Ministério de Multimídia</option>
                  <option value="secretariat">Secretaria</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome (Personalizado)</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={e => setDeptName(e.target.value)}
                  placeholder="Ex: Connect Music"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Sigla</label>
                <input
                  type="text"
                  value={deptAcronym}
                  onChange={e => setDeptAcronym(e.target.value)}
                  placeholder="Ex: CM"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Logo URL (Opcional)</label>
                <input
                  type="url"
                  value={deptLogo}
                  onChange={e => setDeptLogo(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                {editingDept && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDept(null);
                      setDeptName('');
                      setDeptAcronym('');
                      setDeptLogo('');
                      setDeptType('worship');
                    }}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingDept}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex justify-center items-center gap-2"
                >
                  {savingDept ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Lista de Departamentos e Membros */}
        <div className="lg:col-span-2 space-y-6">
          {departments.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum departamento cadastrado</h3>
              <p className="text-slate-500 mt-2">Crie o ministério de louvor ou secretaria ao lado.</p>
            </div>
          ) : (
            departments.map(dept => (
              <div key={dept.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-4">
                    {dept.logo ? (
                      <img src={dept.logo} alt={dept.name} className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-white" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-black text-xl">
                        {dept.acronym || dept.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{dept.name}</h3>
                      <p className="text-sm font-medium text-slate-500">{deptTypesMap[dept.type] || dept.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditDept(dept)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Settings2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">Integrantes</h4>
                    <button
                      onClick={() => setAddingMemberTo(dept.id)}
                      className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Integrante
                    </button>
                  </div>

                  {addingMemberTo === dept.id && (
                    <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-6">
                          <input
                            type="email"
                            required
                            placeholder="E-mail do usuário cadastrado"
                            value={newMemberEmail}
                            onChange={e => setNewMemberEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            required
                            placeholder="Papéis (ex: líder, musico)"
                            value={newMemberRoles}
                            onChange={e => setNewMemberRoles(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setAddingMemberTo(null)}
                            className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold"
                          >
                            X
                          </button>
                          <button
                            type="submit"
                            disabled={savingMember}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex justify-center items-center"
                          >
                            {savingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(membersContent[dept.id] || []).length === 0 ? (
                      <p className="text-sm text-slate-500 italic">Nenhum integrante associado.</p>
                    ) : (
                      (membersContent[dept.id] || []).map(member => {
                        const userDetails = allUsers.find(u => u.id === member.userId);
                        return (
                          <div key={member.userId} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                {userDetails?.name || 'Desconhecido'} <span className="text-slate-400 font-normal">({userDetails?.email || member.userId})</span>
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                {member.roles.map(r => (
                                  <span key={r} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md uppercase font-bold tracking-wider">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveMember(dept.id, member.userId)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
