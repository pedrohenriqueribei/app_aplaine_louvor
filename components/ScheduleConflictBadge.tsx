"use client";

import React, { useState } from "react";
import { AlertTriangle, Users, Calendar, X, AlertCircle } from "lucide-react";
import { ScheduleConflictSummary } from "@/lib/scheduleConflicts";

interface ScheduleConflictBadgeProps {
  summary?: ScheduleConflictSummary | null;
  size?: "sm" | "md" | "lg";
  variant?: "pill" | "badge" | "iconOnly";
  className?: string;
  onOpenDetails?: () => void;
}

export function ScheduleConflictBadge({
  summary,
  size = "md",
  variant = "pill",
  className = "",
  onOpenDetails,
}: ScheduleConflictBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  if (!summary || !summary.hasConflict || summary.conflicts.length === 0) {
    return null;
  }

  const conflictCount = summary.conflicts.length;
  const isMultiple = conflictCount > 1;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onOpenDetails) {
      onOpenDetails();
    } else {
      setShowModal(true);
    }
  };

  const renderBadge = () => {
    if (variant === "iconOnly") {
      return (
        <button
          type="button"
          onClick={handleClick}
          title={summary.tooltipText}
          className={`inline-flex items-center justify-center p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer animate-pulse ${className}`}
        >
          <AlertTriangle className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </button>
      );
    }

    if (variant === "badge") {
      return (
        <button
          type="button"
          onClick={handleClick}
          title={summary.tooltipText}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
          <span>Conflito ({conflictCount})</span>
        </button>
      );
    }

    // Default "pill"
    return (
      <button
        type="button"
        onClick={handleClick}
        title={summary.tooltipText}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/35 dark:border-amber-500/30 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer group ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:rotate-12 transition-transform" />
        <span className="truncate max-w-[200px]">
          {isMultiple
            ? `${conflictCount} em 2 Ministérios`
            : `Conflito: ${summary.shortLabel}`}
        </span>
      </button>
    );
  };

  return (
    <>
      {renderBadge()}

      {/* Modal explicativo ao clicar no alerta */}
      {showModal && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-[2rem] border border-amber-200 dark:border-amber-800/60 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Alerta de Conflito de Escala
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Integrante em 2 Ministérios
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explicação */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              O sistema identificou voluntário(s) escalado(s) simultaneamente em ministérios distintos para a mesma data e período.
            </p>

            {/* Lista dos integrantes em conflito */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {summary.conflicts.map((conflict, idx) => (
                <div
                  key={`${conflict.memberId}-${idx}`}
                  className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {conflict.memberName}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {conflict.periodLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {conflict.assignments.map((ass, aIdx) => (
                      <span
                        key={aIdx}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                      >
                        <strong className="text-amber-600 dark:text-amber-400">{ass.ministryLabel}:</strong> {ass.roleLabel}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Dica de Ação */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
              <span>
                <strong>Orientação:</strong> Recomendamos alinhar com os líderes ministeriais para redistribuir uma das funções e evitar sobrecarga durante o culto.
              </span>
            </div>

            {/* Botão de Fechar */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
