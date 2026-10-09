'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db, messaging } from '@/lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  arrayUnion,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
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
  Info,
  Smartphone,
  Radio,
  Check,
  Building2,
  Users,
  Video,
} from 'lucide-react';
import { BallerinaIcon } from '@/components/BallerinaIcon';

export interface NotificationSettingsData {
  advanceNoticeDays: number;
  advanceNoticeHours: number;
  preferredDispatchHour: string;
  fcmEnabled: boolean;
  enableReminder2h: boolean;
  notifyOnNewSchedule: boolean;
  notifyOnSongChanges: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  targetMinistries: {
    worship: boolean;
    dance: boolean;
    multimedia: boolean;
  };
  applyToChurchVolunteers: boolean;
}

const DEFAULT_SETTINGS: NotificationSettingsData = {
  advanceNoticeDays: 2,
  advanceNoticeHours: 48,
  preferredDispatchHour: '09:00',
  fcmEnabled: true,
  enableReminder2h: true,
  notifyOnNewSchedule: true,
  notifyOnSongChanges: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  targetMinistries: {
    worship: true,
    dance: true,
    multimedia: true,
  },
  applyToChurchVolunteers: true,
};

const PRESET_DAYS = [
  {
    days: 2,
    hours: 48,
    label: '2 Dias de Antecedência',
    shortLabel: '2 dias (48h)',
    badge: 'Recomendado',
    isPrimary: true,
    desc: 'Prazo padrão equilibrado — tempo ideal para confirmação da equipe e organização rápida.',
  },
  {
    days: 3,
    hours: 72,
    label: '3 Dias de Antecedência',
    shortLabel: '3 dias (72h)',
    badge: 'Mais Usado',
    isPrimary: true,
    desc: 'Ideal para ensaios prévios, estudo das cifras no Ministério de Louvor e coreografias na Dança.',
  },
  {
    days: 5,
    hours: 120,
    label: '5 Dias de Antecedência',
    shortLabel: '5 dias (120h)',
    badge: 'Planejamento Amplo',
    isPrimary: true,
    desc: 'Maior antecedência — perfeito para voluntários planejarem trocas de escala e compromissos.',
  },
  {
    days: 1,
    hours: 24,
    label: '1 Dia de Antecedência',
    shortLabel: '1 dia (24h)',
    badge: 'Véspera',
    isPrimary: false,
    desc: 'Aviso na véspera do culto para relembrar horário de chegada e passagens de som.',
  },
  {
    days: 7,
    hours: 168,
    label: '7 Dias (1 Semana)',
    shortLabel: '7 dias (1 sem)',
    badge: 'Semanal',
    isPrimary: false,
    desc: 'Aviso no início do ciclo semanal para início dos estudos de repertório.',
  },
];

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
  const [dispatchingReal, setDispatchingReal] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    volunteersCount: number;
    schedulesCount: number;
    message: string;
  } | null>(null);

  const isLeader =
    userData?.role === 'líder' ||
    userData?.role === 'super_admin' ||
    userData?.super_admin === true ||
    userData?.roles?.worship?.includes('leader') ||
    userData?.roles?.dance?.includes('leader') ||
    userData?.roles?.dance?.includes('dance_leader') ||
    userData?.roles?.multimedia?.includes('leader');

  // Check browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission('unsupported');
    }
  }, []);

  // Load existing settings from Firestore (Church config or User Profile)
  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        setLoading(true);

        let initialSettings: Partial<NotificationSettingsData> = {};

        // 1. Try to load church-wide schedule notification rule if churchId exists
        if (userData?.churchId) {
          try {
            const configDocRef = doc(db, 'services', `schedule_notification_config_${userData.churchId}`);
            const configSnap = await getDoc(configDocRef);
            if (configSnap.exists()) {
              const cData = configSnap.data();
              if (cData.advanceNoticeDays) {
                initialSettings.advanceNoticeDays = Number(cData.advanceNoticeDays);
                initialSettings.advanceNoticeHours = Number(cData.advanceNoticeHours) || Number(cData.advanceNoticeDays) * 24;
              }
              if (cData.preferredDispatchHour) {
                initialSettings.preferredDispatchHour = cData.preferredDispatchHour;
              }
              if (cData.targetMinistries) {
                initialSettings.targetMinistries = {
                  ...DEFAULT_SETTINGS.targetMinistries,
                  ...cData.targetMinistries,
                };
              }
            }
          } catch (e) {
            console.warn('Could not load church schedule notification config:', e);
          }
        }

        // 2. Overlay with user's specific notification settings
        const userNotifSettings = userData?.notificationSettings;
        if (userNotifSettings) {
          const days = Number(userNotifSettings.advanceNoticeDays) ||
            (userNotifSettings.advanceNoticeHours ? Math.max(1, Math.round(userNotifSettings.advanceNoticeHours / 24)) : 2);

          initialSettings = {
            ...initialSettings,
            ...userNotifSettings,
            advanceNoticeDays: days,
            advanceNoticeHours: Number(userNotifSettings.advanceNoticeHours) || days * 24,
            preferredDispatchHour: userNotifSettings.preferredDispatchHour || '09:00',
            targetMinistries: {
              ...DEFAULT_SETTINGS.targetMinistries,
              ...(userNotifSettings.targetMinistries || {}),
            },
          };
        }

        setSettings((prev) => ({
          ...prev,
          ...initialSettings,
        }));
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
                updatedAt: serverTimestamp(),
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

  // Select days preset and sync hours
  const handleSelectDays = (days: number) => {
    setSettings((prev) => ({
      ...prev,
      advanceNoticeDays: days,
      advanceNoticeHours: days * 24,
    }));
  };

  // Save Settings to Firestore
  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const days = Number(settings.advanceNoticeDays) || 2;
      const hours = days * 24;

      // 1. Update user profile settings
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notificationSettings: {
          advanceNoticeDays: days,
          advanceNoticeHours: hours,
          preferredDispatchHour: settings.preferredDispatchHour || '09:00',
          targetMinistries: settings.targetMinistries,
          fcmEnabled: Boolean(settings.fcmEnabled),
          enableReminder2h: Boolean(settings.enableReminder2h),
          notifyOnNewSchedule: Boolean(settings.notifyOnNewSchedule),
          notifyOnSongChanges: Boolean(settings.notifyOnSongChanges),
          quietHoursEnabled: Boolean(settings.quietHoursEnabled),
          quietHoursStart: settings.quietHoursStart || '22:00',
          quietHoursEnd: settings.quietHoursEnd || '07:00',
        },
        updatedAt: serverTimestamp(),
      });

      // 2. If user is leader/admin and opted to apply as church rule, save to church config
      if (isLeader && settings.applyToChurchVolunteers && userData?.churchId) {
        try {
          const churchConfigRef = doc(db, 'services', `schedule_notification_config_${userData.churchId}`);
          await setDoc(
            churchConfigRef,
            {
              churchId: userData.churchId,
              advanceNoticeDays: days,
              advanceNoticeHours: hours,
              preferredDispatchHour: settings.preferredDispatchHour || '09:00',
              targetMinistries: settings.targetMinistries,
              fcmEnabled: Boolean(settings.fcmEnabled),
              enableReminder2h: Boolean(settings.enableReminder2h),
              updatedAt: serverTimestamp(),
              updatedBy: user.uid,
            },
            { merge: true }
          );
        } catch (cErr) {
          console.warn('Could not save church-level notification config:', cErr);
        }
      }

      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error('Error saving notification settings:', err);
      setErrorMessage('Não foi possível salvar as configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Send Direct Test Push Notification
  const handleSendTestNotification = async () => {
    if (!user) return;
    setSendingTest(true);
    try {
      const days = settings.advanceNoticeDays;
      const title = `📅 Lembrete de Escala (${days} ${days === 1 ? 'dia' : 'dias'} antes)`;
      const body = `Você está escalado(a) para ministrar daqui a ${days} dias. Aviso automático via Firebase Cloud Messaging às ${settings.preferredDispatchHour}.`;

      // 1. Create in-app notification doc
      await addDoc(collection(db, 'notifications'), {
        id: `notif_${Date.now()}`,
        userId: user.uid,
        title,
        body,
        type: 'schedule',
        read: false,
        createdAt: serverTimestamp(),
      });

      // 2. Send real FCM notification via API route
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            title,
            body,
            userIds: [user.uid],
            tokens: Array.isArray(userData?.fcmTokens) ? userData.fcmTokens : [],
          }),
        });
      } catch (fcmErr) {
        console.warn('API send FCM error (in-app notification was created):', fcmErr);
      }

      // 3. Browser notification fallback if open
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/icon_applane.png',
            badge: '/icon_applane.png',
          });
        } catch (e) {
          console.log('Browser notification fallback error:', e);
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

  // Scan Upcoming Schedules and Dispatch Automatic Reminders to Scheduled Volunteers
  const handleDispatchAutomaticReminders = async () => {
    if (!user || !userData?.churchId) {
      setErrorMessage('É necessário estar vinculado a uma igreja para verificar e disparar avisos de escala.');
      return;
    }

    setDispatchingReal(true);
    setDispatchResult(null);
    setErrorMessage(null);

    try {
      const days = Number(settings.advanceNoticeDays) || 2;
      const today = new Date();

      // Target date string YYYY-MM-DD
      const targetDateObj = new Date(today);
      targetDateObj.setDate(today.getDate() + days);
      const targetDateStr = targetDateObj.toISOString().split('T')[0];

      // Query church schedules
      const schedulesQ = query(
        collection(db, 'schedules'),
        where('churchId', '==', userData.churchId)
      );
      const schedulesSnap = await getDocs(schedulesQ);

      const matchedSchedules: any[] = [];
      const scheduledVolunteerUids = new Set<string>();

      schedulesSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const schedDate = data.date ? data.date.split('T')[0] : '';

        // Check if date matches target window (or within target day range)
        if (schedDate === targetDateStr) {
          matchedSchedules.push({ id: docSnap.id, ...data });

          // 1. Worship volunteers
          if (settings.targetMinistries.worship) {
            if (Array.isArray(data.members)) {
              data.members.forEach((uid: string) => {
                if (uid && typeof uid === 'string') scheduledVolunteerUids.add(uid);
              });
            }
            if (data.roles) {
              Object.values(data.roles).forEach((val: any) => {
                if (typeof val === 'string' && val.length > 5) scheduledVolunteerUids.add(val);
                if (Array.isArray(val)) val.forEach((uid: string) => {
                  if (typeof uid === 'string') scheduledVolunteerUids.add(uid);
                });
              });
            }
          }

          // 2. Dance volunteers
          if (settings.targetMinistries.dance) {
            const danceLeaders = (data.roles?.danceLeader || []) as string[];
            const dancers = (data.roles?.dancers || []) as string[];
            [...danceLeaders, ...dancers].forEach((uid) => {
              if (uid && typeof uid === 'string') scheduledVolunteerUids.add(uid);
            });
          }

          // 3. Multimedia volunteers
          if (settings.targetMinistries.multimedia) {
            const pcOps = (data.roles?.pcOperators || []) as string[];
            const camOps = (data.roles?.cameraOperators || []) as string[];
            const photoOps = (data.roles?.photographyOperators || []) as string[];
            const socialOps = (data.roles?.socialMediaOperators || []) as string[];
            [...pcOps, ...camOps, ...photoOps, ...socialOps].forEach((uid) => {
              if (uid && typeof uid === 'string') scheduledVolunteerUids.add(uid);
            });
          }
        }
      });

      const volunteerUidsList = Array.from(scheduledVolunteerUids);
      const targetDateFormatted = targetDateObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      if (volunteerUidsList.length === 0) {
        setDispatchResult({
          success: true,
          volunteersCount: 0,
          schedulesCount: matchedSchedules.length,
          message: matchedSchedules.length > 0
            ? `Encontrada escala para ${targetDateFormatted}, porém não há voluntários vinculados aos ministérios selecionados.`
            : `Nenhuma escala cadastrada exatamente para daqui a ${days} ${days === 1 ? 'dia' : 'dias'} (${targetDateFormatted}). A rotina automática do FCM disparará assim que houver cultos nessa data.`,
        });
        return;
      }

      // Dispatch notifications to scheduled volunteers
      const notifTitle = `📅 Lembrete de Escala: Culto em ${days} ${days === 1 ? 'dia' : 'dias'}`;
      const notifBody = `Você está escalado(a) para ministrar no culto de ${targetDateFormatted}. Toque para ver os detalhes e confirmar presença!`;

      // 1. Create in-app notifications
      const notifPromises = volunteerUidsList.map((volunteerUid) =>
        addDoc(collection(db, 'notifications'), {
          id: `sched_auto_${Date.now()}_${volunteerUid}`,
          userId: volunteerUid,
          title: notifTitle,
          body: notifBody,
          type: 'schedule',
          read: false,
          createdAt: serverTimestamp(),
        })
      );
      await Promise.all(notifPromises);

      // 2. Dispatch FCM push via API
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            title: notifTitle,
            body: notifBody,
            userIds: volunteerUidsList,
          }),
        });
      } catch (fcmErr) {
        console.warn('API send FCM error:', fcmErr);
      }

      setDispatchResult({
        success: true,
        volunteersCount: volunteerUidsList.length,
        schedulesCount: matchedSchedules.length,
        message: `Sucesso! ${volunteerUidsList.length} voluntários notificados via Firebase Cloud Messaging para as escalas em ${targetDateFormatted}.`,
      });
    } catch (err: any) {
      console.error('Error running automatic reminders dispatch:', err);
      setErrorMessage('Erro ao verificar escalas e disparar notificações automáticas.');
    } finally {
      setDispatchingReal(false);
    }
  };

  // Helper to format weekday example
  const getExampleDispatchDayText = (daysAhead: number) => {
    const daysMap = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    // Assuming Sunday worship (index 0)
    const sundayIndex = 0;
    const dispatchDayIndex = (sundayIndex - daysAhead + 70) % 7;
    return daysMap[dispatchDayIndex];
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm ${className}`}>
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
          <div className="w-7 h-7 border-3 border-blue-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold">Carregando painel de avisos automáticos FCM...</span>
        </div>
      </div>
    );
  }

  const selectedPreset = PRESET_DAYS.find((p) => p.days === Number(settings.advanceNoticeDays));

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm relative overflow-hidden transition-all ${className}`}>
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-rose-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-100 dark:border-slate-800 relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-800/25">
            <Radio className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Painel de Avisos Automáticos de Escala
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Firebase Cloud Messaging (FCM)
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Configure com quantos <strong>dias de antecedência</strong> (ex: 2, 3, 5 dias) o sistema deve disparar avisos e convocações automáticas de escala diretamente no celular ou computador dos voluntários.
            </p>
          </div>
        </div>

        {/* Master FCM Switch */}
        <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 px-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          <div className="text-right">
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">Avisos via FCM</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {settings.fcmEnabled ? 'Ativados' : 'Desativados'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.fcmEnabled}
            onClick={() => setSettings((prev) => ({ ...prev, fcmEnabled: !prev.fcmEnabled }))}
            className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
              settings.fcmEnabled ? 'bg-blue-800' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                settings.fcmEnabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Browser Permission Banner */}
      {settings.fcmEnabled && (
        <div className="my-6">
          {browserPermission === 'granted' ? (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Navegador Autorizado para FCM:</strong> Seu dispositivo está habilitado para receber push notifications de escala mesmo em segundo plano.
                </span>
              </div>
              <span className="font-extrabold uppercase tracking-wider text-[10px] px-3 py-1 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl">
                Pronto para Push
              </span>
            </div>
          ) : browserPermission === 'denied' ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong>Atenção:</strong> As notificações estão bloqueadas nas configurações do seu navegador. Clique no ícone de cadeado na barra de endereços para permitir notificações push do Applane.
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/40 text-blue-900 dark:text-blue-200 text-xs">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-blue-700 shrink-0" />
                <span>
                  Ative as permissões no navegador para receber as notificações automáticas de escala na tela inicial do seu dispositivo.
                </span>
              </div>
              <button
                type="button"
                onClick={requestFcmPermission}
                className="bg-blue-800 hover:bg-blue-900 text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer"
              >
                Autorizar Notificações Push
              </button>
            </div>
          )}
        </div>
      )}

      {/* CORE PANEL: Seleção de Dias de Antecedência (2, 3, 5 dias, etc.) */}
      <div className="py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Clock className="w-6 h-6 text-blue-800 dark:text-blue-400" />
              <span>Dias de Antecedência para o Disparo Automático</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Escolha uma das regras recomendadas (ex: 2, 3, 5 dias) ou personalize a quantidade de dias:
            </p>
          </div>

          {/* Current Selection Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-2xl text-blue-900 dark:text-blue-200 font-extrabold text-sm shadow-2xs self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>{settings.advanceNoticeDays} {settings.advanceNoticeDays === 1 ? 'dia' : 'dias'} de antecedência ({settings.advanceNoticeDays * 24}h)</span>
          </div>
        </div>

        {/* Presets Cards: 2, 3, 5 Dias em Destaque */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_DAYS.map((preset) => {
            const isSelected = Number(settings.advanceNoticeDays) === preset.days;
            return (
              <button
                key={`preset-${preset.days}`}
                type="button"
                onClick={() => handleSelectDays(preset.days)}
                className={`p-5 rounded-3xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-800 text-white border-blue-800 shadow-xl shadow-blue-800/20 ring-4 ring-blue-800/10 scale-[1.02]'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-600 text-slate-800 dark:text-slate-200 hover:bg-blue-50/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2.5">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white border border-white/30'
                          : preset.isPrimary
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {preset.badge}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-white text-blue-800 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-black text-base sm:text-lg tracking-tight">
                    {preset.label}
                  </h4>
                </div>

                <p
                  className={`text-xs mt-3 leading-relaxed font-medium ${
                    isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {preset.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* NOVO CAMPO DO FORMULÁRIO: 'Dias de Antecedência para Escala' */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 sm:p-7 rounded-[2rem] border-2 border-blue-200 dark:border-blue-900/60 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <label
                  htmlFor="dias-antecedencia-input"
                  className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2"
                >
                  <Calendar className="w-5 h-5 text-blue-800 dark:text-blue-400" />
                  <span>Dias de Antecedência para Escala</span>
                </label>
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  Campo Obrigatório
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                Define aos líderes o momento exato (ex: <strong>2, 3 ou 5 dias</strong>) em que o sistema deve disparar as notificações e convocações automáticas via <strong>Firebase Cloud Messaging (FCM)</strong> para os voluntários escalados.
              </p>
            </div>

            {/* Quick shortcuts 2, 3, 5 dias */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Atalhos:</span>
              {[2, 3, 5].map((d) => (
                <button
                  key={`quick-btn-${d}`}
                  type="button"
                  onClick={() => handleSelectDays(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    Number(settings.advanceNoticeDays) === d
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {d} dias
                </button>
              ))}
            </div>
          </div>

          {/* Numeric Input & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <div className="relative flex items-center w-full sm:w-56">
              <input
                id="dias-antecedencia-input"
                name="diasDeAntecedenciaParaEscala"
                type="number"
                min="1"
                max="30"
                step="1"
                value={settings.advanceNoticeDays}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(30, Number(e.target.value) || 1));
                  handleSelectDays(val);
                }}
                className="w-full text-center text-3xl font-black text-blue-900 dark:text-blue-100 bg-white dark:bg-slate-850 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-800 dark:focus:border-blue-400 rounded-2xl py-3.5 px-4 outline-none transition-all shadow-inner"
                placeholder="2, 3, 5..."
              />
              <span className="absolute right-4 text-xs font-black text-slate-400 pointer-events-none uppercase tracking-wider">
                {settings.advanceNoticeDays === 1 ? 'dia' : 'dias'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectDays(Math.max(1, settings.advanceNoticeDays - 1))}
                className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-slate-700 shadow-2xs"
                title="Diminuir 1 dia"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleSelectDays(Math.min(30, settings.advanceNoticeDays + 1))}
                className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-slate-700 shadow-2xs"
                title="Aumentar 1 dia"
              >
                +
              </button>
            </div>

            <div className="flex-1 sm:pl-4 sm:border-l border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 flex flex-col justify-center">
              <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                Disparo em {settings.advanceNoticeDays} {settings.advanceNoticeDays === 1 ? 'dia' : 'dias'} ({settings.advanceNoticeDays * 24}h de antecedência)
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
                Para um culto no <strong>Domingo</strong>, o aviso via FCM chegará na <strong>{getExampleDispatchDayText(settings.advanceNoticeDays)}</strong> às <strong>{settings.preferredDispatchHour}</strong>.
              </span>
            </div>
          </div>

          {/* Slider for smooth visual adjustment */}
          <div className="pt-2 space-y-1.5">
            <input
              type="range"
              min="1"
              max="14"
              step="1"
              value={settings.advanceNoticeDays}
              onChange={(e) => handleSelectDays(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-800"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
              <span>1 dia (24h)</span>
              <span className="text-blue-700 dark:text-blue-400 font-black">2 dias (48h)</span>
              <span className="text-blue-700 dark:text-blue-400 font-black">3 dias (72h)</span>
              <span className="text-blue-700 dark:text-blue-400 font-black">5 dias (120h)</span>
              <span>7 dias (1 sem)</span>
              <span>14 dias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Horário de Disparo & Ministérios Alvo */}
      <div className="py-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Horário Preferencial */}
        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Horário Preferencial de Envio
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Momento do dia em que os voluntários receberão a notificação push.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {['08:00', '09:00', '12:00', '18:00', '20:00'].map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, preferredDispatchHour: time }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  settings.preferredDispatchHour === time
                    ? 'bg-blue-800 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
              >
                {time}
              </button>
            ))}
            <input
              type="time"
              value={settings.preferredDispatchHour}
              onChange={(e) => setSettings((prev) => ({ ...prev, preferredDispatchHour: e.target.value }))}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-black text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-800"
            />
          </div>
        </div>

        {/* 2. Ministérios Alvo dos Avisos */}
        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Ministérios Atendidos pelos Avisos
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quais equipes de voluntários receberão os alertas automáticos de escala.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Louvor */}
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  targetMinistries: {
                    ...prev.targetMinistries,
                    worship: !prev.targetMinistries.worship,
                  },
                }))
              }
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                settings.targetMinistries.worship
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-black'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
              }`}
            >
              <Music className="w-4 h-4 text-indigo-600" />
              <span className="text-xs">Louvor</span>
            </button>

            {/* Dança */}
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  targetMinistries: {
                    ...prev.targetMinistries,
                    dance: !prev.targetMinistries.dance,
                  },
                }))
              }
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                settings.targetMinistries.dance
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-black'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
              }`}
            >
              <BallerinaIcon className="w-4 h-4 text-rose-600" />
              <span className="text-xs">Dança</span>
            </button>

            {/* Multimídia */}
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  targetMinistries: {
                    ...prev.targetMinistries,
                    multimedia: !prev.targetMinistries.multimedia,
                  },
                }))
              }
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                settings.targetMinistries.multimedia
                  ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-black'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
              }`}
            >
              <Video className="w-4 h-4 text-purple-600" />
              <span className="text-xs">Mídia</span>
            </button>
          </div>
        </div>
      </div>

      {/* Regra Oficial da Igreja para Líderes */}
      {isLeader && (
        <div className="p-5 rounded-3xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-blue-800 text-white rounded-2xl shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Regra Oficial da Congregação</span>
                <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 rounded-md text-[9px] font-black uppercase">
                  Para Líderes
                </span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                Salvar esta configuração de {settings.advanceNoticeDays} {settings.advanceNoticeDays === 1 ? 'dia' : 'dias'} como a regra automática padrão da igreja para todos os voluntários escalados.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer shrink-0 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-2xs">
            <input
              type="checkbox"
              checked={settings.applyToChurchVolunteers}
              onChange={(e) => setSettings((prev) => ({ ...prev, applyToChurchVolunteers: e.target.checked }))}
              className="w-4 h-4 text-blue-800 rounded border-slate-300 focus:ring-blue-700"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Aplicar a Todos os Voluntários
            </span>
          </label>
        </div>
      )}

      {/* FCM Push Live Notification Preview (Mockup Celular) */}
      <div className="py-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-700" />
            Pré-visualização do Aviso Push (FCM no Smartphone)
          </h4>
          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            FCM Real
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white shadow-xl max-w-xl mx-auto border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-blue-600 flex items-center justify-center text-[9px] font-black">
                A
              </div>
              <span className="font-bold text-slate-300">Applane Ministério</span>
              <span>•</span>
              <span>agora</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md font-mono">
              {settings.preferredDispatchHour}
            </span>
          </div>

          <div className="space-y-1">
            <h5 className="font-black text-sm text-white flex items-center gap-1.5">
              <span>📅 Lembrete de Escala • Culto em {settings.advanceNoticeDays} {settings.advanceNoticeDays === 1 ? 'dia' : 'dias'}</span>
            </h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              Olá, Voluntário! Você está escalado(a) para ministrar no culto de {getExampleDispatchDayText(settings.advanceNoticeDays)} (daqui a {settings.advanceNoticeDays} dias). Toque para confirmar sua presença e estudar as músicas e coreografias.
            </p>
          </div>
        </div>
      </div>

      {/* Disparo de Teste Real de Escalas & Feedback */}
      {dispatchResult && (
        <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 animate-in fade-in ${
          dispatchResult.volunteersCount > 0
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-black text-sm">
              {dispatchResult.volunteersCount > 0 ? 'Disparo de Avisos Concluído!' : 'Verificação de Escalas Realizada'}
            </p>
            <p className="font-medium leading-relaxed">
              {dispatchResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Additional Preferences (2h reminder, song changes, etc.) */}
      <div className="py-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
          Preferências Adicionais de Alerta
        </h4>

        {/* 1. Reforço de 2 horas */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Alerta Adicional de Reforço (2 horas antes)
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Segundo lembrete rápido pouco antes do início do culto para não esquecer instrumentos e figurinos.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enableReminder2h}
            onClick={() => setSettings((prev) => ({ ...prev, enableReminder2h: !prev.enableReminder2h }))}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
              settings.enableReminder2h ? 'bg-blue-800' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                settings.enableReminder2h ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 2. Publicação de Nova Escala */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Aviso Imediato ao ser Adicionado na Escala
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Disparo push imediato no momento em que o líder confirma o voluntário na escala oficial.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.notifyOnNewSchedule}
            onClick={() => setSettings((prev) => ({ ...prev, notifyOnNewSchedule: !prev.notifyOnNewSchedule }))}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
              settings.notifyOnNewSchedule ? 'bg-blue-800' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                settings.notifyOnNewSchedule ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
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
          <span className="font-extrabold">
            Configurações salvas com sucesso! Avisos automáticos definidos para {settings.advanceNoticeDays} {settings.advanceNoticeDays === 1 ? 'dia' : 'dias'} de antecedência às {settings.preferredDispatchHour}.
          </span>
        </div>
      )}

      {testSent && (
        <div className="mb-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2 animate-in fade-in">
          <Send className="w-4 h-4 shrink-0 text-blue-600" />
          <span>Notificação de teste FCM disparada com sucesso! Verifique a barra de notificações do seu aparelho.</span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Direct Test Push */}
          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={sendingTest}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Envia uma notificação push de teste direta no seu dispositivo"
          >
            {sendingTest ? (
              <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-blue-700" />
            )}
            <span>Testar Push Imediato</span>
          </button>

          {/* Leader action: Scan and trigger upcoming schedule warnings */}
          {isLeader && (
            <button
              type="button"
              onClick={handleDispatchAutomaticReminders}
              disabled={dispatchingReal}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
              title={`Verifica escalas marcadas para daqui a ${settings.advanceNoticeDays} dias e envia os avisos aos voluntários`}
            >
              {dispatchingReal ? (
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Radio className="w-4 h-4 text-indigo-600" />
              )}
              <span>Disparar Avisos das Escalas em {settings.advanceNoticeDays} {settings.advanceNoticeDays === 1 ? 'Dia' : 'Dias'}</span>
            </button>
          )}
        </div>

        {/* Save button */}
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
              <span>Salvar Regra de Antecedência</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
