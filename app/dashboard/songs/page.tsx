'use client';

import React, { useEffect, useState } from 'react';
import { 
  Music, Plus, Search, MoreVertical, ExternalLink, 
  Trash2, Edit2, X, Check, Youtube, Music2, 
  BarChart2, Clock, Tags, FileText, ChevronRight,
  Sparkles, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  collection, query, where, getDocs, addDoc, 
  updateDoc, deleteDoc, doc, setDoc, serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

interface Song {
  id: string;
  title: string;
  artist: string;
  sheet: string;
  key: string;
  link: string;
  bpm: string;
  timeSignature: string;
  tags: string[];
  observations: string;
  ownerId: string;
  createdAt: any;
}

const AVAILABLE_TAGS = [
  'celebração', 'adoração', 'oração', 
  'Santa ceia', 'abertura', 'oferta'
];

export default function SongsPage() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [viewingSong, setViewingSong] = useState<Song | null>(null);
  const [searchingKey, setSearchingKey] = useState(false);
  const [searchingSheet, setSearchingSheet] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    sheet: '',
    key: '',
    link: '',
    bpm: '',
    timeSignature: '',
    tags: [] as string[],
    observations: ''
  });

  useEffect(() => {
    if (user) {
      fetchSongs();
    }
  }, [user]);

  async function fetchSongs() {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'songs'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const songsList = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Song));
      setSongs(songsList);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'songs');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingSong) {
        const songRef = doc(db, 'songs', editingSong.id);
        await updateDoc(songRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        const songRef = doc(collection(db, 'songs'));
        const songData = {
          ...formData,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          id: songRef.id
        };
        await setDoc(songRef, songData);
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchSongs();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'songs');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta música?')) return;
    try {
      await deleteDoc(doc(db, 'songs', id));
      fetchSongs();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `songs/${id}`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      artist: '',
      sheet: '',
      key: '',
      link: '',
      bpm: '',
      timeSignature: '',
      tags: [],
      observations: ''
    });
    setEditingSong(null);
  };
  
  const fetchOriginalKey = async () => {
    if (!formData.title || !formData.artist) {
      alert('Preencha o título e o artista primeiro para buscar os dados originais.');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      alert('Configuração de IA não encontrada. Por favor, verifique se a chave API está configurada.');
      return;
    }

    setSearchingKey(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analise a música "${formData.title}" do artista "${formData.artist}" e retorne o tom original (key), BPM aproximado e o compasso (time signature).`;
      
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING, description: "Tom original (Ex: G, Am, D#m)" },
              bpm: { type: Type.STRING, description: "Batidas por minuto (Ex: 120)" },
              timeSignature: { type: Type.STRING, description: "Compasso (Ex: 4/4)" }
            },
            required: ["key"]
          }
        }
      });

      const text = response.text?.trim() || "{}";
      try {
        const result = JSON.parse(text);
        setFormData(prev => ({ 
          ...prev, 
          key: result.key || prev.key,
          bpm: result.bpm || prev.bpm,
          timeSignature: result.timeSignature || prev.timeSignature
        }));
      } catch (parseError) {
        console.error('JSON Parse error:', parseError, 'Raw text:', text);
        // Fallback for simple key extraction if JSON parse fails despite Schema
        if (text.length < 10 && text !== '{}') {
          setFormData(prev => ({ ...prev, key: text }));
        } else {
          throw new Error('Não foi possível processar os dados da música.');
        }
      }
    } catch (error: any) {
      console.error('Error fetching song data:', error);
      if (error?.message?.includes('API key not valid') || error?.status === 'INVALID_ARGUMENT') {
        alert('Erro de Chave API: A chave configurada parece ser inválida ou não tem permissão para este modelo. Por favor, verifique as configurações do projeto.');
      } else {
        alert('Ocorreu um erro ao buscar os dados da música. Tente novamente em instantes.');
      }
    } finally {
      setSearchingKey(false);
    }
  };

  const fetchChordSheet = async () => {
    if (!formData.title || !formData.artist) {
      alert('Preencha o título e o artista primeiro para buscar a cifra.');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      alert('Configuração de IA não encontrada.');
      return;
    }

    setSearchingSheet(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Busque a letra e os acordes (cifra) da música "${formData.title}" do artista "${formData.artist}" no seu tom original.
      Retorne a cifra formatada para leitura clara, com os acordes sobre as palavras ou entre parênteses conforme o padrão de cifras.
      Responda APENAS o conteúdo da cifra, sem explicações.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
      });

      const result = response.text?.trim() || "";
      if (result && result.length > 20) {
        setFormData(prev => ({ ...prev, sheet: result }));
      } else {
        alert('Não consegui encontrar uma cifra detalhada para esta música.');
      }
    } catch (error) {
      console.error('Error fetching sheet:', error);
      alert('Erro ao buscar a cifra. Por favor, tente novamente.');
    } finally {
      setSearchingSheet(false);
    }
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const filteredSongs = songs.filter(song => {
    const matchesSearch = 
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = !selectedTag || song.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  if (!user) return null;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative flex-1 w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por título, artista ou tag..." 
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-800 transition-all text-slate-700 dark:text-slate-200 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="w-full md:w-auto flex items-center justify-center gap-3 bg-blue-800 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-800/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          Adicionar Música
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
            !selectedTag
              ? 'bg-blue-800 border-blue-800 text-white shadow-lg shadow-blue-800/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:border-slate-300'
          }`}
        >
          Todas
        </button>
        {AVAILABLE_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
              selectedTag === tag
                ? 'bg-blue-800 border-blue-800 text-white shadow-lg shadow-blue-800/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:border-slate-300'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 h-64 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 animate-pulse"></div>
          ))}
        </div>
      ) : filteredSongs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredSongs.map((song, idx) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden cursor-pointer"
                onClick={() => setViewingSong(song)}
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-800 dark:text-blue-400">
                      <Music className="w-6 h-6" />
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setEditingSong(song);
                           setFormData({
                             title: song.title,
                             artist: song.artist,
                             sheet: song.sheet || '',
                             key: song.key,
                             link: song.link,
                             bpm: song.bpm || '',
                             timeSignature: song.timeSignature || '',
                             tags: song.tags || [],
                             observations: song.observations || ''
                           });
                           setIsModalOpen(true);
                         }}
                         className="p-2 text-slate-300 dark:text-slate-700 hover:text-blue-800 dark:hover:text-blue-400 transition-colors"
                       >
                         <Edit2 size={18} />
                       </button>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           handleDelete(song.id);
                         }}
                         className="p-2 text-slate-300 dark:text-slate-700 hover:text-red-600 transition-colors"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight mb-1 truncate">
                    {song.title}
                  </h3>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-6 truncate">{song.artist}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Tom</div>
                      <div className="text-sm font-black text-blue-800 dark:text-blue-400">{song.key}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">BPM</div>
                      <div className="text-sm font-black text-slate-700 dark:text-slate-300">{song.bpm || '---'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {song.tags?.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-800">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <a 
                    href={song.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 hover:bg-blue-800 hover:text-white dark:hover:bg-blue-800 transition-all border border-slate-100 dark:border-slate-800"
                  >
                    <Youtube className="w-4 h-4" /> Ver no YouTube
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700">
            <Music size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Seu repertório está vazio</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">Comece adicionando as músicas que você toca ou canta.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 bg-blue-800 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-800/20 hover:scale-105 active:scale-95 transition-all"
          >
            Adicionar Minha Primeira Música
          </button>
        </div>
      )}

      <AnimatePresence>
        {/* View Modal */}
        {viewingSong && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingSong(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-8 md:p-12 bg-gradient-to-br from-blue-800 to-indigo-900 text-white relative">
                <button 
                  onClick={() => setViewingSong(null)}
                  className="absolute top-8 right-8 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>

                <div className="flex flex-col md:flex-row md:items-end gap-6">
                   <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
                     <Music className="w-8 h-8 text-white" />
                   </div>
                   <div className="space-y-1">
                     <h2 className="text-4xl font-display font-black tracking-tight">{viewingSong.title}</h2>
                     <p className="text-blue-200 font-bold uppercase tracking-widest text-xs">{viewingSong.artist}</p>
                   </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-8">
                  <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Tom</p>
                    <p className="text-xl font-black">{viewingSong.key}</p>
                  </div>
                  {viewingSong.bpm && (
                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">BPM</p>
                      <p className="text-xl font-black">{viewingSong.bpm}</p>
                    </div>
                  )}
                  {viewingSong.timeSignature && (
                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Compasso</p>
                      <p className="text-xl font-black">{viewingSong.timeSignature}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10">
                {getYoutubeId(viewingSong.link) ? (
                  <div className="aspect-video w-full rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${getYoutubeId(viewingSong.link)}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <a 
                    href={viewingSong.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 hover:bg-blue-800 hover:text-white transition-all border border-slate-100 dark:border-slate-800"
                  >
                    <ExternalLink className="w-5 h-5" /> Abrir Link da Música
                  </a>
                )}

                {viewingSong.tags && viewingSong.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {viewingSong.tags.map(tag => (
                      <span key={tag} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {viewingSong.sheet ? (
                  <section className="space-y-6">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Letra e Cifra
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-x-auto">
                      <pre className="font-mono text-sm md:text-base leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {viewingSong.sheet}
                      </pre>
                    </div>
                  </section>
                ) : (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                     <p className="text-slate-400 font-medium">Nenhuma cifra cadastrada para esta música.</p>
                  </div>
                )}

                {viewingSong.observations && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Observações</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 italic">
                      "{viewingSong.observations}"
                    </p>
                  </section>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Form Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 p-3 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>

              <h2 className="text-3xl font-display font-black text-slate-800 dark:text-slate-100 mb-2">
                {editingSong ? 'Editar Música' : 'Nova Música'}
              </h2>
              <p className="text-slate-400 dark:text-slate-500 font-medium mb-10">Preencha os detalhes para organizar seu repertório.</p>

              <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Título *
                    </label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-bold"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Ex: Hosana"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <Music2 className="w-3 h-3" /> Artista *
                    </label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-bold"
                      value={formData.artist}
                      onChange={e => setFormData({...formData, artist: e.target.value})}
                      placeholder="Ex: Hillsong Worship"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pr-2">
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                          Tom *
                       </label>
                       <button
                         type="button"
                         onClick={fetchOriginalKey}
                         disabled={searchingKey || !formData.title || !formData.artist}
                         className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-400 hover:text-blue-600 transition-colors disabled:opacity-30"
                       >
                         {searchingKey ? (
                           <Loader2 className="w-3 h-3 animate-spin" />
                         ) : (
                           <Sparkles className="w-3 h-3" />
                         )}
                         Tom Original
                       </button>
                    </div>
                    <select
                      required
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-bold appearance-none"
                      value={formData.key}
                      onChange={e => setFormData({...formData, key: e.target.value})}
                    >
                      <option value="">Selecione</option>
                      {[
                        'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
                        'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
                      ].map(key => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <BarChart2 className="w-3 h-3" /> BPM
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-bold"
                      value={formData.bpm}
                      onChange={e => setFormData({...formData, bpm: e.target.value})}
                      placeholder="Ex: 120"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Compasso
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-bold"
                      value={formData.timeSignature}
                      onChange={e => setFormData({...formData, timeSignature: e.target.value})}
                      placeholder="Ex: 4/4"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Youtube className="w-3 h-3" /> Link do Vídeo (YouTube) *
                  </label>
                  <input 
                    required
                    type="url" 
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-bold"
                    value={formData.link}
                    onChange={e => setFormData({...formData, link: e.target.value})}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Plus className="w-3 h-3" /> Cifra
                  </label>
                  <textarea 
                    rows={6}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-mono text-sm leading-relaxed"
                    value={formData.sheet}
                    onChange={e => setFormData({...formData, sheet: e.target.value})}
                    placeholder="Cole a letra com acordes aqui..."
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={fetchChordSheet}
                      disabled={searchingSheet || !formData.title || !formData.artist}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-400 hover:text-blue-600 transition-colors disabled:opacity-30 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800"
                    >
                      {searchingSheet ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Buscar Cifra e Letra Original
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Tags className="w-3 h-3" /> Tags
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABLE_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          formData.tags.includes(tag)
                            ? 'bg-blue-800 border-blue-800 text-white shadow-lg shadow-blue-800/30'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-400 dark:text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest pl-1">Observações</label>
                  <textarea 
                    rows={3}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-blue-800 outline-none transition-all text-slate-800 dark:text-slate-100 font-medium resize-none"
                    value={formData.observations}
                    onChange={e => setFormData({...formData, observations: e.target.value})}
                    placeholder="Informações adicionais sobre o arranjo, etc."
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-6">
                   <button 
                     type="button"
                     onClick={() => setIsModalOpen(false)}
                     className="flex-1 px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-xs text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-all active:scale-95"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit"
                     className="flex-1 px-8 py-5 bg-blue-800 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-800/20 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     {editingSong ? 'Salvar Alterações' : 'Cadastrar Música'}
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

