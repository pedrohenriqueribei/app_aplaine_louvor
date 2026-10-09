"use client";

import React from "react";
import { Music, Flame, ArrowRight, Disc, RefreshCw } from "lucide-react";
import Link from "next/link";

export interface TopSongItem {
  id: string;
  title: string;
  artist: string;
  key?: string;
  playsThisMonth: number;
  lastPlayed?: string;
}

interface TopPlayedSongsWidgetProps {
  songs?: TopSongItem[];
  forgottenSongsCount?: number;
  onOpenForgottenSongs?: () => void;
}

const defaultTopSongs: TopSongItem[] = [
  { id: "s-1", title: "Bondade de Deus", artist: "Isaías Saad", key: "G", playsThisMonth: 4 },
  { id: "s-2", title: "A Casa É Sua", artist: "Casa Worship", key: "C", playsThisMonth: 3 },
  { id: "s-3", title: "Ruja o Leão", artist: "Talita Catanzaro", key: "D", playsThisMonth: 3 },
  { id: "s-4", title: "Ousado Amor", artist: "Isaías Saad", key: "Gb", playsThisMonth: 2 },
  { id: "s-5", title: "Vitorioso És", artist: "Gabriel Guedes", key: "E", playsThisMonth: 2 },
];

export function TopPlayedSongsWidget({
  songs = defaultTopSongs,
  forgottenSongsCount = 12,
  onOpenForgottenSongs,
}: TopPlayedSongsWidgetProps) {
  const displaySongs = songs && songs.length > 0 ? songs.slice(0, 5) : defaultTopSongs;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* CABEÇALHO DO WIDGET */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center font-bold">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Músicas Mais Tocadas
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Top 5 do mês no Louvor
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Repertório Ativo
          </span>
        </div>

        {/* LISTAGEM DAS 5 MÚSICAS MAIS TOCADAS */}
        <div className="space-y-2 mb-4">
          {displaySongs.map((song, idx) => (
            <div
              key={song.id}
              className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 group hover:border-purple-200 dark:hover:border-purple-800/80 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 text-center text-xs font-black text-slate-400 group-hover:text-purple-800 dark:group-hover:text-purple-400">
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-purple-800 dark:group-hover:text-purple-400 transition-colors">
                    {song.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    {song.artist}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {song.key && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    Tom {song.key}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {song.playsThisMonth}x
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ALERTA DE RESGATE DE MÚSICAS ESQUECIDAS */}
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-3 mb-2 flex items-start gap-2.5">
          <RefreshCw className="w-4 h-4 text-amber-800 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h5 className="text-[11px] font-bold text-amber-900 dark:text-amber-300">
              {forgottenSongsCount} músicas sem tocar há 90+ dias
            </h5>
            <p className="text-[10px] text-amber-800/90 dark:text-amber-400/90 leading-tight mt-0.5">
              Evite tocar sempre os mesmos louvores. Resgate canções consolidadas do acervo.
            </p>
            {onOpenForgottenSongs && (
              <button
                onClick={onOpenForgottenSongs}
                className="mt-1 text-[10px] font-black text-amber-800 dark:text-amber-300 hover:underline inline-flex items-center gap-1"
              >
                <span>Ver lista para resgate</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RODAPÉ DO WIDGET */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <Link
          href="/dashboard/songs"
          className="w-full py-2 px-3 rounded-xl text-center text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>Ver Repertório Completo & Cifras</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
