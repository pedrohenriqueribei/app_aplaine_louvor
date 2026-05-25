"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { Bell, CheckCircle, Trash2, Clock, Calendar } from "lucide-react";

interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: any;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Notification,
        );
        // Sort by createdAt desc
        docs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis
            ? a.createdAt.toMillis()
            : a.createdAt?.seconds
              ? a.createdAt.seconds * 1000
              : 0;
          const timeB = b.createdAt?.toMillis
            ? b.createdAt.toMillis()
            : b.createdAt?.seconds
              ? b.createdAt.seconds * 1000
              : 0;
          return timeB - timeA;
        });
        setNotifications(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening for notifications:", err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications
      .filter((n) => !n.read)
      .forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
    await batch.commit();
  };

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100">
            Notificações
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Acompanhe suas convocações e avisos
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-400 hover:underline"
          >
            <CheckCircle className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center text-center">
            <Bell className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-6" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Tudo limpo por aqui!
            </h3>
            <p className="text-slate-500 mt-2">
              Você não possui novas notificações no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-6 rounded-[2rem] border transition-all ${
                  notif.read
                    ? "bg-white/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-75"
                    : "bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/30 shadow-lg shadow-blue-800/5 ring-1 ring-blue-50 dark:ring-blue-900/20"
                }`}
                onClick={() => !notif.read && markAsRead(notif.id)}
              >
                <div className="flex gap-6 items-start">
                  <div
                    className={`mt-1 p-3 rounded-2xl ${
                      notif.read
                        ? "bg-slate-100 dark:bg-slate-800"
                        : "bg-blue-50 dark:bg-blue-900/40"
                    }`}
                  >
                    {notif.type === "schedule" ? (
                      <Calendar
                        className={`w-5 h-5 ${notif.read ? "text-slate-400" : "text-blue-800 dark:text-blue-400"}`}
                      />
                    ) : (
                      <Bell
                        className={`w-5 h-5 ${notif.read ? "text-slate-400" : "text-blue-800 dark:text-blue-400"}`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4
                        className={`font-bold transition-colors ${notif.read ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600 flex items-center gap-1">
                        <Clock size={10} />
                        {notif.createdAt?.toDate
                          ? notif.createdAt.toDate().toLocaleString("pt-BR")
                          : "Agora"}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-sm leading-relaxed ${notif.read ? "text-slate-500 dark:text-slate-500" : "text-slate-600 dark:text-slate-400"}`}
                    >
                      {notif.body}
                    </p>
                    {!notif.read && (
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-400 hover:underline"
                        >
                          Entendido
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
