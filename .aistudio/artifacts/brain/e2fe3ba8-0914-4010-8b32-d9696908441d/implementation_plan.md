# Plano de Implementação: Perfil do Pastor e Cadastro Restrito

Implementação do perfil de acesso ministerial **Pastor** (`pastor`, `pastor_titular`, `pastor_auxiliar`) com isolamento multi-tenant estrito por `churchId`, centralização da criação de contas pastorais exclusivamente no ambiente `/admin/dashboard/churches/[id]`, e blindagem contra acesso cruzado de dados entre diferentes congregações.

---

## Decisões Confirmadas com o Usuário

> [!IMPORTANT]
> Decisões alinhadas na Fase de Planejamento:
> - **Entrega de Credenciais**: Gerar senha provisória aleatória e segura com botão de cópia de alta visibilidade e acionamento de e-mail de redefinição/convite.
> - **Localização na Interface**: Aba dedicada **"Pastores Responsáveis"** integrada na página da igreja (`/admin/dashboard/churches/[id]`), ao lado das seções de Departamentos e Membros.
> - **Classificação Ministerial**: Seletor permitindo escolher entre **Pastor Titular** e **Pastor Auxiliar** com status Ativo/Inativo.

---

## 1. Visão Geral e Conceito Central

- **O que faz**: Oferece aos administradores gerais (`super_admin`) um módulo seguro e dedicado dentro de `/admin/dashboard/churches/[id]` para listar, cadastrar e gerenciar os Pastores Responsáveis pela igreja. Garante que os pastores tenham acesso pleno de liderança aos dados de sua própria igreja (escalas, membros, departamentos, repertório, eventos), mas com bloqueio absoluto e redirecionamento caso tentem consultar ou manipular congregações alheias.
- **Público-Alvo**:
  - **Admin Geral (Super Admin)**: Único perfil autorizado a cadastrar pastores e definir a congregação correspondente.
  - **Pastor Titular / Auxiliar**: Líder espiritual e operacional da igreja local, com visão completa dos dados da sua congregação.
- **Valor Agregado**: Conformidade com a LGPD e princípios de isolamento multi-tenant, eliminando qualquer risco de vazamento de informações entre igrejas irmãs ou independentes.

---

## 2. Experiência do Usuário e Design Visual

### Fluxos Principais

1. **Navegação do Admin Geral até a Igreja**:
   - O Admin Geral acessa `/admin/dashboard/churches/[id]`.
   - Na barra de abas superiores da tela, visualiza: `[Departamentos]` · `[Pastores Responsáveis]` · `[Visão Geral & Escalas]`.
   - Clicando em `Pastores Responsáveis`, visualiza a listagem de pastores já associados à igreja atual e o botão de ação primária **"+ Cadastrar Pastor"**.

2. **Cadastro do Novo Pastor**:
   - O Admin clica em **"+ Cadastrar Pastor"**.
   - Abre-se o modal contendo:
     - **Igreja Vinculada**: Campo bloqueado/desabilitado com o nome e ID da igreja atual (`churchId`).
     - **Classificação**: Seletor ("Pastor Titular" / "Pastor Auxiliar").
     - **Nome Completo**: Input obrigatório.
     - **E-mail**: Input obrigatório com validação de formato e unicidade.
     - **Telefone / WhatsApp**: Input com formatação visual para contato rápido.
     - **Credenciais**: Senha temporária sugerida gerada dinamicamente (mínimo 8 caracteres alfanuméricos com símbolos), campo editável com alternador de visibilidade (olho), botão "Copiar Credenciais" e checkbox "Enviar e-mail com link de primeiro acesso".
     - **Status**: Seletor Ativo / Inativo.
   - Ao salvar, a API cria o usuário no Firebase Auth com `customClaims: { role: 'pastor', churchId }`, registra o documento em `users/{uid}` com liderança atribuída em todos os ministérios da igreja, e anexa o pastor à lista `churches/{churchId}.pastors`.
   - O modal exibe um banner de confirmação com resumo das credenciais e atalho para copiar mensagem de boas-vindas formatada para envio via WhatsApp ou e-mail.

3. **Bloqueio e Isolamento no Dashboard do Pastor**:
   - Quando um usuário com perfil `pastor` faz login:
     - O sistema carrega os dados vinculados exclusivamente ao seu `churchId`.
     - Caso o pastor digite manualmente na URL `/dashboard/churches/{outra_igreja_id}` ou `/admin/*`, o middleware e os componentes de guarda interceptam a requisição, redirecionam imediatamente para `/dashboard/churches/${pastor.churchId}` e exibem um alerta de acesso negado.
     - O botão de cadastro de pastores **não é exibido** no painel regular `/dashboard/churches/[id]`.

---

## 3. Decisões Técnicas e Trade-Offs

- **Decisão 1: Restrição Estrita do Endpoint `/api/admin/create-pastor`**:
  - *Abordagem*: Permitir requisições ao endpoint **exclusivamente** para `super_admin`. Pastores ou líderes que tentarem disparar POST para esta rota receberão `HTTP 403 Forbidden`.
  - *Motivo*: Evita escalonamento de privilégios e cumpre o requisito explícito de que apenas o Admin Geral cadastra pastores.

- **Decisão 2: Remoção do Modal de Cadastro Pastoral de `/dashboard/churches/[id]`**:
  - *Abordagem*: Eliminar a interface de cadastro de pastor de rotas acessíveis a membros ou pastores locais, mantendo-a unicamente em `/admin/dashboard/churches/[id]`.
  - *Motivo*: Garante uma única fonte de verdade administrativa e previne acessos indevidos.

- **Decisão 3: Associação Automática de Liderança Pastoral**:
  - *Abordagem*: Ao ser criado, o perfil pastoral recebe automaticamente permissões de líder em todos os departamentos padrão da igreja local (`worship`, `multimedia`, `secretariat`, `dance`, etc.) com `churchId` obrigatório.
  - *Motivo*: Permite ao pastor atuar imediatamente na gestão de escalas, repertório e membros da sua igreja sem necessidade de configurações manuais adicionais.

---

## 4. Arquitetura do Sistema e Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Painel Admin Geral (Super Admin)                       │
│                     /admin/dashboard/churches/[id]                          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      [Aba: Pastores Responsáveis]
                                       │
                        Botão "+ Cadastrar Pastor"
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │   Modal "Cadastrar Novo Pastor"   │
                     │  - churchId (Locked from URL)    │
                     │  - Nome & Classificação          │
                     │  - Email & WhatsApp              │
                     │  - Senha com Copiar & Link Conv. │
                     └─────────────────┬────────────────┘
                                       │ POST (Bearer Token Super Admin)
                                       ▼
                     ┌──────────────────────────────────┐
                     │  /api/admin/create-pastor        │
                     │  (Enforce isSuperAdmin === true) │
                     └─────────────────┬────────────────┘
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
┌───────────────────────────────┐               ┌────────────────────────────────┐
│         Firebase Auth         │               │       Firestore Database       │
│ - Cria/Atualiza Auth User     │               │ - users/{uid}                  │
│ - Set Custom Claims:          │               │   (role: pastor, churchId)     │
│   { role: 'pastor', churchId }│               │ - churches/{id}.pastors[]      │
└───────────────────────────────┘               └────────────────────────────────┘
                                                                 ▲
                                                                 │
                                                       [Tenant Guard / RLS]
                                                                 │
┌────────────────────────────────────────────────────────────────┴───────────────┐
│                           Dashboard do Pastor Local                           │
│     Acesso total a escalas, membros e dados de {churchId} da sua igreja       │
│      Tentativa de acesso a outra igreja -> 403 / Redirecionamento com Aviso   │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Etapas de Execução

1. **Ajustar API Backend (`/app/api/admin/create-pastor/route.ts`)**:
   - Reconfigurar autorização para exigir estritamente `super_admin`.
   - Adicionar suporte a `status: 'active' | 'inactive'` e registro de data de vinculação.
   - Gerar link de redefinição de senha via Firebase Admin se solicitado.

2. **Aprimorar Tela da Igreja no Admin (`/app/admin/dashboard/churches/[id]/page.tsx`)**:
   - Adicionar abas de navegação visual: `[Departamentos & Membros]`, `[Pastores Responsáveis]`, `[Calendário de Escalas]`.
   - Criar seção e tabela/cards de Pastores Responsáveis com indicadores de status, classificação pastoral e ações rápidas.
   - Implementar o modal "Cadastrar Pastor" com `churchId` bloqueado, gerador de senha provisória, botão de cópia de credenciais e validações.

3. **Restringir Painel de Membros (`/app/dashboard/churches/[id]/page.tsx`)**:
   - Remover botão/modal de cadastro de pastor para usuários não-superadmin.
   - Reforçar o guard de redirecionamento caso um pastor tente acessar a URL de outra igreja.

4. **Verificação de Compilação & Lint**:
   - Executar `compile_applet` e `lint_applet` para assegurar integridade completa do build.
