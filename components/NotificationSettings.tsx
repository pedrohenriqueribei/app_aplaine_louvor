'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db, messaging } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Sparkles,
  Volume2,
  Moon,
  Music,
  Calendar,
  Sliders,
  ChevronRight,
  Info
} from 'lucide-react';

export interface NotificationSettingsData {
  advanceNoticeHours: number;
  fcmEnabled: boolean;
  enableReminder2h: boolean;
  notifyOnNewSchedule: boolean;
  notifyOnSongChanges: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_SETTINGS: NotificationSettingsData = {
  advanceNoticeHours: 24,
  fcmEnabled: true,
  enableReminder2h: true,
  notifyOnNewSchedule: true,
  notifyOnSongChanges: false,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
};

const PRESET_HOURS = [
  { hours: 2, label: '2 horas', desc: 'Última hora', badge: 'Urgente' },
  { hours: 6, label: '6 horas', desc: 'No mesmo dia', badge: 'Curto prazo' },
  { hours: 12, label: '12 horas', desc: 'Metade do dia', badge: 'Prévio' },
  { hours: 24, label: '24 horas (1 dia)', desc: 'Recomendado', badge: 'Padrão' },
  { hours: 48, label: '48 horas (2 dias)', desc: 'Dois dias antes', badge: 'Tranquilo' },
  { hours: 72, label: '72 horas (3 dias)', desc: 'Três dias antes', badge: 'Antecipado' },
  { hours: 168, label: '1 semana', desc: 'Sete dias antes', badge: 'Planejamento' },
];

function formatHoursReadable(hours: number): string {
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} antes do culto`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days} ${days === 1 ? 'dia' : 'dias'} (${hours}h) antes do culto`;
  }
  return `${days} ${days === 1 ? 'dia' : 'dias'} e ${remainingHours}h (${hours}h) antes do culto`;
}

interface NotificationSettingsProps {
  className?: string;
  onSaved?: () => void;
}

export function NotificationSettings({ className = '', onSaved }: NotificationSettingsProps) {
  const { user, userData } = useAuth();
  const [settings, setSettings] = useState<NotificationSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [testSent, setTestSent] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Check browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission('unsupported');
    }
  }, []);

  // Load existing settings from userData or Firestore
  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        setLoading(true);
        if (userData?.notificationSettings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...userData.notificationSettings
          });
        } else {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.notificationSettings) {
              setSettings({
                ...DEFAULT_SETTINGS,
                ...data.notificationSettings
              });
            }
          }
        }
      } catch (err: any) {
        console.error('Error loading notification settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user, userData]);

  // Request browser permission and FCM Token
  const requestFcmPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setErrorMessage('Este navegador não suporta notificações de sistema.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);

      if (permission === 'granted' && user && messaging) {
        try {
          const msgInstance = await messaging();
          if (msgInstance) {
            const token = await getToken(msgInstance);
            if (token) {
              await updateDoc(doc(db, 'users', user.uid), {
                fcmTokens: arrayUnion(token),
                updatedAt: serverTimestamp()
              });
            }
          }
        } catch (fcmErr) {
          console.warn('FCM token acquisition optional error:', fcmErr);
        }
      }
    } catch (err: any) {
      console.error('Failed to request notification permission:', err);
      setErrorMessage('Erro ao solicitar permissão de notificação.');
    }
  };

  // Save Settings to Firestore
  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notificationSettings: {
          advanceNoticeHours: Number(settings.advanceNoticeHours) || 24,
          fcmEnabled: Boolean(settings.fcmEnabled),
          enableReminder2h: Boolean(settings.enableReminder2h),
          notifyOnNewSchedule: Boolean(settings.notifyOnNewSchedule),
          notifyOnSongChanges: Boolean(settings.notifyOnSongChanges),
          quietHoursEnabled: Boolean(settings.quietHoursEnabled),
          quietHoursStart: settings.quietHoursStart || '22:00',
          quietHoursEnd: settings.quietHoursEnd || '07:00'
        },
        updatedAt: serverTimestamp()
      });

      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving notification settings:', err);
      setErrorMessage('Não foi possível salvar as configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Send Test Notification
  const handleSendTestNotification = async () => {
    if (!user) return;
    setSendingTest(true);
    try {
      const title = 'Aviso de Escala (Teste FCM)';
      const body = `Você está escalado! Seu aviso foi configurado para ${formatHoursReadable(settings.advanceNoticeHours)}.`;

      // 1. Create notification doc in Firestore
      await addDoc(collection(db, 'notifications'), {
        id: `notif_${Date.now()}`,
        userId: user.uid,
        title,
        body,
        type: 'schedule',
        read: false,
        createdAt: serverTimestamp()
      });

      // 2. If browser permission granted, fire local notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/icon_applane.png',
            badge: '/icon_applane.png'
          });
        } catch (e) {
          console.log('Direct Notification API fallback error:', e);
        }
      }

      setTestSent(true);
      setTimeout(() => setTestSent(false), 5000);
    } catch (err: any) {
      console.error('Error triggering test notification:', err);
      setErrorMessage('Falha ao enviar notificação de teste.');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm ${className}`}>
        <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Carregando configurações de aviso...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm relative overflow-hidden transition-all ${className}`}>
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-100 dark:border-slate-800 relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <Bell className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-2xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Avisos Automáticos de Escala
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100/70 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                <Sparkles className="w-3 h-3 text-blue-600" />
                FCM Push
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
              Defina com quantas horas de antecedência o Applane deve te avisar sobre as suas escalas e convocações nos cultos.
            </p>
          </div>
        </div>

        {/* Master FCM Push Switch */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 px-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shrink-0">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Notificações FCM</p>
            <p className="text-[10px] text-slate-400 font-medium">
              {settings.fcmEnabled ? 'Ativadas' : 'Desativadas'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.fcmEnabled}
            onClick={() => setSettings(prev => ({ ...prev, fcmEnabled: !prev.fcmEnabled }))}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
              settings.fcmEnabled ? 'bg-blue-800' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                settings.fcmEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Browser Permission Alert Banner */}
      {settings.fcmEnabled && (
        <div className="my-6">
          {browserPermission === 'granted' ? (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Navegador autorizado:</strong> Você receberá avisos push na tela do seu computador ou celular mesmo com a aba em segundo plano.
                </span>
              </div>
              <span className="font-bold uppercase tracking-wider text-[10px] px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                Ativo
              </span>
            </div>
          ) : browserPermission === 'denied' ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong>Atenção:</strong> As notificações estão bloqueadas nas configurações do seu navegador. Para receber alertas na área de trabalho, clique no cadeado ao lado da URL e selecione &quot;Permitir notificações&quot;.
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/40 text-blue-900 dark:text-blue-200 text-xs">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-blue-700 shrink-0" />
                <span>
                  Ative as permissões do navegador para receber os avisos de escala na tela inicial do dispositivo.
                </span>
              </div>
              <button
                type="button"
                onClick={requestFcmPermission}
                className="bg-blue-800 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-blue-900 transition-all shrink-0 active:scale-95 shadow-sm"
              >
                Autorizar no Navegador
              </button>
            </div>
          )}
        </div>
      )}

      {/* CORE REQUIREMENT: Horas de Antecedência */}
      <div className="py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-800 dark:text-blue-400" />
              Antecedência do Aviso Principal
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Escolha um intervalo pré-definido ou digite o número exato de horas.
            </p>
          </div>

          {/* Current Selection Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl text-blue-900 dark:text-blue-300 font-bold text-sm">
            <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>{formatHoursReadable(settings.advanceNoticeHours)}</span>
          </div>
        </div>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PRESET_HOURS.map((preset) => {
            const isSelected = Number(settings.advanceNoticeHours) === preset.hours;
            return (
              <button
                key={preset.hours}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, advanceNoticeHours: preset.hours }))}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-800 text-white border-blue-800 shadow-lg shadow-blue-800/20 ring-2 ring-blue-800/20 scale-[1.02]'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {preset.badge}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <h4 className="font-bold text-sm tracking-tight">{preset.label}</h4>
                </div>
                <p className={`text-[11px] mt-2 font-medium ${
                  isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {preset.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom Hours Input & Slider */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-700" />
                Ajuste fino de horas:
              </span>
              <span className="text-blue-800 dark:text-blue-400 font-extrabold text-sm">
                {settings.advanceNoticeHours} horas
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="168"
              step="1"
              value={settings.advanceNoticeHours}
              onChange={(e) => setSettings(prev => ({ ...prev, advanceNoticeHours: Number(e.target.value) }))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-800"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>1h (imediato)</span>
              <span>24h (1 dia)</span>
              <span>72h (3 dias)</span>
              <span>168h (1 semana)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, advanceNoticeHours: Math.max(1, prev.advanceNoticeHours - 1) }))}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="Diminuir 1 hora"
            >
              -
            </button>
            <div className="w-24 text-center">
              <input
                type="number"
                min="1"
                max="336"
                value={settings.advanceNoticeHours}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(336, Number(e.target.value) || 1));
                  setSettings(prev => ({ ...prev, advanceNoticeHours: val }));
                }}
                className="w-full text-center font-black text-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 text-blue-900 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">horas</span>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, advanceNoticeHours: Math.min(336, prev.advanceNoticeHours + 1) }))}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="Aumentar 1 hora"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Additional Smart Notification Toggles */}
      <div className="py-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
          Preferências Adicionais de Notificação
        </h4>

        {/* 1. Reforço de 2 horas */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Lembrete de Reforço (2 horas antes)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enviar um segundo alerta rápido logo antes do início do culto para você não esquecer instrumentos ou material.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enableReminder2h}
            onClick={() => setSettings(prev => ({ ...prev, enableReminder2h: !prev.enableReminder2h }))}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
              settings.enableReminder2h ? 'bg-blue-800' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                settings.enableReminder2h ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 2. Publicação de Nova Escala */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Aviso Imediato ao ser Convocado
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Receber notificação assim que o líder publicar ou atualizar uma escala com seu nome.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.notifyOnNewSchedule}
            onClick={() => setSettings(prev => ({ ...prev, notifyOnNewSchedule: !prev.notifyOnNewSchedule }))}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
              settings.notifyOnNewSchedule ? 'bg-blue-800' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                settings.notifyOnNewSchedule ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 3. Alterações de Repertório */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Mudanças no Repertório Musical
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ser avisado se uma música for trocada ou adicionada à sua escala.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.notifyOnSongChanges}
            onClick={() => setSettings(prev => ({ ...prev, notifyOnSongChanges: !prev.notifyOnSongChanges }))}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
              settings.notifyOnSongChanges ? 'bg-blue-800' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                settings.notifyOnSongChanges ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 4. Horário de Silêncio / Não perturbe */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Horário de Silêncio (Não Perturbe)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pausar notificações durante o período noturno de descanso.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.quietHoursEnabled}
              onClick={() => setSettings(prev => ({ ...prev, quietHoursEnabled: !prev.quietHoursEnabled }))}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.quietHoursEnabled ? 'bg-blue-800' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  settings.quietHoursEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.quietHoursEnabled && (
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 pl-11">
              <div className="flex items-center gap-2">
                <span>Início:</span>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => setSettings(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 text-xs font-bold"
                />
              </div>
              <div className="flex items-center gap-2">
                <span>Término:</span>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => setSettings(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 text-xs font-bold"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Feedback */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-bold">Configurações salvas com sucesso! Seus avisos serão disparados com {formatHoursReadable(settings.advanceNoticeHours)}.</span>
        </div>
      )}

      {testSent && (
        <div className="mb-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2 animate-in fade-in">
          <Send className="w-4 h-4 shrink-0 text-blue-600" />
          <span>Notificação de teste enviada com sucesso! Verifique a barra de notificações do seu aparelho ou a aba de Notificações.</span>
        </div>
      )}

      {/* Action Buttons Footer */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleSendTestNotification}
          disabled={sendingTest}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          {sendingTest ? (
            <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-blue-700" />
          )}
          <span>Enviar Notificação de Teste</span>
        </button>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-800/25 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Preferências</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
