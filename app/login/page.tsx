"use client";

import React, { useState, Suspense } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, X, HelpCircle } from "lucide-react";

interface AuthErrorInfo {
  title: string;
  description: string;
  suggestion?: string;
}

function getFriendlyAuthErrorMessage(err: any): AuthErrorInfo {
  const code = err?.code || "";
  const rawMessage = (err?.message || "").toString();
  const lowerMsg = rawMessage.toLowerCase();

  // Credenciais inválidas (usuário ou senha errados)
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    lowerMsg.includes("invalid-credential") ||
    lowerMsg.includes("wrong-password")
  ) {
    return {
      title: "E-mail ou senha incorretos",
      description: "As credenciais informadas não correspondem a nenhuma conta cadastrada.",
      suggestion: "Verifique a digitação do seu e-mail e certifique-se de que a tecla Caps Lock não está ativada.",
    };
  }

  // Usuário não encontrado
  if (
    code === "auth/user-not-found" ||
    lowerMsg.includes("user-not-found")
  ) {
    return {
      title: "Conta não localizada",
      description: "Não encontramos nenhum cadastro associado a este endereço de e-mail.",
      suggestion: "Verifique se digitou o e-mail corretamente ou realize seu cadastro no botão abaixo.",
    };
  }

  // Formato do e-mail inválido
  if (
    code === "auth/invalid-email" ||
    lowerMsg.includes("invalid-email")
  ) {
    return {
      title: "Formato de e-mail inválido",
      description: "O e-mail digitado não segue um formato de endereço válido.",
      suggestion: "Exemplo correto de preenchimento: seu.nome@dominio.com.",
    };
  }

  // E-mail já em uso
  if (
    code === "auth/email-already-in-use" ||
    lowerMsg.includes("email-already-in-use")
  ) {
    return {
      title: "E-mail já cadastrado",
      description: "Já existe uma conta registrada com este endereço de e-mail.",
      suggestion: "Acesse usando a opção 'Entrar no Sistema' ou redefina sua senha com a liderança.",
    };
  }

  // Senha muito curta ou fraca
  if (
    code === "auth/weak-password" ||
    lowerMsg.includes("weak-password")
  ) {
    return {
      title: "Senha muito fraca",
      description: "A senha escolhida não atinge os critérios mínimos de segurança.",
      suggestion: "Crie uma senha de no mínimo 6 caracteres, mesclando letras e números.",
    };
  }

  // Muitas tentativas consecutivas
  if (
    code === "auth/too-many-requests" ||
    lowerMsg.includes("too-many-requests")
  ) {
    return {
      title: "Acesso temporariamente bloqueado",
      description: "Houve muitas tentativas consecutivas sem sucesso nesta conta.",
      suggestion: "Por medidas de segurança, aguarde cerca de 3 a 5 minutos antes de tentar novamente.",
    };
  }

  // Usuário desativado pela igreja
  if (
    code === "auth/user-disabled" ||
    lowerMsg.includes("user-disabled")
  ) {
    return {
      title: "Conta desativada",
      description: "O acesso desta conta foi suspenso ou desativado pela liderança do ministério.",
      suggestion: "Procure o administrador ou líder responsável para solicitar a liberação.",
    };
  }

  // Falha de rede
  if (
    code === "auth/network-request-failed" ||
    lowerMsg.includes("network-request-failed")
  ) {
    return {
      title: "Falha na conexão de rede",
      description: "Não foi possível estabelecer contato com os servidores de autenticação.",
      suggestion: "Verifique sua conexão com a internet (Wi-Fi ou 4G/5G) e tente novamente.",
    };
  }

  // Senha obrigatória
  if (
    code === "auth/missing-password" ||
    lowerMsg.includes("missing-password")
  ) {
    return {
      title: "Senha obrigatória",
      description: "Por favor, digite a sua senha para realizar o login.",
      suggestion: "Informe sua senha secreta cadastrada no sistema.",
    };
  }

  // Mensagem simples direta (validação de formulário)
  if (typeof err === "string" && err.trim().length > 0) {
    return {
      title: "Atenção ao preencher os dados",
      description: err,
      suggestion: "Corrija as informações apontadas e tente novamente.",
    };
  }

  // Limpeza de erros genéricos do Firebase
  const cleanMsg = rawMessage
    .replace(/^Firebase:\s*/i, "")
    .replace(/Error\s*\([^)]+\)/i, "")
    .replace(/\(auth\/[a-z0-9_-]+\)/gi, "")
    .replace(/\.$/, "")
    .trim();

  return {
    title: "Não foi possível continuar",
    description: cleanMsg || "Ocorreu uma falha ao autenticar. Por favor, confira os dados informados.",
    suggestion: "Caso o problema persista, recarregue a página ou contate o administrador.",
  };
}

function LoginForm() {
  const { user, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);

  React.useEffect(() => {
    if (!loading && user) {
      router.push(redirectPath);
    }
  }, [user, loading, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);

    // Validações amigáveis antes de disparar requisição
    if (!email.trim()) {
      setErrorInfo({
        title: "E-mail não informado",
        description: "O endereço de e-mail é obrigatório para acessar sua conta.",
        suggestion: "Digite seu e-mail cadastrado (ex: seu.nome@email.com).",
      });
      return;
    }

    if (!password) {
      setErrorInfo({
        title: "Senha não informada",
        description: "O campo de senha não pode ficar em branco.",
        suggestion: "Digite a sua senha de acesso cadastrada.",
      });
      return;
    }

    if (!isLogin && !name.trim()) {
      setErrorInfo({
        title: "Nome completo obrigatório",
        description: "Para criar sua conta ministerial, informe seu nome completo.",
        suggestion: "Exemplo: Maria Oliveira ou Carlos Eduardo.",
      });
      return;
    }

    if (!isLogin && password.length < 6) {
      setErrorInfo({
        title: "Senha muito curta",
        description: "A senha precisa ter no mínimo 6 caracteres para sua segurança.",
        suggestion: "Escolha uma combinação mais segura com pelo menos 6 dígitos.",
      });
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, name.trim(), {
          phone: "",
          instruments: [],
          vocalRange: "",
        });
      }
      router.push(redirectPath);
    } catch (err: any) {
      setErrorInfo(getFriendlyAuthErrorMessage(err));
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
              className="bg-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-blue-900/50 relative group border border-white/20 flex items-center cursor-pointer"
            >
              <div className="absolute inset-0 bg-blue-400/30 rounded-[2rem] blur-2xl group-hover:blur-3xl transition-all duration-500 -z-10"></div>
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
            <div className="lg:hidden flex justify-center mb-6">
              <Link href="/" className="flex items-center">
                <img
                  src="/logo_aplane.png"
                  alt="Applane Logo"
                  className="h-12 w-auto object-contain"
                />
              </Link>
            </div>
            <h1 className="text-4xl font-display font-black text-slate-900 mb-2 tracking-tight">
              {isLogin ? "Bem-vindo de volta" : "Criar conta"}
            </h1>
            <p className="text-slate-500 font-medium">
              {isLogin
                ? "Acesse o sistema do seu ministério"
                : "Comece a gerir seu ministério hoje"}
            </p>
          </div>

          {errorInfo && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              className="mb-6 p-4.5 bg-red-50/95 dark:bg-red-950/40 border border-red-200/90 dark:border-red-900/60 rounded-2xl shadow-xs"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-xl text-red-600 dark:text-red-400 shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-red-900 dark:text-red-200 tracking-tight">
                      {errorInfo.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setErrorInfo(null)}
                      className="text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 -mr-1 -mt-1 rounded-lg hover:bg-red-100/70 dark:hover:bg-red-900/50 transition-colors"
                      title="Fechar mensagem de erro"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                    {errorInfo.description}
                  </p>
                  {errorInfo.suggestion && (
                    <div className="mt-2.5 pt-2.5 border-t border-red-200/60 dark:border-red-900/50 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                      <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                      <span>{errorInfo.suggestion}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
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
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errorInfo) setErrorInfo(null);
                      }}
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorInfo) setErrorInfo(null);
                  }}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorInfo) setErrorInfo(null);
                  }}
                  required
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
              onClick={() => {
                setErrorInfo(null);
                if (isLogin) {
                  router.push(
                    `/register${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
                  );
                } else {
                  setIsLogin(true);
                }
              }}
              className="ml-2 text-blue-800 font-bold hover:underline cursor-pointer"
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
