'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Flame,
  Calendar,
  Clock,
  Users,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import {
  calculateMinisterialOverloadAnalytics,
  MinisterialOverloadStats,
  OverloadedMemberProfile,
  MemberMinistryConflict,
  MINISTRY_LABELS,
} from '@/lib/scheduleConflicts';
import { recordAuditLog } from '@/lib/audit';
import { cn } from '@/lib/utils';

interface ScheduleConflictAuditWidgetProps {
  churchId?: string;
  onRefreshAuditLogs?: () => void;
}

export function ScheduleConflictAuditWidget({
  churchId,
  onRefreshAuditLogs,
}: ScheduleConflictAuditWidgetProps) {
  const { userData, isSuperAdmin, user } = useAuth();
  const effectiveChurchId = churchId || userData?.churchId || '';

  const [schedules, setSchedules] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter state
  const [timeWindow, setTimeWindow] = useState<'all' | 'current_month' | 'next_30_days'>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'moderate'>('all');
  const [searchMember, setSearchMember] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [alertRecordedMap, setAlertRecordedMap] = useState<Record<string, boolean>>({});

  // Real-time listener for schedules, services, members
  useEffect(() => {
    if (!effectiveChurchId && !isSuperAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Schedules Query
    const schedQ = effectiveChurchId
      ? query(collection(db, 'schedules'), where('churchId', '==', effectiveChurchId))
      : query(collection(db, 'schedules'));

    const unsubSched = onSnapshot(
      schedQ,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSchedules(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to schedules for audit conflict widget:', err);
        setLoading(false);
      }
    );

    // 2. Services Query
    const srvQ = effectiveChurchId
      ? query(collection(db, 'services'), where('churchId', '==', effectiveChurchId))
      : query(collection(db, 'services'));

    const unsubSrv = onSnapshot(
      srvQ,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setServices(list);
      },
      (err) => {
        console.error('Error listening to services:', err);
      }
    );

    // 3. Members (users) Query
    const usersQ = effectiveChurchId
      ? query(collection(db, 'users'), where('churchId', '==', effectiveChurchId))
      : query(collection(db, 'users'));

    const unsubUsers = onSnapshot(
      usersQ,
      (snap) => {
        const list = snap.docs.map((d) => ({ uid: d.id, id: d.id, ...d.data() }));
        setMembers(list);
      },
      (err) => {
        console.error('Error listening to members:', err);
      }
    );

    return () => {
      unsubSched();
      unsubSrv();
      unsubUsers();
    };
  }, [effectiveChurchId, isSuperAdmin]);

  // Demo fallback data if database currently has zero schedules or no conflicts,
  // ensuring the leadership can evaluate and test the feature immediately
  const mockFallbackSchedules = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');
    const sundayDate1 = `${curYear}-${curMonth}-18T19:00:00`;
    const sundayDate2 = `${curYear}-${curMonth}-18T19:00:00`;
    const sundayDate3 = `${curYear}-${curMonth}-25T10:00:00`;

    return [
      {
        id: 'mock_sched_worship_1',
        churchId: effectiveChurchId || 'demo_church',
        ministry: 'worship',
        date: sundayDate1,
        title: 'Culto de Celebração - Noite',
        roles: {
          mainMinister: 'mock_mem_1', // Lucas Andrade
          drummer: 'mock_mem_2', // Gabriel Santos
          keyboardist: 'mock_mem_3', // Amanda Oliveira
          acousticGuitarist: 'mock_mem_4', // Rafael Silva
        },
        members: ['mock_mem_1', 'mock_mem_2', 'mock_mem_3', 'mock_mem_4'],
      },
      {
        id: 'mock_sched_media_1',
        churchId: effectiveChurchId || 'demo_church',
        ministry: 'multimedia',
        date: sundayDate2,
        title: 'Transmissão & Mídia - Noite',
        roles: {
          pcOperators: 'mock_mem_2', // Gabriel Santos (Conflito simultâneo: Bateria + Projeção)
          cameraOperators: 'mock_mem_1', // Lucas Andrade (Conflito simultâneo: Ministro + Câmera)
          socialMediaOperators: 'mock_mem_5',
        },
        members: ['mock_mem_2', 'mock_mem_1', 'mock_mem_5'],
      },
      {
        id: 'mock_sched_dance_1',
        churchId: effectiveChurchId || 'demo_church',
        ministry: 'dance',
        date: sundayDate1,
        title: 'Ministração Especial de Dança',
        roles: {
          danceLeader: 'mock_mem_3', // Amanda Oliveira (Conflito: Teclado + Dança)
          dancers: ['mock_mem_6', 'mock_mem_7'],
        },
        members: ['mock_mem_3', 'mock_mem_6', 'mock_mem_7'],
      },
      {
        id: 'mock_sched_worship_extra',
        churchId: effectiveChurchId || 'demo_church',
        ministry: 'worship',
        date: sundayDate3,
        title: 'Culto Matutino',
        roles: {
          mainMinister: 'mock_mem_1', // Lucas Andrade (3ª escala do mês)
          drummer: 'mock_mem_2', // Gabriel Santos (4ª escala do mês)
        },
        members: ['mock_mem_1', 'mock_mem_2'],
      },
    ];
  }, [effectiveChurchId]);

  const mockFallbackMembers = useMemo(
    () => [
      {
        uid: 'mock_mem_2',
        name: 'Gabriel Santos',
        email: 'gabriel.santos@igreja.org',
        role: 'Líder de Louvor & Operador',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      },
      {
        uid: 'mock_mem_1',
        name: 'Lucas Andrade',
        email: 'lucas.andrade@igreja.org',
        role: 'Ministro de Louvor & Mídia',
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      },
      {
        uid: 'mock_mem_3',
        name: 'Amanda Oliveira',
        email: 'amanda.oliveira@igreja.org',
        role: 'Tecladista & Dança',
        photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      },
      {
        uid: 'mock_mem_4',
        name: 'Rafael Silva',
        email: 'rafael.silva@igreja.org',
        role: 'Violonista',
      },
      {
        uid: 'mock_mem_5',
        name: 'Matheus Costa',
        email: 'matheus.costa@igreja.org',
        role: 'Redes Sociais',
      },
    ],
    []
  );

  // Determine whether to use real data or realistic fallback
  const isUsingFallback = schedules.length === 0 && !loading;
  const activeSchedules = schedules.length > 0 ? schedules : mockFallbackSchedules;
  const activeMembers = members.length > 0 ? members : mockFallbackMembers;

  // Compute analytics
  const analytics: MinisterialOverloadStats = useMemo(() => {
    return calculateMinisterialOverloadAnalytics(
      activeSchedules,
      services,
      activeMembers,
      timeWindow
    );
  }, [activeSchedules, services, activeMembers, timeWindow]);

  // Filter overloaded members by risk & search
  const filteredOverloadedMembers = useMemo(() => {
    return analytics.overloadedMembers.filter((m) => {
      if (riskFilter !== 'all' && m.riskLevel !== riskFilter) {
        return false;
      }
      if (searchMember.trim()) {
        const q = searchMember.toLowerCase();
        const matchesName = m.memberName.toLowerCase().includes(q);
        const matchesRole = (m.role || '').toLowerCase().includes(q);
        const matchesMinistry = m.involvedMinistries.some((min) => min.toLowerCase().includes(q));
        if (!matchesName && !matchesRole && !matchesMinistry) return false;
      }
      return true;
    });
  }, [analytics.overloadedMembers, riskFilter, searchMember]);

  // Handle recording an official audit alert log for leadership attention
  const handleRecordAuditAlert = async (member: OverloadedMemberProfile) => {
    if (!effectiveChurchId && !isSuperAdmin) return;
    try {
      setAlertRecordedMap((prev) => ({ ...prev, [member.memberId]: true }));
      await recordAuditLog({
        action: 'UPDATE',
        entityType: 'ScheduleConflictAlert',
        entityId: `overload_${member.memberId}_${Date.now()}`,
        entityLabel: `Alerta de Sobrecarga Ministerial: ${member.memberName}`,
        oldData: {
          overloadScore: member.overloadScore,
          riskLevel: member.riskLevel,
          totalSchedules: member.totalSchedulesCount,
          conflictsCount: member.simultaneousConflictsCount,
          status: 'UNRESOLVED',
        },
        newData: {
          overloadScore: member.overloadScore,
          riskLevel: member.riskLevel,
          suggestedAction: member.suggestedAction,
          reviewedBy: userData?.name || user?.email || 'Auditor',
          recordedAt: new Date().toISOString(),
          status: 'FLAGGED_FOR_LEADERSHIP',
        },
        churchId: effectiveChurchId || 'church',
        departmentId: 'geral',
        metadata: {
          reason: 'Auditoria de integridade preventiva para proteção contra estafa ministerial',
          involvedMinistries: member.involvedMinistries,
        },
      });

      if (onRefreshAuditLogs) {
        onRefreshAuditLogs();
      }
    } catch (err) {
      console.error('Failed to log audit alert:', err);
    }
  };

  // Copy summary to clipboard
  const handleCopySummary = () => {
    const text = [
      `📊 DIAGNÓSTICO DE CONFLITOS DE ESCALA & SOBRECARGA MINISTERIAL`,
      `Igreja: ${userData?.churchName || 'Igreja Local'}`,
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `Total de Conflitos Detectados: ${analytics.totalConflictsDetected}`,
      `Integrantes com Sobrecarga: ${analytics.totalOverloadedMembers}`,
      `Casos Críticos (Risco Burnout): ${analytics.criticalRiskCount}`,
      `Índice de Sobrecarga: ${analytics.averageOverloadIndex}% da equipe escalada`,
      ``,
      `RANKING DE INTEGRANTES EM SOBRECARGA:`,
      ...analytics.overloadedMembers.map(
        (m, i) =>
          `#${i + 1} ${m.memberName} [${m.riskLevel.toUpperCase()}] - Score: ${m.overloadScore}/100\n` +
          `   • Escalas: ${m.totalSchedulesCount} | Conflitos simultâneos: ${m.simultaneousConflictsCount}\n` +
          `   • Ministérios: ${m.involvedMinistries.join(', ')}\n` +
          `   • Ação Recomendada: ${m.suggestedAction}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Posição',
      'Nome do Integrante',
      'Nível de Risco',
      'Score de Sobrecarga',
      'Conflitos Simultâneos',
      'Total de Escalas',
      'Ministérios Envolvidos',
      'Motivos Detectados',
      'Ação Sugerida',
    ];

    const rows = analytics.overloadedMembers.map((m, idx) => [
      `#${idx + 1}`,
      `"${m.memberName}"`,
      `"${m.riskLevel.toUpperCase()}"`,
      m.overloadScore,
      m.simultaneousConflictsCount,
      m.totalSchedulesCount,
      `"${m.involvedMinistries.join(', ')}"`,
      `"${m.reasons.join('; ')}"`,
      `"${m.suggestedAction}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `relatorio_sobrecarga_ministerial_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full rounded-3xl bg-linear-to-b from-slate-50 to-white dark:from-slate-900/90 dark:to-slate-950 border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      {/* 1. Header Bar */}
      <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 border border-amber-500/20 shadow-xs">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Auditoria de Conflitos & Sobrecarga Ministerial
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                Saúde & Governança
              </span>
              {isUsingFallback && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Modo Demonstração Interativo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Monitoramento preventivo contra fadiga ministerial. Identifica voluntários escalados em
              múltiplos ministérios no mesmo culto ou com acúmulo excessivo de escalas mensais.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
            title="Copiar diagnóstico consolidado para WhatsApp ou reunião de líderes"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Copiar Resumo</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportCsv}
            disabled={analytics.overloadedMembers.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Exportar dados de sobrecarga em formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => {
              setIsRefreshing(true);
              setTimeout(() => setIsRefreshing(false), 600);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer shadow-xs"
            title="Recalcular métricas de conflito em tempo real"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            <span>Recalcular</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isExpanded ? 'Recolher Widget' : 'Expandir Widget'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-6 space-y-6"
          >
            {/* 2. KPI Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Conflicts */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-rose-200/80 dark:border-rose-900/40 shadow-xs relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                  <span>Conflitos Detectados</span>
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400 tracking-tight">
                  {analytics.totalConflictsDetected}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <span>Choques simultâneos de horário</span>
                </div>
              </div>

              {/* Card 2: Overloaded Members */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-amber-200/80 dark:border-amber-900/40 shadow-xs relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                  <span>Em Sobrecarga</span>
                  <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
                  {analytics.totalOverloadedMembers}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <span>Integrantes sob estresse de escala</span>
                </div>
              </div>

              {/* Card 3: Critical Cases */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1">
                  <span>Risco Crítico</span>
                  <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">
                  {analytics.criticalRiskCount}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <span>Requer intervenção imediata</span>
                </div>
              </div>

              {/* Card 4: Overload Rate / Index */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Taxa de Sobrecarga</span>
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {analytics.averageOverloadIndex}%
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    da equipe escalada
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      analytics.averageOverloadIndex > 30
                        ? 'bg-rose-500'
                        : analytics.averageOverloadIndex > 15
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(100, analytics.averageOverloadIndex)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Visual Charts & Ministry Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Ministry Impact Breakdown */}
              <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Impacto de Conflitos por Ministério
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {analytics.totalSchedulesAnalyzed} escalas analisadas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(analytics.ministryBreakdown).map(([label, count]) => {
                    const total = Math.max(1, analytics.totalConflictsDetected);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div
                        key={label}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60"
                      >
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                          {label}
                        </div>
                        <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                          {count} <span className="text-xs font-normal text-slate-500">choques</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conflict Types Breakdown Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Tipologias de Choque
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Mesmo Culto / Período
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {analytics.conflictTypeBreakdown.simultaneousCulto}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Volume Mensal Elevado (3+)
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {analytics.conflictTypeBreakdown.excessiveMonthlyVolume}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Multi-Departamentos
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {analytics.conflictTypeBreakdown.crossMinistryOverlap}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Filter Toolbar for Overloaded Members */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Período:
                </span>
                <button
                  onClick={() => setTimeWindow('all')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
                    timeWindow === 'all'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  )}
                >
                  Todas as Escalas
                </button>
                <button
                  onClick={() => setTimeWindow('current_month')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
                    timeWindow === 'current_month'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  )}
                >
                  Mês Corrente
                </button>
                <button
                  onClick={() => setTimeWindow('next_30_days')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
                    timeWindow === 'next_30_days'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  )}
                >
                  Próximos 30 Dias
                </button>
              </div>

              {/* Risk Level Filter & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none"
                >
                  <option value="all">Todos os Níveis de Risco</option>
                  <option value="critical">Crítico (Urgente)</option>
                  <option value="high">Alto Risco</option>
                  <option value="moderate">Risco Moderado</option>
                </select>

                <input
                  type="text"
                  placeholder="Buscar integrante no ranking..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 5. Highlight Section: Ranking of Overloaded Members (Leaderboard) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                    Ranking de Integrantes com Maior Frequência de Sobrecarga Ministerial
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {filteredOverloadedMembers.length} integrante(s) destacados
                </span>
              </div>

              {filteredOverloadedMembers.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2.5" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Nenhuma sobrecarga ministerial encontrada neste filtro!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                    A distribuição de voluntários nas escalas está equilibrada e com respeito aos
                    intervalos de descanso da equipe.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOverloadedMembers.map((member, index) => {
                    const isCrit = member.riskLevel === 'critical';
                    const isHigh = member.riskLevel === 'high';
                    const isExpandedCard = expandedMemberId === member.memberId;
                    const alertRecorded = alertRecordedMap[member.memberId];

                    return (
                      <div
                        key={member.memberId}
                        className={cn(
                          'rounded-2xl border transition-all overflow-hidden bg-white dark:bg-slate-900 shadow-2xs',
                          isCrit
                            ? 'border-rose-300 dark:border-rose-900/60'
                            : isHigh
                            ? 'border-amber-300 dark:border-amber-900/60'
                            : 'border-slate-200 dark:border-slate-800'
                        )}
                      >
                        {/* Member Main Row */}
                        <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            {/* Position Badge & Avatar */}
                            <div className="relative shrink-0">
                              {member.avatarUrl || member.photoURL ? (
                                <img
                                  src={member.avatarUrl || member.photoURL}
                                  alt={member.memberName}
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                                  {member.memberName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join('')}
                                </div>
                              )}
                              <span
                                className={cn(
                                  'absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 shadow-xs',
                                  index === 0
                                    ? 'bg-amber-400 text-amber-950'
                                    : index === 1
                                    ? 'bg-slate-300 text-slate-800'
                                    : index === 2
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-slate-700 text-white'
                                )}
                              >
                                #{index + 1}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                                  {member.memberName}
                                </h4>
                                {/* Risk Badge */}
                                <span
                                  className={cn(
                                    'px-2 py-0.5 text-[10px] font-black uppercase rounded-md tracking-wider',
                                    isCrit
                                      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                      : isHigh
                                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                      : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  )}
                                >
                                  {isCrit
                                    ? '⚠️ Risco Crítico'
                                    : isHigh
                                    ? '⚡ Risco Alto'
                                    : 'Atenção Moderada'}
                                </span>

                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  {member.totalSchedulesCount} escala(s) •{' '}
                                  {member.simultaneousConflictsCount} conflito(s) simultâneo(s)
                                </span>
                              </div>

                              {/* Overload Reasons Tags */}
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {member.reasons.map((r, rIdx) => (
                                  <span
                                    key={rIdx}
                                    className="px-2 py-0.5 text-[11px] rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Right Controls: Score & Actions */}
                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                            {/* Score Meter */}
                            <div className="text-right">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Nível Sobrecarga
                              </div>
                              <div
                                className={cn(
                                  'text-lg font-black tracking-tight',
                                  isCrit
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : isHigh
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-blue-600 dark:text-blue-400'
                                )}
                              >
                                {member.overloadScore}/100
                              </div>
                            </div>

                            {/* Alert Log Action */}
                            <button
                              onClick={() => handleRecordAuditAlert(member)}
                              disabled={alertRecorded}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs',
                                alertRecorded
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              )}
                              title="Registrar notificação oficial de auditoria para a liderança analisar"
                            >
                              {alertRecorded ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Alerta Gravado</span>
                                </>
                              ) : (
                                <>
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>Gravar no Audit</span>
                                </>
                              )}
                            </button>

                            {/* Details Accordion Trigger */}
                            <button
                              onClick={() =>
                                setExpandedMemberId(
                                  isExpandedCard ? null : member.memberId
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={isExpandedCard ? 'Ocultar detalhes' : 'Ver detalhes'}
                            >
                              {isExpandedCard ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Breakdown Drawer */}
                        {isExpandedCard && (
                          <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div className="text-xs text-amber-900 dark:text-amber-200">
                                <strong>Recomendação de Auditoria:</strong> {member.suggestedAction}
                              </div>
                            </div>

                            {member.conflicts.length > 0 ? (
                              <div className="space-y-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                                  Conflitos Simultâneos Registrados:
                                </span>
                                {member.conflicts.map((c, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                        Data: {c.date} ({c.periodLabel})
                                      </span>
                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-md">
                                        Choque de Ministérios
                                      </span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300">
                                      {c.description}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {c.assignments.map((ass, assIdx) => (
                                        <span
                                          key={assIdx}
                                          className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md"
                                        >
                                          {ass.ministryLabel}: {ass.roleLabel}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Sem choques simultâneos de horário no mesmo culto. A sobrecarga deve-se
                                ao volume total elevado de escalas ({member.totalSchedulesCount} participações no período).
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
