"use client";

import React from "react";
import { Check, ShieldCheck, Sparkles } from "lucide-react";

interface VerifiedBadgeProps {
  verified?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  tooltipText?: string;
}

export function VerifiedBadge({
  verified = false,
  size = "sm",
  showText = false,
  className = "",
  tooltipText = "E-mail verificado ✓",
}: VerifiedBadgeProps) {
  if (!verified) return null;

  const sizeClasses = {
    xs: "w-3.5 h-3.5 text-[9px]",
    sm: "w-4 h-4 text-[10px]",
    md: "w-5 h-5 text-xs",
    lg: "w-6 h-6 text-sm",
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-2.5 h-2.5",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 align-middle select-none group relative ${className}`}
      title={tooltipText}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-800 to-indigo-600 text-white font-black shadow-xs shadow-blue-500/30 ${sizeClasses[size]}`}
      >
        <Check className={`${iconSizes[size]} stroke-[3.5]`} />
      </span>

      {showText && (
        <span className="text-[11px] font-bold text-blue-800 dark:text-blue-400">
          Verificado
        </span>
      )}

      {/* Hover tooltip for clarity */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap shadow-lg z-30">
        {tooltipText}
      </span>
    </span>
  );
}
