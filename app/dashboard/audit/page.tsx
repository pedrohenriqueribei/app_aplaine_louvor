'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  PlusCircle,
  FileEdit,
  Trash2,
  Calendar,
  User,
  Clock,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  X,
  Copy,
  Check,
  Sparkles,
  SlidersHorizontal,
  Building2,
  ExternalLink,
  Laptop,
  Lock,
  ShieldAlert,
  Globe,
  MapPin,
  Wifi,
  Server,
  Shield,
} from 'lucide-react';
import { BallerinaIcon } from '@/components/BallerinaIcon';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { AuditLogEntry, AuditAction, AuditEntityType } from '@/lib/audit-types';
import { recordAuditLog } from '@/lib/audit';
import {
  evaluateUserAuditAccess,
  DEFAULT_AUDIT_SECURITY_CONFIG,
  UserAuditEvaluation,
} from '@/lib/audit-security';
import { AuditSecuritySettingsPanel } from '@/components/AuditSecuritySettingsPanel';
import { ScheduleConflictAuditWidget } from '@/components/ScheduleConflictAuditWidget';
import { cn } from '@/lib/utils';
import { formatGeoSummary } from '@/lib/geo-ip';

export default function AuditLogsPage() {
  const { userData, isSuperAdmin, user } = useAuth();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'CREATE' | 'UPDATE' | 'DELETE'>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [securityFilter, setSecurityFilter] = useState<'all' | 'suspicious' | 'leadership'>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [userEvaluation, setUserEvaluation] = useState<UserAuditEvaluation | null>(null);

  // Active church ID
  const effectiveChurchId = userData?.churchId || '';

  // Check RBAC permissions based on Super Admin configured policy
  useEffect(() => {
    async function checkPermissions() {
      if (isSuperAdmin) {
        setUserEvaluation({
          canAccess: true,
          isSuperAdmin: true,
          scope: 'all',
          forcedDepartmentId: null,
          allowedDepartmentAliases: [],
          roleTitle: 'Super Administrador',
        });
        return;
      }

      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const res = await fetch('/api/admin/audit-permissions', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.userEvaluation) {
              setUserEvaluation(data.userEvaluation);
              if (data.userEvaluation.scope === 'department' && data.userEvaluation.forcedDepartmentId) {
                setSelectedDepartment(data.userEvaluation.forcedDepartmentId);
              }
              return;
            }
          }
        }
      } catch (err) {
        console.warn('API permissions check fallback to local eval:', err);
      }

      // Fallback local evaluation using userData
      const evalResult = evaluateUserAuditAccess({
        uid: user?.uid,
        email: user?.email || undefined,
        role: userData?.role,
        roles: userData?.roles,
        isSuperAdmin,
        churchId: userData?.churchId,
      });
      setUserEvaluation(evalResult);
      if (evalResult.scope === 'department' && evalResult.forcedDepartmentId) {
        setSelectedDepartment(evalResult.forcedDepartmentId);
      }
    }

    checkPermissions();
  }, [userData, isSuperAdmin, user]);

  // Fetch or listen to audit logs
  const loadLogs = useCallback(async () => {
    if (!effectiveChurchId && !isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      let q;
      if (isSuperAdmin && !effectiveChurchId) {
        q = query(
          collection(db, 'audit_logs'),
          orderBy('created_at', 'desc'),
          limit(200)
        );
      } else {
        q = query(
          collection(db, 'audit_logs'),
          where('church_id', '==', effectiveChurchId),
          orderBy('created_at', 'desc'),
          limit(200)
        );
      }

      const snap = await getDocs(q);
      let items: AuditLogEntry[] = [];
      snap.forEach((doc) => {
        items.push(doc.data() as AuditLogEntry);
      });

      // Strict departmental restriction filtering at query time:
      // If user is Dance Leader, filter strictly to dance department & dance entities
      if (userEvaluation?.scope === 'department' && userEvaluation?.forcedDepartmentId) {
        const forced = userEvaluation.forcedDepartmentId.toLowerCase();
        const allowedAliases = new Set(
          (userEvaluation.allowedDepartmentAliases || [forced]).map((d) => d.toLowerCase())
        );
        if (forced === 'danca') {
          allowedAliases.add('dance');
          allowedAliases.add('ministério de dança');
        }

        items = items.filter((l) => {
          const dept = (l.department_id || '').toLowerCase();
          const ent = (l.entity_type || '').toLowerCase();
          if (dept && allowedAliases.has(dept)) return true;
          if (forced === 'danca' && ['dancegroup', 'choreography', 'dancerehearsal'].includes(ent)) {
            if (dept && !allowedAliases.has(dept)) return false;
            return true;
          }
          if (forced === 'louvor' && ['song', 'band', 'playlist'].includes(ent)) {
            if (dept && !allowedAliases.has(dept)) return false;
            return true;
          }
          if (forced === 'multimidia' && ['broadcast'].includes(ent)) {
            if (dept && !allowedAliases.has(dept)) return false;
            return true;
          }
          return false;
        });
      }

      setLogs(items);
    } catch (err: any) {
      console.warn('Real-time query fallback to simple collection:', err);
      try {
        const simpleQ = isSuperAdmin && !effectiveChurchId
          ? query(collection(db, 'audit_logs'), limit(150))
          : query(collection(db, 'audit_logs'), where('church_id', '==', effectiveChurchId), limit(150));
        const snap = await getDocs(simpleQ);
        let fallbackItems: AuditLogEntry[] = [];
        snap.forEach((doc) => {
          fallbackItems.push(doc.data() as AuditLogEntry);
        });

        if (userEvaluation?.scope === 'department' && userEvaluation?.forcedDepartmentId) {
          const forced = userEvaluation.forcedDepartmentId.toLowerCase();
          fallbackItems = fallbackItems.filter((l) => {
            const dept = (l.department_id || '').toLowerCase();
            const ent = (l.entity_type || '').toLowerCase();
            if (forced === 'danca') {
              return (
                dept === 'danca' ||
                dept === 'dance' ||
                ['dancegroup', 'choreography', 'dancerehearsal'].includes(ent)
              );
            }
            return dept === forced;
          });
        }

        fallbackItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } catch (innerErr: any) {
        console.warn('Direct Firestore audit read skipped, fetching via secure API:', innerErr?.message || innerErr);
        try {
          const token = await user?.getIdToken();
          if (token) {
            const apiRes = await fetch(`/api/audit?churchId=${effectiveChurchId || ''}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (apiRes.ok) {
              const data = await apiRes.json();
              if (Array.isArray(data.logs)) {
                setLogs(data.logs);
              }
            }
          }
        } catch (apiErr) {
          console.warn('API audit fetch fallback completed:', apiErr);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveChurchId, isSuperAdmin, userEvaluation, user]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Real-time listener for live updates
  useEffect(() => {
    if (!effectiveChurchId && !isSuperAdmin) return;

    try {
      const q = isSuperAdmin && !effectiveChurchId
        ? query(collection(db, 'audit_logs'), limit(100))
        : query(collection(db, 'audit_logs'), where('church_id', '==', effectiveChurchId), limit(100));

      const unsub = onSnapshot(q, (snapshot) => {
        let liveItems: AuditLogEntry[] = [];
        snapshot.forEach((doc) => {
          liveItems.push(doc.data() as AuditLogEntry);
        });

        if (userEvaluation?.scope === 'department' && userEvaluation?.forcedDepartmentId) {
          const forced = userEvaluation.forcedDepartmentId.toLowerCase();
          liveItems = liveItems.filter((l) => {
            const dept = (l.department_id || '').toLowerCase();
            const ent = (l.entity_type || '').toLowerCase();
            if (forced === 'danca') {
              return (
                dept === 'danca' ||
                dept === 'dance' ||
                ['dancegroup', 'choreography', 'dancerehearsal'].includes(ent)
              );
            }
            return dept === forced;
          });
        }

        liveItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setLogs(liveItems);
        setLoading(false);
      }, (err) => {
        console.warn('Snapshot listener skipped, using periodic load:', err);
      });

      return () => unsub();
    } catch {
      // Ignored
    }
  }, [effectiveChurchId, isSuperAdmin, userEvaluation]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = logs.length;
    const creates = logs.filter((l) => l.action === 'CREATE').length;
    const updates = logs.filter((l) => l.action === 'UPDATE').length;
    const deletes = logs.filter((l) => l.action === 'DELETE').length;
    const actors = new Set(logs.map((l) => l.actor_user_id)).size;
    const suspicious = logs.filter(
      (l) =>
        l.security_assessment?.flagged ||
        l.security_assessment?.risk_level === 'high' ||
        l.security_assessment?.risk_level === 'medium'
    ).length;
    const leadership = logs.filter(
      (l) =>
        l.security_assessment?.is_leadership_account ||
        (l.actor_role && ['líder', 'lider', 'super_admin', 'pastor', 'ministro'].includes(l.actor_role.toLowerCase())) ||
        l.actor_email === 'pedrohenriqueribei@gmail.com'
    ).length;

    return { total, creates, updates, deletes, actors, suspicious, leadership };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Security / Leadership filter
    if (securityFilter === 'suspicious') {
      result = result.filter(
        (l) =>
          l.security_assessment?.flagged ||
          l.security_assessment?.risk_level === 'high' ||
          l.security_assessment?.risk_level === 'medium'
      );
    } else if (securityFilter === 'leadership') {
      result = result.filter(
        (l) =>
          l.security_assessment?.is_leadership_account ||
          (l.actor_role && ['líder', 'lider', 'super_admin', 'pastor', 'ministro'].includes(l.actor_role.toLowerCase())) ||
          l.actor_email === 'pedrohenriqueribei@gmail.com'
      );
    }

    // Action filter
    if (activeTab !== 'all') {
      result = result.filter((l) => l.action === activeTab);
    }

    // Entity filter
    if (selectedEntityType !== 'all') {
      result = result.filter((l) => l.entity_type === selectedEntityType);
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      result = result.filter((l) => l.department_id === selectedDepartment);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date().getTime();
      result = result.filter((l) => {
        const logTime = new Date(l.created_at).getTime();
        const diffHours = (now - logTime) / (1000 * 60 * 60);
        if (dateFilter === 'today') return diffHours <= 24;
        if (dateFilter === '7days') return diffHours <= 24 * 7;
        if (dateFilter === '30days') return diffHours <= 24 * 30;
        return true;
      });
    }

    // Text search (including IP address, city, country, ISP, and actor)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((l) => {
        return (
          l.entity_label?.toLowerCase().includes(q) ||
          l.actor_name?.toLowerCase().includes(q) ||
          l.actor_email?.toLowerCase().includes(q) ||
          l.actor_role?.toLowerCase().includes(q) ||
          l.entity_id?.toLowerCase().includes(q) ||
          l.entity_type?.toLowerCase().includes(q) ||
          l.id?.toLowerCase().includes(q) ||
          l.ip_address?.toLowerCase().includes(q) ||
          l.geo_summary?.toLowerCase().includes(q) ||
          l.location?.city?.toLowerCase().includes(q) ||
          l.location?.region?.toLowerCase().includes(q) ||
          l.location?.country?.toLowerCase().includes(q) ||
          l.location?.isp?.toLowerCase().includes(q) ||
          l.changed_fields?.some((f) => f.toLowerCase().includes(q))
        );
      });
    }

    // Strict Departmental Isolation Check:
    // Guarantees that a Dance Leader only ever sees Dance Ministry records.
    if (userEvaluation?.scope === 'department' && userEvaluation?.forcedDepartmentId) {
      const forced = userEvaluation.forcedDepartmentId.toLowerCase();
      result = result.filter((l) => {
        const dept = (l.department_id || '').toLowerCase();
        const ent = (l.entity_type || '').toLowerCase();
        if (forced === 'danca') {
          return (
            dept === 'danca' ||
            dept === 'dance' ||
            ['dancegroup', 'choreography', 'dancerehearsal'].includes(ent)
          );
        }
        return dept === forced;
      });
    }

    return result;
  }, [logs, securityFilter, activeTab, selectedEntityType, selectedDepartment, dateFilter, searchQuery, userEvaluation]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'ID',
      'Data/Hora',
      'Operação',
      'Entidade',
      'ID do Registro',
      'Rótulo',
      'Autor (Nome)',
      'Autor (Email)',
      'Autor (Papel)',
      'Endereço IP',
      'Geolocalização (Estimativa)',
      'Provedor / Conexão',
      'Alerta de Segurança (Liderança)',
      'Campos Modificados',
      'Igreja',
      'Departamento',
      'Origem'
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.created_at).toLocaleString('pt-BR')}"`,
      `"${l.action}"`,
      `"${l.entity_type}"`,
      `"${l.entity_id}"`,
      `"${(l.entity_label || '').replace(/"/g, '""')}"`,
      `"${(l.actor_name || '').replace(/"/g, '""')}"`,
      `"${l.actor_email || ''}"`,
      `"${l.actor_role || ''}"`,
      `"${l.ip_address || ''}"`,
      `"${(l.geo_summary || formatGeoSummary(l.location)).replace(/"/g, '""')}"`,
      `"${(l.location?.isp || '').replace(/"/g, '""')}"`,
      `"${l.security_assessment?.flagged ? `SUSPEITO: ${(l.security_assessment.suspicious_flags || []).join('; ')}` : (l.security_assessment?.is_leadership_account ? 'Liderança Regular' : 'Regular')}"`,
      `"${(l.changed_fields || []).join(', ')}"`,
      `"${l.church_id}"`,
      `"${l.department_id || ''}"`,
      `"${l.source}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `applane_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJson = () => {
    if (filteredLogs.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `applane_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Copy JSON of selected log
  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Trigger simulated audit actions for verification & test
  const handleSimulateAction = async (type: 'CREATE' | 'UPDATE' | 'DELETE' | 'DANCE' | 'LEADERSHIP_REGULAR' | 'SUSPICIOUS_LEADERSHIP') => {
    if (!effectiveChurchId && !userData?.churchId) {
      alert('Igreja não identificada para este usuário.');
      return;
    }
    setSimulating(true);
    try {
      const now = new Date();
      const testId = `teste_${Date.now()}`;
      const church = effectiveChurchId || userData?.churchId || 'church_demo';

      if (type === 'DANCE') {
        await recordAuditLog({
          action: 'CREATE',
          entityType: 'DanceGroup',
          entityId: `dance_${Date.now()}`,
          entityLabel: 'Grupo de Dança Ágape - Coreografia Adoração',
          newData: {
            name: 'Grupo de Dança Ágape',
            department: 'danca',
            choreography: 'Vitorioso És',
            dancersCount: 6,
            rehearsalDay: 'Sábado 15h00',
            status: 'active',
            leaderName: userData?.name || 'Líder de Dança',
          },
          churchId: church,
          departmentId: 'danca',
          metadata: { simulated: true, ministry: 'danca' }
        });
      } else if (type === 'LEADERSHIP_REGULAR') {
        await recordAuditLog({
          action: 'UPDATE',
          entityType: 'Schedule',
          entityId: testId,
          entityLabel: 'Escala Oficial de Domingo - Vigília de Oração',
          oldData: {
            serviceName: 'Culto de Celebração',
            status: 'draft',
            ministerId: 'minister_old',
            notes: 'Aguardando definição dos hinos',
          },
          newData: {
            serviceName: 'Culto de Celebração & Santa Ceia',
            status: 'published',
            ministerId: user?.uid || 'minister_confirmed',
            notes: 'Repertório aprovado pela liderança',
          },
          actorOverride: {
            userId: user?.uid || 'leader_user',
            name: userData?.name || 'Pastor Presidente',
            email: user?.email || 'pastor@igreja.org',
            role: 'líder',
          },
          ipAddress: '177.136.241.10',
          location: {
            city: 'São Paulo',
            region: 'São Paulo',
            region_code: 'SP',
            country: 'Brasil',
            country_code: 'BR',
            timezone: 'America/Sao_Paulo',
            isp: 'Claro Telecomunicações Brasil',
            org: 'Claro S.A.',
            is_local: false,
            is_approximate: true,
          },
          geoSummary: 'São Paulo, SP - Brasil',
          securityAssessment: {
            is_leadership_account: true,
            risk_level: 'low',
            suspicious_flags: [],
            flagged: false,
            explanation: 'Acesso verificado para conta de liderança em ambiente regular.',
          },
          churchId: church,
          departmentId: 'louvor',
          metadata: { simulated: true, simulationType: 'leadership_regular' }
        });
      } else if (type === 'SUSPICIOUS_LEADERSHIP') {
        await recordAuditLog({
          action: 'UPDATE',
          entityType: 'Member',
          entityId: testId,
          entityLabel: 'Permissões Ministeriais e Contas de Líderes',
          oldData: {
            accountStatus: 'standard',
            role: 'membro',
            twoFactorEnabled: true,
          },
          newData: {
            accountStatus: 'elevated',
            role: 'administrador',
            twoFactorEnabled: false,
          },
          actorOverride: {
            userId: user?.uid || 'leader_user',
            name: userData?.name || 'Líder Administrativo',
            email: user?.email || 'lider@igreja.org',
            role: 'líder',
          },
          ipAddress: '198.51.100.24',
          location: {
            city: 'Miami',
            region: 'Flórida',
            region_code: 'FL',
            country: 'Estados Unidos',
            country_code: 'US',
            timezone: 'America/New_York',
            isp: 'DigitalOcean Cloud Datacenter / VPN',
            org: 'DigitalOcean LLC',
            is_local: false,
            is_approximate: true,
          },
          geoSummary: 'Miami, FL - Estados Unidos',
          securityAssessment: {
            is_leadership_account: true,
            risk_level: 'high',
            suspicious_flags: [
              'Acesso internacional detectado (Estados Unidos): fora do padrão habitual do Brasil.',
              'Provedor associado a Datacenter, Servidor em Nuvem ou VPN (DigitalOcean Cloud Datacenter).'
            ],
            flagged: true,
            explanation: 'Atenção Máxima: Ação de liderança executada a partir de servidor/datacenter no exterior. Verifique se o líder estava utilizando VPN ou se a conta foi comprometida.',
          },
          churchId: church,
          departmentId: 'secretaria',
          metadata: { simulated: true, simulationType: 'suspicious_leadership' }
        });
      } else if (type === 'CREATE') {
        await recordAuditLog({
          action: 'CREATE',
          entityType: 'Schedule',
          entityId: testId,
          entityLabel: `Escala Culto da Família - ${now.toLocaleDateString('pt-BR')}`,
          newData: {
            serviceName: 'Culto da Família',
            date: now.toISOString().slice(0, 10),
            ministry: 'louvor',
            membersCount: 4,
            status: 'draft',
            leaderName: userData?.name || 'Líder de Louvor'
          },
          churchId: church,
          departmentId: 'louvor',
          metadata: { simulated: true }
        });
      } else if (type === 'UPDATE') {
        await recordAuditLog({
          action: 'UPDATE',
          entityType: 'Member',
          entityId: testId,
          entityLabel: userData?.name || 'Membro Exemplo',
          oldData: {
            phone: '(11) 98888-0000',
            vocalRange: 'Tenor',
            status: 'active',
            instruments: ['Violão']
          },
          newData: {
            phone: '(11) 99999-1234',
            vocalRange: 'Barítono',
            status: 'active',
            instruments: ['Violão', 'Guitarra']
          },
          churchId: church,
          departmentId: 'louvor',
          metadata: { simulated: true }
        });
      } else if (type === 'DELETE') {
        await recordAuditLog({
          action: 'DELETE',
          entityType: 'Song',
          entityId: testId,
          entityLabel: 'Porque Ele Vive (Playback Antigo)',
          oldData: {
            title: 'Porque Ele Vive (Playback Antigo)',
            artist: 'Harpa Cristã',
            key: 'G',
            bpm: 72,
            archived: true
          },
          churchId: church,
          departmentId: 'louvor',
          metadata: { simulated: true }
        });
      }

      setShowSimulateModal(false);
      await loadLogs();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Helper for human-readable relative time
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffSecs = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (diffSecs < 60) return 'Agora mesmo';
      if (diffSecs < 3600) return `Há ${Math.floor(diffSecs / 60)} min`;
      if (diffSecs < 86400) return `Há ${Math.floor(diffSecs / 3600)} h`;
      const days = Math.floor(diffSecs / 86400);
      if (days === 1) return 'Ontem';
      if (days < 30) return `Há ${days} dias`;
      return date.toLocaleDateString('pt-BR');
    } catch {
      return isoString;
    }
  };

  // Entity label formatters & color maps
  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'CREATE':
        return {
          label: 'CRIAÇÃO',
          icon: PlusCircle,
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        };
      case 'UPDATE':
        return {
          label: 'ALTERAÇÃO',
          icon: FileEdit,
          className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
        };
      case 'DELETE':
        return {
          label: 'EXCLUSÃO',
          icon: Trash2,
          className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        };
      default:
        return {
          label: action,
          icon: ShieldCheck,
          className: 'bg-slate-50 text-slate-700 border-slate-200'
        };
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'Member':
        return '👤';
      case 'Schedule':
        return '📅';
      case 'WorshipService':
      case 'Service':
        return '⛪';
      case 'Song':
        return '🎵';
      case 'Department':
        return '🏛️';
      case 'Visitor':
        return '👋';
      case 'Appointment':
        return '📖';
      case 'Band':
        return '🎸';
      case 'DanceGroup':
      case 'Choreography':
        return '💃';
      case 'Broadcast':
        return '📢';
      case 'ScheduleConflictAlert':
      case 'ScaleConflict':
        return '⚠️';
      default:
        return '📄';
    }
  };

  if (!loading && userEvaluation && !userEvaluation.canAccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-8 shadow-xl text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-full border border-rose-200 dark:border-rose-800">
              Acesso Restrito por Segurança
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Permissão Insuficiente
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {userEvaluation.restrictionReason ||
                'O seu cargo atual não possui permissão concedida pelo Super Administrador para acessar os logs de auditoria.'}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-xs text-left border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span>Seu Cargo Detectado:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{userEvaluation.roleTitle}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Igreja Vinculada:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{effectiveChurchId || 'Não informada'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Política Aplicada:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Painel de Segurança do Super Admin</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Se você acredita que deveria ter acesso aos registros do seu ministério ou igreja, solicite a ativação do seu cargo ao Super Administrador no painel de configurações de segurança.
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Voltar
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Ir para o Painel Geral
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* 1. Header with Breadcrumbs & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
            <span>DASHBOARD</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-500 dark:text-slate-400">SEGURANÇA & CONFORMIDADE</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold">AUDITORIA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-2xl">
              <ShieldCheck className="w-7 h-7" />
            </span>
            Logs de Auditoria
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Rastreamento automatizado e imutável de todas as operações de criação, modificação e exclusão realizadas pelos usuários na igreja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Super Admin Access Control Panel Trigger */}
          {isSuperAdmin && (
            <button
              onClick={() => setShowSecurityModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl transition border border-amber-300 dark:border-amber-800 cursor-pointer shadow-xs"
              title="Super Admin: Definir quais cargos podem acessar os logs de auditoria"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Acesso por Cargo (Super Admin)</span>
            </button>
          )}

          <button
            onClick={() => setShowSimulateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition border border-blue-200 dark:border-blue-800 cursor-pointer"
            title="Simular um evento para testar o sistema de auditoria"
          >
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Simular Ação</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition border border-slate-200 dark:border-slate-700 disabled:opacity-50 cursor-pointer shadow-xs"
            title="Exportar registros filtrados em formato CSV"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition border border-slate-200 dark:border-slate-700 disabled:opacity-50 cursor-pointer shadow-xs"
            title="Exportar registros completos em formato JSON"
          >
            <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>JSON</span>
          </button>

          <button
            onClick={loadLogs}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition cursor-pointer shadow-xs shadow-blue-700/20 disabled:opacity-70"
            title="Atualizar lista de registros"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Department Isolation Banner for Ministry Leaders (e.g. Dance Leader) */}
      {userEvaluation?.scope === 'department' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-purple-50 via-pink-50 to-amber-50 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-amber-950/20 border border-purple-200/80 dark:border-purple-800/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-2xl shrink-0">
              {userEvaluation.forcedDepartmentId === 'danca' ? (
                <BallerinaIcon className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              ) : (
                <Lock className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Isolamento Departamental Ativo
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-200/80 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                  {userEvaluation.roleTitle}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                {userEvaluation.forcedDepartmentId === 'danca' ? (
                  <>
                    Você está autenticado como <strong>Líder de Dança</strong>. Por diretriz de segurança, seus privilégios de auditoria estão <strong>estritamente delimitados aos logs e eventos do Ministério de Dança</strong> da sua igreja.
                  </>
                ) : (
                  <>
                    Você está autenticado como <strong>{userEvaluation.roleTitle}</strong>. Seus privilégios de auditoria estão delimitados exclusivamente aos logs do seu respectivo departamento.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Conformidade Ativa</span>
            </span>
          </div>
        </div>
      )}

      {/* 2. KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Logs */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            <span>Total</span>
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Eventos catalogados
          </div>
        </div>

        {/* Creates */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/40 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
            <span>Criações</span>
            <PlusCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
            {stats.creates}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Novos cadastros
          </div>
        </div>

        {/* Updates */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-950/40 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400 mb-1.5">
            <span>Alterações</span>
            <FileEdit className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400 tracking-tight">
            {stats.updates}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Modificações
          </div>
        </div>

        {/* Deletes */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/40 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400 mb-1.5">
            <span>Exclusões</span>
            <Trash2 className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 tracking-tight">
            {stats.deletes}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Registros removidos
          </div>
        </div>

        {/* Leadership Actions */}
        <div
          onClick={() => setSecurityFilter(securityFilter === 'leadership' ? 'all' : 'leadership')}
          className={cn(
            "p-3.5 rounded-2xl border shadow-xs cursor-pointer transition-all",
            securityFilter === 'leadership'
              ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20"
              : "bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-950/40 hover:border-indigo-300"
          )}
          title="Clique para filtrar apenas ações de líderes e administradores"
        >
          <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1.5">
            <span>Liderança</span>
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">
            {stats.leadership}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Contas de líderes
          </div>
        </div>

        {/* Suspicious Accesses */}
        <div
          onClick={() => setSecurityFilter(securityFilter === 'suspicious' ? 'all' : 'suspicious')}
          className={cn(
            "p-3.5 rounded-2xl border shadow-xs cursor-pointer transition-all",
            securityFilter === 'suspicious'
              ? "bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20"
              : stats.suspicious > 0
              ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 hover:border-amber-400"
              : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300"
          )}
          title="Clique para filtrar apenas acessos suspeitos detectados"
        >
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className={stats.suspicious > 0 ? "text-rose-700 dark:text-rose-400 font-extrabold" : "text-slate-500 dark:text-slate-400"}>
              Suspeitos
            </span>
            <AlertTriangle className={cn("w-4 h-4", stats.suspicious > 0 ? "text-rose-600 animate-pulse" : "text-slate-400")} />
          </div>
          <div className={cn(
            "text-xl sm:text-2xl font-black tracking-tight",
            stats.suspicious > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
          )}>
            {stats.suspicious}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.suspicious > 0 ? "Acessos em alerta" : "Nenhum alerta"}
          </div>
        </div>
      </div>

      {/* 2.5 Widget Visual de Conflitos de Escala & Sobrecarga Ministerial */}
      <ScheduleConflictAuditWidget
        churchId={effectiveChurchId}
        onRefreshAuditLogs={loadLogs}
      />

      {/* 3. Filters & Search Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Top Filter Row: Search & Action Tabs */}
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Action Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                onClick={() => setActiveTab('CREATE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'CREATE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Criação</span>
              </button>
              <button
                onClick={() => setActiveTab('UPDATE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'UPDATE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-700'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Alteração</span>
              </button>
              <button
                onClick={() => setActiveTab('DELETE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'DELETE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-700'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Exclusão</span>
              </button>
            </div>

            {/* Quick Security & Leadership Filter Pills */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                onClick={() => setSecurityFilter('all')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
                  securityFilter === 'all'
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                Qualquer Origem
              </button>
              <button
                onClick={() => setSecurityFilter(securityFilter === 'leadership' ? 'all' : 'leadership')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                  securityFilter === 'leadership'
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Liderança ({stats.leadership})</span>
              </button>
              <button
                onClick={() => setSecurityFilter(securityFilter === 'suspicious' ? 'all' : 'suspicious')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                  securityFilter === 'suspicious'
                    ? "bg-rose-600 text-white shadow-xs"
                    : stats.suspicious > 0
                    ? "text-rose-700 dark:text-rose-400 font-extrabold hover:text-rose-800"
                    : "text-slate-600 dark:text-slate-400 hover:text-rose-700"
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Suspeitos ({stats.suspicious})</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por registro, autor, e-mail, IP ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row: Entity, Department, Date Period */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Entity Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Tipo de Entidade
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Todas as Entidades</option>
              <option value="Schedule">📅 Escalas (Schedules)</option>
              <option value="Member">👤 Membros (Members)</option>
              <option value="WorshipService">⛪ Cultos e Serviços</option>
              <option value="Song">🎵 Repertório Musical</option>
              <option value="Department">🏛️ Departamentos</option>
              <option value="Visitor">👋 Visitantes</option>
              <option value="Appointment">📖 Atendimentos</option>
              <option value="Band">🎸 Bandas</option>
              <option value="DanceGroup">💃 Ministério de Dança</option>
              <option value="Broadcast">📢 Comunicados</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Departamento Ministerial
              </label>
              {userEvaluation?.scope === 'department' && (
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado ao cargo
                </span>
              )}
            </div>
            <select
              value={userEvaluation?.scope === 'department' && userEvaluation.forcedDepartmentId ? userEvaluation.forcedDepartmentId : selectedDepartment}
              onChange={(e) => {
                if (userEvaluation?.scope !== 'department') {
                  setSelectedDepartment(e.target.value);
                }
              }}
              disabled={userEvaluation?.scope === 'department'}
              className={`w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                userEvaluation?.scope === 'department'
                  ? 'cursor-not-allowed font-bold text-purple-700 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800'
                  : ''
              }`}
            >
              {userEvaluation?.scope === 'department' ? (
                <option value={userEvaluation.forcedDepartmentId || 'danca'}>
                  {userEvaluation.forcedDepartmentId === 'danca'
                    ? '💃 Ministério de Dança (Exclusivo do seu cargo)'
                    : `🔒 Departamento: ${userEvaluation.forcedDepartmentId}`}
                </option>
              ) : (
                <>
                  <option value="all">Todos os Departamentos</option>
                  <option value="louvor">Ministério de Louvor</option>
                  <option value="multimidia">Ministério de Multimídia</option>
                  <option value="danca">Ministério de Dança</option>
                  <option value="secretaria">Secretaria da Igreja</option>
                </>
              )}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Período Temporal
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Todo o Histórico</option>
              <option value="today">Últimas 24 Horas</option>
              <option value="7days">Últimos 7 Dias</option>
              <option value="30days">Últimos 30 Dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Logs List & Timeline View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
          <span>
            Mostrando {filteredLogs.length} de {logs.length} registros
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Rastreamento Ativo em Tempo Real
          </span>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Carregando registros de auditoria da igreja...
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Nenhum log de auditoria encontrado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery || activeTab !== 'all' || selectedEntityType !== 'all'
                  ? 'Nenhum evento corresponde aos filtros selecionados. Tente limpar os termos de busca.'
                  : 'Nenhuma alteração foi registrada ainda nesta igreja. Qualquer criação, edição ou exclusão de membros, escalas e cultos gerará um registro imediato.'}
              </p>
            </div>
            <button
              onClick={() => setShowSimulateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simular Primeiro Registro</span>
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const BadgeIcon = badge.icon;
              const entityIcon = getEntityIcon(log.entity_type);
              const isUpdate = log.action === 'UPDATE';
              const diffCount = log.changed_fields?.length || 0;

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Action Icon Pill */}
                    <div className={`p-2.5 rounded-2xl border shrink-0 mt-0.5 ${badge.className}`}>
                      <BadgeIcon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      {/* Top Badges Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.className}`}>
                          {badge.label}
                        </span>

                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                          <span>{entityIcon}</span>
                          <span>{log.entity_type}</span>
                        </span>

                        {log.department_id && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                            {log.department_id}
                          </span>
                        )}

                        {/* IP & Geolocation Badge */}
                        {log.ip_address && (
                          <span
                            className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/60"
                            title={`IP: ${log.ip_address} • ${log.geo_summary || formatGeoSummary(log.location)}`}
                          >
                            <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="font-mono font-semibold">{log.ip_address}</span>
                            {(log.location?.city || log.geo_summary) && (
                              <span className="text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                                • {log.location?.city || log.geo_summary}
                              </span>
                            )}
                          </span>
                        )}

                        {/* Leadership Account Badge */}
                        {(log.security_assessment?.is_leadership_account ||
                          (log.actor_role && ['líder', 'lider', 'super_admin', 'pastor', 'ministro'].includes(log.actor_role.toLowerCase())) ||
                          log.actor_email === 'pedrohenriqueribei@gmail.com') && (
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <Shield className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>Liderança</span>
                          </span>
                        )}

                        {/* Suspicious Alert Badge */}
                        {log.security_assessment?.flagged && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Acesso Suspeito</span>
                          </span>
                        )}

                        {isUpdate && diffCount > 0 && (
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                            {diffCount} {diffCount === 1 ? 'campo modificado' : 'campos modificados'}
                          </span>
                        )}
                      </div>

                      {/* Title / Entity Label */}
                      <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {log.entity_label || log.entity_id}
                      </div>

                      {/* Diff summary preview */}
                      {isUpdate && log.changed_fields && log.changed_fields.length > 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">Alterado:</span>
                          {log.changed_fields.slice(0, 4).map((f) => (
                            <span key={f} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                              {f}
                            </span>
                          ))}
                          {log.changed_fields.length > 4 && (
                            <span className="text-[11px] text-slate-400">
                              +{log.changed_fields.length - 4} mais
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Author & Timestamp & Inspection Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center sm:justify-end gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black">
                          {log.actor_name ? log.actor_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="truncate max-w-[150px]">{log.actor_name || 'Usuário'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center sm:justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(log.created_at)}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Inspecionar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Deep Diff Inspector Modal / Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl border ${getActionBadge(selectedLog.action).className}`}>
                    {React.createElement(getActionBadge(selectedLog.action).icon, { className: 'w-5 h-5' })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getActionBadge(selectedLog.action).className}`}>
                        {getActionBadge(selectedLog.action).label}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {selectedLog.entity_type}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedLog.entity_label || selectedLog.entity_id}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Event Metadata Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Autor</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block">
                      {selectedLog.actor_name}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {selectedLog.actor_email}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Data e Hora</span>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {new Date(selectedLog.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {new Date(selectedLog.created_at).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">ID do Registro</span>
                    <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 block truncate" title={selectedLog.entity_id}>
                      {selectedLog.entity_id}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      Origem: {selectedLog.source}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">ID de Correlação</span>
                    <span className="font-mono text-[11px] text-slate-500 block truncate" title={selectedLog.correlation_id}>
                      {selectedLog.correlation_id}
                    </span>
                  </div>
                </div>

                {/* Access Security, IP & Geolocation Card */}
                <div
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border space-y-3 transition-all",
                    selectedLog.security_assessment?.flagged
                      ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800"
                      : selectedLog.security_assessment?.is_leadership_account
                      ? "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs",
                          selectedLog.security_assessment?.flagged
                            ? "bg-rose-600"
                            : selectedLog.security_assessment?.is_leadership_account
                            ? "bg-indigo-600"
                            : "bg-blue-600"
                        )}
                      >
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            Rastreamento de Conexão & Geolocalização
                          </h4>
                          {(selectedLog.security_assessment?.is_leadership_account ||
                            (selectedLog.actor_role && ['líder', 'lider', 'super_admin', 'pastor', 'ministro'].includes(selectedLog.actor_role.toLowerCase())) ||
                            selectedLog.actor_email === 'pedrohenriqueribei@gmail.com') && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                              <Shield className="w-3 h-3 text-indigo-500" />
                              <span>Conta de Liderança</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Identificação de endereço IP e estimativa de geolocalização aproximada para auditoria de integridade.
                        </p>
                      </div>
                    </div>

                    {selectedLog.security_assessment?.flagged ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-600 text-white flex items-center gap-1.5 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Alerta: Acesso Suspeito ({selectedLog.security_assessment.risk_level === 'high' ? 'Alto Risco' : 'Atenção'})</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Acesso Regular</span>
                      </span>
                    )}
                  </div>

                  {/* 3-Column Security Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Endereço IP */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <Wifi className="w-3 h-3 text-blue-500" /> Endereço IP
                        </span>
                        {selectedLog.ip_address && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedLog.ip_address!);
                              setCopiedJson(true);
                              setTimeout(() => setCopiedJson(false), 2000);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            title="Copiar endereço IP"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white block mt-1">
                        {selectedLog.ip_address || 'Não capturado (registro prévio)'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {selectedLog.location?.is_local ? 'Rede Local / Loopback' : 'Conexão Internet'}
                      </span>
                    </div>

                    {/* Estimativa de Localização */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" /> Geolocalização Estimada
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block mt-1 truncate" title={selectedLog.geo_summary || formatGeoSummary(selectedLog.location)}>
                        {selectedLog.geo_summary || formatGeoSummary(selectedLog.location)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {selectedLog.location?.timezone ? `Fuso: ${selectedLog.location.timezone}` : 'Estimativa aproximada'}
                      </span>
                    </div>

                    {/* Provedor / ISP */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Server className="w-3 h-3 text-indigo-500" /> Provedor / Conexão
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block mt-1 truncate" title={selectedLog.location?.isp || selectedLog.location?.org || 'Provedor Comercial'}>
                        {selectedLog.location?.isp || selectedLog.location?.org || (selectedLog.location?.is_local ? 'Rede Local' : 'Provedor de Acesso')}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {selectedLog.location?.country || 'Rede Externa'}
                      </span>
                    </div>
                  </div>

                  {/* Suspicious Details Banner if flagged */}
                  {selectedLog.security_assessment?.flagged && (
                    <div className="p-3.5 bg-rose-100/90 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 rounded-xl text-xs space-y-2">
                      <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Indicadores de Anomalia em Conta de Liderança:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 dark:text-rose-300 font-medium pl-1">
                        {selectedLog.security_assessment.suspicious_flags.map((flag, idx) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                      {selectedLog.security_assessment.explanation && (
                        <p className="text-[11px] text-rose-700 dark:text-rose-400 pt-1.5 border-t border-rose-200 dark:border-rose-900/60 font-semibold italic">
                          {selectedLog.security_assessment.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Diff Viewer Section */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                    <span>Detalhamento das Modificações (Diff Estruturado)</span>
                  </h3>

                  {selectedLog.action === 'UPDATE' && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      <div className="grid grid-cols-12 bg-slate-100/80 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 p-3">
                        <div className="col-span-4">Campo Modificado</div>
                        <div className="col-span-4 text-rose-700 dark:text-rose-400">Valor Anterior (Old)</div>
                        <div className="col-span-4 text-emerald-700 dark:text-emerald-400">Novo Valor (New)</div>
                      </div>

                      {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 ? (
                        selectedLog.changed_fields.map((field) => {
                          const oldVal = selectedLog.old_values?.[field];
                          const newVal = selectedLog.new_values?.[field];

                          return (
                            <div key={field} className="grid grid-cols-12 p-3 gap-2 items-start font-mono text-[11px]">
                              <div className="col-span-4 font-bold text-slate-800 dark:text-slate-200 break-words">
                                {field}
                              </div>
                              <div className="col-span-4 p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/50 break-words">
                                {oldVal !== undefined ? JSON.stringify(oldVal, null, 1) : '<vazio>'}
                              </div>
                              <div className="col-span-4 p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50 break-words font-semibold">
                                {newVal !== undefined ? JSON.stringify(newVal, null, 1) : '<vazio>'}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-slate-400">
                          Nenhum campo com alteração isolada registrado.
                        </div>
                      )}
                    </div>
                  )}

                  {selectedLog.action === 'CREATE' && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Registro Criado Inicialmente com os Seguintes Valores:</span>
                      </div>
                      <pre className="p-3 bg-white dark:bg-slate-900 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-[11px] overflow-x-auto border border-emerald-100 dark:border-emerald-900/50">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.action === 'DELETE' && (
                    <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 space-y-2">
                      <div className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Estado do Registro Imediatamente Antes da Exclusão:</span>
                      </div>
                      <pre className="p-3 bg-white dark:bg-slate-900 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-[11px] overflow-x-auto border border-rose-100 dark:border-rose-900/50">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Technical Fingerprint & User Agent */}
                {selectedLog.user_agent && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-slate-500">
                    <Laptop className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">Cliente e Navegador</span>
                      <span className="break-all">{selectedLog.user_agent}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copiar JSON Completo</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Test & Simulation Modal */}
      <AnimatePresence>
        {showSimulateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-blue-700 dark:text-blue-400">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Simular Registro de Auditoria
                  </h3>
                </div>
                <button
                  onClick={() => setShowSimulateModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                Dispare uma operação simulada para testar em tempo real a captura de CREATE, UPDATE (com cálculo de diff) e DELETE no banco de dados da sua igreja.
              </p>

              <div className="space-y-2.5">
                {/* Suspicious Leadership Access Simulation */}
                <button
                  onClick={() => handleSimulateAction('SUSPICIOUS_LEADERSHIP')}
                  disabled={simulating}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 font-bold text-xs transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-rose-900 dark:text-rose-100">Simular Acesso Suspeito (Liderança)</span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">Alto Risco</span>
                      </div>
                      <span className="text-[10px] text-rose-700/80 dark:text-rose-300/80 font-normal block">
                        IP internacional de Datacenter/VPN (Miami - EUA) em conta de liderança
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-rose-500" />
                </button>

                {/* Regular Leadership Access Simulation */}
                <button
                  onClick={() => handleSimulateAction('LEADERSHIP_REGULAR')}
                  disabled={simulating}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-black text-indigo-900 dark:text-indigo-100 block">Simular Acesso Regular (Liderança)</span>
                      <span className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 font-normal block">
                        Ação de Pastor/Líder a partir de São Paulo - SP (IP residencial Brasil)
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-indigo-500" />
                </button>

                <button
                  onClick={() => handleSimulateAction('CREATE')}
                  disabled={simulating}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span>Testar CREATE (Nova Escala de Culto)</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSimulateAction('UPDATE')}
                  disabled={simulating}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <FileEdit className="w-4 h-4 text-blue-600" />
                    <span>Testar UPDATE (Alteração de Membro)</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSimulateAction('DELETE')}
                  disabled={simulating}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 hover:bg-rose-100/80 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Testar DELETE (Remoção de Música)</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Dance Ministry simulation - highlights the role isolation capability */}
                <button
                  onClick={() => handleSimulateAction('DANCE')}
                  disabled={simulating}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <BallerinaIcon className="w-4 h-4 text-purple-600" />
                    <span>Testar Evento do Ministério de Dança</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Super Admin Security Configuration Modal */}
      <AnimatePresence>
        {showSecurityModal && isSuperAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-2xl">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Configurações de Segurança e Acesso aos Logs
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Painel exclusivo do Super Administrador: defina quais cargos ministeriais e de liderança têm permissão para acessar os logs de auditoria e configure o isolamento estrito departamental.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSecurityModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Security Panel Component */}
              <AuditSecuritySettingsPanel onSaveSuccess={() => { loadLogs(); }} />

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowSecurityModal(false)}
                  className="px-5 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Concluir e Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
