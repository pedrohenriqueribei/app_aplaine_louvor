"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LayoutGrid, Loader2 } from "lucide-react";

export default function MinistriesRedirectPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function routeToMinistries() {
      if (userData?.churchId) {
        router.replace(`/dashboard/churches/${userData.churchId}#grid-ministerios`);
        return;
      }

      try {
        const snap = await getDocs(query(collection(db, "churches")));
        if (!snap.empty) {
          router.replace(`/dashboard/churches/${snap.docs[0].id}#grid-ministerios`);
          return;
        }
      } catch (err) {
        console.error("Error finding church for ministries:", err);
      }

      router.replace("/dashboard/churches");
    }

    routeToMinistries();
  }, [userData?.churchId, authLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 animate-pulse">
        <LayoutGrid className="w-10 h-10" />
      </div>
      <p className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando ministérios...
      </p>
    </div>
  );
}
