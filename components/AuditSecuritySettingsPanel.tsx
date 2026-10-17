'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Building2,
  Users,
  Save,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sliders,
  Sparkles,
  Info,
  Trash2,
  Eye,
  Layers,
  ArrowRight
} from 'lucide-react';
import { BallerinaIcon } from '@/components/BallerinaIcon';
import { auth } from '@/lib/firebase';
import {
  AuditRolePermissionRule,
  AuditSecurityConfig,
  DEFAULT_AUDIT_SECURITY_CONFIG,
  DEFAULT_AUDIT_SECURITY_RULES,
  evaluateUserAuditAccess,
} from '@/lib/audit-security';

interface Props {
  onSaved?: (updatedConfig: AuditSecurityConfig) => void;
  onSaveSuccess?: () => void;
  className?: string;
}

export function AuditSecuritySettingsPanel({ onSaved, onSaveSuccess, className = '' }: Props) {
  const [config, setConfig] = useState<AuditSecurityConfig>(DEFAULT_AUDIT_SECURITY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New custom role state
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleCategory, setNewRoleCategory] = useState<'ministerio' | 'lideranca' | 'outro'>('ministerio');
  const [newRoleDeptId, setNewRoleDeptId] = useState('danca');
  const [newRoleDeptName, setNewRoleDeptName] = useState('Ministério de Dança');
  const [newRoleScope, setNewRoleScope] = useState<'church' | 'department'>('department');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Simulator state
  const [simulatedRoleKey, setSimulatedRoleKey] = useState<string>('dance_leader');

  useEffect(() => {
    fetchSecurityConfig();
  }, []);

  async function fetchSecurityConfig() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Não autenticado');

      const res = await fetch('/api/admin/audit-permissions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao carregar políticas de segurança');
      }

      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
    } catch (err: any) {
      console.warn('Usando configuração padrão local:', err);
      setConfig(DEFAULT_AUDIT_SECURITY_CONFIG);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleRule = (ruleId: string) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => {
        if (rule.id === ruleId && !rule.isSystemProtected) {
          return { ...rule, enabled: !rule.enabled };
        }
        return rule;
      }),
    }));
  };

  const handleScopeChange = (ruleId: string, newScope: 'church' | 'department') => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => {
        if (rule.id === ruleId) {
          return { ...rule, scope: newScope };
        }
        return rule;
      }),
    }));
  };

  const handleDepartmentChange = (ruleId: string, deptKey: string, deptName: string) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => {
        if (rule.id === ruleId) {
          return {
            ...rule,
            departmentId: deptKey,
            departmentName: deptName,
          };
        }
        return rule;
      }),
    }));
  };

  const handleResetToDefault = () => {
    if (confirm('Deseja restaurar as configurações padrão de segurança recomendadas?')) {
      setConfig({
        ...DEFAULT_AUDIT_SECURITY_CONFIG,
        updatedAt: new Date().toISOString(),
      });
      setSuccessMsg('Configurações redefinidas para o padrão recomendado. Clique em Salvar para persistir.');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleAddCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleKey.trim()) return;

    const generatedId = `custom_${Date.now()}`;
    const newRule: AuditRolePermissionRule = {
      id: generatedId,
      name: newRoleName.trim(),
      roleKey: newRoleKey.trim().toLowerCase().replace(/\s+/g, '_'),
      category: newRoleCategory,
      departmentId: newRoleScope === 'department' ? newRoleDeptId : null,
      departmentName: newRoleScope === 'department' ? newRoleDeptName : null,
      enabled: true,
      scope: newRoleScope,
      description: newRoleDesc.trim() || `Regra personalizada para o cargo ${newRoleName.trim()}.`,
      isSystemProtected: false,
    };

    setConfig((prev) => ({
      ...prev,
      rules: [...prev.rules, newRule],
    }));

    setShowAddRole(false);
    setNewRoleName('');
    setNewRoleKey('');
    setNewRoleDesc('');
    setSuccessMsg(`Novo cargo "${newRule.name}" adicionado às regras de auditoria!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDeleteRule = (ruleId: string) => {
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.filter((r) => r.id !== ruleId),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Não autenticado como Super Administrador.');

      const res = await fetch('/api/admin/audit-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao persistir configurações de segurança.');
      }

      setSuccessMsg('Políticas de segurança dos logs de auditoria salvas com sucesso!');
      if (onSaved) onSaved(config);
      if (onSaveSuccess) onSaveSuccess();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  // Run simulation calculation
  const simulatedUserMock = {
    role: simulatedRoleKey,
    roles: {
      dance: simulatedRoleKey === 'dance_leader' ? ['leader'] : [],
      worship: simulatedRoleKey === 'worship_leader' ? ['leader'] : [],
      multimedia: simulatedRoleKey === 'multimedia_leader' ? ['leader'] : [],
      secretariat: simulatedRoleKey === 'secretariat_leader' ? ['leader'] : [],
    },
    churchId: 'church_demo',
  };
  const simulationResult = evaluateUserAuditAccess(simulatedUserMock, config);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-sm font-medium text-slate-600 dark:text-slate-400">
          Carregando políticas de segurança...
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* 1. Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Controle de Acesso RBAC
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Permissões de Acesso aos Logs de Auditoria
            </h2>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              Defina quais cargos podem consultar logs de auditoria de suas respectivas igrejas. Configure o escopo de visibilidade para que <strong className="text-white font-semibold">líderes de ministério (ex: Dança ou Louvor)</strong> visualizem estritamente os logs referentes ao seu próprio departamento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleResetToDefault}
              type="button"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer"
              title="Restaurar valores de segurança recomendados"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Padrão Recomendado
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              type="button"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Políticas
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-3 p-4 bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 rounded-2xl text-sm font-medium"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-3 p-4 bg-rose-500/20 text-rose-200 border border-rose-500/40 rounded-2xl text-sm font-medium"
          >
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </div>

      {/* 2. Interactive Simulator Test Bar */}
      <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Simulador de Acesso em Tempo Real
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                  Validação Ativa
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Teste instantaneamente o que um usuário com determinado cargo conseguirá enxergar nos Logs de Auditoria:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Testar como:
            </label>
            <select
              value={simulatedRoleKey}
              onChange={(e) => setSimulatedRoleKey(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dance_leader">Líder do Ministério de Dança</option>
              <option value="worship_leader">Líder do Ministério de Louvor</option>
              <option value="multimedia_leader">Líder do Ministério de Multimídia</option>
              <option value="secretariat_leader">Líder da Secretaria</option>
              <option value="admin">Administrador da Igreja</option>
              <option value="pastor">Pastor / Presbitério</option>
              <option value="general_leader">Líder Geral</option>
              <option value="member">Membro Comum</option>
            </select>
          </div>
        </div>

        {/* Simulation Output Banner */}
        <div className="mt-4 pt-4 border-t border-blue-200/60 dark:border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {simulationResult.canAccess ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Acesso Permitido
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                <Lock className="w-3.5 h-3.5" /> Acesso Bloqueado
              </span>
            )}

            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Escopo: {' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                {simulationResult.scope === 'all'
                  ? 'Global (Todas as Igrejas)'
                  : simulationResult.scope === 'church'
                  ? 'Igreja Inteira (Todos os Departamentos)'
                  : simulationResult.scope === 'department'
                  ? `Exclusivo do Ministério: ${simulationResult.forcedDepartmentId === 'danca' ? 'Dança 💃' : simulationResult.forcedDepartmentId?.toUpperCase()}`
                  : 'Nenhum'}
              </strong>
            </div>
          </div>

          {simulationResult.forcedDepartmentId === 'danca' && (
            <div className="text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 px-3 py-1 rounded-xl font-bold flex items-center gap-1.5">
              <BallerinaIcon className="w-3.5 h-3.5" />
              Garantia: O Líder de Dança enxergará APENAS registros do Ministério de Dança.
            </div>
          )}
        </div>
      </div>

      {/* 3. Roles Matrix & Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            Matriz de Cargos e Permissões
          </h3>

          <button
            onClick={() => setShowAddRole(!showAddRole)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Cargo Personalizado
          </button>
        </div>

        {/* Add Role Drawer / Modal Form */}
        <AnimatePresence>
          {showAddRole && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddCustomRole}
              className="bg-white dark:bg-slate-900 border-2 border-blue-500/30 rounded-3xl p-6 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Cadastrar Regra de Acesso para Novo Cargo
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddRole(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Cargo / Função
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Coordenador de Dança, Líder de Teatro"
                    value={newRoleName}
                    onChange={(e) => {
                      setNewRoleName(e.target.value);
                      if (!newRoleKey) {
                        setNewRoleKey(
                          e.target.value
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]/g, '_')
                        );
                      }
                    }}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Identificador (Role Key)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: dance_leader, youth_leader"
                    value={newRoleKey}
                    onChange={(e) => setNewRoleKey(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Escopo de Visibilidade
                  </label>
                  <select
                    value={newRoleScope}
                    onChange={(e) => setNewRoleScope(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="department">Restrito ao Departamento</option>
                    <option value="church">Igreja Inteira</option>
                  </select>
                </div>
              </div>

              {newRoleScope === 'department' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Departamento Vinculado
                    </label>
                    <select
                      value={newRoleDeptId}
                      onChange={(e) => {
                        setNewRoleDeptId(e.target.value);
                        if (e.target.value === 'danca') setNewRoleDeptName('Ministério de Dança');
                        else if (e.target.value === 'louvor') setNewRoleDeptName('Ministério de Louvor');
                        else if (e.target.value === 'multimidia') setNewRoleDeptName('Ministério de Multimídia');
                        else if (e.target.value === 'secretaria') setNewRoleDeptName('Secretaria');
                      }}
                      className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="danca">Ministério de Dança (danca)</option>
                      <option value="louvor">Ministério de Louvor (louvor)</option>
                      <option value="multimidia">Ministério de Multimídia (multimidia)</option>
                      <option value="secretaria">Secretaria (secretaria)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Breve Descrição da Regra
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Visualiza apenas movimentações do elenco de dança"
                      value={newRoleDesc}
                      onChange={(e) => setNewRoleDesc(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Salvar Regra do Cargo
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Roles List */}
        <div className="grid grid-cols-1 gap-3.5">
          {config.rules.map((rule) => {
            const isDance = rule.id === 'dance_leader' || rule.departmentId === 'danca';
            const isWorship = rule.id === 'worship_leader' || rule.departmentId === 'louvor';
            const isMultimedia = rule.id === 'multimedia_leader' || rule.departmentId === 'multimidia';

            return (
              <div
                key={rule.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 sm:p-6 transition-all ${
                  rule.enabled
                    ? isDance
                      ? 'border-rose-200 dark:border-rose-900/40 bg-gradient-to-r from-rose-50/20 to-transparent'
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900/60'
                    : 'border-slate-200 dark:border-slate-800/60 opacity-60 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Role Info */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-3 rounded-2xl shrink-0 mt-0.5 ${
                        !rule.enabled
                          ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          : isDance
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                          : isWorship
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                          : isMultimedia
                          ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                          : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                      }`}
                    >
                      {isDance ? (
                        <BallerinaIcon className="w-5 h-5" />
                      ) : (
                        <ShieldCheck className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {rule.name}
                        </h4>

                        {rule.enabled ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Acesso Permitido
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Acesso Bloqueado
                          </span>
                        )}

                        {isDance && rule.enabled && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Restrito à Dança 💃
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                        {rule.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Controls */}
                  <div className="flex flex-wrap items-center gap-3 self-end md:self-center">
                    {/* Scope Selector (Only visible if enabled) */}
                    {rule.enabled && !rule.isSystemProtected && (
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleScopeChange(rule.id, 'department')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            rule.scope === 'department'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                          }`}
                          title="Restringe o líder exclusivamente ao departamento configurado"
                        >
                          Apenas Departamento
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScopeChange(rule.id, 'church')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            rule.scope === 'church'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                          }`}
                          title="Permite visualizar todos os logs da igreja"
                        >
                          Igreja Inteira
                        </button>
                      </div>
                    )}

                    {/* Department Tag/Selector */}
                    {rule.enabled && rule.scope === 'department' && (
                      <div className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        <span>{rule.departmentName || 'Departamento'}</span>
                      </div>
                    )}

                    {/* Toggle Switch */}
                    {!rule.isSystemProtected ? (
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id)}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          rule.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        aria-pressed={rule.enabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            rule.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        Protegido
                      </span>
                    )}

                    {/* Delete Custom Rule */}
                    {rule.id.startsWith('custom_') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Remover regra customizada"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
