'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Church, MapPin, User as PastorIcon, Users, 
  Music, Mic2, Shield, Calendar, Mail, Phone, ExternalLink, Waves,
  Copy, Check
} from 'lucide-react';
import Link from 'next/link';

interface Musician {
  uid: string;
  name: string;
  email: string;
  instrument?: string;
  instruments?: string[];
  vocalRange?: string;
  level?: string;
  role: 'líder' | 'instrumentista';
  status: 'active' | 'inactive';
}

interface ChurchType {
  id: string;
  name: string;
  address: string;
  pastor: string;
}

export default function ChurchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [church, setChurch] = useState<ChurchType | null>(null);
  const [members, setMembers] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/register?churchId=${id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Church
        const churchDoc = await getDoc(doc(db, 'churches', id as string));
        if (churchDoc.exists()) {
          setChurch({ ...churchDoc.data() } as ChurchType);
        }

        // Fetch Members
        const q = query(
          collection(db, 'users'), 
          where('churchId', '==', id),
          orderBy('name', 'asc')
        );
        const memberSnap = await getDocs(q);
        setMembers(memberSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Musician)));

      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `churches/${id}`);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-800 rounded-full animate-spin"></div>
          <div className="absolute inset-x-0 top-20 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
        <Church className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Igreja não encontrada</h2>
        <button onClick={() => router.back()} className="text-blue-800 dark:text-blue-400 font-bold flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </div>
    );
  }

  // Define instruments and vocal ranges for grouping
  const groupMembers = () => {
    const groups: { [key: string]: Musician[] } = {};

    members.forEach(m => {
      // If has instruments list
      if (m.instruments && m.instruments.length > 0) {
        m.instruments.forEach(inst => {
          if (!groups[inst]) groups[inst] = [];
          groups[inst].push(m);
        });
      } else if (m.instrument) {
        // Legacy single instrument
        if (!groups[m.instrument]) groups[m.instrument] = [];
        groups[m.instrument].push(m);
      }

      // Vocal range
      if (m.vocalRange) {
        if (!groups[m.vocalRange]) groups[m.vocalRange] = [];
        // Prevent duplicate if already added by instrument? 
        // No, user requested "vocal type" to be visible too.
        groups[m.vocalRange].push(m);
      }

      // If nothing defined
      if (!m.instruments?.length && !m.instrument && !m.vocalRange) {
        if (!groups['Outros']) groups['Outros'] = [];
        groups['Outros'].push(m);
      }
    });

    return groups;
  };

  const groupedData = groupMembers();

  return (
    <div className="max-w-6xl space-y-12 pb-20">
      <header className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-blue-800 dark:hover:text-blue-400 font-bold transition-colors group"
        >
          <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover:border-blue-100 dark:group-hover:border-blue-900 group-hover:shadow-lg transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span>Voltar para Igrejas</span>
        </button>
      </header>

      <section className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 dark:bg-blue-900/10 blur-[120px] -mr-48 -mt-48 opacity-50"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-start md:items-center">
          <div className="w-24 h-24 bg-blue-800 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-800/30">
            <Church size={40} />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/50">
                Ministério de Louvor
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-tight">
              {church.name}
            </h1>
            <div className="flex flex-wrap gap-8 pt-4">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
                <PastorIcon className="w-5 h-5 text-blue-400 dark:text-blue-500" />
                <span>{church.pastor || 'Pastor não informado'}</span>
              </div>
              <div className="flex items-start gap-3 text-slate-500 dark:text-slate-400 font-medium max-w-md">
                <MapPin className="w-5 h-5 text-blue-400 dark:text-blue-500 mt-0.5 shrink-0" />
                <span>{church.address || 'Endereço não informado'}</span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-auto flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800 rounded-[3rem] border border-white dark:border-slate-700">
            <div className="text-4xl font-display font-black text-blue-800 dark:text-blue-400 mb-1">{members.length}</div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Integrantes</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          <h2 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 flex items-center gap-4">
            <Users className="w-6 h-6 text-blue-800 dark:text-blue-400" />
            Integrantes por Categoria
          </h2>

          <div className="space-y-6">
            {Object.keys(groupedData).length > 0 ? (
              Object.entries(groupedData).map(([group, list]) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={group} 
                  className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                      {group.includes('Soprano') || group.includes('Contralto') || group.includes('Mezzo') || group.includes('Baixo') || group.includes('Tenor') || group.includes('Barítono') ? (
                        <Mic2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Music className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                      )}
                    </div>
                    <h3 className="font-display font-black text-slate-800 dark:text-slate-100 text-lg capitalize">{group}</h3>
                    <span className="ml-auto text-[10px] font-bold text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">{list.length}</span>
                  </div>

                  <div className="space-y-4">
                    {list.map(m => (
                      <Link 
                        key={m.uid} 
                        href={`/dashboard/members/${m.uid}`}
                        className="group flex items-center gap-4 p-4 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                      >
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-900 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                          {m.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">{m.name}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 capitalize">{m.role} {m.level ? `• ${m.level}` : ''}</div>
                        </div>
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-blue-800 dark:text-blue-400 shadow-sm">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-12 text-center border border-dashed border-slate-200 dark:border-slate-800">
                <Users className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum integrante vinculado a esta igreja ainda.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-12">
          <section className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] -mb-32 -mr-32"></div>
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-10">Informações Rápidas</h3>
            
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <PastorIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pastor Responsável</div>
                  <div className="font-display font-bold text-lg">{church.pastor || '---'}</div>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Localização</div>
                  <div className="font-display font-bold text-lg leading-snug">{church.address || '---'}</div>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Líderes de Louvor</div>
                  <div className="font-display font-bold text-lg">
                    {members.filter(m => m.role === 'líder').length} Integrantes
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-blue-600 rounded-[3.5rem] p-12 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
           <Waves className="absolute right-0 bottom-0 text-white/5 transform translate-x-1/4 translate-y-1/4 scale-150" size={300} />
           <div className="relative z-10">
              <h3 className="text-2xl font-display font-black leading-tight mb-6">Convite para<br />Integrantes</h3>
              <p className="text-blue-100 text-sm mb-10 leading-relaxed font-medium">
                Deseja adicionar mais músicos ou vocalistas a esta igreja? Compartilhe o link de convite ou realize o cadastro manual.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard/members" className="inline-flex items-center gap-3 bg-white text-blue-800 px-8 py-4 rounded-[2rem] font-bold shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all">
                  Cadastrar Manualmente
                </Link>
                <button 
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-3 px-8 py-4 rounded-[2rem] font-bold transition-all hover:scale-105 active:scale-95 border ${
                    copied 
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-xl shadow-emerald-500/20' 
                      : 'bg-blue-700/50 text-white border-white/20 hover:bg-blue-700 shadow-xl shadow-black/10'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" /> Link Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" /> Copiar Link Convite
                    </>
                  )}
                </button>
              </div>
           </div>
          </section>
        </div>
      </div>
    </div>
  );
}
