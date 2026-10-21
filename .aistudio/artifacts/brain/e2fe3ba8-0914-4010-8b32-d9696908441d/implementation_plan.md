# Funcionalidade de Foto de Perfil com Recorte e Compressão Otimizada

Plano de arquitetura e design para permitir que integrantes e líderes façam o envio, ajuste interativo e exibição de suas fotos de perfil na plataforma Applaine, integrando compressão client-side de alto desempenho, pré-visualização com corte circular e persistência no Firebase Auth e Firestore.

### User Review & Critical Decisions

> [!IMPORTANT]
> As decisões de produto e experiência do usuário foram confirmadas na fase de esclarecimento e nortearão toda a implementação:

-   **Método de Envio**: Upload direto do dispositivo do usuário (suportando arquivos JPEG, PNG e WebP, além da câmera do smartphone), com processamento e compressão automática no cliente para garantir carregamento instantâneo e leveza de dados.
-   **Ferramenta de Ajuste e Recorte**: Modal interativo com pré-visualização em tempo real, máscara de corte circular/quadrado, controle deslizante de zoom (1x a 3x) e reposicionamento por arraste (pan), além de opção para remover a foto existente.
-   **Pontos de Acesso na Interface**:
    1.  Diretamente no cartão de perfil do integrante (`/dashboard/members/[id]`), com botão de câmera dedicado sobre o avatar.
    2.  No avatar do usuário na barra flutuante superior (`FloatingTopBar`), com menu de ação rápida para visualização/troca imediata de foto.
    3.  No modal administrativo de edição de integrante (`/dashboard/members`).

---

### 1. Overview & Core Concept

-   **What It Does**: Oferece aos integrantes e líderes uma experiência visual moderna e humanizada para gerenciar sua identidade na igreja. Ao selecionar uma imagem, o usuário visualiza um modal com recorte circular, ajusta o enquadramento através de zoom e arraste suave, e ao salvar, a imagem é processada e armazenada como imagem otimizada em WebP/JPEG com resolução ideal (300x300px), atualizando o perfil do Firebase Authentication (`updateProfile`) e o documento do usuário no Firestore (`users/{userId}.photoURL`).
-   **Target Audience / Persona**: Músicos, cantores, equipe de multimídia, grupo de dança, pastores e líderes ministeriais que precisam de reconhecimento visual rápido em escalas, chamadas e relatórios.
-   **Key Value**: Proporciona reconhecimento visual imediato nas escalas de domingo, listas ministeriais e barras de navegação, elevando a identidade comunitária e a usabilidade em dispositivos móveis e desktops.

---

### 2. User Experience & Visual Design

-   **Key User Flows**:
    1.  *Acionamento*:
        -   O usuário clica no botão com ícone de câmera posicionado no canto inferior do avatar do seu perfil (`/dashboard/members/[id]`) ou clica diretamente no avatar da barra flutuante (`FloatingTopBar`).
    2.  *Seleção do Arquivo*:
        -   Abre o seletor nativo de fotos do dispositivo (ou permite arrastar e soltar a imagem).
    3.  *Ajuste e Recorte Interativo*:
        -   Um modal elegante é aberto exibindo a foto selecionada com máscara circular iluminada, guias de alinhamento sutis, botões de zoom (`-` e `+`) com controle deslizante, e opção de reposicionar a imagem arrastando com o dedo ou mouse.
    4.  *Confirmação e Processamento*:
        -   Ao clicar em "Salvar Foto", um canvas invisível renderiza o recorte exato nas dimensões otimizadas ($300 \times 300\text{px}$, formato WebP/JPEG com compressão de 82%), gerando uma imagem ultraleve (< 40KB).
        -   O sistema salva simultaneamente no Firebase Auth (`updateProfile`) e no Firestore (`users/{uid}`), atualizando o estado do `AuthProvider` sem recarregar a tela.
    5.  *Remoção*:
        -   Opção clara de "Remover foto" para restaurar a inicial do nome com badge padrão.

-   **Visual Identity & Theme**:
    -   *Modal de Edição*: `bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-[2.5rem] shadow-2xl`.
    -   *Área de Pré-Visualização*: Área com fundo escurecido contrastante, círculo centralizador com contorno de alta precisão (`ring-2 ring-blue-500/80 shadow-2xl`), suporte a gestos de toque em smartphones.
    -   *Controles de Zoom*: Barra deslizante com botões de micro-passo (`ZoomIn` e `ZoomOut`) e valor percentual discreto em números tabulares (`tabular-nums font-mono`).
    -   *Propagação Global*: Exibição da foto com cantos arredondados contínuos e fallback resiliente (se a foto falhar no carregamento, exibe a letra inicial com fundo estilizado, sem quebrar o layout).

---

### 3. Key Product Decisions & Trade-Offs

-   **Decisão 1: Compressão e Otimização no Cliente via Canvas HTML5**
    -   *Chosen Approach*: Processar o corte e a compressão diretamente no navegador do usuário gerando WebP (com fallback JPEG) de tamanho compacto ($300 \times 300\text{px}$, ~35KB).
    -   *Why*: Elimina dependência de infraestrutura externa de processamento pesado, garante upload ultrarrápido mesmo em conexões 3G/4G móveis, não gera custos extras de cloud functions e mantém a foto imediatamente disponível na nuvem.
    -   *Alternatives Considered*: Enviar a foto bruta de 8MB para o servidor redimensionar, descartado por latência excessiva no celular e alto consumo de banda.

-   **Decisão 2: Persistência Híbrida (Firebase Auth `photoURL` + Firestore `users/{uid}.photoURL`)**
    -   *Chosen Approach*: Atualizar o perfil do Firebase Auth (`updateProfile`) e o documento do usuário no Firestore (`photoURL`).
    -   *Why*: O Firebase Auth mantém a foto associada ao token de autenticação (disponível instantaneamente no `user.photoURL`), enquanto o Firestore permite que outros membros vejam a foto na lista de integrantes, escalas e perfis públicos sem exigir chamadas extras.
    -   *Alternatives Considered*: Apenas no Firebase Auth, descartado pois outros usuários na congregação não teriam acesso às fotos uns dos outros nas escalas.

-   **Decisão 3: Componente Dedicado de Avatar com Fallback Gracioso (`UserAvatar`)**
    -   *Chosen Approach*: Criar um componente unificado `components/UserAvatar.tsx` com tratamento de estados (carregamento, imagem quebrada, inicial do nome e tamanho customizável `sm`, `md`, `lg`, `xl`).
    -   *Why*: Centraliza a estilização e evita duplicação de tags `<img onError=...>` espalhadas pelo projeto, prevenindo qualquer ocorrência de imagem quebrada.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Fluxo de Foto de Perfil                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ FloatingTopBar / MemberProfilePage / MembersList               │   │
│   │  [Avatar com acionador de clique / botão de câmera]            │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ ProfilePhotoCropModal.tsx                                      │   │
│   │  - Seletor de arquivo (input file / drag-drop)                 │   │
│   │  - Preview com máscara circular e pan/drag                     │   │
│   │  - Controle de zoom slider (1x - 3x)                           │   │
│   │  - Compressão via HTML5 Canvas (300x300 WebP/JPEG, ~35KB)      │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Sincronização & Persistência                                   │   │
│   │  ├─ Firebase Auth: updateProfile(auth.currentUser, {photoURL}) │   │
│   │  ├─ Firestore: updateDoc(doc(db, 'users', uid), {photoURL})    │   │
│   │  └─ AuthProvider: setUserData / refreshUserData()              │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Exibição Atualizada em Tempo Real                              │   │
│   │  ├─ FloatingTopBar.tsx (perfil superior compacto)              │   │
│   │  ├─ app/dashboard/members/[id]/page.tsx (cabeçalho de perfil) │   │
│   │  ├─ app/dashboard/members/page.tsx (tabela e cards mobile)     │   │
│   │  └─ components/Sidebar.tsx (perfil da barra lateral)           │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Blueprint & Security Rules Strategy

1.  **`firebase-blueprint.json`**:
    -   Atualizar a entidade `User` para incluir a propriedade opcional `photoURL: { "type": "string", "description": "URL ou payload otimizado da foto de perfil" }`.
2.  **`firestore.rules`**:
    -   Atualizar o helper `isValidUser(data)` para validar `(!('photoURL' in data) || (data.photoURL is string && data.photoURL.size() <= 200000))`.
    -   Incluir `'photoURL'` nas chaves permitidas para atualização pelo próprio usuário (`affectedKeys().hasOnly([...])`).
    -   Executar validação e deploy das regras de segurança com o RPC `DeployRules`.
3.  **Componentes e Modificações**:
    -   `components/ProfilePhotoCropModal.tsx`: Novo componente interativo para seleção, corte e compressão.
    -   `components/UserAvatar.tsx`: Novo componente unificado com fallback automático por inicial e estilos responsivos.
    -   `components/FloatingTopBar.tsx`: Renderização do avatar atualizado e gatilho direto para alterar foto.
    -   `app/dashboard/members/[id]/page.tsx`: Inclusão do botão de câmera sobre o avatar principal e acoplamento ao modal de recorte.
    -   `app/dashboard/members/page.tsx`: Integração da exibição de fotos na listagem geral de integrantes e no modal de edição.
    -   `components/AuthProvider.tsx`: Exposição do método de sincronização instantânea de avatar.
