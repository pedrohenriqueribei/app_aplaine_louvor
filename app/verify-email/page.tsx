"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, markEmailVerified, refreshUserData } = useAuth();

  const emailParam = searchParams.get("email");
  const userIdParam = searchParams.get("userId");
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  // Effective email and userId (from URL query or from authenticated session)
  const targetEmail = emailParam || user?.email || userData?.email || "";
  const targetUserId = userIdParam || user?.uid || userData?.uid || "";

  // 6 digits state
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer state (60 seconds)
  const [cooldown, setCooldown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  // Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingCode, setSendingCode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState<boolean>(false);
  const [previewDevCode, setPreviewDevCode] = useState<string | null>(null);

  // Send or resend validation code
  const sendCode = useCallback(async (isManualResend = true) => {
    if (!targetEmail || !targetUserId) return;

    if (isManualResend) {
      setSendingCode(true);
      setErrorMessage(null);
    }

    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          userId: targetUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
          setCanResend(false);
        }
        setErrorMessage(data.error || "Não foi possível enviar o código agora.");
      } else {
        setCooldown(60);
        setCanResend(false);
        if (data.devCode) {
          setPreviewDevCode(data.devCode);
        }
        if (isManualResend) {
          setSuccessMessage("Novo código enviado com sucesso!");
          setTimeout(() => setSuccessMessage(null), 4000);
        }
      }
    } catch (err: any) {
      setErrorMessage("Erro de conexão ao enviar o código. Tente novamente.");
    } finally {
      setSendingCode(false);
    }
  }, [targetEmail, targetUserId]);

  // Initial code send trigger
  const hasTriggeredInitialSend = useRef<boolean>(false);

  useEffect(() => {
    if (targetEmail && targetUserId && !hasTriggeredInitialSend.current) {
      hasTriggeredInitialSend.current = true;
      sendCode(false);
    }
  }, [targetEmail, targetUserId, sendCode]);

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");

    const newDigits = [...digits];

    if (cleaned.length === 0) {
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    // Take the last entered character if multiple
    newDigits[index] = cleaned[cleaned.length - 1];
    setDigits(newDigits);
    setErrorMessage(null);

    // Auto-focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle keyboard navigation (Backspace)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle paste full 6-digit code
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || "";
    }
    setDigits(newDigits);
    setErrorMessage(null);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Quick fill demo code helper
  const handleFillDemoCode = (code: string) => {
    const chars = code.split("").slice(0, 6);
    setDigits(chars);
    setErrorMessage(null);
    inputRefs.current[5]?.focus();
  };

  // Submit and verify code
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = digits.join("");

    if (fullCode.length !== 6) {
      setErrorMessage("Por favor, preencha os 6 dígitos do código.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          code: fullCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Código inválido ou expirado.");
        setLoading(false);
        return;
      }

      // Success! Update Auth Context state & Firestore on client side as well for safety
      markEmailVerified?.();
      if (user?.uid) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            emailVerified: true,
            email_verified: true,
            emailVerifiedAt: serverTimestamp(),
          });
        } catch (clientErr) {
          console.warn("Client side updateDoc fallback note:", clientErr);
        }
        try {
          await refreshUserData?.();
        } catch (refreshErr) {
          console.warn("Could not refresh user data:", refreshErr);
        }
      }

      setIsVerifiedSuccess(true);
      setSuccessMessage("E-mail confirmado com sucesso! Redirecionando...");

      // Redirect to dashboard with verified indicator
      setTimeout(() => {
        router.push(`${redirectPath}?verified=true`);
      }, 1500);
    } catch (err: any) {
      setErrorMessage("Erro de conexão ao validar o código. Tente novamente.");
      setLoading(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300">
      {/* Background radial decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* APPLANE LOGO */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <img
                src="/logo_aplane.png"
                alt="Applane Logo"
                className="h-9 w-auto object-contain"
              />
            </div>
          </Link>
        </div>

        {/* MAIN VERIFICATION CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 shadow-xl p-8 sm:p-10 space-y-6"
        >
          {isVerifiedSuccess ? (
            /* SUCCESS CELEBRATION VIEW */
            <div className="text-center py-6 space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  E-mail Confirmado!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Sua conta foi validada com sucesso e agora possui o selo oficial de verificação.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-800 animate-pulse" />
                  Redirecionando para o seu dashboard...
                </span>
              </div>
            </div>
          ) : (
            /* ACTIVE CODE ENTRY VIEW */
            <>
              {/* HEADER ICON & TITLES */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 mx-auto flex items-center justify-center shadow-md shadow-blue-800/10 mb-4 border border-blue-100 dark:border-blue-900/50">
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Confirme seu E-mail
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Enviamos um código de segurança de 6 dígitos numéricos para:
                </p>
                <div className="inline-block px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200">
                  {targetEmail || "seu e-mail"}
                </div>
              </div>

              {/* DEMO / PREVIEW CODE HELPER BANNER */}
              {previewDevCode && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-3.5 text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <KeyRound className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300">
                      Código de validação gerado:{" "}
                      <strong className="text-blue-800 dark:text-blue-300 font-mono text-sm tracking-wider">
                        {previewDevCode}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemoCode(previewDevCode)}
                    className="px-2.5 py-1 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
                  >
                    Preencher
                  </button>
                </motion.div>
              )}

              {/* FEEDBACK ERROR MESSAGE */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {/* FEEDBACK SUCCESS MESSAGE */}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </motion.div>
              )}

              {/* 6 INDIVIDUAL OTP INPUT FIELDS */}
              <form onSubmit={handleVerify} className="space-y-6 pt-2">
                <div
                  className="flex items-center justify-center gap-2 sm:gap-3"
                  onPaste={handlePaste}
                >
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      autoFocus={index === 0}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`w-11 sm:w-13 h-14 sm:h-16 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all outline-none font-mono ${
                        digit
                          ? "border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:border-blue-800 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900"
                      } ${errorMessage ? "border-rose-300 dark:border-rose-800 bg-rose-50/30" : ""}`}
                    />
                  ))}
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading || !isComplete}
                  className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    isComplete && !loading
                      ? "bg-blue-800 hover:bg-blue-900 text-white shadow-blue-800/25 active:scale-98"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validando código...</span>
                    </>
                  ) : (
                    <>
                      <span>Validar Código</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* RESEND CODE WITH 60s COOLDOWN */}
              <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <p>
                  Não recebeu o e-mail ou o código expirou?
                </p>
                <div>
                  {canResend ? (
                    <button
                      type="button"
                      onClick={() => sendCode(true)}
                      disabled={sendingCode}
                      className="font-bold text-blue-800 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {sendingCode ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Enviando novo código...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reenviar código</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-semibold inline-flex items-center gap-1">
                      <span>Reenviar código em</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-mono">
                        00:{cooldown < 10 ? `0${cooldown}` : cooldown}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* BOTTOM HELPER LINKS */}
        <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Voltar para o Login</span>
          </Link>
          <span>•</span>
          <Link
            href={redirectPath}
            className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Continuar para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-800 border-t-transparent animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
