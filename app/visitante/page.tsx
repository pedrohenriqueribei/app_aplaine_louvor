"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Church,
  Heart,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  MessageSquare,
  Users,
  Send,
  ArrowRight,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Clock,
  HeartHandshake,
} from "lucide-react";
import Link from "next/link";
import { formatPhone } from "@/lib/utils";

interface ChurchMeta {
  id: string;
  name: string;
  address?: string;
  pastor?: string;
  worshipMinistryName?: string;
}

function VisitorFormContent() {
  const searchParams = useSearchParams();
  const churchIdFromUrl = searchParams.get("churchId") || searchParams.get("church") || "";

  const [churchList, setChurchList] = useState<ChurchMeta[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string>(churchIdFromUrl);
  const [churchMeta, setChurchMeta] = useState<ChurchMeta | null>(null);
  const [loadingChurch, setLoadingChurch] = useState<boolean>(true);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [firstVisit, setFirstVisit] = useState(new Date().toISOString().split("T")[0]);
  const [howMet, setHowMet] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [prayerRequest, setPrayerRequest] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch church info
  useEffect(() => {
    async function loadChurchData() {
      setLoadingChurch(true);
      try {
        if (churchIdFromUrl) {
          const res = await fetch(`/api/visitors/church-info?churchId=${encodeURIComponent(churchIdFromUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.church) {
              setChurchMeta(data.church);
              setSelectedChurchId(data.church.id);
            }
          }
        } else {
          // No churchId, fetch list so visitor can select
          const res = await fetch("/api/visitors/church-info");
          if (res.ok) {
            const data = await res.json();
            if (data.churches && data.churches.length > 0) {
              setChurchList(data.churches);
              setChurchMeta(data.churches[0]);
              setSelectedChurchId(data.churches[0].id);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load church info:", err);
      } finally {
        setLoadingChurch(false);
      }
    }
    loadChurchData();
  }, [churchIdFromUrl]);

  // Handle phone mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhone(raw);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Por favor, informe seu nome completo.");
      return;
    }

    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      setErrorMessage("Por favor, digite um número de WhatsApp ou telefone válido com DDD (mínimo 10 dígitos).");
      return;
    }

    if (!selectedChurchId) {
      setErrorMessage("Por favor, selecione a igreja que você está visitando.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/visitors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          churchId: selectedChurchId,
          firstVisit,
          howMet,
          invitedBy: invitedBy.trim(),
          ageGroup,
          maritalStatus,
          prayerRequest: prayerRequest.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Não foi possível enviar seu cadastro. Tente novamente.");
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMessage(err.message || "Ocorreu um erro ao enviar seus dados. Verifique sua conexão.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setName("");
    setPhone("");
    setEmail("");
    setHowMet("");
    setInvitedBy("");
    setAgeGroup("");
    setMaritalStatus("");
    setPrayerRequest("");
    setSubmitted(false);
    setErrorMessage(null);
  };

  const howMetOptions = [
    "Convite de um amigo ou familiar",
    "Redes Sociais (Instagram, YouTube)",
    "Passando em frente ao templo",
    "Ação social ou evento da igreja",
    "Mudança recente para o bairro",
    "Outro",
  ];

  const ageGroupOptions = [
    "Criança (até 11 anos)",
    "Adolescente (12 a 17 anos)",
    "Jovem (18 a 29 anos)",
    "Adulto (30 a 59 anos)",
    "Melhor Idade (60+ anos)",
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* BACKGROUND DECORATIVE GLOW */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      {/* HEADER / BRANDING */}
      <header className="relative z-10 w-full pt-8 pb-4 px-4 sm:px-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <Church className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-blue-600 dark:text-blue-400">
                Acolhimento & Boas-Vindas
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {churchMeta?.name || "Comunidade Cristã"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Você é nosso convidado</span>
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-6">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {submitted ? (
              /* ========================================================================= */
              /* SUCCESS STATE SCREEN */
              /* ========================================================================= */
              <motion.div
                key="success-screen"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xl text-center space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Cadastro Confirmado!
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-slate-100">
                    Seja muito bem-vindo(a)! 🎉
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Ficamos imensamente felizes com a sua presença em{" "}
                    <strong className="text-slate-900 dark:text-slate-200">
                      {churchMeta?.name || "nossa igreja"}
                    </strong>
                    . Nossa equipe ministerial recebeu suas informações com muito carinho.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80 text-left space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold">
                    <HeartHandshake className="w-4 h-4" />
                    <span>O que acontece agora?</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 pl-6 list-disc">
                    <li>Nossa equipe de recepção e líderes entrará em contato via WhatsApp.</li>
                    <li>Estaremos orando pelo seu pedido e pela sua família durante a semana.</li>
                    <li>Sinta-se em casa para participar de nossos cultos e ministérios!</li>
                  </ul>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleResetForAnother}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Cadastrar outro familiar ou amigo</span>
                  </button>

                  <Link
                    href="/"
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <span>Conhecer o Applaine</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* ========================================================================= */
              /* VISITOR REGISTRATION FORM */
              /* ========================================================================= */
              <motion.div
                key="form-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-9 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6"
              >
                {/* HERO TITLE */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    <Heart className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
                    <span>Ficha de Boas-Vindas</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    Que alegria ter você conosco!
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Preencha rapidinho seus dados para que possamos abençoar você, orar por suas necessidades e manter contato.
                  </p>
                </div>

                {/* CHURCH SELECTOR (if multiple churches or no churchId passed) */}
                {churchList.length > 1 && !churchIdFromUrl && (
                  <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60 space-y-2">
                    <label className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                      Qual congregação você está visitando?
                    </label>
                    <select
                      value={selectedChurchId}
                      onChange={(e) => {
                        setSelectedChurchId(e.target.value);
                        const c = churchList.find((ch) => ch.id === e.target.value);
                        if (c) setChurchMeta(c);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {churchList.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.name} {ch.address ? `• ${ch.address}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ERROR ALERT */}
                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* NOME COMPLETO */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nome Completo <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Maria dos Santos Ribeiro"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  {/* WHATSAPP & EMAIL IN 2 COLS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* WHATSAPP / CELULAR */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        WhatsApp / Celular <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={handlePhoneChange}
                          placeholder="(11) 98765-4321"
                          maxLength={15}
                          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                        />
                      </div>
                    </div>

                    {/* EMAIL */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        E-mail <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="maria@exemplo.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DATA DA VISITA & FAIXA ETÁRIA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* DATA DA VISITA */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Data da Visita
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <input
                          type="date"
                          value={firstVisit}
                          onChange={(e) => setFirstVisit(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                        />
                      </div>
                    </div>

                    {/* FAIXA ETÁRIA */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Faixa Etária <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <select
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      >
                        <option value="">Selecione sua faixa etária...</option>
                        {ageGroupOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* COMO CONHECEU A IGREJA */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Como conheceu nossa igreja?
                    </label>
                    <select
                      value={howMet}
                      onChange={(e) => setHowMet(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                    >
                      <option value="">Selecione uma opção...</option>
                      {howMetOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* QUEM CONVIDOU (SEPLICÁVEL) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Quem te convidou? <span className="text-slate-400 font-normal">(nome do membro ou amigo)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={invitedBy}
                        onChange={(e) => setInvitedBy(e.target.value)}
                        placeholder="Ex: Irmão João / Pastora Ana"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  {/* PEDIDO DE ORAÇÃO OU MENSAGEM */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Como podemos orar por você? <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                        Confidencial
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={prayerRequest}
                      onChange={(e) => setPrayerRequest(e.target.value)}
                      placeholder="Deixe aqui seu pedido de oração, dúvida ou mensagem para nossa equipe pastoral..."
                      className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
                    />
                  </div>

                  {/* PRIVACY / SECURITY BADGE */}
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Seus dados são protegidos e usados apenas pela equipe de acolhimento da igreja.</span>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all transform active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Enviando cadastro...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Concluir Cadastro de Visitante</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 px-4">
        <p className="flex items-center justify-center gap-1.5">
          <span>{churchMeta?.name || "Igreja Local"}</span>
          <span>•</span>
          <span>Plataforma Applaine</span>
        </p>
      </footer>
    </div>
  );
}

export default function VisitorRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Carregando formulário...
            </p>
          </div>
        </div>
      }
    >
      <VisitorFormContent />
    </Suspense>
  );
}
