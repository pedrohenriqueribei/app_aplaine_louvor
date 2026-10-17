# Barra Superior Fixa Flutuante com Efeito Glassmorphism ao Rolar

Plano de arquitetura e design para criar uma barra de navegação superior fixa com efeito translúcido de vidro fosco (glassmorphism), que permanece invisível no topo da página e surge suavemente ao iniciar a rolagem vertical, disponibilizando título contextual, busca rápida, notificações, tema e perfil compacto em todas as telas da plataforma.

### User Review & Critical Decisions

> [!IMPORTANT]
> As preferências de design e comportamento foram confirmadas pelo usuário na etapa de alinhamento e guiarão toda a execução:

-   **Elementos da Barra Superior**: Título contextual da página atual, badge de notificações em tempo real, acionador de busca, alternador de tema claro/escuro e badge compacto do perfil do usuário com foto/avatar e indicador de verificação.
-   **Estilo Visual**: Barra flutuante tipo cápsula/pill translúcida com acabamento em vidro fosco (`backdrop-blur-md`, bordas suaves com contraste sutil, sombras profundas e cantos arredondados `rounded-2xl`).
-   **Abrangência do Sistema**: Ativa em todas as páginas da plataforma, integrada de forma padronizada através dos layouts mestres (`DashboardShell`, `AdminShell` e páginas complementares), respeitando a largura do conteúdo e a presença da barra lateral existente (desktop e mobile).

---

### 1. Overview & Core Concept

-   **What It Does**: Monitora a rolagem vertical do usuário (tanto no container de rolagem `<main>` quanto na janela global `window`). Enquanto o usuário estiver no topo da página (rolagem $\le 60\text{px}$), a barra fixa fica oculta e transparente. Assim que ultrapassa esse limiar, a barra desliza suavemente de cima para baixo com transição fluida de opacidade e translação vertical, mantendo os controles primários de contexto e navegação acessíveis sem forçar o retorno manual ao topo.
-   **Target Audience / Persona**: Pastores, líderes de ministério, músicos, equipe de multimídia e administradores que visualizam tabelas extensas de escalas, membros, relatórios e eventos e necessitam de navegação ágil.
-   **Key Value**: Elimina o atrito de ter que rolar longas telas de volta ao topo para checar notificações, acessar o perfil ou alternar páginas, mantendo a experiência limpa e focada no conteúdo.

---

### 2. User Experience & Visual Design

-   **Key User Flows**:
    1.  *Topo da Página (Zero Scroll)*: O cabeçalho padrão da página é renderizado normalmente. A barra flutuante superior permanece com `opacity-0`, `pointer-events-none` e translação para cima (`-translate-y-4`).
    2.  *Descida na Rolagem (> 60px)*: A barra fixa desliza com aceleração suave (`transition-all duration-300 ease-out`), fixando-se no topo com recuo de margem (`top-4`) ou aderente ao topo do viewport.
    3.  *Interações Rápidas*: O usuário pode clicar no atalho de busca para abrir a busca rápida/menu, alternar entre modos claro/escuro (`ThemeToggle`), clicar no sino para ver notificações pendentes ou clicar no perfil para ir direto à sua página de membro.
    4.  *Retorno ao Topo*: Ao rolar de volta para o início, a barra flutuante se desvanece suavemente sem solavancos visuais.

-   **Visual Identity & Theme**:
    -   *Aesthetic Direction*: Sofisticado, limpo, padrão SaaS contemporâneo de alta fidelidade sem ruídos visuais.
    -   *Efeito Glassmorphism*:
        -   Modo Claro: `bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-slate-900/5`
        -   Modo Escuro: `dark:bg-slate-900/80 dark:backdrop-blur-md dark:border-slate-800/80 dark:shadow-black/20`
    -   *Typography*: Fonte display `Outfit` para títulos e `Inter` para metadados, com truncamento inteligente (`truncate max-w-[200px] sm:max-w-[320px]`) e rótulos concisos em linha única.
    -   *Responsividade & Mobile*: Em telas menores (`< 768px`), prioriza o título enxuto, badge de notificações e avatar, mantendo a altura abaixo de $56\text{px}$ para atender com folga o teto de 15% de sticky surfaces em dispositivos móveis.

---

### 3. Key Product Decisions & Trade-Offs

-   **Decisão 1: Componente Reutilizável Centralizado (`FloatingTopBar`)**
    -   *Chosen Approach*: Criar um componente dedicado `FloatingTopBar.tsx` desacoplado que recebe o título da página, subtítulo, dados do usuário, contagem de notificações e callbacks de busca/menu.
    -   *Why*: Garante consistência visual idêntica entre o `DashboardShell`, telas administrativas e páginas públicas/internas, evitando duplicação de lógica de scroll e estilização.
    -   *Alternatives Considered*: Inserir a lógica diretamente dentro de cada arquivo de página, descartado por violar o princípio DRY e gerar inconsistências visuais.

-   **Decisão 2: Detecção Híbrida de Rolagem (Container `<main>` + `window`)**
    -   *Chosen Approach*: Implementar um hook/listener com listeners passivos (`{ passive: true }`) monitorando a rolagem do container interno `<main ref={mainRef}>` e também de `window`.
    -   *Why*: O layout da plataforma utiliza `overflow-y-auto` na tag `<main>` em layouts com sidebar fixa, tornando os listeners puramente de `window` ineficazes se o body não rolar. A abordagem híbrida funciona perfeitamente em qualquer estrutura.
    -   *Alternatives Considered*: Observar via `IntersectionObserver` no cabeçalho original. A detecção direta de scroll com limiar de $60\text{px}$ e flag `scrolled` oferece feedback instantâneo e sem delay de intersecção.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DashboardShell / Layout                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ FloatingTopBar (Sticky/Fixed, top-4, z-50)                    │   │
│   │ [Status: Oculto se scroll <= 60px; Visível se scroll > 60px]    │   │
│   │                                                                │   │
│   │  [Logo/Título Atual]  ···  [Busca] [Tema] [Notificações] [Perfil]│
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌───────────────┐  ┌─────────────────────────────────────────────┐   │
│   │    Sidebar    │  │ <main ref={mainRef} className="overflow-y"> │   │
│   │               │  │                                             │   │
│   │  Navegação    │  │  ┌────────────────────────────────────────┐ │   │
│   │  Principal    │  │  │ Header Original da Página (em fluxo)   │ │   │
│   │               │  │  └────────────────────────────────────────┘ │   │
│   │               │  │                                             │   │
│   │               │  │  ┌────────────────────────────────────────┐ │   │
│   │               │  │  │ Conteúdo da Página ({children})        │ │   │
│   │               │  │  └────────────────────────────────────────┘ │   │
│   └───────────────┘  └─────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Component & State Mapping

-   **`FloatingTopBar.tsx`**:
    -   Props: `title: string`, `user: User | null`, `userData: any`, `unreadCount: number`, `onOpenSearch?: () => void`, `onOpenMenu?: () => void`, `containerRef?: React.RefObject<HTMLElement | null>`.
    -   Estado interno `isScrolled: boolean`: alternado quando `scrollTop > 60px`.
    -   Estilização animada com classes Tailwind:
        -   Oculto: `opacity-0 -translate-y-4 pointer-events-none scale-98`
        -   Visível: `opacity-100 translate-y-0 pointer-events-auto scale-100`
        -   Transições: `transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`
-   **`DashboardShell.tsx`**:
    -   Integra o `FloatingTopBar` posicionado de forma fixa sobre a área principal com alinhamento adequado à barra lateral esquerda (desktop `md:left-72 left-4 right-4 md:right-12`).
    -   Conecta a contagem de notificações já existente e a foto/avatar do usuário.
-   **`AdminShell.tsx`**:
    -   Integra o `FloatingTopBar` para as telas de administração (`/admin/dashboard`, `/admin/dashboard/users`, `/admin/dashboard/security`).
-   **Qualidade e Performance**:
    -   Utiliza propriedades exclusivas de compositor (`opacity`, `transform`).
    -   Zero layout shifts na página (o fluxo natural do documento não é alterado).
    -   Suporte nativo ao modo escuro e claro sincronizado com o `ThemeToggle`.
