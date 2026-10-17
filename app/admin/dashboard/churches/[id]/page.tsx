'use client';

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, setDoc, updateDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { 
  Building2, 
  Plus, 
  Loader2, 
  Save, 
  Users, 
  Settings2, 
  Trash2, 
  Crown,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Layers,
  Sparkles,
  Music,
  Video,
  FileText,
  UserCheck,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChurchScalesCalendarWidget } from '@/components/ChurchScalesCalendarWidget';

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

interface MemberWithDept extends Member {
  deptId: string;
  deptName: string;
  deptType: string;
  userDetails?: any;
  displayName: string;
  displayEmail: string;
  isLeader: boolean;
  roleBadges: string[];
}

export default function AdminChurchDetails() {
  const params = useParams();
  const id = params?.id as string;
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

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [leadershipFilter, setLeadershipFilter] = useState<'all' | 'leaders' | 'members'>('all');
  const [sortBy, setSortBy] = useState<'leaders-first' | 'name-asc' | 'name-desc' | 'recent'>('leaders-first');
  const [viewMode, setViewMode] = useState<'grouped' | 'unified'>('grouped');

  useEffect(() => {
    if (id) {
      fetchChurchData();
      fetchAllUsers();
    }
  }, [id]);

  const getDeptRoleLabels = (deptId: string, member: any) => {
    const badges: string[] = [];
    const deptRoles = member.roles || [];

    if (deptId === 'worship') {
      if (deptRoles.includes("leader")) {
        badges.push("Líder");
      }
      
      const isVocal = member.vocalRange || (member.instruments && member.instruments.includes("Voz")) || member.instrument === "Voz";
      const hasInstruments = (member.instruments && member.instruments.filter((i: string) => i !== "Voz").length > 0) || (member.instrument && member.instrument !== "Voz");

      if (isVocal) {
        if (member.vocalRange) {
          badges.push(`Vocalista (${member.vocalRange})`);
        } else {
          badges.push("Vocalista");
        }
      }

      if (hasInstruments) {
        if (member.instruments && member.instruments.length > 0) {
          member.instruments.filter((i: string) => i !== "Voz").forEach((inst: string) => {
            badges.push(inst);
          });
        } else if (member.instrument) {
          badges.push(member.instrument);
        }
      }

      deptRoles.forEach((role: string) => {
        if (role === "leader") return;
        if (role === "instrumentist" || role === "instrumentista") {
          if (!hasInstruments) badges.push("Instrumentista");
        } else if (role === "vocalist" || role === "vocalista") {
          if (!isVocal) badges.push("Vocalista");
        } else if (role === "musician") {
          // already covered or standard
        } else {
          badges.push(role.charAt(0).toUpperCase() + role.slice(1));
        }
      });

      if (badges.length === 0) {
        badges.push("Integrante");
      }
    } else if (deptId === 'multimedia') {
      if (deptRoles.includes("leader") || deptRoles.includes("multimedia_leader")) {
        badges.push("Líder");
      }

      deptRoles.forEach((role: string) => {
        if (role === "leader" || role === "multimedia_leader") return;
        
        if (role === "audio_operator" || role === "audio" || role === "sound") {
          badges.push("Operador de Áudio");
        } else if (role === "pc_operator" || role === "projection" || role === "slides") {
          badges.push("Projeção");
        } else if (role === "social_media_operator" || role === "social_media_manager") {
          badges.push("Redes Sociais");
        } else if (role === "camera_operator" || role === "camera" || role === "video") {
          badges.push("Câmera / Vídeo");
        } else if (role === "photography_operator" || role === "photography") {
          badges.push("Fotografia");
        } else if (role === "lights" || role === "illumination") {
          badges.push("Iluminação");
        } else {
          badges.push(role.charAt(0).toUpperCase() + role.slice(1));
        }
      });

      if (badges.length === 0) {
        badges.push("Integrante");
      }
    } else if (deptId === 'secretariat') {
      if (deptRoles.includes("leader") || deptRoles.includes("admin") || deptRoles.includes("secretariat_leader")) {
        badges.push("Secretário");
      }

      deptRoles.forEach((role: string) => {
        if (role === "leader" || role === "admin" || role === "secretariat_leader") return;
        badges.push(role.charAt(0).toUpperCase() + role.slice(1));
      });

      if (badges.length === 0) {
        badges.push("Integrante");
      }
    } else {
      deptRoles.forEach((role: string) => {
        badges.push(role.charAt(0).toUpperCase() + role.slice(1));
      });
      if (badges.length === 0) {
        badges.push("Integrante");
      }
    }

    return badges;
  };

  async function fetchChurchData() {
    if (!id) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'churches', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setChurchName(snap.data().name);
      }

      // Fetch departments
      const deptsRef = collection(db, 'churches', id, 'departments');
      const deptsSnap = await getDocs(deptsRef);
      let depts = deptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department));

      // Ensure default departments are always shown
      const defaultDeptsList = [
        { id: 'worship', name: 'Ministério de Louvor', type: 'worship' },
        { id: 'multimedia', name: 'Ministério de Multimídia', type: 'multimedia' },
        { id: 'secretariat', name: 'Secretaria', type: 'secretariat' }
      ];
      defaultDeptsList.forEach(defDept => {
        if (!depts.some(d => d.id === defDept.id)) {
          depts.push(defDept);
        }
      });

      setDepartments(depts);

      // Query all users from users collection belonging to this church
      const usersQ = query(collection(db, 'users'), where('churchId', '==', id));
      const usersSnap = await getDocs(usersQ);
      const churchUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch members for each department
      const membersMap: Record<string, Member[]> = {};
      for (const dept of depts) {
        const deptId = dept.id;
        const tempDeptMembers = new Map<string, Member>();

        // 1. Fetch from subcollection /churches/{id}/departments/{deptId}/members
        try {
          const membersRef = collection(db, 'churches', id, 'departments', deptId, 'members');
          const membersSnap = await getDocs(membersRef);
          membersSnap.docs.forEach(d => {
            const data = d.data();
            const rolesArray = data.roles || [];
            tempDeptMembers.set(d.id, {
              userId: d.id,
              roles: rolesArray,
              joinedAt: data.joinedAt || new Date().toISOString()
            });
          });
        } catch (err) {
          console.error(`Error loading members subcollection for ${deptId}:`, err);
        }

        // 2. Scan all churchUsers to see if they have roles for this department in their user doc
        churchUsers.forEach((u: any) => {
          const userDeptRoles = u.roles?.[deptId] || [];
          if (userDeptRoles.length > 0 || tempDeptMembers.has(u.id)) {
            const existing = tempDeptMembers.get(u.id);
            const finalRoles = Array.from(new Set([
              ...(existing?.roles || []),
              ...userDeptRoles
            ]));

            if (finalRoles.length > 0) {
              tempDeptMembers.set(u.id, {
                userId: u.id,
                roles: finalRoles,
                joinedAt: existing?.joinedAt || u.createdAt || new Date().toISOString(),
                name: u.name,
                email: u.email
              });
            }
          }
        });

        membersMap[deptId] = Array.from(tempDeptMembers.values());
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

      const deptRef = doc(db, 'churches', id, 'departments', deptId);
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

      const memberRef = doc(db, 'churches', id, 'departments', addingMemberTo, 'members', user.id);
      
      await setDoc(memberRef, {
        userId: user.id,
        roles: rolesArray,
        joinedAt: new Date().toISOString()
      }, { merge: true });

      // Link the user to this church as well
      await updateDoc(doc(db, 'users', user.id), {
        churchId: id
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
    try {
      await deleteDoc(doc(db, 'churches', id, 'departments', deptId, 'members', userId));
      await fetchChurchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromoteToLeader = async (deptId: string, userId: string) => {
    try {
      const actorId = auth.currentUser?.uid || auth.currentUser?.email || 'super_admin';
      const memberRef = doc(db, 'churches', id, 'departments', deptId, 'members', userId);
      const memberSnap = await getDoc(memberRef);
      
      let currentRoles: string[] = [];
      let joinedAt = new Date().toISOString();
      if (memberSnap.exists()) {
        const d = memberSnap.data();
        currentRoles = d.roles || [];
        joinedAt = d.joinedAt || d.createdAt || d.joinedAt || joinedAt;
      }
      
      const isCurrentlyLeader = currentRoles.includes('leader');
      let updatedRoles: string[];
      if (isCurrentlyLeader) {
        updatedRoles = currentRoles.filter(r => r !== 'leader');
      } else {
        updatedRoles = Array.from(new Set([...currentRoles, 'leader']));
      }
      
      await setDoc(memberRef, {
        userId,
        roles: updatedRoles,
        joinedAt,
        updatedAt: new Date().toISOString(),
        updatedBy: actorId
      }, { merge: true });

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        const uRolesObj = uData.roles || {};
        const uDeptRoles = uRolesObj[deptId] || [];
        
        let uUpdatedDeptRoles: string[];
        if (isCurrentlyLeader) {
          uUpdatedDeptRoles = uDeptRoles.filter((r: string) => r !== 'leader');
        } else {
          uUpdatedDeptRoles = Array.from(new Set([...uDeptRoles, 'leader']));
        }
        
        await updateDoc(userRef, {
          [`roles.${deptId}`]: uUpdatedDeptRoles,
          updatedAt: new Date().toISOString(),
          updatedBy: actorId
        });
      }

      await fetchChurchData();
    } catch (err) {
      console.error('Error toggling member leader role:', err);
    }
  };

  // Flatten all members with full department context
  const allMembersFlattened = useMemo(() => {
    const list: MemberWithDept[] = [];
    departments.forEach(dept => {
      const deptMembers = membersContent[dept.id] || [];
      deptMembers.forEach(m => {
        const u = allUsers.find(user => user.id === m.userId);
        const isLeader = Boolean(
          m.roles?.includes('leader') ||
          m.roles?.includes('multimedia_leader') ||
          m.roles?.includes('secretariat_leader') ||
          m.roles?.includes('admin') ||
          u?.roles?.leader ||
          u?.isLeader
        );
        const badges = getDeptRoleLabels(dept.id, { ...u, roles: m.roles });
        list.push({
          ...m,
          deptId: dept.id,
          deptName: dept.name,
          deptType: dept.type,
          userDetails: u,
          displayName: m.name || u?.name || 'Desconhecido',
          displayEmail: m.email || u?.email || m.userId,
          isLeader,
          roleBadges: badges
        });
      });
    });
    return list;
  }, [departments, membersContent, allUsers]);

  // Overall statistics for counters
  const stats = useMemo(() => {
    const total = allMembersFlattened.length;
    const leaders = allMembersFlattened.filter(m => m.isLeader).length;
    const membersOnly = total - leaders;

    const perDept: Record<string, { total: number; leaders: number }> = {};
    departments.forEach(dept => {
      const deptList = allMembersFlattened.filter(m => m.deptId === dept.id);
      perDept[dept.id] = {
        total: deptList.length,
        leaders: deptList.filter(m => m.isLeader).length
      };
    });

    return { total, leaders, membersOnly, perDept };
  }, [allMembersFlattened, departments]);

  // Filtered and sorted members
  const filteredMembers = useMemo(() => {
    return allMembersFlattened
      .filter(item => {
        // Department filter
        if (deptFilter !== 'all' && item.deptId !== deptFilter) {
          return false;
        }
        // Leadership filter
        if (leadershipFilter === 'leaders' && !item.isLeader) {
          return false;
        }
        if (leadershipFilter === 'members' && item.isLeader) {
          return false;
        }
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchName = item.displayName.toLowerCase().includes(q);
          const matchEmail = item.displayEmail.toLowerCase().includes(q);
          const matchDept = item.deptName.toLowerCase().includes(q);
          const matchBadge = item.roleBadges.some(b => b.toLowerCase().includes(q));
          if (!matchName && !matchEmail && !matchDept && !matchBadge) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'leaders-first') {
          if (a.isLeader && !b.isLeader) return -1;
          if (!a.isLeader && b.isLeader) return 1;
          return a.displayName.localeCompare(b.displayName);
        }
        if (sortBy === 'name-asc') {
          return a.displayName.localeCompare(b.displayName);
        }
        if (sortBy === 'name-desc') {
          return b.displayName.localeCompare(a.displayName);
        }
        if (sortBy === 'recent') {
          return new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime();
        }
        return 0;
      });
  }, [allMembersFlattened, deptFilter, leadershipFilter, searchTerm, sortBy]);

  const hasActiveFilters = searchTerm.trim() !== '' || deptFilter !== 'all' || leadershipFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setDeptFilter('all');
    setLeadershipFilter('all');
    setSortBy('leaders-first');
  };

  const getDeptIcon = (type: string) => {
    switch (type) {
      case 'worship':
        return <Music className="w-4 h-4 text-purple-500" />;
      case 'multimedia':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'secretariat':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      default:
        return <Users className="w-4 h-4 text-slate-500" />;
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
    <div className="admin-church-details-container max-w-7xl mx-auto pb-20 space-y-10">
      <div>
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
          Gerenciamento de departamentos, integrantes e escalas ministeriais.
        </p>
      </div>

      {/* WIDGET DEDICADO: CALENDÁRIO DE ESCALAS DA IGREJA */}
      <section>
        <ChurchScalesCalendarWidget
          churchId={id}
          churchName={churchName}
          allUsersList={allUsers}
        />
      </section>

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

        {/* Painel e Lista de Integrantes com Sistema de Filtros */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Principal de Filtros e Busca */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Integrantes & Lideranças
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Gerencie, filtre e promova membros em todos os ministérios
                </p>
              </div>

              {/* Modo de Visualização */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'grouped'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Agrupar por departamento"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Por Departamento
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('unified')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'unified'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Visão unificada de todos os membros"
                >
                  <Users className="w-3.5 h-3.5" />
                  Lista Geral ({allMembersFlattened.length})
                </button>
              </div>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, e-mail, instrumento, papel ou departamento..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Linha de Filtros: Departamento, Liderança e Ordenação */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              {/* Filtro por Departamento */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-blue-600" />
                  Departamento
                </label>
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="all">Todos os Departamentos ({stats.total})</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({stats.perDept[d.id]?.total || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Papel de Liderança */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-500" />
                  Papel de Liderança
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setLeadershipFilter('all')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-center ${
                      leadershipFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadershipFilter('leaders')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
                      leadershipFilter === 'leaders'
                        ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                    }`}
                    title="Apenas integrantes com papel de líder"
                  >
                    <Crown className="w-3 h-3 fill-amber-500 text-amber-500" />
                    Líderes ({stats.leaders})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadershipFilter('members')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-center ${
                      leadershipFilter === 'members'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Apenas integrantes regulares"
                  >
                    Membros ({stats.membersOnly})
                  </button>
                </div>
              </div>

              {/* Ordenação */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  Ordenar por
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="leaders-first">⭐ Líderes primeiro</option>
                  <option value="name-asc">Nome (A-Z)</option>
                  <option value="name-desc">Nome (Z-A)</option>
                  <option value="recent">Mais recentes</option>
                </select>
              </div>
            </div>

            {/* Indicador de Filtros Ativos & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 font-medium">
                  Resultados: <strong className="text-slate-800 dark:text-slate-200">{filteredMembers.length}</strong> integrante{filteredMembers.length !== 1 ? 's' : ''}
                  {filteredMembers.length > 0 && (
                    <span className="text-slate-400 ml-1">
                      ({filteredMembers.filter(m => m.isLeader).length} com liderança)
                    </span>
                  )}
                </span>

                {hasActiveFilters && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    {searchTerm.trim() && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md font-medium">
                        Busca: &ldquo;{searchTerm}&rdquo;
                        <button type="button" onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {deptFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-md font-medium">
                        Dept: {departments.find(d => d.id === deptFilter)?.name || deptFilter}
                        <button type="button" onClick={() => setDeptFilter('all')} className="hover:text-indigo-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {leadershipFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md font-medium">
                        {leadershipFilter === 'leaders' ? '⭐ Apenas Líderes' : '👥 Apenas Membros'}
                        <button type="button" onClick={() => setLeadershipFilter('all')} className="hover:text-amber-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* VISÃO UNIFICADA / LISTA GERAL */}
          {viewMode === 'unified' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                      Todos os Integrantes da Igreja
                    </h3>
                    <p className="text-xs text-slate-500">
                      {filteredMembers.length} de {stats.total} integrantes correspondentes
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {filteredMembers.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">Nenhum integrante encontrado</h4>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                      Não há integrantes que correspondam aos filtros de busca, departamento ou liderança selecionados.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Redefinir Filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMembers.map(member => (
                      <div
                        key={`${member.deptId}-${member.userId}`}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border rounded-xl transition-colors gap-3 ${
                          member.isLeader
                            ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/10'
                            : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 relative ${
                            member.isLeader
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {member.displayName.substring(0, 2).toUpperCase()}
                            {member.isLeader && (
                              <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500 absolute -top-1 -right-1" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                {member.displayName}
                              </p>
                              {member.isLeader && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] rounded-md font-bold uppercase tracking-wider">
                                  <Crown className="w-3 h-3 fill-amber-500" /> Líder
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeptFilter(member.deptId)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] rounded-md font-medium cursor-pointer transition-colors"
                                title="Filtrar por este departamento"
                              >
                                {getDeptIcon(member.deptType)}
                                {member.deptName}
                              </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {member.displayEmail}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {member.roleBadges.map((label, index) => (
                                <span
                                  key={`${label}-${index}`}
                                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] rounded-md uppercase font-bold tracking-wider"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handlePromoteToLeader(member.deptId, member.userId)}
                            className={`p-2 rounded-lg transition-colors ${
                              member.roles?.includes('leader')
                                ? 'text-amber-500 hover:bg-amber-500/10'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}
                            title={member.roles?.includes('leader') ? 'Remover Liderança' : 'Promover a Líder'}
                          >
                            <Crown className={`w-4 h-4 ${member.roles?.includes('leader') ? 'fill-amber-500 text-amber-500' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.deptId, member.userId)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Remover deste departamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* VISÃO AGRUPADA POR DEPARTAMENTO */
            departments.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum departamento cadastrado</h3>
                <p className="text-slate-500 mt-2">Crie o ministério de louvor ou secretaria ao lado.</p>
              </div>
            ) : (
              departments
                .filter(dept => deptFilter === 'all' || dept.id === deptFilter)
                .map(dept => {
                  const deptFilteredMembers = filteredMembers.filter(m => m.deptId === dept.id);
                  const totalInDept = (membersContent[dept.id] || []).length;
                  const leadersInDept = (membersContent[dept.id] || []).filter(m => {
                    const u = allUsers.find(user => user.id === m.userId);
                    return Boolean(
                      m.roles?.includes('leader') ||
                      m.roles?.includes('multimedia_leader') ||
                      m.roles?.includes('secretariat_leader') ||
                      m.roles?.includes('admin') ||
                      u?.roles?.leader ||
                      u?.isLeader
                    );
                  }).length;

                  return (
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
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{dept.name}</h3>
                              {getDeptIcon(dept.type)}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-sm font-medium text-slate-500">{deptTypesMap[dept.type] || dept.type}</p>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-xs font-semibold text-slate-500">
                                {totalInDept} integrante{totalInDept !== 1 ? 's' : ''} ({leadersInDept} líder{leadersInDept !== 1 ? 'es' : ''})
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditDept(dept)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar Departamento"
                        >
                          <Settings2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300">Integrantes</h4>
                            {hasActiveFilters && (
                              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                                {deptFilteredMembers.length} filtrado{deptFilteredMembers.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
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
                          {deptFilteredMembers.length === 0 ? (
                            hasActiveFilters && totalInDept > 0 ? (
                              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center">
                                <p className="text-xs text-slate-500">
                                  Nenhum integrante deste departamento corresponde aos filtros aplicados.
                                </p>
                                <button
                                  type="button"
                                  onClick={resetFilters}
                                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                                >
                                  Limpar filtros
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 italic">Nenhum integrante associado.</p>
                            )
                          ) : (
                            deptFilteredMembers.map(member => {
                              return (
                                <div
                                  key={member.userId}
                                  className={`flex justify-between items-center p-3 border rounded-xl transition-colors ${
                                    member.isLeader
                                      ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-900/10'
                                      : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                        {member.displayName}
                                      </p>
                                      <span className="text-slate-400 font-normal text-xs">({member.displayEmail})</span>
                                      {member.isLeader && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] rounded-md font-bold uppercase tracking-wider">
                                          <Crown className="w-3 h-3 fill-amber-500" /> Líder
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                      {member.roleBadges.map((label, index) => (
                                        <span
                                          key={`${label}-${index}`}
                                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md uppercase font-bold tracking-wider"
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handlePromoteToLeader(dept.id, member.userId)}
                                      className={`p-2 rounded-lg transition-colors ${
                                        member.roles?.includes('leader')
                                          ? 'text-amber-500 hover:bg-amber-500/10'
                                          : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                      }`}
                                      title={member.roles?.includes('leader') ? 'Remover Liderança' : 'Promover a Líder'}
                                    >
                                      <Crown className={`w-4 h-4 ${member.roles?.includes('leader') ? 'fill-amber-500 text-amber-500' : ''}`} />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveMember(dept.id, member.userId)}
                                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      title="Remover"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )
          )}
        </div>
      </div>
    </div>
  );
}
