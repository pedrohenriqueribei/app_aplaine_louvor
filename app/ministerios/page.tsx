"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Music,
  Video,
  Calendar,
  Briefcase,
  BookOpen,
  HeartHandshake,
  Flame,
  Globe,
  Coins,
  Building2,
  Sparkles,
  Search,
  CheckCircle2,
  Layers,
  ChevronRight,
  Star,
  Users,
} from "lucide-react";
import { BallerinaIcon } from "@/components/BallerinaIcon";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MinistryDetail {
  id: string;
  name: string;
  shortName: string;
  category: "principais" | "pastoral" | "ensino" | "oracao" | "gestao";
  isMain: boolean;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badgeColor: string;
  tagline: string;
  biblicalFoundation: string;
  purpose: string;
  responsibilities: string[];
  roles: string[];
  applaneFeatures: string[];
  registrationRole?: string;
}

const MINISTRIES_CATALOG: MinistryDetail[] = [
  {
    id: "louvor",
    name: "Ministério de Louvor",
    shortName: "Louvor",
    category: "principais",
    isMain: true,
    image: "/images/worship.png",
    icon: Music,
    iconBg: "bg-blue-600",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    tagline: "Adoração com excelência, repertório organizado e bandas integradas.",
    biblicalFoundation: "Salmo 150:6 — 'Tudo o que tem fôlego louve ao Senhor. Aleluia!'",
    purpose:
      "Conduzir a congregação à presença de Deus através da música cristã congregacional, promovendo unidade entre músicos, cantores e líderes em espírito e em verdade.",
    responsibilities: [
      "Planejar o repertório musical de todos os cultos e eventos da semana",
      "Realizar ensaios com instrumentos e alinhamento de vozes (soprano, contralto, tenor)",
      "Treinar novos talentos e músicos em desenvolvimento na igreja",
      "Zelar pela afinação e conservação dos instrumentos do templo",
    ],
    roles: [
      "Líder de Louvor",
      "Ministro de Louvor",
      "Vocalistas / Backing Vocals",
      "Tecladista / Pianista",
      "Violonista (Acústico)",
      "Guitarrista (Solo / Base)",
      "Baixista",
      "Baterista",
    ],
    applaneFeatures: [
      "Biblioteca de cifras e letras com transposição de tom em tempo real",
      "Organização de repertório com link direto para YouTube e Spotify",
      "Gestão de bandas e rodízio equilibrado de músicos",
      "Notificações instantâneas de convite e confirmação de presença no culto",
    ],
    registrationRole: "musico",
  },
  {
    id: "multimedia",
    name: "Ministério de Multimídia",
    shortName: "Multimídia",
    category: "principais",
    isMain: true,
    image: "/images/multimedia.png",
    icon: Video,
    iconBg: "bg-purple-600",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    tagline: "Tecnologia, som límpido, projeção e alcance digital do Evangelho.",
    biblicalFoundation: "Marcos 16:15 — 'Ide por todo o mundo e pregai o evangelho a toda criatura.'",
    purpose:
      "Dar suporte técnico impecável para a proclamação da Palavra, garantindo som audível, projeção de letras sem atrasos e transmissões ao vivo para quem assiste de casa.",
    responsibilities: [
      "Operação da mesa de som (PA, retorno de fone e transmissão digital)",
      "Projeção de letras de cânticos, versículos bíblicos e avisos nos telões",
      "Gravação e transmissão ao vivo dos cultos em plataformas de streaming",
      "Fotografia oficial, captação de cortes de vídeo e cobertura em redes sociais",
    ],
    roles: [
      "Líder de Multimídia",
      "Operador de Som / Mesa de Áudio",
      "Operador de Projeção & Telão (Holyrics, ProPresenter)",
      "Camerista / Diretor de Transmissão (OBS, vMix)",
      "Fotógrafo Congregacional",
      "Social Media & Designer",
    ],
    applaneFeatures: [
      "Sincronização do repertório de louvor direto com a equipe de projeção",
      "Controle de escalas técnicas dedicado para sonoplastia e câmeras",
      "Roteiro de culto com ordem de momentos, pregação e avisos",
      "Avisos automáticos de disponibilidade para voluntários técnicos",
    ],
    registrationRole: "multimidia",
  },
  {
    id: "escalas",
    name: "Escalas & Organização de Cultos",
    shortName: "Escalas",
    category: "principais",
    isMain: true,
    image: "/images/calendar_schedule_1790306007642.jpg",
    icon: Calendar,
    iconBg: "bg-indigo-600",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    tagline: "Planejamento centralizado de cultos semanais com confirmação em tempo real.",
    biblicalFoundation: "1 Coríntios 14:40 — 'Tudo, porém, seja feito com decência e ordem.'",
    purpose:
      "Eliminar conflitos de datas, garantir que nenhum culto fique sem equipe e distribuir o serviço voluntário de maneira justa, fraterna e transparente.",
    responsibilities: [
      "Montar o cronograma mensal de cultos de domingo, meio de semana e vigílias",
      "Consultar a disponibilidade prévia de cada integrante antes de escalar",
      "Acompanhar confirmações e substituições de emergência",
      "Integrar diferentes ministérios na mesma escala de culto unificada",
    ],
    roles: [
      "Coordenador Geral de Escalas",
      "Líderes de Ministérios",
      "Voluntários Escalados",
      "Pastores Supervisores",
    ],
    applaneFeatures: [
      "Detector inteligente de conflitos e sobreposição de horários",
      "Confirmação ou recusa de escala com 1 clique pelo voluntário",
      "Visão de lentes por ministério ou visão unificada da igreja",
      "Calendário mensal, semanal e alertas de gaps (vagas não preenchidas)",
    ],
  },
  {
    id: "danca",
    name: "Ministério de Dança",
    shortName: "Dança",
    category: "principais",
    isMain: true,
    image: "/images/church_dance_ministry_1790305997872.jpg",
    icon: BallerinaIcon,
    iconBg: "bg-rose-600",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    tagline: "Expressão profética, gestos de louvor e vestes consagradas.",
    biblicalFoundation: "Salmo 149:3 — 'Louvem o seu nome com danças; cantem-lhe louvores com tamborim e harpa.'",
    purpose:
      "Expressar adoração visual e profética por meio do movimento corporal, coreografias, teatro, fitas e estandartes, transmitindo a mensagem de Cristo com arte e consagração.",
    responsibilities: [
      "Criar e ensaiar coreografias sincronizadas com as canções ministradas",
      "Gerenciar o acervo de vestes, túnicas e adereços de cada celebração",
      "Promover momentos de oração, santificação e unidade entre os bailarinos",
      "Ministrar em cultos dominicais, conferências e congressos da igreja",
    ],
    roles: [
      "Líder do Ministério de Dança",
      "Coreógrafo(a)",
      "Bailarinos(as) Integrantes",
      "Coordenador(a) de Figurino & Vestes",
      "Diretor(a) de Ensaio",
    ],
    applaneFeatures: [
      "Ficha de coreografia vinculada diretamente à canção da escala",
      "Controle de figurino (cor, modelo e tema definido para o culto)",
      "Registro de notas de ensaio e vídeos de referência para estudo",
      "Escalação específica de líderes e dançarinos por evento",
    ],
    registrationRole: "danca",
  },
  {
    id: "secretaria",
    name: "Secretaria & Administração",
    shortName: "Secretaria",
    category: "pastoral",
    isMain: false,
    image: "/images/church_secretariat.jpg",
    icon: Briefcase,
    iconBg: "bg-emerald-600",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    tagline: "Gestão documental, membresia atualizada e suporte pastoral contínuo.",
    biblicalFoundation: "Lucas 14:28 — 'Pois qual de vós, querendo edificar uma torre, não se senta primeiro a fazer as contas?'",
    purpose:
      "Manter a organização legal, cadastral e documental da congregação em dia, dando suporte administrativo ao corpo pastoral e facilitando o cuidado com cada membro.",
    responsibilities: [
      "Cadastrar e atualizar dados de membros, batismos e transferências",
      "Controlar aniversariantes da semana e lembretes para felicitações",
      "Emitir cartas pastorais, certificados de batismo e atas de assembleia",
      "Agendamento de atendimentos e aconselhamentos pastorais",
    ],
    roles: [
      "Secretário(a) Geral",
      "Auxiliar de Secretaria",
      "Gestor(a) de Membresia",
      "Recepcionista Administrativo",
    ],
    applaneFeatures: [
      "Ficha cadastral completa com status ativo/inativo e histórico ministerial",
      "Painel de aniversariantes com envio de mensagens automáticas",
      "Módulo de agendamentos pastorais com lembretes automáticos",
      "Relatórios de crescimento e presença para a liderança sênior",
    ],
    registrationRole: "secretaria",
  },
  {
    id: "biblico",
    name: "Ministério Bíblico & Ensino",
    shortName: "Ensino Bíblico",
    category: "ensino",
    isMain: false,
    image: "/images/church_teaching.jpg",
    icon: BookOpen,
    iconBg: "bg-indigo-600",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    tagline: "Escola Bíblica (EBD), discipulado sólido e capacitação teológica.",
    biblicalFoundation: "2 Timóteo 2:15 — 'Procura apresentar-te a Deus aprovado, como obreiro que não tem de que se envergonhar.'",
    purpose:
      "Alimentar o rebanho com o conhecimento profundo das Escrituras Sagradas, formando discípulos fiéis, capacitando novos líderes e fundamentando a fé congregacional.",
    responsibilities: [
      "Coordenar as classes da Escola Bíblica Dominical (EBD) por faixas etárias",
      "Supervisionar o discipulado de novos convertidos rumo ao batismo",
      "Organizar cursos bíblicos, seminários e palestras temáticas para a família",
      "Capacitar professores e fornecer materiais didáticos cristãos atualizados",
    ],
    roles: [
      "Superintendente de Ensino Bíblico",
      "Professores de EBD (Adultos, Jovens, Adolescentes)",
      "Discipuladores Pessoais",
      "Secretário(a) da Escola Bíblica",
    ],
    applaneFeatures: [
      "Controle de classes, frequências de alunos e relatórios de assiduidade",
      "Escala de professores e reservas de salas no templo",
      "Acompanhamento da jornada de novos convertidos até o batismo",
      "Acervo de currículos e materiais de apoio bíblico",
    ],
  },
  {
    id: "acolhimento",
    name: "Ministério de Acolhimento & Recepção",
    shortName: "Acolhimento",
    category: "pastoral",
    isMain: false,
    image: "/images/church_welcome.jpg",
    icon: HeartHandshake,
    iconBg: "bg-teal-600",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    tagline: "Portas abertas, sorrisos sinceros e integração amorosa de visitantes.",
    biblicalFoundation: "Romanos 15:7 — 'Portanto, acolhei-vos uns aos outros, como também Cristo nos acolheu para a glória de Deus.'",
    purpose:
      "Ser o primeiro cartão de visitas da igreja, proporcionando um ambiente acolhedor, amável e seguro para que cada visitante se sinta em casa e encontre Jesus.",
    responsibilities: [
      "Recepcionar pessoas nas portas de entrada com alegria e cordialidade",
      "Auxiliar os visitantes a encontrar assentos confortáveis no santuário",
      "Coletar fichas de visitantes para contato posterior e boas-vindas",
      "Apresentar visitantes aos pastores e encaminhá-los para pequenos grupos",
    ],
    roles: [
      "Coordenador(a) de Acolhimento",
      "Recepcionista de Portaria / Templo",
      "Integrador(a) de Novos Visitantes",
      "Anfitrião de Boas-Vindas",
    ],
    applaneFeatures: [
      "Módulo de cadastro rápido de visitantes via QR Code ou formulário",
      "Escala de recepcionistas por portões e entradas do templo",
      "Funil de acompanhamento e primeiro contato pós-visita",
      "Notificação para os pastores sobre primeiras visitas na congregação",
    ],
  },
  {
    id: "intercessao",
    name: "Ministério de Intercessão & Oração",
    shortName: "Intercessão",
    category: "oracao",
    isMain: false,
    image: "/images/church_prayer.jpg",
    icon: Flame,
    iconBg: "bg-violet-600",
    badgeColor: "bg-violet-100 text-violet-800 border-violet-200",
    tagline: "Sentinelas de oração, vigílias e clamor contínuo pelas famílias.",
    biblicalFoundation: "1 Tessalonicenses 5:17 — 'Orai sem cessar.'",
    purpose:
      "Sustentar espiritualmente toda a igreja em oração, cobrindo os cultos, os pastores, os enfermos, a liderança e as causas urgentes através do clamor diante de Deus.",
    responsibilities: [
      "Organizar turnos e correntes de oração durante a semana",
      "Realizar vigílias de clamor e intercessão pela nação e pela igreja",
      "Orar pelas intenções e pedidos depositados nos cultos",
      "Dar cobertura espiritual durante os períodos de pregação e apelo",
    ],
    roles: [
      "Líder de Intercessão",
      "Sentinela de Oração",
      "Coordenador de Vigílias",
      "Intercessor de Plantão no Culto",
    ],
    applaneFeatures: [
      "Canal seguro para registro e acompanhamento de pedidos de oração",
      "Escalas de turnos de sentinelas no templo ou em casa",
      "Controle de vigílias com confirmação de presença",
      "Relatório de testemunhos e orações respondidas",
    ],
  },
  {
    id: "evangelismo",
    name: "Ministério de Evangelismo & Missões",
    shortName: "Evangelismo",
    category: "oracao",
    isMain: false,
    image: "/images/church_missions.jpg",
    icon: Globe,
    iconBg: "bg-orange-600",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
    tagline: "Impactos urbanos, ação social e compromisso com missões mundiais.",
    biblicalFoundation: "Mateus 28:19 — 'Ide, portanto, fazei discípulos de todas as nações...'",
    purpose:
      "Levar o amor de Deus além das quatro paredes do templo, alcançando os necessitados, anunciando o evangelho nas praças e sustentando missionários no campo.",
    responsibilities: [
      "Promover ações evangelísticas nas ruas, praças e hospitais da cidade",
      "Distribuir cestas básicas, roupas e auxílio social a famílias carentes",
      "Manter contato e enviar suporte financeiro aos missionários adotados",
      "Despertar o fervor missionário nas novas gerações",
    ],
    roles: [
      "Líder de Missões & Evangelismo",
      "Evangelista Urbano",
      "Coordenador de Ação Social",
      "Agente de Conexão Missionária",
    ],
    applaneFeatures: [
      "Gestão de projetos e mutirões evangelísticos comunitários",
      "Escala de voluntários para saídas missionárias e distribuição social",
      "Painel de missionários parceiros e relatórios de campo",
      "Métricas de pessoas alcançadas e decisões por Cristo",
    ],
  },
  {
    id: "tesouraria",
    name: "Tesouraria & Finanças",
    shortName: "Tesouraria",
    category: "gestao",
    isMain: false,
    image: "/images/church_treasury.jpg",
    icon: Coins,
    iconBg: "bg-emerald-700",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    tagline: "Transparência santa, relatórios financeiros e integridade cristã.",
    biblicalFoundation: "2 Coríntios 8:21 — 'Pois zelamos pelo que é honesto, não só diante do Senhor, mas também diante dos homens.'",
    purpose:
      "Administrar com santo zelo os dízimos e ofertas entregues pelo povo de Deus, garantindo cumprimento das obrigações fiscais, investimentos missionários e prestação de contas clara.",
    responsibilities: [
      "Contagem e conferência de ofertas e dízimos recolhidos nos cultos",
      "Pagamento de despesas, contas de consumo e manutenção do templo",
      "Emissão de balancetes mensais para o conselho e assembleia",
      "Controle orçamentário para reformas e aquisição de equipamentos",
    ],
    roles: [
      "Primeiro(a) Tesoureiro(a)",
      "Segundo(a) Tesoureiro(a)",
      "Conselheiro(a) Fiscal / Auditor",
      "Auxiliar de Caixa",
    ],
    applaneFeatures: [
      "Registro de entradas e saídas por centro de custos ministerial",
      "Geração instantânea de balancetes e relatórios para assembleia",
      "Controle rigoroso de comprovantes e auditoria interna",
      "Previsão orçamentária para eventos, congressos e reformas",
    ],
  },
  {
    id: "patrimonio",
    name: "Patrimônio & Zeladoria",
    shortName: "Patrimônio",
    category: "gestao",
    isMain: false,
    image: "/images/church_heritage.jpg",
    icon: Building2,
    iconBg: "bg-cyan-700",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    tagline: "Cuidado amoroso com a casa de Deus, manutenção e conservação dos bens.",
    biblicalFoundation: "1 Crônicas 29:3 — 'Por amor da casa de meu Deus, dei do meu tesouro particular...'",
    purpose:
      "Zelar pela limpeza, segurança física, manutenção predial e inventário dos bens da congregação, garantindo que o templo esteja sempre impecável para receber o povo de Deus.",
    responsibilities: [
      "Inventariar equipamentos, móveis, instrumentos e bens patrimoniais",
      "Supervisionar a manutenção de ar-condicionado, som, telhado e elétrica",
      "Coordenar a limpeza e desinfecção de salas, santuário e banheiros",
      "Manter o estoque de materiais de higiene e copa sempre abastecido",
    ],
    roles: [
      "Coordenador(a) de Patrimônio",
      "Zelador(a) do Templo",
      "Técnico de Manutenção Predial",
      "Responsável por Inventário",
    ],
    applaneFeatures: [
      "Inventário detalhado com número de patrimônio e fotos dos bens",
      "Abertura de chamados de manutenção e conserto",
      "Checklists de inspeção antes e depois de cada culto",
      "Histórico de reformas e garantias de equipamentos",
    ],
  },
  {
    id: "infantil",
    name: "Ministério Infantil (Kids)",
    shortName: "Infantil",
    category: "ensino",
    isMain: false,
    image: "/images/church_kids.jpg",
    icon: Sparkles,
    iconBg: "bg-amber-600",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    tagline: "Culto infantil lúdico, histórias bíblicas e alicerce espiritual para os pequenos.",
    biblicalFoundation: "Provérbios 22:6 — 'Educa a criança no caminho em que deve andar; e até quando envelhecer não se desviará dele.'",
    purpose:
      "Apresentar Jesus de maneira viva, dinâmica e amorosa para as crianças, proporcionando um ambiente acolhedor e seguro enquanto os pais adoram no templo principal.",
    responsibilities: [
      "Ministrar o culto infantil e aulas da salinha adaptadas à faixa etária",
      "Realizar teatro de fantoches, louvor infantil e dinâmicas pedagógicas",
      "Garantir a segurança física com controle rigoroso de entrega às famílias",
      "Cuidar do berçário e dar suporte às mães de bebês",
    ],
    roles: [
      "Líder do Ministério Infantil",
      "Professor(a) de Crianças",
      "Monitor(a) de Salinha / Berçário",
      "Coordenador(a) de Check-in Infantil",
    ],
    applaneFeatures: [
      "Escala dedicada de tias, tios e monitores por faixa etária",
      "Planejamento de lições bíblicas e materiais para impressão",
      "Registro de avisos de alergias ou cuidados especiais das crianças",
      "Alertas para os pais em caso de necessidade durante o culto",
    ],
  },
];

export default function MinisteriosExplicacaoPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredMinistries = useMemo(() => {
    return MINISTRIES_CATALOG.filter((m) => {
      // Category filter
      if (selectedCategory === "principais" && !m.isMain) return false;
      if (selectedCategory !== "all" && selectedCategory !== "principais" && m.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(query);
        const matchesTagline = m.tagline.toLowerCase().includes(query);
        const matchesRoles = m.roles.some((r) => r.toLowerCase().includes(query));
        const matchesFeatures = m.applaneFeatures.some((f) => f.toLowerCase().includes(query));
        return matchesName || matchesTagline || matchesRoles || matchesFeatures;
      }

      return true;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900 pb-24 transition-colors duration-300">
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-semibold text-sm group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Voltar ao Início</span>
            </Link>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <Link href="/" className="flex items-center">
              <img
                src="/logo_aplane_transparent.png"
                alt="Applane Logo"
                className="h-10 w-auto object-contain dark:brightness-110"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Tema */}
            <ThemeToggle
              variant="segmented"
              className="hidden sm:inline-flex"
            />
            <ThemeToggle
              variant="icon"
              className="sm:hidden p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 shadow-xs"
              iconClassName="w-4 h-4"
            />

            <Link
              href="/login"
              className="text-slate-600 dark:text-slate-300 font-bold hover:text-blue-800 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-900 transition-all shadow-md shadow-blue-800/10 active:scale-95 inline-flex items-center gap-2"
            >
              <span>Cadastrar Igreja</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="pt-36 pb-12 px-6 bg-gradient-to-b from-blue-50/70 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 border-b border-slate-100 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-100/70 text-blue-800 rounded-full text-xs font-bold mb-5 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
            Guia Ministerial & Recursos do Applane
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-slate-900 tracking-tight mb-5 leading-tight">
            Ministérios em{" "}
            <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 bg-clip-text text-transparent italic">
              harmonia e excelência
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Conheça detalhadamente cada área suportada na plataforma, seu propósito bíblico,
            responsabilidades práticas e as ferramentas que o Applane oferece para cada equipe.
          </p>

          {/* Quick Search & Filters */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar ministério, função ou recurso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "all", label: "Todos os Ministérios (12)" },
              { id: "principais", label: "★ 4 Principais" },
              { id: "pastoral", label: "Pastoral & Secretaria" },
              { id: "ensino", label: "Ensino & Crianças" },
              { id: "oracao", label: "Oração & Missões" },
              { id: "gestao", label: "Finanças & Patrimônio" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-blue-800 text-white shadow-md shadow-blue-800/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content: List of Ministries */}
      <main className="max-w-7xl mx-auto px-6 pt-12">
        {filteredMinistries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum ministério encontrado</h3>
            <p className="text-sm text-slate-500 mb-4">
              Não encontramos resultados para &quot;{searchQuery}&quot;.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-blue-800 font-bold text-sm hover:underline"
            >
              Ver todos os 12 ministérios
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {filteredMinistries.map((ministry) => {
              const Icon = ministry.icon;
              return (
                <section
                  key={ministry.id}
                  id={ministry.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden scroll-mt-28 hover:shadow-md transition-shadow"
                >
                  <div className="grid lg:grid-cols-12 gap-0">
                    {/* Visual & Summary Column (5 cols) */}
                    <div className="lg:col-span-5 relative flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-slate-900 to-slate-950 text-white min-h-[380px]">
                      {/* Background Image with Dark Vignette */}
                      <div className="absolute inset-0 overflow-hidden opacity-35">
                        <img
                          src={ministry.image}
                          alt={ministry.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/60" />
                      </div>

                      {/* Header with Icon and Main Badge */}
                      <div className="relative z-10 flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl ${ministry.iconBg} text-white flex items-center justify-center shadow-lg`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Ministério
                            </span>
                            <h2 className="text-2xl font-black text-white leading-tight">
                              {ministry.name}
                            </h2>
                          </div>
                        </div>

                        {ministry.isMain && (
                          <span className="inline-flex items-center gap-1 bg-blue-600/90 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 shadow-sm shrink-0">
                            <Star className="w-3 h-3 fill-white" />
                            Principal
                          </span>
                        )}
                      </div>

                      {/* Tagline & Biblical Quote */}
                      <div className="relative z-10 space-y-4 my-auto">
                        <p className="text-slate-100 text-base font-semibold leading-relaxed">
                          {ministry.tagline}
                        </p>
                        <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs italic text-blue-200/95 leading-relaxed">
                          {ministry.biblicalFoundation}
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="relative z-10 pt-6 mt-4 border-t border-white/10">
                        <Link
                          href={
                            ministry.registrationRole
                              ? `/register?role=${ministry.registrationRole}`
                              : "/register"
                          }
                          className="w-full bg-white text-slate-900 hover:bg-blue-50 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group/btn shadow-md active:scale-95"
                        >
                          <span>Participar deste Ministério</span>
                          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>

                    {/* Detailed Information Column (7 cols) */}
                    <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                      {/* Propósito */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                          Propósito & Vocação
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                          {ministry.purpose}
                        </p>
                      </div>

                      {/* Responsabilidades Práticas */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                          O que faz na prática da congregação
                        </h4>
                        <ul className="grid sm:grid-cols-2 gap-2.5">
                          {ministry.responsibilities.map((resp, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2.5 text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-tight">{resp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Funções Cadastradas no Applane */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          Funções & Papéis Suportados
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {ministry.roles.map((role, idx) => (
                            <span
                              key={idx}
                              className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/60"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Recursos Exclusivos no Applane */}
                      <div className="pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2.5 flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-blue-700" />
                          Como o Applane potencializa este ministério
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {ministry.applaneFeatures.map((feat, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-blue-50/60 px-3 py-2 rounded-xl border border-blue-100/70"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                              <span className="truncate">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Bottom Call to Action Banner */}
        <section className="mt-16 bg-gradient-to-tr from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden text-center">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,#fff_0,transparent_60%)]" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-display font-black mb-4">
              Leve a excelência do Applane para todos os ministérios da sua igreja
            </h2>
            <p className="text-blue-100 text-base sm:text-lg mb-8 leading-relaxed">
              Elimine o caos das escalas no papel e grupos dispersos. Centralize músicos, dança,
              multimídia, secretaria e todas as áreas com um clique.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="bg-white text-blue-900 hover:bg-blue-50 px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-lg active:scale-95 inline-flex items-center gap-2"
              >
                <span>Cadastrar Minha Igreja Grátis</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="bg-blue-800/80 hover:bg-blue-800 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-base transition-all active:scale-95"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <img src="/logo_aplane.png" alt="Applane Logo" className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-6 text-sm font-semibold text-slate-600">
            <Link href="/" className="hover:text-blue-800">
              Início
            </Link>
            <Link href="/login" className="hover:text-blue-800">
              Entrar
            </Link>
            <Link href="/register" className="hover:text-blue-800">
              Criar Conta
            </Link>
          </div>
          <p className="text-sm font-medium text-slate-500">
            © {new Date().getFullYear()} Applane. Gestão ministerial com excelência.
          </p>
        </div>
      </footer>
    </div>
  );
}
