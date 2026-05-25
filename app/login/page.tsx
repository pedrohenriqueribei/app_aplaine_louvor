"use client";

import React, { useState, Suspense } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";

function LoginForm() {
  const { user, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (!loading && user) {
      router.push(redirectPath);
    }
  }, [user, loading, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name, {
          phone: "",
          instruments: [],
          vocalRange: "",
        });
      }
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar. Verifique seus dados.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Left Side - Visual/Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-20 w-80 h-80 bg-blue-400 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 -right-20 w-80 h-80 bg-indigo-400 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-lg text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-12 flex justify-center"
          >
            <Link
              href="/"
              className="bg-white p-6 rounded-[2rem] shadow-2xl shadow-blue-900/50 relative group border border-white/20 block cursor-pointer"
            >
              <div className="absolute inset-0 bg-blue-400/30 rounded-[2rem] blur-2xl group-hover:blur-3xl transition-all duration-500 -z-10"></div>
              <img
                src="https://lh3.googleusercontent.com/d/1lKzsn9yPg-jpcH5Lw1x5QwCyH_W9btXq?v=2"
                alt="Aplaine Logo"
                className="h-20 w-auto relative z-10 transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </Link>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-display font-black text-white mb-6 leading-tight"
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
            className="text-blue-100 text-xl font-medium leading-relaxed"
          >
            Gestão ministerial inteligente para louvor, escalas e repertórios.
          </motion.p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-display font-black text-slate-900 mb-2 tracking-tight">
              {isLogin ? "Bem-vindo de volta" : "Criar conta"}
            </h1>
            <p className="text-slate-500 font-medium">
              {isLogin
                ? "Acesse o sistema do seu ministério"
                : "Comece a gerir seu ministério hoje"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-bold text-slate-700 ml-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ex: João Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? "Processando..."
                : isLogin
                  ? "Entrar no Sistema"
                  : "Criar minha Conta"}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <p className="mt-10 text-center text-slate-600 font-medium">
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
            <button
              onClick={() =>
                isLogin
                  ? router.push(
                      `/register${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
                    )
                  : setIsLogin(true)
              }
              className="ml-2 text-blue-800 font-bold hover:underline"
            >
              {isLogin ? "Cadastre-se" : "Faça login"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-800 rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
