"use client";

import React, { useState, Suspense } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  Music,
  Video,
  Briefcase,
  CheckCircle2,
  Phone,
  Mic2,
  Home,
  Church,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

function RegisterForm() {
  const { user, signUpWithEmail, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchIdFromUrl = searchParams.get("churchId");
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const roleFromUrl = searchParams.get("role"); // Don't default to musico directly

  const [selectedRole, setSelectedRole] = useState<string | null>(roleFromUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instrumentsSelected, setInstrumentsSelected] = useState<string[]>([]);
  const [vocalRange, setVocalRange] = useState("");
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
      if (!selectedRole) {
        throw new Error("Por favor, selecione seu papel.");
      }
      await signUpWithEmail(email, password, name, {
        phone,
        instruments: selectedRole === "musico" ? instrumentsSelected : [],
        vocalRange: selectedRole === "musico" ? vocalRange : "",
        churchId: churchIdFromUrl || "",
      });

      // Write role specifics if user just signed up
      try {
        const currentUserUid = auth.currentUser?.uid;
        if (currentUserUid) {
          const userRoles = {
            worship: selectedRole === "musico" ? instrumentsSelected : [],
            multimedia:
              selectedRole === "multimidia" ? instrumentsSelected : [],
            secretariat: selectedRole === "secretaria" ? ["admin"] : [],
          };
          await updateDoc(doc(db, "users", currentUserUid), {
            roles: userRoles,
          });
        }
      } catch (err) {
        console.error("Erro ao salvar roles adicionais:", err);
      }

      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta. Verifique seus dados.");
    }
  };

  const toggleInstrument = (inst: string) => {
    setInstrumentsSelected((prev) =>
      prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst],
    );
  };

  const instrumentsList = [
    "Violão",
    "Guitarra",
    "Baixo",
    "Bateria",
    "Teclado",
    "Voz",
    "Percussão",
  ];

  const vocalRanges = [
    "Soprano",
    "Contralto",
    "Mezzo",
    "Baixo",
    "Tenor",
    "Barítono",
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-20 w-80 h-80 bg-blue-400 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 -right-20 w-80 h-80 bg-indigo-400 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-lg text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center text-white mb-10 border border-white/20 shadow-2xl mx-auto"
          >
            <Music className="w-10 h-10" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-display font-black text-white mb-6 leading-tight"
          >
            Faça parte da <span className="text-blue-300 italic">equipe</span>.
          </motion.h2>
          <div className="space-y-6 text-left inline-block self-center">
            <FeatureItem text="Organize suas escalas semanais" />
            <FeatureItem text="Acesse cifras e repertórios completos" />
            <FeatureItem text="Comunicação integrada com o ministério" />
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto relative">
        <button
          onClick={() => router.push("/")}
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-blue-800 font-bold transition-all group"
        >
          <Home className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
          <span>Voltar para Início</span>
        </button>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md py-12"
        >
          {!selectedRole ? (
            <div className="space-y-8">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl font-display font-black text-slate-900 mb-2 tracking-tight">
                  Como quer atuar?
                </h1>
                <p className="text-slate-500 font-medium">
                  Selecione seu papel principal no ministério para continuar o
                  cadastro.
                </p>
              </div>

              <div className="space-y-4">
                {/* Músico Button */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("musico")}
                  className="w-full bg-white p-6 rounded-3xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 text-left cursor-pointer group flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-800 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <Music className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-800 transition-colors">
                      Músico / Vocalista
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      Participe do louvor com vocais, instrumentos e gerencie
                      cifras e escalas.
                    </p>
                  </div>
                </button>

                {/* Multimídia Button */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("multimidia")}
                  className="w-full bg-white p-6 rounded-3xl border-2 border-slate-200 hover:border-amber-600 hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300 text-left cursor-pointer group flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      Equipe Multimídia
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      Gerencie mídias sociais, fotos, opere som, projeções de
                      letras ou filmagens.
                    </p>
                  </div>
                </button>
              </div>

              <p className="text-center text-slate-600 font-medium">
                Já possui uma conta?
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/login${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
                    )
                  }
                  className="ml-2 text-blue-800 font-bold hover:underline"
                >
                  Fazer Login
                </button>
              </p>
            </div>
          ) : (
            <div>
              {/* Back button to change role */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                }}
                className="mb-6 flex items-center gap-1.5 text-xs text-blue-800 font-bold hover:underline transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Mudar tipo de papel</span>
              </button>

              <div className="mb-10 text-center lg:text-left">
                <h1 className="text-4xl font-display font-black text-slate-900 mb-2 tracking-tight">
                  {selectedRole === "musico"
                    ? "Cadastro de Músico"
                    : selectedRole === "multimidia"
                      ? "Cadastro de Multimídia"
                      : "Cadastro de Secretaria"}
                </h1>
                <p className="text-slate-500 font-medium">
                  {selectedRole === "musico"
                    ? "Preencha os dados abaixo para se juntar ao ministério."
                    : selectedRole === "multimidia"
                      ? "Preencha os dados abaixo para apoiar na equipe técnica."
                      : "Preencha os dados abaixo para apoiar na secretaria."}
                </p>
              </div>

              {churchIdFromUrl && (
                <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-800 shadow-sm">
                    <Church className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">
                      Convite Ativo
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      Vínculo automático com a igreja
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 mb-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>

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
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900"
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
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 outline-none transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>

                {selectedRole === "musico" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">
                        Instrumentos (pode escolher vários)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {instrumentsList.map((inst) => (
                          <button
                            key={inst}
                            type="button"
                            onClick={() => toggleInstrument(inst)}
                            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                              instrumentsSelected.includes(inst)
                                ? "bg-blue-800 text-white border-blue-800 shadow-lg shadow-blue-800/20"
                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                            }`}
                          >
                            {inst}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                        <Mic2 className="w-4 h-4" /> Vocal (se possuir)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {vocalRanges.map((range) => (
                          <button
                            key={range}
                            type="button"
                            onClick={() =>
                              setVocalRange(vocalRange === range ? "" : range)
                            }
                            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                              vocalRange === range
                                ? "bg-indigo-700 text-white border-indigo-700 shadow-lg shadow-indigo-700/20"
                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedRole === "multimidia" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">
                        Funções Digitais e Técnicas (pode escolher várias)
                      </label>
                      <p className="text-xs text-slate-400 ml-1 -mt-1 font-medium">
                        Selecione suas áreas de atuação no ministério técnico.
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {[
                          {
                            id: "multimedia_leader",
                            label: "Líder de Multimídia",
                          },
                          { id: "audio_operator", label: "Operador de Áudio" },
                          { id: "pc_operator", label: "Operador de PC" },
                          {
                            id: "social_media_operator",
                            label: "Operador de Redes Sociais",
                          },
                          {
                            id: "camera_operator",
                            label: "Camera Man (Woman)",
                          },
                          { id: "photography_operator", label: "Fotografia" },
                        ].map((spec) => (
                          <button
                            key={spec.id}
                            type="button"
                            onClick={() => toggleInstrument(spec.id)}
                            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                              instrumentsSelected.includes(spec.id)
                                ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20"
                                : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                            }`}
                          >
                            {spec.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? "Criando conta..." : "Cadastrar agora"}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>

              <p className="mt-10 text-center text-slate-600 font-medium">
                Já possui uma conta?
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/login${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
                    )
                  }
                  className="ml-2 text-blue-800 font-bold hover:underline"
                >
                  Fazer Login
                </button>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
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
      <RegisterForm />
    </Suspense>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-blue-100 font-medium">
      <CheckCircle2 className="w-5 h-5 text-blue-400" />
      {text}
    </div>
  );
}
