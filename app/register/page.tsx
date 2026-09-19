"use client";

import React, { useState, Suspense } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { formatPhone } from "@/lib/utils";

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
  const [submitting, setSubmitting] = useState(false);

  const [dynamicInstruments, setDynamicInstruments] = useState<any[]>([
    { id: "acousticGuitarist", label: "Violão", value: "Violão" },
    { id: "electricGuitarist", label: "Guitarra", value: "Guitarra" },
    { id: "bassist", label: "Baixo", value: "Baixo" },
    { id: "drummer", label: "Bateria", value: "Bateria" },
    { id: "keyboardist", label: "Teclado", value: "Teclado" },
    { id: "mainMinister", label: "Voz", value: "Voz" },
    { id: "percussao", label: "Percussão", value: "Percussão" },
  ]);

  const [dynamicMultimediaRoles, setDynamicMultimediaRoles] = useState<any[]>([
    { id: "multimedia_leader", label: "Líder de Multimídia" },
    { id: "pc_operator", label: "Operador de PC" },
    { id: "social_media_operator", label: "Operador de Redes Sociais" },
    { id: "photography_operator", label: "Fotógrafo" },
    { id: "camera_operator", label: "Operador de Câmera" },
    { id: "audio_operator", label: "Operador de Áudio" },
  ]);

  React.useEffect(() => {
    const loadConfigAndRoles = async () => {
      const cId = churchIdFromUrl || "";
      if (!cId) return;

      try {
        // 1. Fetch Worship Instruments
        const worshipDoc = await getDoc(doc(db, "services", `worship_scale_config_${cId}`));
        const defaultInstruments = [
          { id: "acousticGuitarist", label: "Violão", value: "Violão" },
          { id: "electricGuitarist", label: "Guitarra", value: "Guitarra" },
          { id: "bassist", label: "Baixo", value: "Baixo" },
          { id: "drummer", label: "Bateria", value: "Bateria" },
          { id: "keyboardist", label: "Teclado", value: "Teclado" },
          { id: "mainMinister", label: "Voz", value: "Voz" },
        ];
        if (worshipDoc.exists()) {
          const data = worshipDoc.data();
          const availableKeys = data.availableInstruments || [];
          const customRoleMetadata = data.customRoleMetadata || {};
          
          const mapping: Record<string, { label: string; value: string }> = {
            mainMinister: { label: "Ministro de Louvor", value: "Voz" },
            keyboardist: { label: "Teclado", value: "Teclado" },
            acousticGuitarist: { label: "Violão", value: "Violão" },
            electricGuitarist: { label: "Guitarra", value: "Guitarra" },
            bassist: { label: "Baixo", value: "Baixo" },
            drummer: { label: "Bateria", value: "Bateria" },
          };

          const finalInstruments: { id: string; label: string; value: string }[] = [];
          
          availableKeys.forEach((key: string) => {
            if (mapping[key]) {
              finalInstruments.push({ id: key, label: mapping[key].label, value: mapping[key].value });
            } else if (key.startsWith("custom_instrument_")) {
              const customLabel = customRoleMetadata[key]?.label || key;
              finalInstruments.push({ id: key, label: customLabel, value: customLabel });
            } else {
              const labels: Record<string, string> = {
                soprano: "Sopranoist (Vocal)",
                contralto: "Contraltoist (Vocal)",
                baritone: "Baritonoist (Vocal)",
                mezzoSoprano: "Mezzo-Sopranoist (Vocal)"
              };
              const lbl = labels[key] || key;
              finalInstruments.push({ id: key, label: lbl, value: key });
            }
          });

          if (finalInstruments.length > 0) {
            setDynamicInstruments(finalInstruments);
          }
        }

        // 2. Fetch Multimedia Roles
        const multimediaDoc = await getDoc(doc(db, "services", `multimedia_scale_config_${cId}`));
        if (multimediaDoc.exists()) {
          const data = multimediaDoc.data();
          const customRoleMetadata = data.customRoleMetadata || {};
          const rolesConfig = data.roles || {
            pcOperator: { enabled: true, count: 2 },
            socialMediaOperator: { enabled: true, count: 1 },
            photographyOperator: { enabled: true, count: 2 },
            cameraOperator: { enabled: true, count: 1 },
          };

          const mappedKeys: Record<string, { id: string; label: string }> = {
            pcOperator: { id: "pc_operator", label: "Operador de PC" },
            socialMediaOperator: { id: "social_media_operator", label: "Operador de Redes Sociais" },
            photographyOperator: { id: "photography_operator", label: "Fotógrafo" },
            cameraOperator: { id: "camera_operator", label: "Operador de Câmera" },
          };

          const finalRoles: { id: string; label: string }[] = [];
          
          finalRoles.push({ id: "multimedia_leader", label: "Líder de Multimídia" });
          finalRoles.push({ id: "audio_operator", label: "Operador de Áudio" });

          Object.entries(rolesConfig).forEach(([key, configVal]: [string, any]) => {
            if (configVal && configVal.enabled) {
              if (mappedKeys[key]) {
                if (!finalRoles.some(r => r.id === mappedKeys[key].id)) {
                  finalRoles.push(mappedKeys[key]);
                }
              } else {
                const customLabel = customRoleMetadata[key]?.label || key;
                finalRoles.push({ id: key, label: customLabel });
              }
            }
          });
          
          if (finalRoles.length > 0) {
            setDynamicMultimediaRoles(finalRoles);
          }
        }
      } catch (err) {
        console.error("Error loading church configs for self-registration:", err);
      }
    };

    loadConfigAndRoles();
  }, [churchIdFromUrl]);

  React.useEffect(() => {
    if (!loading && user) {
      router.push(redirectPath);
    }
  }, [user, loading, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      if (!selectedRole) {
        throw new Error("Por favor, selecione seu papel.");
      }
      
      if (selectedRole === "musico") {
        if (instrumentsSelected.length === 0) {
          throw new Error("A seleção de pelo menos um instrumento é obrigatória.");
        }
        if (instrumentsSelected.includes("Voz") && !vocalRange) {
          throw new Error("Como você selecionou 'Voz', a definição do seu tipo de voz/vocal é obrigatória.");
        }
      } else if (selectedRole === "multimidia") {
        if (instrumentsSelected.length === 0) {
          throw new Error("A seleção de pelo menos uma função técnica/digital é obrigatória.");
        }
      }

      const multimediaRoles = selectedRole === "multimidia" ? [...instrumentsSelected] : [];
      if (multimediaRoles.includes("multimedia_leader") && !multimediaRoles.includes("leader")) {
        multimediaRoles.push("leader");
      }
      const userRoles = {
        worship: selectedRole === "musico" ? instrumentsSelected : [],
        multimedia: multimediaRoles,
        secretariat: selectedRole === "secretaria" ? ["admin"] : [],
      };

      await signUpWithEmail(email, password, name, {
        phone,
        instruments: selectedRole === "musico" ? instrumentsSelected : [],
        vocalRange: selectedRole === "musico" ? vocalRange : "",
        churchId: churchIdFromUrl || "",
        roles: userRoles,
      });

      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta. Verifique seus dados.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleInstrument = (inst: string) => {
    setInstrumentsSelected((prev) => {
      const isSelected = prev.includes(inst);
      if (inst === "Voz" && isSelected) {
        setVocalRange("");
      }
      return isSelected ? prev.filter((i) => i !== inst) : [...prev, inst];
    });
  };

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-10 flex justify-center"
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
                      maxLength={15}
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
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
                      <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1">
                        <span>Instrumentos (pode escolher vários)</span>
                        <span className="text-red-500 font-black">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {dynamicInstruments.map((inst) => (
                          <button
                            key={inst.id}
                            type="button"
                            onClick={() => toggleInstrument(inst.value)}
                            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                              instrumentsSelected.includes(inst.value)
                                ? "bg-blue-800 text-white border-blue-800 shadow-lg shadow-blue-800/20"
                                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                            }`}
                          >
                            {inst.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1.5 flex-wrap">
                        <Mic2 className="w-4 h-4 text-indigo-600" />
                        <span>Vocal</span>
                        {instrumentsSelected.includes("Voz") ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-wider animate-pulse">Obrigatório para Vocalistas *</span>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">(se possuir)</span>
                        )}
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
                      <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1">
                        <span>Funções Digitais e Técnicas (pode escolher várias)</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      <p className="text-xs text-slate-400 ml-1 -mt-1 font-medium">
                        Selecione suas áreas de atuação no ministério técnico.
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {dynamicMultimediaRoles.map((spec) => (
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
                  disabled={loading || submitting}
                  className="w-full bg-blue-800 text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-800/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {loading || submitting ? "Criando conta..." : "Cadastrar agora"}
                  {!(loading || submitting) && <ArrowRight className="w-5 h-5" />}
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
