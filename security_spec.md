# Especificação de Segurança & Controle de Acesso Multi-tenant (Strict Isolation)
**Sistema Applaine / Plataforma de Gestão Ministerial**

---

## 1. Princípios e Regras de Segurança

### 1.1 Isolamento Multi-tenant Estrito (Strict Multi-Tenant Isolation)
- Cada congregação cristã opera como um tenant logicamente isolado.
- Todos os registros pertinentes à vida da congregação (escalas, cultos, repertório, atendimentos pastorais, eventos da agenda, visitantes, disponibilidades voluntárias, bandas, departamentos, movimentações financeiras de dízimos/ofertas e comunicados) possuem chave estrangeira mandatória `igreja_id` (UUID em SQL) / `churchId` (string em Firestore).
- Usuários vinculados a uma igreja específica só podem visualizar, criar, editar ou excluir dados associados diretamente à sua própria congregação (`igreja_id = current_user_church_id()`).

### 1.2 Sem Acesso Global / Bloqueio a Usuários Órfãos (No Orphan Access)
- Usuários sem vínculo ativo com nenhuma igreja (`igreja_id IS NULL` ou sem registro de associação) **NÃO** podem visualizar ou manipular dados de **NENHUMA** congregação.
- Em nível de banco de dados, funções de resolução de sessão como `current_user_church_id()` retornam `NULL`. Nas políticas RLS, qualquer comparação com `NULL` resulta em `FALSE` (three-valued logic), bloqueando qualquer retorno de linha.
- Em nível de aplicação, tentativas de consultar endpoints de dados por usuários sem igreja resultam em resposta `403 Forbidden` com código `ORPHAN_USER_BLOCKED`.

### 1.3 Bloqueio Cross-Tenant & Prevenção de Adulteração de URL
- É estritamente proibido o vazamento ou leitura cruzada de dados entre igrejas diferentes, mesmo via requisições diretas à API ou manipulando parâmetros na URL (ex: `/dashboard/churches/igreja_B` ou `GET /api/agenda/events?churchId=igreja_B`).
- Validações tanto no cliente quanto no servidor barram requisições cujo `churchId` requisitado seja diferente do `churchId` do token autenticado.

---

## 2. Invariantes de Dados (Data Invariants)

1. **Invariante de Paternidade Congregacional:** Nenhum registro congregacional pode existir sem um `igreja_id` válido e existente na tabela `igrejas`.
2. **Invariante de Imutabilidade de Tenant:** O campo `igreja_id` / `churchId` de um registro é imutável após a sua criação (`NEW.igreja_id == OLD.igreja_id`). Uma igreja não pode roubar dados de outra nem transferir registros entre tenants.
3. **Invariante de Associação de Usuário:** Integrantes comuns não podem alterar seu próprio `igreja_id` nem se auto-promover a cargos como `pastor`, `líder` ou `super_admin`.
4. **Invariante de Integridade de Escalas:** Membros escalados para um culto devem pertencer à mesma igreja da escala.
5. **Invariante de Atendimentos Pastorais:** Atendimentos de gabinete pastoral são confidenciais e restritos exclusivamente aos pastores da congregação correspondente.

---

## 3. Matriz de Dirty Dozen Payloads (Tentativas de Invasão & Testes de Penetração)

| # | Vetor de Ataque | Payload / Ação Testada | Resultado Esperado | Camada de Bloqueio |
|---|----------------|------------------------|--------------------|-------------------|
| 1 | **Cross-Tenant Read (URL)** | Usuário da Igreja A acessa `/dashboard/churches/igreja_B` | Acesso Negado (403 Forbidden / UI Shield) | RLS Policy / Firestore Rule / App Guard |
| 2 | **Cross-Tenant API Scraping** | Usuário da Igreja A chama `GET /api/agenda/events?churchId=igreja_B` | HTTP 403 `CROSS_TENANT_VIOLATION` | `requireTenantAuth` + `validateTenantAccess` |
| 3 | **Orphan Data Read** | Usuário sem igreja (`churchId: ""`) consulta `schedules` ou `visitors` | 0 resultados / HTTP 403 `ORPHAN_USER_BLOCKED` | RLS (`current_user_church_id() IS NOT NULL`) / Firestore `inChurch()` |
| 4 | **Cross-Tenant Injection** | Usuário da Igreja A tenta criar escala com `churchId: "igreja_B"` | Operação Rejeitada com `PERMISSION_DENIED` | Trigger `trg_escalas_tenant_guard` / Firestore `inChurch(incoming().churchId)` |
| 5 | **Cross-Tenant Update Hijack** | Usuário tenta enviar PATCH trocando `churchId` de registro existente de A para B | Operação Abortada | Trigger `BEFORE UPDATE` / RLS `WITH CHECK` / Firestore rule |
| 6 | **Self-Privilege Escalation** | Usuário comum envia `{ role: "líder", roles: { worship: ["leader"] } }` | Atualização Rejeitada | Firestore Rule `grantsLeadership()` / RLS column check |
| 7 | **Self-Church Reassignment** | Usuário comum envia `{ churchId: "outra_igreja" }` em seu próprio perfil | Rejeitado por `affectedKeys().hasOnly([...])` | Firestore Rule `users/{userId}` |
| 8 | **Cross-Tenant Visitor Leak** | Integrante da Igreja A consulta dados cadastrais e telefone de visitante da Igreja B | Leitura Negada | Firestore Rule `visitors/{visitorId}` / RLS `rls_visitantes_select` |
| 9 | **Orphan Announcement Broadcast** | Usuário sem igreja tenta emitir comunicado global | HTTP 403 `ORPHAN_USER_BLOCKED` | `app/api/announcements/route.ts` |
| 10 | **Unauthenticated Scale Inspection**| Requisição anônima sem Bearer Token tentando ler `/schedules` | HTTP 401 Unauthorized / Firestore PERMISSION_DENIED | RLS `auth.uid() IS NOT NULL` / Firestore `isSignedIn()` |
| 11 | **Financial Records Espionage** | Membro comum ou de outra igreja tentando ler `financial_records` | PERMISSION_DENIED / 0 linhas retornadas | RLS `rls_registros_financeiros_select` / Firestore `leadsChurch()` |
| 12 | **Audit Log Tampering** | Qualquer usuário tentando executar `UPDATE` ou `DELETE` em `audit_logs` | Operação Bloqueada (`allow update, delete: if false;`) | RLS `logs_auditoria` imutável / Firestore Rule |

---

## 4. Arquitetura em Camadas (Defense-in-Depth)

```
+-----------------------------------------------------------------------+
| 1. CAMADA DE BORDA & MIDDLEWARE (Next.js Edge Middleware)            |
|    - Injeção de Headers de Segurança (nosniff, SAMEORIGIN)            |
|    - Validação de Parâmetros de Query (Bloqueio de múltiplos tenants) |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| 2. CAMADA DE APLICAÇÃO & API (lib/tenant-guard.ts)                    |
|    - requireTenantAuth(): Autenticação Bearer via Firebase Admin Auth |
|    - validateTenantAccess(): Bloqueio estrito Cross-Tenant            |
|    - enforceTenantPayload(): Injeção forçada de churchId autenticado  |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| 3. CAMADA DE BANCO DE DADOS & POLÍTICAS RLS                           |
|    A) PostgreSQL / SQL:                                               |
|       - ALTER TABLE ... FORCE ROW LEVEL SECURITY;                     |
|       - current_user_church_id() IS NOT NULL AND igreja_id = tenant   |
|       - Triggers de Integridade enforce_tenant_integrity()            |
|    B) Firebase Firestore:                                             |
|       - inChurch(churchId) com hasChurch() (Sem acesso órfão)         |
|       - match /{collection}/{id} avaliado em nível de documento       |
+-----------------------------------------------------------------------+
```

---

## 5. Arquivos de Código Entregues

1. **SQL Schema & RLS Policies:** `/sql/01_multi_tenant_rls_schema.sql`
2. **Regras Hardened de Firestore:** `/firestore.rules`
3. **Middleware de Aplicação:** `/middleware.ts`
4. **Guarda de Tenancy Server-Side:** `/lib/tenant-guard.ts`
5. **APIs Protegidas:** `/app/api/agenda/events/route.ts`, `/app/api/announcements/route.ts`
6. **Interface com Bloqueio de URL Cross-Tenant:** `/app/dashboard/churches/[id]/page.tsx`, `/components/DashboardShell.tsx`
