'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Copy,
  Printer,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Share2,
  X,
  Building2,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  ShieldCheck,
  Calendar,
  User,
  Users,
  Check,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/components/AuthProvider';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import {
  FinancialRecord,
  FinancialType,
  FinancialSummary,
  IncomeCategory,
  ExpenseCategory,
  PaymentMethod,
  STANDARD_CHURCH_DEPARTMENTS,
  PAYMENT_METHOD_LABELS,
  INCOME_CATEGORY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  DepartmentBudgetOption,
} from '@/lib/treasuryTypes';
import { getAllChurchMinistries, normalizeMinistryKey } from '@/lib/ministryUtils';

interface TreasuryWorkspaceProps {
  churchId: string;
  churchName?: string;
}

export default function TreasuryWorkspace({ churchId, churchName }: TreasuryWorkspaceProps) {
  const { user, userData, isSuperAdmin } = useAuth();

  // State
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense' | 'departments' | 'report'>('all');
  
  // Date selector (Default to current Year-Month)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');

  // Modals
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [viewingReceipt, setViewingReceipt] = useState<FinancialRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FinancialRecord | null>(null);

  // Form states
  const [incomeForm, setIncomeForm] = useState({
    category: 'dizimo' as IncomeCategory,
    amount: '',
    contributorName: '',
    contributorMemberId: '',
    isAnonymous: false,
    serviceName: 'Culto de Domingo - Noite',
    paymentMethod: 'pix' as PaymentMethod,
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    departmentId: 'louvor',
    category: 'despesa_departamento' as ExpenseCategory,
    amount: '',
    supplier: '',
    paymentMethod: 'pix' as PaymentMethod,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    status: 'confirmed' as 'confirmed' | 'pending',
    invoiceNumber: '',
    description: '',
    notes: '',
  });

  // Church members for contributor autocompletion
  const [churchMembers, setChurchMembers] = useState<Array<{ uid: string; name: string }>>([]);
  const [customDepartments, setCustomDepartments] = useState<DepartmentBudgetOption[]>([]);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Check if current user has treasury leadership permissions
  const isTreasuryLeader = useMemo(() => {
    if (isSuperAdmin) return true;
    const role = userData?.role || '';
    if (['pastor', 'pastor_titular', 'pastor_auxiliar', 'super_admin'].includes(role)) return true;
    
    // Check treasury roles
    const userRoles = userData?.roles || {};
    const treasuryRoles = userRoles['tesouraria'] || userRoles['treasury'] || [];
    if (treasuryRoles.some((r: string) => ['leader', 'vice_treasurer', 'admin'].includes(r))) return true;
    
    return false;
  }, [isSuperAdmin, userData]);

  // Format currency in BRL
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // Month names
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Fetch all transactions and departments
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!churchId) return;
      setLoading(true);

      try {
        // Fetch church document to get custom ministries
        const churchDoc = await getDoc(doc(db, 'churches', churchId));
        if (churchDoc.exists() && isMounted) {
          const cData = churchDoc.data();
          const allMin = getAllChurchMinistries(cData);
          const deptOpts: DepartmentBudgetOption[] = allMin.map(m => ({
            id: m.id,
            name: m.name,
            iconKey: m.iconKey,
            color: m.color,
          }));
          // Add General option if not present
          if (!deptOpts.some(d => d.id === 'geral')) {
            deptOpts.push({ id: 'geral', name: 'Administração Geral & Templo', iconKey: 'building', color: 'emerald' });
          }
          setCustomDepartments(deptOpts);
        }

        // Fetch church members for contributor autocomplete
        const membersSnap = await getDocs(
          query(collection(db, 'users'), where('churchId', '==', churchId))
        );
        if (isMounted) {
          const mList: Array<{ uid: string; name: string }> = [];
          membersSnap.docs.forEach(d => {
            const data = d.data();
            if (data.name) {
              mList.push({ uid: d.id, name: data.name });
            }
          });
          setChurchMembers(mList.sort((a, b) => a.name.localeCompare(b.name)));
        }

        // Fetch financial records
        const finRef = collection(db, 'churches', churchId, 'financial_records');
        const q = query(finRef, orderBy('date', 'desc'));
        const snap = await getDocs(q);

        if (isMounted) {
          const items: FinancialRecord[] = [];
          snap.docs.forEach(d => {
            items.push({ id: d.id, ...(d.data() as any) });
          });
          setRecords(items);
        }
      } catch (err) {
        console.warn('Erro ao buscar dados financeiros da igreja:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [churchId]);

  // Filter records by selected Month and Year
  const currentMonthRecords = useMemo(() => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    const prefix = `${selectedYear}-${monthStr}`;

    return records.filter(r => r.date && r.date.startsWith(prefix));
  }, [records, selectedYear, selectedMonth]);

  // Compute Financial Summary for Selected Month
  const summary: FinancialSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalDizimos = 0;
    let totalOfertas = 0;
    let totalOtherIncome = 0;
    let totalPendingExpense = 0;

    const deptMap: Record<string, { departmentId: string; departmentName: string; total: number; count: number; percentage: number }> = {};

    currentMonthRecords.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'income') {
        totalIncome += amt;
        if (r.category === 'dizimo') {
          totalDizimos += amt;
        } else if (r.category === 'oferta' || r.category === 'oferta_missoes' || r.category === 'oferta_especial') {
          totalOfertas += amt;
        } else {
          totalOtherIncome += amt;
        }
      } else if (r.type === 'expense') {
        totalExpense += amt;
        if (r.status === 'pending') {
          totalPendingExpense += amt;
        }

        const dId = r.departmentId || 'geral';
        const dName = r.departmentName || 'Geral / Outros';

        if (!deptMap[dId]) {
          deptMap[dId] = {
            departmentId: dId,
            departmentName: dName,
            total: 0,
            count: 0,
            percentage: 0,
          };
        }
        deptMap[dId].total += amt;
        deptMap[dId].count += 1;
      }
    });

    // Calculate percentages
    Object.keys(deptMap).forEach(key => {
      deptMap[key].percentage = totalExpense > 0 ? (deptMap[key].total / totalExpense) * 100 : 0;
    });

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      totalDizimos,
      totalOfertas,
      totalOtherIncome,
      totalPendingExpense,
      expensesByDepartment: deptMap,
    };
  }, [currentMonthRecords]);

  // Filtered records for display based on active tab, search, and department filter
  const displayedRecords = useMemo(() => {
    return currentMonthRecords.filter(r => {
      // Tab filter
      if (activeTab === 'income' && r.type !== 'income') return false;
      if (activeTab === 'expense' && r.type !== 'expense') return false;
      if (activeTab === 'departments' && r.type !== 'expense') return false;

      // Department filter
      if (selectedDeptFilter !== 'all' && r.departmentId !== selectedDeptFilter) {
        return false;
      }

      // Payment method filter
      if (selectedPaymentFilter !== 'all' && r.paymentMethod !== selectedPaymentFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (r.description || '').toLowerCase().includes(q);
        const contribMatch = (r.contributorName || '').toLowerCase().includes(q);
        const supplierMatch = (r.supplier || '').toLowerCase().includes(q);
        const receiptMatch = (r.receiptNumber || '').toLowerCase().includes(q);
        const deptMatch = (r.departmentName || '').toLowerCase().includes(q);
        if (!descMatch && !contribMatch && !supplierMatch && !receiptMatch && !deptMatch) {
          return false;
        }
      }

      return true;
    });
  }, [currentMonthRecords, activeTab, selectedDeptFilter, selectedPaymentFilter, searchQuery]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  // Submit Dízimo / Oferta
  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchId || !incomeForm.amount) return;

    try {
      const numAmount = parseFloat(incomeForm.amount.replace(/\./g, '').replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        alert('Por favor, informe um valor válido.');
        return;
      }

      const recordId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const receiptNum = `REC-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${String(records.length + 1).padStart(4, '0')}`;

      const newRecord: FinancialRecord = {
        id: recordId,
        churchId,
        type: 'income',
        category: incomeForm.category,
        categoryLabel: INCOME_CATEGORY_LABELS[incomeForm.category] || 'Entrada',
        amount: numAmount,
        date: incomeForm.date,
        description: incomeForm.description || `${INCOME_CATEGORY_LABELS[incomeForm.category]} - ${incomeForm.serviceName}`,
        paymentMethod: incomeForm.paymentMethod,
        status: 'confirmed',
        contributorName: incomeForm.isAnonymous ? 'Ofertante Anônimo' : (incomeForm.contributorName || 'Dizimista'),
        contributorMemberId: incomeForm.isAnonymous ? '' : incomeForm.contributorMemberId,
        isAnonymous: incomeForm.isAnonymous,
        serviceName: incomeForm.serviceName,
        receiptNumber: receiptNum,
        notes: incomeForm.notes,
        createdBy: user?.uid || '',
        createdByName: userData?.name || 'Tesouraria',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'churches', churchId, 'financial_records', recordId), newRecord);

      setRecords(prev => [newRecord, ...prev]);
      setIsIncomeModalOpen(false);

      // Offer immediate receipt view
      setViewingReceipt(newRecord);

      // Reset form
      setIncomeForm({
        category: 'dizimo',
        amount: '',
        contributorName: '',
        contributorMemberId: '',
        isAnonymous: false,
        serviceName: 'Culto de Domingo - Noite',
        paymentMethod: 'pix',
        date: new Date().toISOString().split('T')[0],
        description: '',
        notes: '',
      });
    } catch (err) {
      console.error('Erro ao registrar entrada financeira:', err);
      alert('Falha ao salvar o lançamento. Verifique as permissões de acesso.');
    }
  };

  // Submit Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchId || !expenseForm.amount) return;

    try {
      const numAmount = parseFloat(expenseForm.amount.replace(/\./g, '').replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        alert('Por favor, informe um valor válido para a despesa.');
        return;
      }

      const deptObj = (customDepartments.length > 0 ? customDepartments : STANDARD_CHURCH_DEPARTMENTS).find(
        d => d.id === expenseForm.departmentId
      );
      const deptName = deptObj ? deptObj.name : 'Administração Geral';

      const recordId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const receiptNum = `DESP-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${String(records.length + 1).padStart(4, '0')}`;

      const newRecord: FinancialRecord = {
        id: recordId,
        churchId,
        type: 'expense',
        category: expenseForm.category,
        categoryLabel: EXPENSE_CATEGORY_LABELS[expenseForm.category] || 'Despesa',
        amount: numAmount,
        date: expenseForm.date,
        dueDate: expenseForm.dueDate,
        departmentId: expenseForm.departmentId,
        departmentName: deptName,
        supplier: expenseForm.supplier || 'Fornecedor',
        description: expenseForm.description || `${EXPENSE_CATEGORY_LABELS[expenseForm.category]} - ${deptName}`,
        paymentMethod: expenseForm.paymentMethod,
        status: expenseForm.status,
        invoiceNumber: expenseForm.invoiceNumber,
        receiptNumber: receiptNum,
        notes: expenseForm.notes,
        createdBy: user?.uid || '',
        createdByName: userData?.name || 'Tesouraria',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'churches', churchId, 'financial_records', recordId), newRecord);

      setRecords(prev => [newRecord, ...prev]);
      setIsExpenseModalOpen(false);

      // Reset form
      setExpenseForm({
        departmentId: 'louvor',
        category: 'despesa_departamento',
        amount: '',
        supplier: '',
        paymentMethod: 'pix',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        invoiceNumber: '',
        description: '',
        notes: '',
      });
    } catch (err) {
      console.error('Erro ao registrar despesa ministerial:', err);
      alert('Falha ao salvar a despesa. Verifique as permissões de acesso.');
    }
  };

  // Delete transaction
  const handleDeleteRecord = async () => {
    if (!recordToDelete || !churchId) return;

    try {
      await deleteDoc(doc(db, 'churches', churchId, 'financial_records', recordToDelete.id));
      setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
      setRecordToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir lançamento:', err);
      alert('Não foi possível excluir o lançamento.');
    }
  };

  // Copy Executive Report to WhatsApp
  const handleCopyReportToWhatsApp = () => {
    const monthLabel = `${monthNames[selectedMonth - 1]} de ${selectedYear}`;
    let text = `*RELATÓRIO FINANCEIRO DA TESOURARIA*\n`;
    text += `*${churchName || 'Igreja'}* - Competência: *${monthLabel}*\n\n`;
    text += `🟢 *ENTRADAS TOTAIS: ${formatBRL(summary.totalIncome)}*\n`;
    text += ` • Dízimos: ${formatBRL(summary.totalDizimos)}\n`;
    text += ` • Ofertas e Missões: ${formatBRL(summary.totalOfertas)}\n`;
    if (summary.totalOtherIncome > 0) {
      text += ` • Outras Entradas: ${formatBRL(summary.totalOtherIncome)}\n`;
    }
    text += `\n🔴 *DESPESAS TOTAIS: ${formatBRL(summary.totalExpense)}*\n`;

    const depts = Object.values(summary.expensesByDepartment);
    if (depts.length > 0) {
      text += `_Despesas por Departamento:_\n`;
      depts.forEach(d => {
        text += ` • ${d.departmentName}: ${formatBRL(d.total)} (${d.percentage.toFixed(1)}%)\n`;
      });
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚖️ *SALDO LÍQUIDO DO MÊS: ${formatBRL(summary.netBalance)}*\n`;
    if (summary.totalPendingExpense > 0) {
      text += `⚠️ Despesas a Pagar (Previsto): ${formatBRL(summary.totalPendingExpense)}\n`;
    }
    text += `\n_Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} via Plataforma Aplaine._`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  // Departments available list
  const availableDepartments = customDepartments.length > 0 ? customDepartments : STANDARD_CHURCH_DEPARTMENTS;

  return (
    <div className="space-y-8">
      {/* 1. Header & Navigation Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 dark:bg-emerald-800 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Módulo Financeiro
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {churchName || 'Tesouraria da Igreja'}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-black text-slate-800 dark:text-slate-100 mt-1">
                Tesouraria & Finanças
              </h2>
            </div>
          </div>

          {/* Month Navigator & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Selector Pill */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 text-xs font-black text-slate-800 dark:text-slate-200 min-w-[130px] text-center">
                {monthNames[selectedMonth - 1]} / {selectedYear}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Leadership Report Button */}
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Relatório para Liderança</span>
            </button>

            {/* Incomes & Expenses Trigger Buttons */}
            {isTreasuryLeader && (
              <>
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-700/20 active:scale-95 transition-all text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lançar Dízimo / Oferta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-rose-600/20 active:scale-95 transition-all text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Despesa</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Incomes */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> Entradas Totais
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {formatBRL(summary.totalIncome)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Dízimos: <strong>{formatBRL(summary.totalDizimos)}</strong></span>
            <span>Ofertas: <strong>{formatBRL(summary.totalOfertas)}</strong></span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5" /> Saídas Totais
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {formatBRL(summary.totalExpense)}
          </div>
          <div className="mt-3 text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Departamentos: <strong>{Object.keys(summary.expensesByDepartment).length}</strong></span>
            {summary.totalPendingExpense > 0 && (
              <span className="text-amber-600 font-bold">Previsto: {formatBRL(summary.totalPendingExpense)}</span>
            )}
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5",
              summary.netBalance >= 0
                ? "text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60"
                : "text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60"
            )}>
              <DollarSign className="w-3.5 h-3.5" /> Saldo Líquido
            </span>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
              summary.netBalance >= 0
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
            )}>
              {summary.netBalance >= 0 ? '+' : '-'}
            </div>
          </div>
          <div className={cn(
            "text-2xl md:text-3xl font-display font-black tracking-tight",
            summary.netBalance >= 0 ? "text-emerald-800 dark:text-emerald-400" : "text-rose-800 dark:text-rose-400"
          )}>
            {formatBRL(summary.netBalance)}
          </div>
          <div className="mt-3 text-xs text-slate-500 font-medium">
            Resultado da competência no período
          </div>
        </div>

        {/* Total Records in Month */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800/60 flex items-center gap-1.5">
              <PieChartIcon className="w-3.5 h-3.5" /> Movimentações
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {currentMonthRecords.length}
          </div>
          <div className="mt-3 text-xs text-slate-500 font-medium">
            Lançamentos registrados neste mês
          </div>
        </div>
      </div>

      {/* 3. Controle de Despesas por Departamento (Card em Destaque) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg md:text-xl text-slate-800 dark:text-slate-100">
                Controle de Despesas por Departamento
              </h3>
              <p className="text-xs text-slate-500">Distribuição dos custos operacionais por ministério e templo</p>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Total Despesas: <strong className="text-rose-600">{formatBRL(summary.totalExpense)}</strong>
          </div>
        </div>

        {Object.keys(summary.expensesByDepartment).length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
            <p className="text-xs text-slate-500 font-medium">
              Nenhuma despesa ministerial registrada para o mês de {monthNames[selectedMonth - 1]}.
            </p>
            {isTreasuryLeader && (
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="mt-3 text-xs font-bold text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                + Registrar a primeira despesa de departamento
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(summary.expensesByDepartment).map((dept) => (
              <div
                key={dept.departmentId}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {dept.departmentName}
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {dept.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="text-xl font-display font-black text-slate-800 dark:text-slate-100">
                  {formatBRL(dept.total)}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
                  <span>{dept.count} {dept.count === 1 ? 'lançamento' : 'lançamentos'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeptFilter(dept.departmentId);
                      setActiveTab('expense');
                    }}
                    className="text-indigo-600 hover:underline font-bold cursor-pointer"
                  >
                    Ver detalhes →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Transactions List & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedDeptFilter('all');
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeTab === 'all'
                  ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              Todos ({currentMonthRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('income')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === 'income'
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Dízimos & Ofertas ({currentMonthRecords.filter(r => r.type === 'income').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expense')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === 'expense'
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Despesas ({currentMonthRecords.filter(r => r.type === 'expense').length})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, culto, recibo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar:
          </span>

          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">Todos os Departamentos</option>
            {availableDepartments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={selectedPaymentFilter}
            onChange={(e) => setSelectedPaymentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">Todas as Formas de Pagamento</option>
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="cartao_debito">Cartão de Débito</option>
            <option value="transferencia">Transferência</option>
            <option value="boleto">Boleto</option>
          </select>

          {(selectedDeptFilter !== 'all' || selectedPaymentFilter !== 'all' || searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDeptFilter('all');
                setSelectedPaymentFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Transactions Table / List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">
            Carregando movimentações financeiras...
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <Coins className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Nenhum lançamento encontrado
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Não há registros com os filtros atuais para {monthNames[selectedMonth - 1]} de {selectedYear}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pl-2">Data</th>
                  <th className="pb-3">Tipo / Categoria</th>
                  <th className="pb-3">Descrição / Origem</th>
                  <th className="pb-3">Departamento</th>
                  <th className="pb-3">Forma</th>
                  <th className="pb-3 text-right">Valor</th>
                  <th className="pb-3 text-center pr-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedRecords.map((r) => {
                  const isInc = r.type === 'income';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 pl-2 font-mono text-slate-500 whitespace-nowrap">
                        {r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="py-3.5">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1",
                          isInc
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
                        )}>
                          {isInc ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {r.categoryLabel || (isInc ? 'Entrada' : 'Despesa')}
                        </span>
                      </td>
                      <td className="py-3.5 max-w-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {r.description}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {isInc ? (
                            <span>{r.contributorName} {r.serviceName ? `• ${r.serviceName}` : ''}</span>
                          ) : (
                            <span>{r.supplier || 'Geral'} {r.invoiceNumber ? `• NF: ${r.invoiceNumber}` : ''}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 whitespace-nowrap">
                        {r.departmentName ? (
                          <span className="font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-[11px]">
                            {r.departmentName}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {PAYMENT_METHOD_LABELS[r.paymentMethod] || r.paymentMethod}
                      </td>
                      <td className={cn(
                        "py-3.5 text-right font-display font-black text-sm whitespace-nowrap",
                        isInc ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {isInc ? '+' : '-'} {formatBRL(r.amount)}
                      </td>
                      <td className="py-3.5 text-center pr-2 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingReceipt(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ver Recibo / Detalhes"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {isTreasuryLeader && (
                            <button
                              type="button"
                              onClick={() => setRecordToDelete(r)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Excluir Lançamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL: Lançamento de Dízimos e Ofertas */}
      <AnimatePresence>
        {isIncomeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100">
                      Lançar Dízimo ou Oferta
                    </h3>
                    <p className="text-xs text-slate-500">Registro seguro de arrecadação no tesouro da igreja</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateIncome} className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    Tipo de Contribuição
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIncomeForm(prev => ({ ...prev, category: 'dizimo' }))}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer",
                        incomeForm.category === 'dizimo'
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      Dízimo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncomeForm(prev => ({ ...prev, category: 'oferta' }))}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer",
                        incomeForm.category === 'oferta'
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      Oferta de Culto
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncomeForm(prev => ({ ...prev, category: 'oferta_missoes' }))}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer",
                        incomeForm.category === 'oferta_missoes'
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      Oferta Missionária
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncomeForm(prev => ({ ...prev, category: 'oferta_especial' }))}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer",
                        incomeForm.category === 'oferta_especial'
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      Oferta Especial / Doação
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Valor (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                      R$
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="0,00"
                      value={incomeForm.amount}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-display font-black text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Contributor selection / anonymous */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Identificação do Contribuinte
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={incomeForm.isAnonymous}
                        onChange={(e) => setIncomeForm(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Anônimo / Coleta no Culto</span>
                    </label>
                  </div>

                  {!incomeForm.isAnonymous && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Nome do Dizimista / Ofertante"
                        value={incomeForm.contributorName}
                        onChange={(e) => setIncomeForm(prev => ({ ...prev, contributorName: e.target.value }))}
                        list="church-members-list"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                      <datalist id="church-members-list">
                        {churchMembers.map(m => (
                          <option key={m.uid} value={m.name} />
                        ))}
                      </datalist>
                    </div>
                  )}
                </div>

                {/* Payment Method & Service */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Forma de Pagamento
                    </label>
                    <select
                      value={incomeForm.paymentMethod}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    >
                      <option value="pix">PIX (Chave da Igreja)</option>
                      <option value="dinheiro">Dinheiro (Espécie)</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="transferencia">Transferência Bancária</option>
                      <option value="boleto">Boleto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Culto / Celebração
                    </label>
                    <select
                      value={incomeForm.serviceName}
                      onChange={(e) => setIncomeForm(prev => ({ ...prev, serviceName: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    >
                      <option value="Culto de Domingo - Noite">Culto de Domingo - Noite</option>
                      <option value="Culto de Domingo - Manhã">Culto de Domingo - Manhã</option>
                      <option value="Culto da Família">Culto da Família</option>
                      <option value="Culto de Doutrina / Quarta">Culto de Quarta-feira</option>
                      <option value="Culto de Jovens / Conexão">Culto de Jovens</option>
                      <option value="Vigília / Oração">Vigília</option>
                      <option value="Arrecadação Direta / Secretaria">Direto na Secretaria</option>
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Data do Recebimento
                  </label>
                  <input
                    type="date"
                    required
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Observações Internas (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Doação direcionada à compra de cabos de som"
                    value={incomeForm.notes}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsIncomeModalOpen(false)}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Confirmar e Salvar Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. MODAL: Controle de Despesas por Departamento */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100">
                      Registrar Despesa Ministerial
                    </h3>
                    <p className="text-xs text-slate-500">Controle orçamentário por departamento e templo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-4">
                {/* Department Selection */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Departamento Responsável *
                  </label>
                  <select
                    required
                    value={expenseForm.departmentId}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, departmentId: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    {availableDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Expense Category */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Categoria da Despesa
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  >
                    <option value="despesa_departamento">Despesa de Atividades do Ministério</option>
                    <option value="equipamentos">Aquisição de Equipamentos / Instrumentos</option>
                    <option value="manutencao_templo">Manutenção & Reparos no Templo</option>
                    <option value="material_didatico">Material Didático / Revistas / Livros</option>
                    <option value="utilidades">Contas de Consumo (Luz, Água, Internet)</option>
                    <option value="aluguel">Aluguel do Espaço</option>
                    <option value="alimentacao_evento">Alimentação / Cantina / Lanches</option>
                    <option value="acao_social">Ação Social & Cestas Básicas</option>
                    <option value="combustivel_transporte">Combustível & Transporte</option>
                    <option value="honorario_prebenda">Prebenda / Auxílio de Ministrantes</option>
                    <option value="outro">Outras Despesas</option>
                  </select>
                </div>

                {/* Amount & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Valor (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                        R$
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="0,00"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-display font-black text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Status do Pagamento
                    </label>
                    <select
                      value={expenseForm.status}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    >
                      <option value="confirmed">Pago (Liquidado)</option>
                      <option value="pending">A Pagar (Previsto)</option>
                    </select>
                  </div>
                </div>

                {/* Supplier / Favorecido */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Fornecedor / Beneficiário
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Loja de Instrumentos, Enel Energia, Papelaria Central"
                    value={expenseForm.supplier}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Descrição Detalhada do Item
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Compra de 4 cabos XLR e 2 microfones para o Louvor"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Dates & Payment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Data da Despesa
                    </label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Forma de Pagamento
                    </label>
                    <select
                      value={expenseForm.paymentMethod}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    >
                      <option value="pix">PIX da Igreja</option>
                      <option value="dinheiro">Dinheiro (Caixa)</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="transferencia">Transferência</option>
                      <option value="boleto">Boleto Pago</option>
                    </select>
                  </div>
                </div>

                {/* Invoice Number & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Nº Nota Fiscal / Recibo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: NF-e 45291"
                      value={expenseForm.invoiceNumber}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Observação / Centro de Custo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Aprovado pelo conselho"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Registrar Despesa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. MODAL: Relatório Financeiro Simplificado para a Liderança */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-10 max-w-2xl w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none print:border-none"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-2xl text-slate-800 dark:text-slate-100">
                      Balancete Financeiro
                    </h3>
                    <p className="text-xs text-slate-500">
                      Relatório condensado para o Pastor Titular e Conselho Fiscal
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 print:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Church & Period Header */}
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">
                    Igreja Local
                  </div>
                  <div className="text-lg font-display font-black text-slate-800 dark:text-slate-100">
                    {churchName || 'Igreja'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black uppercase text-slate-400">
                    Competência
                  </div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {monthNames[selectedMonth - 1]} de {selectedYear}
                  </div>
                </div>
              </div>

              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 text-center">
                  <div className="text-[10px] font-black uppercase text-emerald-700">Total Arrecadado</div>
                  <div className="text-xl font-display font-black text-emerald-800 dark:text-emerald-300 mt-1">
                    {formatBRL(summary.totalIncome)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 text-center">
                  <div className="text-[10px] font-black uppercase text-rose-700">Total Despesas</div>
                  <div className="text-xl font-display font-black text-rose-800 dark:text-rose-300 mt-1">
                    {formatBRL(summary.totalExpense)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 text-center">
                  <div className="text-[10px] font-black uppercase text-blue-700">Saldo Líquido</div>
                  <div className={cn(
                    "text-xl font-display font-black mt-1",
                    summary.netBalance >= 0 ? "text-blue-800 dark:text-blue-300" : "text-rose-800 dark:text-rose-300"
                  )}>
                    {formatBRL(summary.netBalance)}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Discriminação de Entradas
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-300">Dízimos dos Membros</span>
                    <strong className="text-slate-800 dark:text-slate-100">{formatBRL(summary.totalDizimos)}</strong>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-300">Ofertas dos Cultos e Celebrações</span>
                    <strong className="text-slate-800 dark:text-slate-100">{formatBRL(summary.totalOfertas)}</strong>
                  </div>
                  {summary.totalOtherIncome > 0 && (
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-300">Outras Entradas / Campanhas</span>
                      <strong className="text-slate-800 dark:text-slate-100">{formatBRL(summary.totalOtherIncome)}</strong>
                    </div>
                  )}
                </div>

                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 pt-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  Despesas por Departamento
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {Object.values(summary.expensesByDepartment).length === 0 ? (
                    <div className="py-3 text-slate-400 italic">Nenhuma despesa lançada nesta competência.</div>
                  ) : (
                    Object.values(summary.expensesByDepartment).map(d => (
                      <div key={d.departmentId} className="py-2 flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-300">
                          {d.departmentName} ({d.count} {d.count === 1 ? 'item' : 'itens'})
                        </span>
                        <div className="text-right">
                          <strong className="text-slate-800 dark:text-slate-100">{formatBRL(d.total)}</strong>
                          <span className="text-[10px] text-slate-400 ml-2">({d.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Signatures for Official Print */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Primeiro(a) Tesoureiro(a)</div>
                  <div>Tesouraria Geral</div>
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Pastor(a) Presidente / Titular</div>
                  <div>Conselho Pastoral</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 print:hidden">
                <button
                  type="button"
                  onClick={handleCopyReportToWhatsApp}
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-700/20"
                >
                  {copiedText ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedText ? 'Copiado para WhatsApp!' : 'Copiar para WhatsApp da Liderança'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Relatório</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. MODAL: Visualizar Comprovante / Recibo */}
      <AnimatePresence>
        {viewingReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200">
                  {viewingReceipt.receiptNumber || 'Comprovante'}
                </span>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center py-2 space-y-1">
                <div className="text-xs text-slate-400 font-bold uppercase">
                  {viewingReceipt.type === 'income' ? 'Recibo de Contribuição' : 'Comprovante de Despesa'}
                </div>
                <div className="text-3xl font-display font-black text-slate-800 dark:text-slate-100">
                  {formatBRL(viewingReceipt.amount)}
                </div>
                <div className="text-xs text-emerald-600 font-semibold">
                  {viewingReceipt.categoryLabel}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Data:</span>
                  <strong className="text-slate-700 dark:text-slate-200">
                    {new Date(viewingReceipt.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </strong>
                </div>
                {viewingReceipt.type === 'income' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contribuinte:</span>
                      <strong className="text-slate-700 dark:text-slate-200">
                        {viewingReceipt.contributorName}
                      </strong>
                    </div>
                    {viewingReceipt.serviceName && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Culto:</span>
                        <span className="text-slate-700 dark:text-slate-200">
                          {viewingReceipt.serviceName}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Departamento:</span>
                      <strong className="text-slate-700 dark:text-slate-200">
                        {viewingReceipt.departmentName}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Favorecido:</span>
                      <span className="text-slate-700 dark:text-slate-200">
                        {viewingReceipt.supplier}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Forma:</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {PAYMENT_METHOD_LABELS[viewingReceipt.paymentMethod] || viewingReceipt.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lançado por:</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {viewingReceipt.createdByName}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `*COMPROVANTE - ${churchName || 'Igreja'}*\nRecibo: ${viewingReceipt.receiptNumber}\nValor: ${formatBRL(viewingReceipt.amount)}\nData: ${viewingReceipt.date}\nDescrição: ${viewingReceipt.description}\nForma: ${PAYMENT_METHOD_LABELS[viewingReceipt.paymentMethod]}`;
                    navigator.clipboard.writeText(text);
                    alert('Comprovante copiado para a área de transferência!');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. MODAL: Confirm Delete Record */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 max-w-sm w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  Excluir Lançamento?
                </h4>
                <p className="text-xs text-slate-500">
                  Esta ação removerá o registro de {formatBRL(recordToDelete.amount)} permanentemente do balanço da igreja.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRecord}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
