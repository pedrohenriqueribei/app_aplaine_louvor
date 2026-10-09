"use client";

import React, { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Cake,
  PartyPopper,
  MessageCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  User,
  Heart,
} from "lucide-react";
import Link from "next/link";

export interface BirthdayMemberData {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  day: number;
  month: number;
  formattedDate: string;
  isToday: boolean;
  roleBadge?: string;
  ministry?: string;
  photoUrl?: string;
}

interface BirthdayCarouselProps {
  birthdays: BirthdayMemberData[];
  loading?: boolean;
  currentMonthName?: string;
  churchName?: string;
  onCopyToast?: (name: string) => void;
}

export function BirthdayCarousel({
  birthdays = [],
  loading = false,
  currentMonthName = "Outubro",
  churchName = "Nossa Igreja",
  onCopyToast,
}: BirthdayCarouselProps) {
  const [filterTab, setFilterTab] = useState<"today" | "week" | "month">("month");
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const currentDay = today.getDate();

  // Filtra aniversariantes por aba
  const filteredList = useMemo(() => {
    if (filterTab === "today") {
      return birthdays.filter((b) => b.isToday);
    }
    if (filterTab === "week") {
      return birthdays.filter((b) => {
        // Esta semana: hoje até hoje + 7 dias
        const diff = b.day - currentDay;
        return diff >= 0 && diff <= 7;
      });
    }
    return birthdays;
  }, [birthdays, filterTab, currentDay]);

  const countToday = useMemo(() => birthdays.filter((b) => b.isToday).length, [birthdays]);
  const countWeek = useMemo(
    () =>
      birthdays.filter((b) => {
        const diff = b.day - currentDay;
        return diff >= 0 && diff <= 7;
      }).length,
    [birthdays, currentDay]
  );

  const getGreetingMessage = (b: BirthdayMemberData) => {
    const firstName = b.name.split(" ")[0];
    const ministryText = b.roleBadge ? ` e por sua dedicação no ministério de ${b.roleBadge}` : "";
    return `Olá ${firstName}! A família ${churchName} deseja a você um Feliz Aniversário! 🎉🎂 Louvamos a Deus pela sua vida${ministryText}. Que o Senhor te abençoe ricamente com paz, saúde e unção! Tenha um dia abençoado! 🙏✨`;
  };

  const getWhatsAppUrl = (b: BirthdayMemberData) => {
    if (!b.phone) return null;
    let clean = b.phone.replace(/\D/g, "");
    if (clean.length === 10 || clean.length === 11) {
      clean = "55" + clean;
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(getGreetingMessage(b))}`;
  };

  const handleCopyMessage = (b: BirthdayMemberData) => {
    const text = getGreetingMessage(b);
    navigator.clipboard.writeText(text);
    setCopiedUid(b.uid);
    if (onCopyToast) onCopyToast(b.name);
    setTimeout(() => {
      setCopiedUid(null);
    }, 2500);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6">
      {/* HEADER DO CARROSSEL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
            <Cake className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">
                Acolhimento & Comunhão
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300">
                {currentMonthName}
              </span>
              {birthdays.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {birthdays.length} aniversariantes
                </span>
              )}
            </div>
            <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
              Aniversariantes do Dia & da Semana
            </h3>
          </div>
        </div>

        {/* ABAS INTERATIVAS + CONTROLES DE SCROLL */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterTab("today")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                filterTab === "today"
                  ? "bg-pink-600 text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <span>Hoje</span>
              {countToday > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setFilterTab("week")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTab === "week"
                  ? "bg-pink-600 text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Esta Semana ({countWeek})
            </button>
            <button
              onClick={() => setFilterTab("month")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTab === "month"
                  ? "bg-pink-600 text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Mês Completo ({birthdays.length})
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={scrollLeft}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Rolar para esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollRight}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Rolar para direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CARROSSEL HORIZONTAL DE CARDS */}
      {loading ? (
        <div className="p-10 flex items-center justify-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold">Carregando aniversariantes...</span>
        </div>
      ) : filteredList.length > 0 ? (
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth"
        >
          {filteredList.map((member, idx) => {
            const whatsappUrl = getWhatsAppUrl(member);
            const isCopied = copiedUid === member.uid;
            const diffDays = member.day - currentDay;

            let relativeBadge = `Dia ${member.day}`;
            if (member.isToday) relativeBadge = "Hoje! 🎉";
            else if (diffDays === 1) relativeBadge = "Amanhã ✨";
            else if (diffDays > 1 && diffDays <= 7) relativeBadge = `Em ${diffDays} dias`;

            return (
              <motion.div
                key={member.uid}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04 }}
                className={`min-w-[280px] sm:min-w-[320px] max-w-[340px] p-5 rounded-3xl border transition-all shrink-0 flex flex-col justify-between relative overflow-hidden group ${
                  member.isToday
                    ? "bg-gradient-to-br from-pink-500/15 via-rose-500/10 to-amber-500/10 dark:from-pink-950/40 dark:via-rose-950/30 dark:to-amber-950/30 border-pink-400 dark:border-pink-600 shadow-xl shadow-pink-500/10 ring-2 ring-pink-400/40"
                    : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:border-pink-300 dark:hover:border-pink-800/80 hover:shadow-md"
                }`}
              >
                <div>
                  {/* CABEÇALHO DO CARD */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black tracking-wide border ${
                        member.isToday
                          ? "bg-pink-600 text-white border-pink-500 shadow-sm shadow-pink-600/30 animate-pulse"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {relativeBadge}
                    </span>

                    {member.roleBadge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 truncate max-w-[130px]">
                        {member.roleBadge}
                      </span>
                    )}
                  </div>

                  {/* INFO DO ANIVERSARIANTE */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-xs transition-transform group-hover:scale-105 ${
                        member.isToday
                          ? "bg-pink-500 text-white shadow-pink-500/30"
                          : "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 border border-slate-200 dark:border-slate-600"
                      }`}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/members/${member.uid}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-pink-600 dark:hover:text-pink-400 transition-colors block truncate text-sm"
                      >
                        {member.name}
                      </Link>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {member.phone || member.email || "Sem contato cadastrado"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO: WHATSAPP DIRETO & COPIAR */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopyMessage(member)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCopied
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                    }`}
                    title="Copiar mensagem personalizada de felicitações"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>

                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                        member.isToday
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white"
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{member.isToday ? "Parabenizar!" : "WhatsApp"}</span>
                    </a>
                  ) : (
                    <Link
                      href={`/dashboard/members/${member.uid}`}
                      className="text-[11px] text-pink-600 dark:text-pink-400 font-bold hover:underline"
                    >
                      + Telefone
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-10 text-center text-slate-400 space-y-2">
          <PartyPopper className="w-10 h-10 mx-auto text-pink-400 opacity-60" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Nenhum aniversariante encontrado neste período
          </h4>
          <p className="text-xs text-slate-400">
            {filterTab === "today"
              ? "Não temos integrantes celebrando aniversário hoje. Clique na aba 'Esta Semana' ou 'Mês Completo'."
              : filterTab === "week"
                ? "Nenhum aniversário nos próximos 7 dias. Veja o mês completo!"
                : "Cadastre a data de nascimento dos membros para visualizar aqui."}
          </p>
          {filterTab !== "month" && (
            <button
              onClick={() => setFilterTab("month")}
              className="mt-2 text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
            >
              Ver todos do mês ({birthdays.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
