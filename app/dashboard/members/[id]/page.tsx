'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Mail, Phone, Music, Mic2, Shield, 
  Calendar, CheckCircle2, XCircle, User, Edit2, Waves 
} from 'lucide-react';

interface Musician {
  uid: string;
  name: string;
  email: string;
  phone: string;
  instruments: string[];
  vocalRange: string;
  level?: string;
  churchId?: string;
  role: 'líder' | 'instrumentista';
  status: 'active' | 'inactive';
  createdAt: any;
}

export default function MusicianProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [musician, setMusician] = useState<Musician | null>(null);
  const [churchName, setChurchName] = useState<string>('---');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMusician() {
      if (!id) return;
      try {
        const docRef = doc(db, 'users', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Musician;
          setMusician(data);
          
          if (data.churchId) {
            const churchRef = doc(db, 'churches', data.churchId);
            const churchSnap = await getDoc(churchRef);
            if (churchSnap.exists()) {
              setChurchName(churchSnap.data().name);
            }
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchMusician();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!musician) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">Músico não encontrado</h2>
        <button 
          onClick={() => router.back()}
          className="mt-4 text-blue-800 font-bold hover:underline flex items-center gap-2 mx-auto"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-800 font-bold transition-all group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>Voltar para Listagem</span>
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden"
      >
        {/* Header/Cover */}
        <div className="h-48 bg-gradient-to-r from-blue-800 to-indigo-900 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,#ffffff_0,transparent_70%)]" />
        </div>

        {/* Profile Content */}
        <div className="relative px-8 md:px-12 pb-12">
          {/* Avatar Area */}
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 mb-10">
            <div className="w-32 h-32 bg-white rounded-[2.5rem] p-2 shadow-2xl">
              <div className="w-full h-full bg-slate-50 rounded-[2rem] flex items-center justify-center text-blue-800 text-4xl font-black border border-slate-100">
                {musician.name.charAt(0)}
              </div>
            </div>
            <div className="pb-4">
              <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight flex items-center gap-3">
                {musician.name}
                {musician.status === 'active' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-slate-300" />
                )}
              </h1>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <Shield className={`w-4 h-4 ${musician.role === 'líder' ? 'text-amber-500' : 'text-blue-400'}`} />
                {musician.role === 'líder' ? 'Líder de Ministério' : 'Instrumentista Integrante'}
              </p>
            </div>
            <div className="md:ml-auto pb-4">
               <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
                 <Edit2 className="w-4 h-4" />
                 Editar Perfil
               </button>
            </div>
          </div>

          {/* Grid Information */}
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <section>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Contatos</h3>
                <div className="space-y-4">
                  <InfoItem icon={Mail} label="E-mail" value={musician.email} />
                  <InfoItem icon={Phone} label="Telefone" value={musician.phone || 'Não informado'} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Ministério</h3>
                <div className="space-y-4">
                  <InfoItem icon={User} label="Função" value={musician.role === 'líder' ? 'Líder' : 'Instrumentista'} />
                  <InfoItem icon={Waves} label="Ministério" value={churchName} />
                  <InfoItem icon={Calendar} label="Membro desde" value={musician.createdAt?.toDate().toLocaleDateString('pt-BR') || '---'} />
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Habilidades Musicais</h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Music className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold">Instrumentos</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {musician.instruments && musician.instruments.length > 0 ? (
                        musician.instruments.map(inst => (
                          <span key={inst} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 italic">
                            {inst}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-sm italic">Nenhum instrumento selecionado</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mic2 className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-bold">Vocal</span>
                    </div>
                    {musician.vocalRange ? (
                      <span className="inline-block px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">
                        {musician.vocalRange}
                      </span>
                    ) : (
                      <p className="text-slate-400 text-sm italic">Não definido</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold">Nível</span>
                    </div>
                    {musician.level ? (
                      <span className="inline-block px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 capitalize">
                        {musician.level}
                      </span>
                    ) : (
                      <p className="text-slate-400 text-sm italic">Não informado</p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-slate-800 font-bold">{value}</p>
      </div>
    </div>
  );
}
