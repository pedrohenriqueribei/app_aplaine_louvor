"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  User,
  Phone,
  Building2,
  HelpCircle,
  ShieldCheck,
  ArrowLeft,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ThemeToggle } from "@/components/ThemeToggle";

type Category = "duvida" | "suporte" | "sugestao" | "elogio" | "parceria" | "outro";

const CATEGORIES: { value: Category; label: string; icon: string; description: string }[] = [
  { value: "duvida", label: "Dúvidas Gerais", icon: "❓", description: "Esclarecimentos sobre o uso do Applane" },
  { value: "suporte", label: "Suporte Técnico", icon: "🛠️", description: "Problemas de acesso, escalas ou relatórios" },
  { value: "sugestao", label: "Sugestão de Recurso", icon: "💡", description: "Ideias e melhorias para a plataforma" },
  { value: "elogio", label: "Elogio ou Depoimento", icon: "👏", description: "Feedback positivo do seu ministério" },
  { value: "parceria", label: "Parceria ou Integração", icon: "🤝", description: "Comunicação institucional e expansão" },
  { value: "outro", label: "Outro Assunto", icon: "📋", description: "Outras demandas não listadas" },
];

export default function FaleConoscoPage() {
  const { user, userData } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(userData?.name || user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(userData?.phone || "");
  const [churchName, setChurchName] = useState(userData?.churchName || "");
  const [category, setCategory] = useState<Category>("duvida");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{ protocol: string; email: string } | null>(null);

  // Auto-fill when auth loads if fields are empty
  React.useEffect(() => {
    if (user) {
      if (!email && user.email) setEmail(user.email);
      if (!name && (userData?.name || user.displayName)) setName(userData?.name || user.displayName || "");
      if (!phone && userData?.phone) setPhone(userData.phone);
    }
  }, [user, userData, email, name, phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Por favor, preencha seu nome completo.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Por favor, informe um e-mail válido para resposta.");
      return;
    }
    if (!subject.trim()) {
      setErrorMessage("Por favor, informe o assunto da sua mensagem.");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setErrorMessage("Sua mensagem deve conter pelo menos 5 caracteres.");
      return;
    }

    setIsSubmitting(true);
    const generatedId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const protocolCode = "APL-" + Math.floor(100000 + Math.random() * 900000);

    const payload = {
      id: generatedId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      churchName: churchName.trim() || undefined,
      category,
      subject: subject.trim(),
      message: message.trim(),
      userId: user?.uid || undefined,
      status: "new" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // 1. Send to server API route
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao enviar mensagem.");
      }

      // 2. Direct Firestore sync attempt for real-time admin listener
      try {
        await setDoc(doc(db, "contact_messages", generatedId), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (firestoreErr) {
        // Non-blocking: API route already persisted in store
        console.warn("[Fale Conosco] Firestore direct save warning (using API backup):", firestoreErr);
      }

      setSubmittedData({
        protocol: protocolCode,
        email: email.trim(),
      });
    } catch (err: any) {
      console.error("[Fale Conosco] Error submitting form:", err);
      setErrorMessage(err?.message || "Ocorreu um erro ao enviar sua mensagem. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    setSubject("");
    setMessage("");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={user ? "/dashboard" : "/"}
              className="flex items-center gap-2 p-1.5 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="bg-white p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <img src="/logo_aplane.png" alt="Applane Logo" className="h-6 w-auto object-contain" />
              </div>
              <span className="font-display font-black text-slate-900 dark:text-white tracking-tight text-lg">
                Applane
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 transition-colors shadow-xs" />
            <Link
              href={user ? "/dashboard" : "/login"}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              {user ? "Ir para o Painel" : "Fazer Login"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-3 border border-blue-200 dark:border-blue-800 shadow-xs">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Canal Direto com a Administração</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight">
            Fale Conosco
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base leading-relaxed">
            Dúvidas, sugestões, suporte ou feedback sobre o sistema. Sua mensagem é direcionada diretamente para a área administrativa do Applane.
          </p>
        </div>

        {submittedData ? (
          /* Success Screen */
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold mb-3 border border-slate-200 dark:border-slate-700">
              Protocolo: {submittedData.protocol}
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Mensagem Encaminhada com Sucesso!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              Sua solicitação foi registrada e disponibilizada no painel dos administradores. Em breve você receberá um retorno no e-mail:
              <br />
              <strong className="text-slate-900 dark:text-slate-200 font-semibold">{submittedData.email}</strong>
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2 mb-8">
              <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Próximos Passos:</span>
              </div>
              <ul className="list-disc pl-5 text-slate-500 dark:text-slate-400 space-y-1">
                <li>Nossa equipe analisa as mensagens diariamente por ordem de envio.</li>
                <li>Caso tenha informado WhatsApp, poderemos entrar em contato para agilizar o suporte.</li>
                <li>Guarde o número do seu protocolo para eventuais consultas.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Enviar Outra Mensagem
              </button>
              <Link
                href={user ? "/dashboard" : "/"}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md shadow-blue-600/20"
              >
                Voltar à Página Principal
              </Link>
            </div>
          </div>
        ) : (
          /* Contact Form Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar Information */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <span>Área Administrativa</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Todas as mensagens enviadas através deste formulário são encaminhadas diretamente para a caixa de entrada dos Super Administradores.
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Tempo de Resposta</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Normalmente respondemos em até 24 horas úteis.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Retorno por E-mail</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Você receberá atualizações no endereço de e-mail informado.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Privacidade Garantida</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Suas informações não são compartilhadas com terceiros.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Precisa de acesso administrativo?
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Se você é super administrador, faça login pelo portal protegido.
                  </p>
                  <Link
                    href="/admin/login"
                    className="inline-block mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Acessar Admin Login &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-medium border border-red-200 dark:border-red-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                    Categoria do Assunto *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const isSelected = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-base">{cat.icon}</span>
                            <span className="text-xs font-bold">{cat.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {cat.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name & Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Seu Nome Completo *</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>E-mail para Retorno *</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Phone & Church row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>WhatsApp / Telefone (opcional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Igreja / Congregação (opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={churchName}
                      onChange={(e) => setChurchName(e.target.value)}
                      placeholder="Ex: Igreja Batista Central"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white text-sm"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Assunto da Mensagem *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Dúvida sobre configuração da escala de domingo"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white text-sm"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mensagem Detalhada *
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {message.length} / 5000 caracteres
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Descreva aqui sua solicitação, dúvida ou sugestão com o máximo de detalhes possível..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white text-sm resize-y"
                    required
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">
                    * Campos obrigatórios
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando Mensagem...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar para a Administração</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">
        <p>&copy; {new Date().getFullYear()} Applane. Gestão Inteligente de Ministérios e Igrejas.</p>
      </footer>
    </div>
  );
}
