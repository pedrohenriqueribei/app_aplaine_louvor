"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Check,
  X,
  HelpCircle,
} from "lucide-react";

type Step = "request" | "verify" | "reset" | "success";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial email from query param if available
  const initialEmail = searchParams.get("email") || "";

  // Step state
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState<string>(initialEmail);

  // OTP digits (6 items)
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password fields
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Reset token obtained after successful code verification
  const [resetToken, setResetToken] = useState<string>("");

  // Loading and cooldown states
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previewDevCode, setPreviewDevCode] = useState<string | null>(null);

  // Cooldown interval timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto focus first OTP input when entering verify step
  useEffect(() => {
    if (step === "verify") {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 200);
    }
  }, [step]);

  // STEP 1: Request 6-digit code
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Por favor, digite seu endereço de e-mail.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
        }
        setErrorMessage(data.error || "Não foi possível enviar o código de recuperação.");
      } else {
        setCooldown(data.cooldownRemaining || 60);
        if (data.devCode) {
          setPreviewDevCode(data.devCode);
        }
        setStatusMessage(
          data.message ||
            "Se este e-mail estiver cadastrado, você receberá um código de redefinição de 6 dígitos."
        );
        // Move to OTP step
        setStep("verify");
      }
    } catch {
      setErrorMessage("Erro de conexão com o servidor. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Resend code from OTP step
  const handleResendCode = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
        }
        setErrorMessage(data.error || "Não foi possível reenviar o código agora.");
      } else {
        setCooldown(data.cooldownRemaining || 60);
        if (data.devCode) {
          setPreviewDevCode(data.devCode);
        }
        setStatusMessage("Um novo código de 6 dígitos foi enviado para o seu e-mail!");
        // Clear previous input digits
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setErrorMessage("Erro ao solicitar novo código.");
    } finally {
      setResending(false);
    }
  };

  // STEP 2: Handle OTP input
  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    const updated = [...digits];

    if (!clean) {
      updated[index] = "";
      setDigits(updated);
      return;
    }

    // Single digit input
    updated[index] = clean[clean.length - 1];
    setDigits(updated);
    setErrorMessage(null);

    // Auto advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...digits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setDigits(updated);
    setErrorMessage(null);

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  // STEP 2: Verify code
  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = digits.join("");

    if (fullCode.length !== 6) {
      setErrorMessage("Digite todos os 6 dígitos do código recebido.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Código de recuperação inválido.");
      } else {
        setResetToken(data.resetToken);
        setStep("reset");
        setErrorMessage(null);
      }
    } catch {
      setErrorMessage("Erro de conexão ao validar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Password strength calculations
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  // STEP 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      if (!hasMinLength) {
        setErrorMessage("A senha deve possuir pelo menos 8 caracteres.");
      } else if (!hasLetter || !hasNumber) {
        setErrorMessage("A senha deve conter uma combinação de letras e números.");
      } else if (!passwordsMatch) {
        setErrorMessage("As senhas informadas não coincidem.");
      }
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Não foi possível alterar sua senha.");
      } else {
        setStep("success");
      }
    } catch {
      setErrorMessage("Erro ao processar alteração da senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Left side branding (Matches Login page) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 p-12 items-center justify-center relative overflow-hidden">
        {/* Glow and mesh background effects */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

        <div className="relative z-10 max-w-lg text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-10 flex justify-center"
          >
            <Link
              href="/"
              className="bg-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-blue-950/50 relative group border border-white/20 flex items-center cursor-pointer"
            >
              <div className="absolute inset-0 bg-blue-400/30 rounded-[2rem] blur-2xl group-hover:blur-3xl transition-all duration-500 -z-10" />
              <img
                src="/logo_aplane.png"
                alt="Applane Logo"
                className="h-16 w-auto object-contain relative z-10 transition-transform duration-500 group-hover:scale-105"
              />
            </Link>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-display font-black text-white mb-6 leading-tight"
          >
            Sua igreja em{" "}
            <span className="bg-gradient-to-r from-blue-200 via-white to-blue-300 bg-clip-text text-transparent italic drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
              harmonia
            </span>{" "}
            perfeita.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-blue-100 text-lg font-medium leading-relaxed"
          >
            Recuperação segura de acesso com verificação por código numérico de 6 dígitos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-left flex items-start gap-4"
          >
            <div className="p-3 bg-white/10 rounded-xl text-blue-200 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Segurança em 3 Etapas</h4>
              <p className="text-blue-200/90 text-xs mt-1 leading-relaxed">
                1. Solicitação do código por e-mail<br />
                2. Confirmação dos 6 dígitos numéricos<br />
                3. Definição da nova senha com hash protegido
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side form container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <Link href="/" className="flex items-center">
              <img
                src="/logo_aplane.png"
                alt="Applane Logo"
                className="h-12 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Stepper Progress Bar */}
          {step !== "success" && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                <span className={step === "request" ? "text-blue-800 dark:text-blue-400 font-extrabold" : ""}>
                  1. E-mail
                </span>
                <span className={step === "verify" ? "text-blue-800 dark:text-blue-400 font-extrabold" : ""}>
                  2. Código
                </span>
                <span className={step === "reset" ? "text-blue-800 dark:text-blue-400 font-extrabold" : ""}>
                  3. Nova Senha
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className={`h-full bg-blue-800 dark:bg-blue-600 transition-all duration-500 ${
                    step === "request" ? "w-1/3" : step === "verify" ? "w-2/3" : "w-full"
                  }`}
                />
              </div>
            </div>
          )}

          {/* Global Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-red-800 dark:text-red-200">
                <p className="font-semibold">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Development / Preview Testing Assistance Banner */}
          {previewDevCode && step === "verify" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-start gap-3"
            >
              <Sparkles className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs sm:text-sm text-blue-900 dark:text-blue-200">
                <span className="font-bold">Ambiente de Teste:</span> Código de 6 dígitos gerado:{" "}
                <span className="font-mono font-black text-base bg-blue-200/70 dark:bg-blue-800/60 px-2 py-0.5 rounded-md tracking-wider">
                  {previewDevCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const arr = previewDevCode.split("");
                    setDigits(arr);
                    inputRefs.current[5]?.focus();
                  }}
                  className="ml-2 font-bold underline text-blue-800 dark:text-blue-300 hover:text-blue-950"
                >
                  Preencher
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 1: Request Code */}
          {step === "request" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="mb-8">
                <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  Esqueci minha senha
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                  Informe o e-mail cadastrado na sua conta. Se for localizado, você receberá um
                  código numérico de 6 dígitos para redefinição.
                </p>
              </div>

              <form onSubmit={handleRequestCode} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                    E-mail cadastrado
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando código...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar código de recuperação</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Lembrou sua senha? Voltar para o Login</span>
                </Link>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Verify Code (OTP 6 Digits) */}
          {step === "verify" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center text-blue-800 dark:text-blue-300 mb-4">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  Inserir Código
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                  Digite os 6 dígitos numéricos enviados para{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{email}</span>. O
                  código expira em 15 minutos.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("request");
                    setErrorMessage(null);
                  }}
                  className="mt-1 text-xs text-blue-800 dark:text-blue-400 hover:underline font-bold"
                >
                  Alterar e-mail informado
                </button>
              </div>

              {statusMessage && (
                <div className="mb-6 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{statusMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-6">
                {/* 6 OTP Inputs */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 text-center">
                    CÓDIGO DE 6 DÍGITOS
                  </label>
                  <div className="flex justify-between gap-2 sm:gap-3">
                    {digits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-800 focus:ring-4 focus:ring-blue-800/20 outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Code Section with 60s cooldown timer */}
                <div className="flex items-center justify-between text-xs sm:text-sm pt-2">
                  <span className="text-slate-500">Não recebeu o código?</span>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={cooldown > 0 || resending}
                    className="font-bold text-blue-800 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                    {cooldown > 0 ? (
                      <span>Reenviar em {cooldown}s</span>
                    ) : resending ? (
                      <span>Reenviando...</span>
                    ) : (
                      <span>Reenviar código</span>
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || digits.join("").length !== 6}
                  className="w-full bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Validando código...</span>
                    </>
                  ) : (
                    <>
                      <span>Validar Código</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para digitação de e-mail</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Create New Password */}
          {step === "reset" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-800 dark:text-emerald-300 mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  Criar Nova Senha
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                  Código validado com sucesso! Agora defina uma nova senha segura para a conta{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{email}</span>.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password Input */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password Input */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password strength checklist */}
                <div className="p-4 bg-slate-100 dark:bg-slate-900/60 rounded-2xl space-y-2 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Critérios de segurança:
                  </span>
                  <div className="flex items-center gap-2">
                    {hasMinLength ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                    )}
                    <span className={hasMinLength ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-slate-500"}>
                      Mínimo de 8 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasLetter ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                    )}
                    <span className={hasLetter ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-slate-500"}>
                      Pelo menos uma letra
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasNumber ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                    )}
                    <span className={hasNumber ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-slate-500"}>
                      Pelo menos um número
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordsMatch ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                    )}
                    <span className={passwordsMatch ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-slate-500"}>
                      As senhas coincidem
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isPasswordValid}
                  className="w-full bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-6"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Atualizando senha...</span>
                    </>
                  ) : (
                    <>
                      <span>Salvar Nova Senha</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 4: Success Message */}
          {step === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 rounded-3xl mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white mb-3">
                Senha alterada com sucesso!
              </h1>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-sm mx-auto mb-8">
                Sua nova senha foi salva e protegida com criptografia de ponta a ponta. Você já
                pode entrar no sistema com a nova credencial.
              </p>

              <Link
                href={`/login?resetSuccess=true&email=${encodeURIComponent(email)}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95"
              >
                <span>Fazer Login Agora</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-800 rounded-full animate-spin" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
