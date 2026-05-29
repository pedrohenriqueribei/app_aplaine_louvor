"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Mail,
  Phone,
  Music,
  Mic2,
  Shield,
  Calendar,
  CheckCircle2,
  XCircle,
  User,
  Edit2,
  Waves,
  Youtube,
  ChevronRight,
} from "lucide-react";

interface Musician {
  uid: string;
  name: string;
  email: string;
  phone: string;
  instruments: string[];
  vocalRange: string;
  level?: string;
  churchId?: string;
  role?: string;
  roles?: {
    worship?: string[];
    secretariat?: string[];
    multimedia?: string[];
  };
  status: "active" | "inactive";
  createdAt: any;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  link: string;
}

interface Band {
  id: string;
  name: string;
  churchId: string;
}

export default function MusicianProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [musician, setMusician] = useState<Musician | null>(null);
  const [churchName, setChurchName] = useState<string>("---");
  const [songs, setSongs] = useState<Song[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "songs">("info");

  useEffect(() => {
    async function fetchMusician() {
      if (!id) return;
      try {
        const docRef = doc(db, "users", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Musician;
          setMusician(data);

          if (data.churchId) {
            const churchRef = doc(db, "churches", data.churchId);
            const churchSnap = await getDoc(churchRef);
            if (churchSnap.exists()) {
              setChurchName(churchSnap.data().name);
            }
          }

          // Fetch songs for this user
          const songsQuery = query(
            collection(db, "songs"),
            where("ownerId", "==", id),
            orderBy("createdAt", "desc"),
          );
          const songsSnap = await getDocs(songsQuery);
          setSongs(
            songsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Song),
          );

          // Fetch bands this user is part of
          const bandsQuery = query(
            collection(db, "bands"),
            where("memberIds", "array-contains", id),
          );
          const bandsSnap = await getDocs(bandsQuery);
          setBands(
            bandsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Band),
          );
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
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          Músico não encontrado
        </h2>
        <button
          onClick={() => router.back()}
          className="text-blue-800 dark:text-blue-400 font-bold hover:underline flex items-center gap-2 mx-auto"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
      </div>
    );
  }

  const isLeader = musician.roles?.worship?.includes("leader") || musician.roles?.multimedia?.includes("leader") || musician.roles?.secretariat?.includes("leader");
  const isMultimedia = (musician.roles?.multimedia?.length ?? 0) > 0;
  const isSecretariat = (musician.roles?.secretariat?.length ?? 0) > 0;

  let displayRole = "Instrumentista Integrante";
  let displayRoleShort = "Instrumentista";
  let shieldColor = "text-blue-400";

  if (isLeader) {
    displayRole = "Líder de Ministério";
    displayRoleShort = "Líder";
    shieldColor = "text-amber-500";
  } else if (isMultimedia) {
    displayRole = "Multimídia";
    displayRoleShort = "Multimídia";
    shieldColor = "text-purple-500";
  } else if (isSecretariat) {
    displayRole = "Secretaria";
    displayRoleShort = "Secretaria";
    shieldColor = "text-slate-500";
  } else if (musician.vocalRange && musician.vocalRange.trim().length > 0) {
    displayRole = `Vocal (${musician.vocalRange})`;
    displayRoleShort = musician.vocalRange;
    shieldColor = "text-pink-500";
  } else if (musician.instruments?.includes("Voz")) {
    displayRole = "Vocal Integrante";
    displayRoleShort = "Vocal";
    shieldColor = "text-pink-500";
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
        className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
      >
        {/* Header/Cover */}
        <div className="h-48 bg-gradient-to-r from-blue-800 to-indigo-900 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,#ffffff_0,transparent_70%)]" />
        </div>

        {/* Profile Content */}
        <div className="relative px-8 md:px-12 pb-12">
          {/* Avatar Area */}
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 mb-10">
            <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-[2.5rem] p-2 shadow-2xl">
              <div className="w-full h-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-blue-800 dark:text-blue-400 text-4xl font-black border border-slate-100 dark:border-slate-700">
                {musician.name.charAt(0)}
              </div>
            </div>
            <div className="pb-4">
              <h1 className="text-4xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                {musician.name}
                {musician.status === "active" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                )}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                <Shield
                  className={`w-4 h-4 ${shieldColor}`}
                />
                {displayRole}
              </p>
            </div>
            <div className="md:ml-auto pb-4">
              <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
                <Edit2 className="w-4 h-4" />
                Editar Perfil
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-slate-100 dark:border-slate-800 mb-12">
            <button
              onClick={() => setActiveTab("info")}
              className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
                activeTab === "info"
                  ? "text-blue-800 dark:text-blue-400"
                  : "text-slate-300 dark:text-slate-700"
              }`}
            >
              Informações
              {activeTab === "info" && (
                <motion.div
                  layoutId="tab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-800 dark:bg-blue-400 rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("songs")}
              className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${
                activeTab === "songs"
                  ? "text-blue-800 dark:text-blue-400"
                  : "text-slate-300 dark:text-slate-700"
              }`}
            >
              Músicas
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === "songs"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {songs.length}
              </span>
              {activeTab === "songs" && (
                <motion.div
                  layoutId="tab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-800 dark:bg-blue-400 rounded-full"
                />
              )}
            </button>
          </div>

          {activeTab === "info" ? (
            /* Grid Information */
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <section>
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                    Contatos
                  </h3>
                  <div className="space-y-4">
                    <InfoItem
                      icon={Mail}
                      label="E-mail"
                      value={musician.email}
                    />
                    <InfoItem
                      icon={Phone}
                      label="Telefone"
                      value={musician.phone || "Não informado"}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                    Ministério
                  </h3>
                  <div className="space-y-4">
                    <InfoItem
                      icon={User}
                      label="Função"
                      value={displayRoleShort}
                    />
                    <InfoItem
                      icon={Waves}
                      label="Ministério"
                      value={churchName}
                    />
                    <InfoItem
                      icon={Calendar}
                      label="Membro desde"
                      value={
                        musician.createdAt
                          ?.toDate()
                          .toLocaleDateString("pt-BR") || "---"
                      }
                    />
                  </div>
                </section>

                {bands.length > 0 && (
                  <section>
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                      Bandas / Grupos
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {bands.map((band) => (
                        <div
                          key={band.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl"
                        >
                          <Music className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {band.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <div className="space-y-8">
                {musician.roles?.multimedia && musician.roles.multimedia.filter(s => s !== "leader").length > 0 && (
                  <section>
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                      Habilidades de Multimídia
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {musician.roles.multimedia.filter(s => s !== "leader").map((skill) => {
                        const translated = 
                          skill === "audio_operator" || skill === "audio" || skill === "sound" ? "Operador de Áudio" :
                          skill === "pc_operator" || skill === "projection" ? "Operador de PC / Projeção" :
                          skill === "social_media_operator" || skill === "social_media_manager" ? "Redes Sociais" :
                          skill === "camera_operator" || skill === "camera" || skill === "video" ? "Operador de Câmera" :
                          skill === "photography_operator" || skill === "photography" ? "Fotografia" :
                          skill === "lights" || skill === "illumination" ? "Iluminação" :
                          skill === "multimedia_leader" ? "Líder de Multimídia" :
                          skill.charAt(0).toUpperCase() + skill.slice(1);
                        return (
                          <span
                            key={skill}
                            className="px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl text-xs font-bold border border-purple-100 dark:border-purple-800 uppercase"
                          >
                            {translated}
                          </span>
                        );
                      })}
                    </div>
                  </section>
                )}

                {((musician.instruments && musician.instruments.length > 0) || musician.vocalRange || musician.level) && (
                  <section>
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                      Habilidades Musicais
                    </h3>
                    <div className="space-y-6">
                      {musician.instruments && musician.instruments.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Music className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-bold">Instrumentos</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {musician.instruments.map((inst) => (
                              <span
                                key={inst}
                                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-800 italic"
                              >
                                {inst}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {musician.vocalRange && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Mic2 className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-bold">Vocal</span>
                          </div>
                          <span className="inline-block px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-100 dark:border-indigo-800">
                            {musician.vocalRange}
                          </span>
                        </div>
                      )}

                      {musician.level && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Shield className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-bold">Nível</span>
                          </div>
                          <span className="inline-block px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-800 capitalize">
                            {musician.level}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : (
            /* Songs Tab */
            <div className="space-y-6">
              {songs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {songs.map((song) => (
                    <div
                      key={song.id}
                      className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 group hover:border-blue-200 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-800 shadow-sm">
                          <Music size={20} />
                        </div>
                        <a
                          href={song.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-800 transition-colors"
                        >
                          <Youtube size={18} />
                        </a>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">
                        {song.title}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-4">
                        {song.artist}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
                          Tom: {song.key}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-200 dark:text-slate-700 group-hover:text-blue-800 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Music className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Nenhuma música cadastrada ainda.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-slate-800 dark:text-slate-100 font-bold">{value}</p>
      </div>
    </div>
  );
}
