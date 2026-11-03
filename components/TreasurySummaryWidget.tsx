'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Building2,
  Calendar,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { FinancialRecord } from '@/lib/treasuryTypes';
import { useAuth } from '@/components/AuthProvider';

interface ChurchOption {
  id: string;
  name: string;
}

interface TreasurySummaryWidgetProps {
  churchId?: string;
  churchName?: string;
  className?: string;
}

export function TreasurySummaryWidget({
  churchId: propChurchId,
  churchName: propChurchName,
  className,
}: TreasurySummaryWidgetProps) {
  const { userData, isSuperAdmin } = useAuth();

  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string>(propChurchId || '');
  const [selectedChurchName, setSelectedChurchName] = useState<string>(propChurchName || '');
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Month names
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthName = monthNames[currentMonth - 1];
  const currentMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // 1. Fetch available churches if not provided via props
  useEffect(() => {
    let isMounted = true;

    async function loadChurches() {
      if (propChurchId) {
        setSelectedChurchId(propChurchId);
        if (propChurchName) setSelectedChurchName(propChurchName);
        return;
      }

      try {
        const snap = await getDocs(collection(db, 'churches'));
        if (isMounted && !snap.empty) {
          const list: ChurchOption[] = snap.docs.map(d => ({
            id: d.id,
            name: d.data().name || `Igreja ${d.id}`,
          }));
          setChurches(list);

          // Default to user's churchId or first church in database
          const targetId = userData?.churchId || list[0].id;
          setSelectedChurchId(targetId);
          const matched = list.find(c => c.id === targetId);
          if (matched) setSelectedChurchName(matched.name);
        }
      } catch (err) {
        console.warn('Erro ao carregar lista de igrejas no widget de tesouraria:', err);
      }
    }

    loadChurches();
    return () => {
      isMounted = false;
    };
  }, [propChurchId, propChurchName, userData?.churchId]);

  // 2. Fetch financial records for the active church
  const fetchRecords = async (targetChurchId: string) => {
    if (!targetChurchId) {
      setLoading(false);
      return;
    }

    setRefreshing(true);
    try {
      const finRef = collection(db, 'churches', targetChurchId, 'financial_records');
      const q = query(finRef, orderBy('date', 'desc'));
      const snap = await getDocs(q);

      const items: FinancialRecord[] = [];
      snap.docs.forEach(d => {
        items.push({ id: d.id, ...(d.data() as any) });
      });

      setRecords(items);
    } catch (err) {
      console.warn('Erro ao buscar lançamentos no widget de tesouraria:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedChurchId) {
      fetchRecords(selectedChurchId);
    } else {
      setLoading(false);
    }
  }, [selectedChurchId]);

  // Helper currency formatter BRL
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // 3. Compute Total Accumulated Balance of the Church (all time)
  const totalBalanceStats = useMemo(() => {
    let totalAllIncomes = 0;
    let totalAllExpenses = 0;

    records.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'income') {
        totalAllIncomes += amt;
      } else if (r.type === 'expense' && r.status !== 'pending') {
        totalAllExpenses += amt;
      }
    });

    const netBalance = totalAllIncomes - totalAllExpenses;

    return {
      totalAllIncomes,
      totalAllExpenses,
      netBalance,
      recordCount: records.length,
    };
  }, [records]);

  // 4. Compute Cashflow for the Current Month (Entradas vs. Saídas)
  const currentMonthCashflow = useMemo(() => {
    let monthIncomes = 0;
    let monthDizimos = 0;
    let monthOfertas = 0;
    let monthOtherIncomes = 0;

    let monthExpenses = 0;
    let monthPaidExpenses = 0;
    let monthPendingExpenses = 0;

    const currentRecords = records.filter(r => r.date && r.date.startsWith(currentMonthPrefix));

    currentRecords.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'income') {
        monthIncomes += amt;
        if (r.category === 'dizimo') {
          monthDizimos += amt;
        } else if (r.category === 'oferta' || r.category === 'oferta_missoes' || r.category === 'oferta_especial') {
          monthOfertas += amt;
        } else {
          monthOtherIncomes += amt;
        }
      } else if (r.type === 'expense') {
        monthExpenses += amt;
        if (r.status === 'pending') {
          monthPendingExpenses += amt;
        } else {
          monthPaidExpenses += amt;
        }
      }
    });

    const monthNetBalance = monthIncomes - monthExpenses;
    const totalVolume = monthIncomes + monthExpenses;

    // Percentages for comparison bar
    const incomePercent = totalVolume > 0 ? (monthIncomes / totalVolume) * 100 : 50;
    const expensePercent = totalVolume > 0 ? (monthExpenses / totalVolume) * 100 : 50;

    // Coverage ratio: what % of expenses are covered by incomes
    const coverageRatio = monthExpenses > 0 ? (monthIncomes / monthExpenses) * 100 : (monthIncomes > 0 ? 100 : 0);

    return {
      monthIncomes,
      monthDizimos,
      monthOfertas,
      monthOtherIncomes,
      monthExpenses,
      monthPaidExpenses,
      monthPendingExpenses,
      monthNetBalance,
      incomePercent,
      expensePercent,
      coverageRatio,
      currentMonthCount: currentRecords.length,
    };
  }, [records, currentMonthPrefix]);

  const treasuryPageHref = selectedChurchId
    ? `/dashboard/churches/${selectedChurchId}/ministries/tesouraria`
    : '/dashboard/churches';

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all',
        className
      )}
    >
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 dark:bg-emerald-800 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-xl text-slate-800 dark:text-slate-100 tracking-tight">
                Resumo da Tesouraria
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                Financeiro
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Saldo total consolidado e fluxo de caixa da congregação
            </p>
          </div>
        </div>

        {/* Church Selector & Quick Actions */}
        <div className="flex items-center gap-2.5">
          {churches.length > 1 && (
            <div className="relative">
              <select
                value={selectedChurchId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedChurchId(id);
                  const matched = churches.find(c => c.id === id);
                  if (matched) setSelectedChurchName(matched.name);
                }}
                className="px-3.5 py-2 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                {churches.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => selectedChurchId && fetchRecords(selectedChurchId)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Atualizar Dados"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-emerald-600")} />
          </button>

          <Link
            href={treasuryPageHref}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer group"
          >
            <span>Ver Módulo Completo</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 font-medium">
          Carregando indicadores financeiros da igreja...
        </div>
      ) : (
        <div className="pt-6 space-y-6 relative z-10">
          {/* Main 2-Column Section: Saldo Total Atual vs. Fluxo de Caixa do Mês */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 1. Saldo Total Atual da Igreja (Col 5) */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-linear-to-br from-slate-50 to-slate-100/60 dark:from-slate-800/60 dark:to-slate-800/20 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Saldo Total Atual
                  </span>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                    totalBalanceStats.netBalance >= 0
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                      : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                  )}>
                    {totalBalanceStats.netBalance >= 0 ? "Superávit Acumulado" : "Déficit Acumulado"}
                  </span>
                </div>

                <div className={cn(
                  "text-3xl md:text-4xl font-display font-black tracking-tight",
                  totalBalanceStats.netBalance >= 0
                    ? "text-emerald-800 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}>
                  {formatBRL(totalBalanceStats.netBalance)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Saldo em caixa e contas bancárias da congregação ({selectedChurchName || 'Igreja'})
                </p>
              </div>

              {/* Historical Incomes vs Expenses Mini Cards */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Entradas Histórico
                  </span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {formatBRL(totalBalanceStats.totalAllIncomes)}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Saídas Histórico
                  </span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {formatBRL(totalBalanceStats.totalAllExpenses)}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Fluxo de Caixa do Mês Atual (Col 7) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Fluxo de Caixa — {currentMonthName} / {currentYear}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Resultado do Mês:</span>
                  <span className={cn(
                    "text-xs font-black px-2 py-0.5 rounded-lg",
                    currentMonthCashflow.monthNetBalance >= 0
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                      : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                  )}>
                    {currentMonthCashflow.monthNetBalance >= 0 ? '+' : ''}{formatBRL(currentMonthCashflow.monthNetBalance)}
                  </span>
                </div>
              </div>

              {/* Monthly Incomes & Expenses Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Entradas do Mês */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Entradas do Mês
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div className="text-2xl font-display font-black text-emerald-700 dark:text-emerald-400">
                    {formatBRL(currentMonthCashflow.monthIncomes)}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span>Dízimos:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{formatBRL(currentMonthCashflow.monthDizimos)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Ofertas / Outros:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{formatBRL(currentMonthCashflow.monthOfertas + currentMonthCashflow.monthOtherIncomes)}</strong>
                    </div>
                  </div>
                </div>

                {/* Saídas do Mês */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-400 flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" /> Saídas do Mês
                    </span>
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  </div>

                  <div className="text-2xl font-display font-black text-rose-600 dark:text-rose-400">
                    {formatBRL(currentMonthCashflow.monthExpenses)}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span>Pagas (Liquidadas):</span>
                      <strong className="text-slate-700 dark:text-slate-300">{formatBRL(currentMonthCashflow.monthPaidExpenses)}</strong>
                    </div>
                    {currentMonthCashflow.monthPendingExpenses > 0 ? (
                      <div className="flex justify-between text-amber-600 font-bold">
                        <span>A Pagar (Previstas):</span>
                        <span>{formatBRL(currentMonthCashflow.monthPendingExpenses)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span>A Pagar:</span>
                        <span className="text-slate-400">R$ 0,00</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cashflow Proportion Comparison Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Entradas ({currentMonthCashflow.incomePercent.toFixed(0)}%)
                  </span>
                  <span className="text-rose-700 dark:text-rose-400">
                    Saídas ({currentMonthCashflow.expensePercent.toFixed(0)}%)
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 flex overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-500"
                    style={{ width: `${currentMonthCashflow.incomePercent}%` }}
                    title={`Entradas: ${formatBRL(currentMonthCashflow.monthIncomes)}`}
                  ></div>
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${currentMonthCashflow.expensePercent}%` }}
                    title={`Saídas: ${formatBRL(currentMonthCashflow.monthExpenses)}`}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>
                    {currentMonthCashflow.currentMonthCount} {currentMonthCashflow.currentMonthCount === 1 ? 'lançamento neste mês' : 'lançamentos neste mês'}
                  </span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {currentMonthCashflow.monthExpenses > 0
                      ? `Cobertura de Despesas: ${currentMonthCashflow.coverageRatio.toFixed(0)}%`
                      : 'Sem despesas cadastradas no mês'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Footer Action Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Controle financeiro com permissão e prestação de contas pastoral</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={treasuryPageHref}
                className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Lançar Dízimos, Ofertas ou Despesas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TreasurySummaryWidget;
