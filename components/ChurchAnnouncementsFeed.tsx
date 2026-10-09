"use client";

import React, { useState } from "react";
import {
  Bell,
  Pin,
  Share2,
  Calendar,
  Sparkles,
  ChevronRight,
  MessageCircle,
  Plus,
} from "lucide-react";

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: "Geral" | "Louvor" | "Dança" | "Secretaria" | "Liderança";
  date: string;
  author: string;
  isPinned?: boolean;
}

const defaultAnnouncements: AnnouncementItem[] = [
  {
    id: "ann-1",
    title: "Ensaio Geral Integrado: Louvor & Dança",
    content: "Nesta quinta-feira às 19:30 no Templo Principal para alinhamento do culto de celebração.",
    category: "Geral",
    date: "Hoje às 14h",
    author: "Liderança de Culto",
    isPinned: true,
  },
  {
    id: "ann-2",
    title: "Prazo para Envio de Disponibilidade",
    content: "Lembre-se de preencher suas datas do próximo mês no app até o dia 25 para fechamento da grade.",
    category: "Secretaria",
    date: "Ontem",
    author: "Secretaria",
    isPinned: false,
  },
  {
    id: "ann-3",
    title: "Alinhamento Pré-Culto de Domingo",
    content: "Oração e consagração de todas as equipes escaladas pontualmente às 08:30 na sala de ministração.",
    category: "Liderança",
    date: "Há 2 dias",
    author: "Pastoral",
    isPinned: false,
  },
];

interface ChurchAnnouncementsFeedProps {
  announcements?: AnnouncementItem[];
  onShareWhatsApp?: (announcement: AnnouncementItem) => void;
}

export function ChurchAnnouncementsFeed({
  announcements = defaultAnnouncements,
  onShareWhatsApp,
}: ChurchAnnouncementsFeedProps) {
  const [items] = useState<AnnouncementItem[]>(announcements);

  const handleShare = (item: AnnouncementItem) => {
    if (onShareWhatsApp) {
      onShareWhatsApp(item);
      return;
    }
    const message = `📢 *${item.title}*\n${item.content}\n\n_Por: ${item.author} (${item.date})_\n*Applane • Gestão da Igreja*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Louvor":
        return "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Dança":
        return "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "Secretaria":
        return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Liderança":
        return "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* CABEÇALHO DO WIDGET */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-800/10 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Últimos Avisos da Igreja
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Mural interno de comunicados
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-850">
            Atualizado
          </span>
        </div>

        {/* LISTAGEM DE AVISOS */}
        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                item.isPinned
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40"
                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.isPinned && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-800 text-white">
                      <Pin className="w-2.5 h-2.5 fill-current" />
                      Fixado
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(
                      item.category
                    )}`}
                  >
                    {item.category}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  {item.date}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug mb-1">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                {item.content}
              </p>

              <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">
                  {item.author}
                </span>
                <button
                  onClick={() => handleShare(item)}
                  title="Compartilhar no WhatsApp"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Enviar no Zap</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RODAPÉ DO WIDGET */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <button
          onClick={() => {
            const text = "Aviso da Igreja: A paz do Senhor a todos! Segue o link com as últimas atualizações de ministérios e escalas no Applane.";
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
          }}
          className="w-full py-2 px-3 rounded-xl text-center text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>Disparar Informativo no WhatsApp</span>
          <Share2 className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
