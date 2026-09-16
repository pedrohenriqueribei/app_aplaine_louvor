# Applane

Plataforma de gestão de ministérios de louvor, multimídia e escalas para igrejas.

Next.js 15 (App Router) + Firebase (Auth, Firestore, Cloud Messaging) + Gemini.

## Rodando localmente

Pré-requisitos: Node.js 20+ e JDK 21+ (apenas para os testes de rules).

```bash
npm ci
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

O Firebase Admin SDK usa Application Default Credentials. Fora do Google Cloud,
aponte `GOOGLE_APPLICATION_CREDENTIALS` para o JSON de uma service account.

## Verificação

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm run build         # build de produção
npm run test:rules    # regras do Firestore no emulador
```

## Deploy

Hospedado no Firebase App Hosting (`apphosting.yaml`), que roda sobre Cloud Run e
fornece as Application Default Credentials usadas por `lib/firebase-admin.ts`.

Regras e índices do Firestore são versionados e publicados à parte:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Modelo de permissão

- `super_admin`: custom claim no Firebase Auth, concedida via `/api/set-super-admin`.
- Líder de igreja: `leader` ou `multimedia_leader` em `users/{uid}.roles.*`,
  ou o campo legado `role == 'líder'`.
- Papéis de liderança não podem ser atribuídos pelo próprio usuário — apenas por
  um líder da mesma igreja ou por um super admin.

Todo acesso é isolado por `churchId`. As garantias estão cobertas em
`tests/firestore-rules.test.mjs`.
