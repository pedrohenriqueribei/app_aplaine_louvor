'use client';

import React, { useEffect, useState } from 'react';
import { 
  Video, Play, Pause, Trash2, Edit3, Plus, X, ArrowUp, ArrowDown, 
  Check, Sliders, Radio, Activity, Tv2, Monitor, HelpCircle, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface VideoAsset {
  id: string;
  title: string;
  category: string;
  duration: string;
  url: string;
}

interface CueStep {
  id: string;
  title: string;
  duration: string; // Ex: "5m" or "45m"
  type: string;     // Ex: "Contagem", "Louvor", "Mensagem", "Aviso"
  videoAssetId: string;
  notes: string;
  status: 'idle' | 'active';
}

interface PresetChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

const DEFAULT_VIDEOS: VideoAsset[] = [
  {
    id: 'vid-1',
    title: 'Contagem Regressiva - Culto de Celebração',
    category: 'Contagem Regressiva',
    duration: '05:00',
    url: 'https://www.youtube.com/embed/F696l243Olw'
  },
  {
    id: 'vid-2',
    title: 'Fundo Abstrato - Adoração Profunda',
    category: 'Louvor / Fundo',
    duration: '10:00',
    url: 'https://www.youtube.com/embed/pWst8PioLao'
  },
  {
    id: 'vid-3',
    title: 'Avisos da Semana - Informativo',
    category: 'Aviso',
    duration: '02:15',
    url: 'https://www.youtube.com/embed/FfclBszcWfM'
  },
  {
    id: 'vid-4',
    title: 'Fundo Estelar - Pregação Suave',
    category: 'Mensagem',
    duration: '15:00',
    url: 'https://www.youtube.com/embed/f77v8sF5gJk'
  }
];

const DEFAULT_CUES: CueStep[] = [
  {
    id: 'cue-1',
    title: 'Contagem Regressiva & Boas-Vindas',
    duration: '5m',
    type: 'Contagem',
    videoAssetId: 'vid-1',
    notes: 'Iniciar som ambiente gradual, projeção com contagem ativa.',
    status: 'active'
  },
  {
    id: 'cue-2',
    title: 'Abertura & Oração Inicial da Equipe',
    duration: '3m',
    type: 'Abertura',
    videoAssetId: '',
    notes: 'Subir luzes gerais, habilitar microfones dos líderes.',
    status: 'idle'
  },
  {
    id: 'cue-3',
    title: 'Momento de Louvor (Músicas Rápidas)',
    duration: '20m',
    type: 'Louvor',
    videoAssetId: 'vid-2',
    notes: 'Transmitir letras sincronizadas, loop estelar de fundo.',
    status: 'idle'
  },
  {
    id: 'cue-4',
    title: 'Vídeo Institucional & Oferenda',
    duration: '5m',
    type: 'Aviso',
    videoAssetId: 'vid-3',
    notes: 'Disparar som do vídeo no master, projetar QR Code.',
    status: 'idle'
  },
  {
    id: 'cue-5',
    title: 'Ministração da Palavra (Sermão)',
    duration: '45m',
    type: 'Mensagem',
    videoAssetId: 'vid-4',
    notes: 'Fundo estelar estático com brilho reduzido no painel.',
    status: 'idle'
  },
  {
    id: 'cue-6',
    title: 'Encerramento & Network Social',
    duration: '5m',
    type: 'Encerramento',
    videoAssetId: '',
    notes: 'Música de fundo instrumental, slides de novos eventos.',
    status: 'idle'
  }
];

const DEFAULT_CHECKLIST: PresetChecklistItem[] = [
  { id: 'chk-1', label: 'Conectar cabos HDMI e SDI no switcher', checked: true },
  { id: 'chk-2', label: 'Testar e calibrar brilho do projetor de palco', checked: false },
  { id: 'chk-3', label: 'Verificar link de transmissão RTMP no OBS Studio', checked: false },
  { id: 'chk-4', label: 'Testar sincronia das legendas das músicas', checked: true },
  { id: 'chk-5', label: 'Ajustar foco da câmera principal (PTZ)', checked: false }
];

export default function MultimediaWorkspace({ churchId }: { churchId: string }) {
  const { userData } = useAuth();
  
  // Roles check
  const isLeader = userData?.role === 'líder';
  
  // States
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [cues, setCues] = useState<CueStep[]>([]);
  const [checklist, setChecklist] = useState<PresetChecklistItem[]>([]);
  
  // Interactive console states
  const [powerProjector, setPowerProjector] = useState(true);
  const [powerStream, setPowerStream] = useState(false);
  const [powerLed, setPowerLed] = useState(true);
  const [powerCameras, setPowerCameras] = useState(true);
  
  // Fader gains
  const [masterVolume, setMasterVolume] = useState(85);
  const [inputBackground, setInputBackground] = useState(50);
  const [inputMics, setInputMics] = useState(70);
  const [inputVideoAudio, setInputVideoAudio] = useState(60);

  // Modal / Form state
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [newVideo, setNewVideo] = useState({ title: '', category: 'Abertura', duration: '03:00', url: '' });
  
  const [isAddingCue, setIsAddingCue] = useState(false);
  const [newCue, setNewCue] = useState({ title: '', duration: '5m', type: 'Louvor', videoAssetId: '', notes: '' });
  
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Firestore sync doc identifier
  const syncDocId = `multimedia_all_in_one_${churchId}`;

  // Fetch / Sync
  useEffect(() => {
    if (!churchId) return;

    const docRef = doc(db, 'services', syncDocId);

    // Initial load check
    const loadDefaultIfNotExist = async () => {
      try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await setDoc(docRef, {
            videos: DEFAULT_VIDEOS,
            cues: DEFAULT_CUES,
            checklist: DEFAULT_CHECKLIST,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Error setting default multimedia configurations:", err);
      }
    };

    loadDefaultIfNotExist();

    // Listen to changes in real-time
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.videos) setVideos(data.videos);
        if (data.cues) setCues(data.cues);
        if (data.checklist) setChecklist(data.checklist);
      }
    }, (error) => {
      console.error("Firestore sync error:", error);
    });

    return () => unsubscribe();
  }, [churchId, syncDocId]);

  // Helper helper to save back to Firestore
  const updateWorkspaceInFirestore = async (newV: VideoAsset[], newC: CueStep[], newCheck: PresetChecklistItem[]) => {
    try {
      const docRef = doc(db, 'services', syncDocId);
      await setDoc(docRef, {
        videos: newV,
        cues: newC,
        checklist: newCheck,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error syncing to Firestore:", err);
    }
  };

  // Video Actions
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideo.title || !newVideo.url) return;

    // Convert standard youtube link to embed if necessary
    let processedUrl = newVideo.url;
    if (processedUrl.includes('watch?v=')) {
      processedUrl = processedUrl.replace('watch?v=', 'embed/');
    } else if (processedUrl.includes('youtu.be/')) {
      processedUrl = processedUrl.replace('youtu.be/', 'youtube.com/embed/');
    }

    const createdVideo: VideoAsset = {
      id: `vid-${Date.now()}`,
      title: newVideo.title,
      category: newVideo.category,
      duration: newVideo.duration,
      url: processedUrl
    };

    const updatedVideos = [...videos, createdVideo];
    setVideos(updatedVideos);
    await updateWorkspaceInFirestore(updatedVideos, cues, checklist);
    
    // Clear state
    setNewVideo({ title: '', category: 'Abertura', duration: '03:00', url: '' });
    setIsAddingVideo(false);
  };

  const handleDeleteVideo = async (id: string) => {
    const updatedVideos = videos.filter(v => v.id !== id);
    setVideos(updatedVideos);
    await updateWorkspaceInFirestore(updatedVideos, cues, checklist);
  };

  // Checklist Actions
  const handleToggleChecklist = async (id: string) => {
    const updated = checklist.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    await updateWorkspaceInFirestore(videos, cues, updated);
  };

  // Cue / Sequence Actions (Leader Exclusive Control Sequence)
  const handleTriggerCue = async (cueId: string) => {
    const updatedCues = cues.map(cue => ({
      ...cue,
      status: cue.id === cueId ? 'active' : 'idle' as any
    }));
    setCues(updatedCues);
    await updateWorkspaceInFirestore(videos, updatedCues, checklist);
  };

  const handleNextCue = async () => {
    const activeIndex = cues.findIndex(c => c.status === 'active');
    if (activeIndex === -1 || activeIndex === cues.length - 1) return;
    
    const updatedCues = cues.map((cue, idx) => ({
      ...cue,
      status: idx === activeIndex + 1 ? 'active' : 'idle' as any
    }));
    setCues(updatedCues);
    await updateWorkspaceInFirestore(videos, updatedCues, checklist);
  };

  const handlePrevCue = async () => {
    const activeIndex = cues.findIndex(c => c.status === 'active');
    if (activeIndex <= 0) return;
    
    const updatedCues = cues.map((cue, idx) => ({
      ...cue,
      status: idx === activeIndex - 1 ? 'active' : 'idle' as any
    }));
    setCues(updatedCues);
    await updateWorkspaceInFirestore(videos, updatedCues, checklist);
  };

  const handleMoveCue = async (cueId: string, direction: 'up' | 'down') => {
    const idx = cues.findIndex(c => c.id === cueId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === cues.length - 1) return;

    const updated = [...cues];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    
    // Swap
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    setCues(updated);
    await updateWorkspaceInFirestore(videos, updated, checklist);
  };

  const handleDeleteCue = async (cueId: string) => {
    const deletedIndex = cues.findIndex(c => c.id === cueId);
    let updated = cues.filter(c => c.id !== cueId);
    
    // Maintain at least one active if deleted active item
    if (cues[deletedIndex]?.status === 'active' && updated.length > 0) {
      updated[Math.min(deletedIndex, updated.length - 1)].status = 'active';
    }

    setCues(updated);
    await updateWorkspaceInFirestore(videos, updated, checklist);
  };

  const handleAddCue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCue.title) return;

    const createdCue: CueStep = {
      id: `cue-${Date.now()}`,
      title: newCue.title,
      duration: newCue.duration,
      type: newCue.type,
      videoAssetId: newCue.videoAssetId,
      notes: newCue.notes,
      status: cues.length === 0 ? 'active' : 'idle'
    };

    const updated = [...cues, createdCue];
    setCues(updated);
    await updateWorkspaceInFirestore(videos, updated, checklist);

    // Reset Form
    setNewCue({ title: '', duration: '5m', type: 'Louvor', videoAssetId: '', notes: '' });
    setIsAddingCue(false);
  };

  // Find currently active cue
  const activeCue = cues.find(c => c.status === 'active');
  const activeVideo = activeCue && videos.find(v => v.id === activeCue.videoAssetId);

  // Counts
  const completedChecklistCount = checklist.filter(c => c.checked).length;
  const checklistPercentage = checklist.length > 0 ? Math.round((completedChecklistCount / checklist.length) * 100) : 0;

  return (
    <div className="space-y-12 pb-20">
      
      {/* 1. ON-AIR STATUS SCREEN & LIVE PREVIEW (Treatments specific) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cinematic Live Screen View */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[3rem] p-6 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[360px]">
          {/* Scanning lines effect */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-40"></div>
          
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <span className="font-mono text-xs font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                On Air Projeção
              </span>
            </div>
            
            <div className="flex gap-2">
              <div className="text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-mono flex items-center gap-1.5 text-slate-400">
                <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                Bitrate: 4500 kbps
              </div>
              <div className="text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-mono text-emerald-400">
                1080p @ 60 FPS
              </div>
            </div>
          </div>

          {/* Virtual projection preview screen */}
          <div className="flex-1 flex flex-col items-center justify-center my-6 relative z-10 py-4">
            {powerProjector ? (
              <div className="text-center space-y-4 max-w-lg">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  key={activeCue?.id}
                  className="space-y-3"
                >
                  <p className="text-xs font-black text-purple-400 uppercase tracking-widest font-mono">Próxima Deixa / Passo Ativo</p>
                  <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    {activeCue?.title}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {activeCue?.notes || "Nenhuma observação operacional cadastrada."}
                  </p>
                </motion.div>

                {activeVideo ? (
                  <div className="pt-4 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-slate-400 font-mono text-xs">VÍDEO CARREGADO NO MIXER:</span>
                    <button 
                      onClick={() => setPreviewVideoUrl(activeVideo.url)}
                      className="ml-2 bg-purple-600/30 text-purple-300 font-bold px-4 py-1.5 rounded-full border border-purple-500/10 text-xs hover:bg-purple-600/50 hover:text-white transition-all transition-transform active:scale-95"
                    >
                      Visualizar Prévia
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic pt-4">Nenhuma mídia de vídeo associada a esta deixa.</p>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-600 space-y-2">
                <Monitor className="w-12 h-12 mx-auto stroke-1" />
                <p className="font-mono text-sm leading-none uppercase tracking-widest font-bold">Sem Sinal de Saída</p>
                <p className="text-xs max-w-xs text-slate-600">Dispositivo de Saída / Projetor Central do Templo desligado no rack virtual.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center relative z-10 border-t border-slate-800/80 pt-4 font-mono text-[10px] text-slate-500">
            <div>APLAINE MULTIMEDIA WORKSTATION v2.0</div>
            <div>STATUS: {powerStream ? "STREAMING DIRETAMENTE" : "STANDBY LOCAL"}</div>
          </div>
        </div>

        {/* Technical Hardware Switches Frame (Interactive details with treatments) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-slate-800 dark:text-slate-100">Rack Virtual</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Hardware e sinal integrados</p>
              </div>
            </div>

            {/* Direct virtual buttons with glow treatments */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${powerProjector ? 'bg-emerald-500 shadow-md shadow-emerald-500/40 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Projetor Central</span>
                </div>
                <button 
                  onClick={() => setPowerProjector(!powerProjector)}
                  className={`text-xs px-4 py-2 font-black rounded-xl uppercase tracking-widest transition-all ${
                    powerProjector 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/10' 
                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {powerProjector ? 'LIGADO' : 'DESLIGADO'}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${powerStream ? 'bg-red-500 shadow-md shadow-red-500/40 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Live Streaming</span>
                </div>
                <button 
                  onClick={() => setPowerStream(!powerStream)}
                  className={`text-xs px-4 py-2 font-black rounded-xl uppercase tracking-widest transition-all ${
                    powerStream 
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/10' 
                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {powerStream ? 'STREAMEANDO' : 'DESATIVADO'}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${powerLed ? 'bg-emerald-500 shadow-md shadow-emerald-500/40 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Painel LED Palco</span>
                </div>
                <button 
                  onClick={() => setPowerLed(!powerLed)}
                  className={`text-xs px-4 py-2 font-black rounded-xl uppercase tracking-widest transition-all ${
                    powerLed 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/10' 
                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {powerLed ? 'LIGADO' : 'DESLIGADO'}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${powerCameras ? 'bg-emerald-500 shadow-md shadow-emerald-500/40 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Câmeras PTZ / OBS</span>
                </div>
                <button 
                  onClick={() => setPowerCameras(!powerCameras)}
                  className={`text-xs px-4 py-2 font-black rounded-xl uppercase tracking-widest transition-all ${
                    powerCameras 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/10' 
                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {powerCameras ? 'ATIVA' : 'MUTADA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LEADER SEQUENCE INTERFACE vs WORKER VIEWS (Exclusive feature based on Role) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cue Playlist Sequencer (Main body) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] p-8 md:p-10 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Sequência Técnica do Culto
                </h3>
                <span className="text-xs font-black bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400 border border-purple-100 dark:border-purple-900/60 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                  {isLeader ? "Modo Diretor" : "Modo Operador"}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Playlist sequencial ordenada das fases dos eventos.</p>
            </div>

            {isLeader && (
              <button 
                onClick={() => setIsAddingCue(true)}
                className="bg-purple-800 hover:bg-purple-900 text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-800/10 hover:shadow-purple-800/20 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" /> Nova Deixa (Cue)
              </button>
            )}
          </div>

          {/* Quick next/prev sequence triggers for Leader */}
          {isLeader && cues.length > 1 && (
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/50 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Mudança Manual de Sequência</span>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Controle o andamento da reunião</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handlePrevCue}
                  className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-6 py-3 rounded-2xl text-xs hover:bg-slate-100 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                >
                  Voltar Deixa
                </button>
                <button 
                  onClick={handleNextCue}
                  className="bg-purple-800 hover:bg-purple-900 text-white font-black px-8 py-3 rounded-2xl text-xs hover:shadow-lg hover:shadow-purple-800/20 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest"
                >
                  Avançar Próxima <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </div>
          )}

          {/* Cue steps list */}
          <div className="space-y-4">
            {cues.length > 0 ? (
              cues.map((cue, index) => {
                const video = videos.find(v => v.id === cue.videoAssetId);
                const isActive = cue.status === 'active';
                
                return (
                  <div 
                    key={cue.id}
                    className={`p-5 rounded-[2rem] border transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                      isActive 
                        ? 'bg-purple-50/40 dark:bg-purple-950/10 border-purple-500/40 shadow-md ring-1 ring-purple-500/20' 
                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-850 hover:bg-slate-150/40 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Badge counter */}
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-black text-sm shrink-0 ${
                        isActive 
                          ? 'bg-purple-800 text-white shadow-md shadow-purple-800/20' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {index + 1}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-black text-slate-800 dark:text-slate-100 text-base">
                            {cue.title}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            cue.type === 'Contagem' ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700' :
                            cue.type === 'Louvor' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' :
                            cue.type === 'Mensagem' ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-700' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {cue.type}
                          </span>
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            • Duração: {cue.duration}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                          {cue.notes || "Sem observações operacionais adicionais."}
                        </p>
                        {video && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <Video className="w-3.5 h-3.5 text-purple-500" />
                            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 truncate">
                              Vídeo associado: {video.title}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      {/* Active / Trigger indicators */}
                      {isActive ? (
                        <div className="flex items-center gap-1.5 bg-red-500/10 text-red-600 px-3 py-1.5 rounded-full border border-red-500/20 text-[10px] font-black uppercase tracking-widest font-mono animate-pulse">
                          <Radio className="w-3 h-3" /> NO AR
                        </div>
                      ) : (
                        isLeader && (
                          <button 
                            onClick={() => handleTriggerCue(cue.id)}
                            className="bg-slate-200 dark:bg-slate-800 hover:bg-purple-800 hover:text-white dark:hover:bg-purple-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all tracking-wide scale-95"
                          >
                            DISPARAR CUE
                          </button>
                        )
                      )}

                      {/* Direction and deletes (Leader Exclusive Actions) */}
                      {isLeader && (
                        <div className="flex gap-1 border-l border-slate-200 dark:border-slate-800 pl-2 ml-1">
                          <button 
                            disabled={index === 0}
                            onClick={() => handleMoveCue(cue.id, 'up')}
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30"
                            title="Mover para Cima"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button 
                            disabled={index === cues.length - 1}
                            onClick={() => handleMoveCue(cue.id, 'down')}
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30"
                            title="Mover para Baixo"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCue(cue.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            title="Excluir Deixa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <Sliders className="w-10 h-10 text-slate-300 dark:text-slate-750 mx-auto mb-3" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Nenhum evento registrado no sequenciador.</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Crie a sequência de eventos para organizar fones, letras e projeção virtual do culto.</p>
              </div>
            )}
          </div>
        </div>

        {/* Mixer faders and checklist panels */}
        <div className="space-y-8 flex flex-col justify-between h-full">
          
          {/* Audio Console Mixer Faders ( treatments specific) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-slate-800 dark:text-slate-100 leading-none">Console Faders</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">Ganhos Virtuais de Áudio</p>
              </div>
            </div>

            {/* Fader list */}
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold uppercase">Master Louvor</span>
                  <span className="text-purple-600 font-bold">{masterVolume}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={masterVolume} 
                  onChange={(e) => setMasterVolume(Number(e.target.value))} 
                  className="w-full accent-purple-800 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">Mics de Voz</span>
                  <span>{inputMics}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={inputMics} 
                  onChange={(e) => setInputMics(Number(e.target.value))} 
                  className="w-full accent-slate-800 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">Fundo Instrumental</span>
                  <span>{inputBackground}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={inputBackground} 
                  onChange={(e) => setInputBackground(Number(e.target.value))} 
                  className="w-full accent-slate-850 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">Áudio do Vídeo</span>
                  <span>{inputVideoAudio}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={inputVideoAudio} 
                  onChange={(e) => setInputVideoAudio(Number(e.target.value))} 
                  className="w-full accent-purple-600 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Checklist de Produção (States tracker) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-black text-slate-800 dark:text-slate-100 text-lg leading-none">
                Checklist Técnico
              </h3>
              <div className="font-mono text-xs font-bold text-slate-400">
                {checklistPercentage}% completo
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-purple-800 h-full transition-all duration-300"
                style={{ width: `${checklistPercentage}%` }}
              ></div>
            </div>

            {/* Checklist list */}
            <div className="space-y-3 pt-2">
              {checklist.length > 0 ? (
                checklist.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className="w-full flex items-start text-left gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800/50 transition-colors group"
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      item.checked 
                        ? 'bg-purple-800 border-purple-800 text-white' 
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:border-purple-800'
                    }`}>
                      {item.checked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-slate-700 dark:text-slate-300 text-xs font-medium leading-normal ${
                      item.checked ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}>
                      {item.label}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic">Nenhum item de checklist.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MULTIMEDIA VIDEOS HUB & EMBEDS CONTROL */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] p-8 md:p-10 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Galeria de Mídias & Loops
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Vídeos de suporte que alimentam os projetores e fundos visuais da banda.
            </p>
          </div>

          <button 
            onClick={() => setIsAddingVideo(true)}
            className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-850 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50 px-5 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
          >
            <Video className="w-4 h-4" /> Cadastrar Vídeo
          </button>
        </div>

        {/* Video Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.length > 0 ? (
            videos.map(video => (
              <div 
                key={video.id}
                className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] p-5 hover:border-purple-200 dark:hover:border-purple-800 transition-all flex flex-col justify-between group h-64"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <span className="bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400 border border-purple-200/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                      {video.category}
                    </span>
                    <button 
                      onClick={() => handleDeleteVideo(video.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Apagar Vídeo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="font-display font-black text-slate-800 dark:text-slate-100 leading-snug text-lg line-clamp-3 mb-2">
                    {video.title}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">Duração: {video.duration}</span>
                </div>

                <button 
                  onClick={() => setPreviewVideoUrl(video.url)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 font-bold py-3.5 px-4 rounded-2xl text-xs hover:bg-purple-800 hover:text-white dark:hover:bg-purple-800 hover:border-purple-800 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Visualizar Vídeo
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <Video className="w-12 h-12 text-slate-350 dark:text-slate-750 mx-auto mb-4" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Sem mídias cadastradas no templo.</p>
              <button 
                onClick={() => setVideos(DEFAULT_VIDEOS)}
                className="text-purple-855 hover:underline font-bold text-xs mt-2 block mx-auto"
              >
                Restaurar loops e vídeos padrões
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 4. DIALOGS MODALS (Cinematic Treatments) */}
      <AnimatePresence>
        {/* Cinematic Video Player Popup */}
        {previewVideoUrl && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-850 rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setPreviewVideoUrl(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-950/40 p-2.5 rounded-full z-10 transition-colors border border-white/10"
              >
                <X size={20} />
              </button>
              
              <div className="aspect-video w-full bg-black">
                <iframe 
                  src={previewVideoUrl} 
                  title="Video preview" 
                  className="w-full h-full border-noborder"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>

              <div className="p-6 text-white flex justify-between items-center bg-slate-950/80 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                  <span className="text-sm font-bold opacity-80">Projetando Sinal Virtual do Templo</span>
                </div>
                <div className="text-xs opacity-50 font-mono">1080P PROJECTION SOURCE</div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Add New Video */}
        {isAddingVideo && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-850 rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setIsAddingVideo(false)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>

              <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-8">
                Cadastrar Mídia
              </h3>

              <form onSubmit={handleAddVideo} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Título da Mídia / Loop</label>
                  <input 
                    type="text"
                    required
                    value={newVideo.title}
                    onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                    placeholder="Ex: Fundo de Estrelas Nebulares"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Categoria</label>
                    <select 
                      value={newVideo.category}
                      onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-bold text-sm"
                    >
                      <option value="Abertura">Abertura</option>
                      <option value="Contagem Regressiva">Contagem</option>
                      <option value="Aviso">Informativo</option>
                      <option value="Louvor / Fundo">Fundo visual</option>
                      <option value="Mensagem">Mensagem</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Duração (Minutos)</label>
                    <input 
                      type="text"
                      required
                      value={newVideo.duration}
                      onChange={(e) => setNewVideo({ ...newVideo, duration: e.target.value })}
                      placeholder="Ex: 05:00"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Link YouTube (URL ou Embed)</label>
                  <input 
                    type="url"
                    required
                    value={newVideo.url}
                    onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-2">Você pode colocar o link de compartilhamento normal do YouTube.</span>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-purple-800 hover:bg-purple-900 text-white py-4.5 rounded-2xl font-black shadow-xl shadow-purple-800/10 hover:shadow-purple-800/20 active:scale-[0.98] transition-all"
                >
                  Confirmar Cadastro
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Add New Cue (Leader exclusive) */}
        {isAddingCue && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-850 rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setIsAddingCue(false)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>

              <h3 className="text-2xl font-display font-black text-slate-800 dark:text-slate-100 mb-8">
                Subir Nova Deixa (Cue)
              </h3>

              <form onSubmit={handleAddCue} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Título do Evento / Deixa</label>
                  <input 
                    type="text"
                    required
                    value={newCue.title}
                    onChange={(e) => setNewCue({ ...newCue, title: e.target.value })}
                    placeholder="Ex: Momento de Avisos e Interação"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Duração Estimada</label>
                    <input 
                      type="text"
                      required
                      value={newCue.duration}
                      onChange={(e) => setNewCue({ ...newCue, duration: e.target.value })}
                      placeholder="Ex: 5m, 12m, 45m"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Tipo do Passo</label>
                    <select 
                      value={newCue.type}
                      onChange={(e) => setNewCue({ ...newCue, type: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-bold text-sm"
                    >
                      <option value="Contagem">Contagem</option>
                      <option value="Abertura">Abertura</option>
                      <option value="Louvor">Louvor</option>
                      <option value="Aviso">Informativo</option>
                      <option value="Mensagem">Mensagem</option>
                      <option value="Encerramento">Encerramento</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Associar Background Vídeo</label>
                  <select 
                    value={newCue.videoAssetId}
                    onChange={(e) => setNewCue({ ...newCue, videoAssetId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-bold text-sm"
                  >
                    <option value="">Nenhum vídeo (Fundo estático ou escuro)</option>
                    {videos.map(vid => (
                      <option key={vid.id} value={vid.id}>{vid.title} ({vid.duration})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Observações Técnicas / Script</label>
                  <textarea 
                    value={newCue.notes}
                    onChange={(e) => setNewCue({ ...newCue, notes: e.target.value })}
                    placeholder="Instruções para a equipe de projeção e áudio..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium text-sm resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-purple-800 hover:bg-purple-900 text-white py-4.5 rounded-2xl font-black shadow-xl shadow-purple-800/10 hover:shadow-purple-800/20 active:scale-[0.98] transition-all"
                >
                  Adicionar na Fila
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
