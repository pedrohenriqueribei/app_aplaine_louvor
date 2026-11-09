-- ==============================================================================
-- CONTROLE DE ACESSO ESTRETO & ISOLAMENTO TOTAL MULTI-TENANT (ROW LEVEL SECURITY)
-- Sistema Applaine / Gestão Ministerial
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. MODELAGEM RELACIONAL DE DADOS COM CHAVE ESTRANGEIRA (igreja_id)
-- ==============================================================================

-- 2.1 Tabela Mestra de Tenancy: Igrejas / Congregações
CREATE TABLE IF NOT EXISTS igrejas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    pastor VARCHAR(255),
    endereco TEXT,
    telefone VARCHAR(50),
    email VARCHAR(255),
    cnpj VARCHAR(30) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Usuários e Integrantes (Multi-tenant)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid VARCHAR(128) UNIQUE, -- Vínculo com Firebase Auth / Identity Provider
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL,
    telefone VARCHAR(50),
    cargo VARCHAR(100) DEFAULT 'membro',
    roles JSONB DEFAULT '{"worship":[], "multimedia":[], "secretariat":[], "dance":[]}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Departamentos e Ministérios da Igreja
CREATE TABLE IF NOT EXISTS departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_igreja_depto_slug UNIQUE (igreja_id, slug)
);

-- 2.4 Membros em Departamentos (Sub-relação)
CREATE TABLE IF NOT EXISTS membros_departamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    departamento_id UUID NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    funcoes TEXT[] DEFAULT '{}',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_membro_depto UNIQUE (departamento_id, usuario_id)
);

-- 2.5 Cultos Semanais da Congregação
CREATE TABLE IF NOT EXISTS cultos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    dia_semana VARCHAR(50) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 Escalas Ministeriais de Louvor e Culto
CREATE TABLE IF NOT EXISTS escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    culto_id UUID REFERENCES cultos(id) ON DELETE SET NULL,
    data DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'publicada',
    notas TEXT,
    notas_multimidia TEXT,
    funcoes JSONB DEFAULT '{}'::jsonb,
    membros UUID[] DEFAULT '{}',
    musicas UUID[] DEFAULT '{}',
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 Atendimentos e Gabinete Pastoral
CREATE TABLE IF NOT EXISTS atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    pastor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    pessoa_id VARCHAR(128),
    pessoa_nome VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('counseling', 'prayer', 'visit', 'other')),
    agendado_para TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 Agenda e Eventos da Congregação
CREATE TABLE IF NOT EXISTS eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    data DATE NOT NULL,
    horario_inicio TIME,
    horario_fim TIME,
    local VARCHAR(255),
    categoria VARCHAR(100) DEFAULT 'geral',
    descricao TEXT,
    criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9 Visitantes e Acompanhamento de Integração
CREATE TABLE IF NOT EXISTS visitantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(50),
    email VARCHAR(200),
    primeira_visita DATE NOT NULL DEFAULT CURRENT_DATE,
    status_acompanhamento VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status_acompanhamento IN ('pending', 'contacted', 'member', 'archived')),
    solicitou_oracao BOOLEAN DEFAULT false,
    deseja_visita BOOLEAN DEFAULT false,
    aceitou_jesus BOOLEAN DEFAULT false,
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10 Disponibilidade Mensal dos Voluntários
CREATE TABLE IF NOT EXISTS disponibilidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mes INT NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INT NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
    dias INT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_usuario_disponibilidade UNIQUE (usuario_id, ano, mes)
);

-- 2.11 Repertório Musical da Congregação
CREATE TABLE IF NOT EXISTS musicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    artista VARCHAR(255) NOT NULL,
    tom VARCHAR(20),
    link VARCHAR(500),
    cifra TEXT,
    bpm VARCHAR(20),
    compasso VARCHAR(30),
    tags TEXT[] DEFAULT '{}',
    observacoes TEXT,
    dono_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.12 Playlists de Louvor por Escala
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    escala_id UUID NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
    musicas UUID[] NOT NULL DEFAULT '{}',
    data_ensaio DATE,
    hora_ensaio TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_escala_playlist UNIQUE (escala_id)
);

-- 2.13 Bandas Internas
CREATE TABLE IF NOT EXISTS bandas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    lider_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    membros UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.14 Ministério de Dança: Grupos e Coreografias
CREATE TABLE IF NOT EXISTS grupos_danca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    lider_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    membros UUID[] DEFAULT '{}',
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coreografias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    musica VARCHAR(200),
    artista VARCHAR(200),
    grupo_id UUID REFERENCES grupos_danca(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'rehearsing',
    figurino TEXT,
    link_musica VARCHAR(500),
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ensaios_danca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    data DATE NOT NULL,
    horario TIME,
    local VARCHAR(255),
    concluido BOOLEAN DEFAULT false,
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.15 Tesouraria e Lançamentos Financeiros
CREATE TABLE IF NOT EXISTS registros_financeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('income', 'expense')),
    categoria VARCHAR(100) NOT NULL,
    valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    forma_pagamento VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending')),
    departamento_id UUID REFERENCES departamentos(id) ON DELETE SET NULL,
    criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.16 Comunicados e Transmissões (Broadcasts)
CREATE TABLE IF NOT EXISTS comunicados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    autor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    titulo VARCHAR(200) NOT NULL,
    conteudo TEXT NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Geral',
    fixado BOOLEAN DEFAULT false,
    publico_alvo VARCHAR(100) DEFAULT 'Todos os Membros',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.17 Logs de Auditoria Imutáveis
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    ator_user_id VARCHAR(128) NOT NULL,
    acao VARCHAR(50) NOT NULL CHECK (acao IN ('CREATE', 'UPDATE', 'DELETE')),
    entidade_tipo VARCHAR(100) NOT NULL,
    entidade_id VARCHAR(128) NOT NULL,
    valores_antigos JSONB,
    valores_novos JSONB,
    campos_alterados TEXT[],
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. ÍNDICES DE ALTA PERFORMANCE PARA ISOLAMENTO MULTI-TENANT (igreja_id)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_igreja_id ON usuarios(igreja_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_uid ON usuarios(auth_uid);
CREATE INDEX IF NOT EXISTS idx_departamentos_igreja_id ON departamentos(igreja_id);
CREATE INDEX IF NOT EXISTS idx_membros_depto_igreja_id ON membros_departamento(igreja_id);
CREATE INDEX IF NOT EXISTS idx_cultos_igreja_id ON cultos(igreja_id);
CREATE INDEX IF NOT EXISTS idx_escalas_igreja_id ON escalas(igreja_id);
CREATE INDEX IF NOT EXISTS idx_escalas_igreja_data ON escalas(igreja_id, data);
CREATE INDEX IF NOT EXISTS idx_atendimentos_igreja_id ON atendimentos(igreja_id);
CREATE INDEX IF NOT EXISTS idx_eventos_igreja_id ON eventos(igreja_id);
CREATE INDEX IF NOT EXISTS idx_visitantes_igreja_id ON visitantes(igreja_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidades_igreja_id ON disponibilidades(igreja_id);
CREATE INDEX IF NOT EXISTS idx_musicas_igreja_id ON musicas(igreja_id);
CREATE INDEX IF NOT EXISTS idx_playlists_igreja_id ON playlists(igreja_id);
CREATE INDEX IF NOT EXISTS idx_bandas_igreja_id ON bandas(igreja_id);
CREATE INDEX IF NOT EXISTS idx_grupos_danca_igreja_id ON grupos_danca(igreja_id);
CREATE INDEX IF NOT EXISTS idx_coreografias_igreja_id ON coreografias(igreja_id);
CREATE INDEX IF NOT EXISTS idx_ensaios_danca_igreja_id ON ensaios_danca(igreja_id);
CREATE INDEX IF NOT EXISTS idx_registros_financeiros_igreja_id ON registros_financeiros(igreja_id);
CREATE INDEX IF NOT EXISTS idx_comunicados_igreja_id ON comunicados(igreja_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_igreja_id ON logs_auditoria(igreja_id);

-- ==============================================================================
-- 4. FUNÇÃO AUXILIAR DE RESOLUÇÃO DE TENANT (STRICT ISOLATION & NO ORPHANS)
-- ==============================================================================

-- Retorna o ID da igreja ativa associada à sessão/token.
-- Se o usuário for anônimo, deslogado ou NÃO possuir igreja vinculada (órfão),
-- a função retorna NULL imediatamente.
CREATE OR REPLACE FUNCTION current_user_church_id() 
RETURNS UUID AS $$
DECLARE
    claim_church TEXT;
    session_church TEXT;
    current_uid TEXT;
    resolved_church UUID;
BEGIN
    -- 1. Tentativa via variável de sessão local (definida pelo middleware / pooler na conexão)
    session_church := NULLIF(current_setting('app.current_church_id', true), '');
    IF session_church IS NOT NULL THEN
        RETURN session_church::UUID;
    END IF;

    -- 2. Tentativa via token JWT / claims (PostgREST / Supabase / OAuth Bearer)
    BEGIN
        claim_church := NULLIF(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'churchId', '');
        IF claim_church IS NOT NULL THEN
            RETURN claim_church::UUID;
        END IF;

        claim_church := NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'igreja_id', '');
        IF claim_church IS NOT NULL THEN
            RETURN claim_church::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- claims inválidas ou inexistentes, prosseguir para fallback
    END;

    -- 3. Resolução pelo UID do usuário autenticado no banco de dados
    BEGIN
        current_uid := NULLIF(current_setting('request.jwt.claim.sub', true), '');
        IF current_uid IS NULL THEN
            current_uid := NULLIF(current_setting('app.current_user_id', true), '');
        END IF;

        IF current_uid IS NOT NULL THEN
            SELECT u.igreja_id INTO resolved_church
            FROM usuarios u
            WHERE (u.auth_uid = current_uid OR u.id::text = current_uid)
              AND u.status = 'active'
            LIMIT 1;

            IF resolved_church IS NOT NULL THEN
                RETURN resolved_church;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- ignorar erro de busca
    END;

    -- REGRA DE NEGÓCIO: Se o usuário não tem vínculo ativo, retorna NULL.
    -- Nenhum dado de igreja nenhuma poderá ser acessado!
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Função auxiliar para verificar se o usuário atual é Super Administrador global
CREATE OR REPLACE FUNCTION is_current_user_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN := false;
    current_uid TEXT;
BEGIN
    BEGIN
        IF current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'super_admin' = 'true' THEN
            RETURN true;
        END IF;
    EXCEPTION WHEN OTHERS THEN END;

    BEGIN
        current_uid := NULLIF(current_setting('request.jwt.claim.sub', true), '');
        IF current_uid IS NULL THEN
            current_uid := NULLIF(current_setting('app.current_user_id', true), '');
        END IF;

        IF current_uid IS NOT NULL THEN
            SELECT u.is_super_admin INTO is_admin
            FROM usuarios u
            WHERE (u.auth_uid = current_uid OR u.id::text = current_uid)
            LIMIT 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN END;

    RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 5. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) COM FORCE RLS
-- ==============================================================================

ALTER TABLE igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE igrejas FORCE ROW LEVEL SECURITY;

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios FORCE ROW LEVEL SECURITY;

ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos FORCE ROW LEVEL SECURITY;

ALTER TABLE membros_departamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros_departamento FORCE ROW LEVEL SECURITY;

ALTER TABLE cultos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultos FORCE ROW LEVEL SECURITY;

ALTER TABLE escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas FORCE ROW LEVEL SECURITY;

ALTER TABLE atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos FORCE ROW LEVEL SECURITY;

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos FORCE ROW LEVEL SECURITY;

ALTER TABLE visitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitantes FORCE ROW LEVEL SECURITY;

ALTER TABLE disponibilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilidades FORCE ROW LEVEL SECURITY;

ALTER TABLE musicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE musicas FORCE ROW LEVEL SECURITY;

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists FORCE ROW LEVEL SECURITY;

ALTER TABLE bandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandas FORCE ROW LEVEL SECURITY;

ALTER TABLE grupos_danca ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_danca FORCE ROW LEVEL SECURITY;

ALTER TABLE coreografias ENABLE ROW LEVEL SECURITY;
ALTER TABLE coreografias FORCE ROW LEVEL SECURITY;

ALTER TABLE ensaios_danca ENABLE ROW LEVEL SECURITY;
ALTER TABLE ensaios_danca FORCE ROW LEVEL SECURITY;

ALTER TABLE registros_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_financeiros FORCE ROW LEVEL SECURITY;

ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados FORCE ROW LEVEL SECURITY;

ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria FORCE ROW LEVEL SECURITY;

-- ==============================================================================
-- 6. POLÍTICAS DE ROW LEVEL SECURITY (SELECT, INSERT, UPDATE, DELETE)
-- ==============================================================================

-- 6.1 Políticas para Tabela: igrejas
-- Usuários só podem visualizar os dados da sua própria igreja; Super Admin pode listar todas.
DROP POLICY IF EXISTS rls_igrejas_select ON igrejas;
CREATE POLICY rls_igrejas_select ON igrejas
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_igrejas_insert ON igrejas;
CREATE POLICY rls_igrejas_insert ON igrejas
    FOR INSERT
    WITH CHECK (is_current_user_super_admin());

DROP POLICY IF EXISTS rls_igrejas_update ON igrejas;
CREATE POLICY rls_igrejas_update ON igrejas
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_igrejas_delete ON igrejas;
CREATE POLICY rls_igrejas_delete ON igrejas
    FOR DELETE
    USING (is_current_user_super_admin());

-- ------------------------------------------------------------------------------
-- MACRO DE POLÍTICA PADRÃO PARA TABELAS TENANT-SCOPED (igreja_id)
-- ------------------------------------------------------------------------------

-- Tabela: escalas
DROP POLICY IF EXISTS rls_escalas_select ON escalas;
CREATE POLICY rls_escalas_select ON escalas
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_escalas_insert ON escalas;
CREATE POLICY rls_escalas_insert ON escalas
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_escalas_update ON escalas;
CREATE POLICY rls_escalas_update ON escalas
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_escalas_delete ON escalas;
CREATE POLICY rls_escalas_delete ON escalas
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: cultos
DROP POLICY IF EXISTS rls_cultos_select ON cultos;
CREATE POLICY rls_cultos_select ON cultos
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_cultos_insert ON cultos;
CREATE POLICY rls_cultos_insert ON cultos
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_cultos_update ON cultos;
CREATE POLICY rls_cultos_update ON cultos
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_cultos_delete ON cultos;
CREATE POLICY rls_cultos_delete ON cultos
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: atendimentos
DROP POLICY IF EXISTS rls_atendimentos_select ON atendimentos;
CREATE POLICY rls_atendimentos_select ON atendimentos
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_atendimentos_insert ON atendimentos;
CREATE POLICY rls_atendimentos_insert ON atendimentos
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_atendimentos_update ON atendimentos;
CREATE POLICY rls_atendimentos_update ON atendimentos
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_atendimentos_delete ON atendimentos;
CREATE POLICY rls_atendimentos_delete ON atendimentos
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: eventos
DROP POLICY IF EXISTS rls_eventos_select ON eventos;
CREATE POLICY rls_eventos_select ON eventos
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_eventos_insert ON eventos;
CREATE POLICY rls_eventos_insert ON eventos
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_eventos_update ON eventos;
CREATE POLICY rls_eventos_update ON eventos
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_eventos_delete ON eventos;
CREATE POLICY rls_eventos_delete ON eventos
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: visitantes
DROP POLICY IF EXISTS rls_visitantes_select ON visitantes;
CREATE POLICY rls_visitantes_select ON visitantes
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_visitantes_insert ON visitantes;
CREATE POLICY rls_visitantes_insert ON visitantes
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_visitantes_update ON visitantes;
CREATE POLICY rls_visitantes_update ON visitantes
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_visitantes_delete ON visitantes;
CREATE POLICY rls_visitantes_delete ON visitantes
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: disponibilidades
DROP POLICY IF EXISTS rls_disponibilidades_select ON disponibilidades;
CREATE POLICY rls_disponibilidades_select ON disponibilidades
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_disponibilidades_insert ON disponibilidades;
CREATE POLICY rls_disponibilidades_insert ON disponibilidades
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_disponibilidades_update ON disponibilidades;
CREATE POLICY rls_disponibilidades_update ON disponibilidades
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_disponibilidades_delete ON disponibilidades;
CREATE POLICY rls_disponibilidades_delete ON disponibilidades
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: musicas
DROP POLICY IF EXISTS rls_musicas_select ON musicas;
CREATE POLICY rls_musicas_select ON musicas
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_musicas_insert ON musicas;
CREATE POLICY rls_musicas_insert ON musicas
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_musicas_update ON musicas;
CREATE POLICY rls_musicas_update ON musicas
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_musicas_delete ON musicas;
CREATE POLICY rls_musicas_delete ON musicas
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: playlists
DROP POLICY IF EXISTS rls_playlists_select ON playlists;
CREATE POLICY rls_playlists_select ON playlists
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_playlists_insert ON playlists;
CREATE POLICY rls_playlists_insert ON playlists
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_playlists_update ON playlists;
CREATE POLICY rls_playlists_update ON playlists
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_playlists_delete ON playlists;
CREATE POLICY rls_playlists_delete ON playlists
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: bandas
DROP POLICY IF EXISTS rls_bandas_select ON bandas;
CREATE POLICY rls_bandas_select ON bandas
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_bandas_insert ON bandas;
CREATE POLICY rls_bandas_insert ON bandas
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_bandas_update ON bandas;
CREATE POLICY rls_bandas_update ON bandas
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_bandas_delete ON bandas;
CREATE POLICY rls_bandas_delete ON bandas
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: grupos_danca, coreografias, ensaios_danca
DROP POLICY IF EXISTS rls_grupos_danca_all ON grupos_danca;
CREATE POLICY rls_grupos_danca_all ON grupos_danca
    FOR ALL
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_coreografias_all ON coreografias;
CREATE POLICY rls_coreografias_all ON coreografias
    FOR ALL
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_ensaios_danca_all ON ensaios_danca;
CREATE POLICY rls_ensaios_danca_all ON ensaios_danca
    FOR ALL
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: registros_financeiros (Tesouraria - Isolamento Total)
DROP POLICY IF EXISTS rls_registros_financeiros_select ON registros_financeiros;
CREATE POLICY rls_registros_financeiros_select ON registros_financeiros
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_registros_financeiros_insert ON registros_financeiros;
CREATE POLICY rls_registros_financeiros_insert ON registros_financeiros
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_registros_financeiros_update ON registros_financeiros;
CREATE POLICY rls_registros_financeiros_update ON registros_financeiros
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_registros_financeiros_delete ON registros_financeiros;
CREATE POLICY rls_registros_financeiros_delete ON registros_financeiros
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: comunicados
DROP POLICY IF EXISTS rls_comunicados_all ON comunicados;
CREATE POLICY rls_comunicados_all ON comunicados
    FOR ALL
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: logs_auditoria (Somente leitura para a congregação; inserção automática)
DROP POLICY IF EXISTS rls_logs_auditoria_select ON logs_auditoria;
CREATE POLICY rls_logs_auditoria_select ON logs_auditoria
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_logs_auditoria_insert ON logs_auditoria;
CREATE POLICY rls_logs_auditoria_insert ON logs_auditoria
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- Tabela: usuarios
-- Usuários só podem ver membros da mesma congregação (ou a si mesmos); Super Admin vê todos.
DROP POLICY IF EXISTS rls_usuarios_select ON usuarios;
CREATE POLICY rls_usuarios_select ON usuarios
    FOR SELECT
    USING (
        is_current_user_super_admin() OR
        (auth_uid IS NOT NULL AND auth_uid = current_setting('request.jwt.claim.sub', true)) OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_usuarios_insert ON usuarios;
CREATE POLICY rls_usuarios_insert ON usuarios
    FOR INSERT
    WITH CHECK (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_usuarios_update ON usuarios;
CREATE POLICY rls_usuarios_update ON usuarios
    FOR UPDATE
    USING (
        is_current_user_super_admin() OR
        (auth_uid IS NOT NULL AND auth_uid = current_setting('request.jwt.claim.sub', true)) OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    )
    WITH CHECK (
        is_current_user_super_admin() OR
        -- Imutabilidade do Tenant: O usuário NÃO pode transferir a si mesmo ou a outro para igreja diferente
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

DROP POLICY IF EXISTS rls_usuarios_delete ON usuarios;
CREATE POLICY rls_usuarios_delete ON usuarios
    FOR DELETE
    USING (
        is_current_user_super_admin() OR
        (current_user_church_id() IS NOT NULL AND igreja_id = current_user_church_id())
    );

-- ==============================================================================
-- 7. TRIGGER DE INTEGRIDADE CONTRA VAZAMENTO / ADULTERAÇÃO DE TENANT (igreja_id)
-- ==============================================================================

CREATE OR REPLACE FUNCTION enforce_tenant_integrity()
RETURNS TRIGGER AS $$
DECLARE
    active_tenant UUID;
BEGIN
    active_tenant := current_user_church_id();

    -- Se for super admin, permitir override
    IF is_current_user_super_admin() THEN
        RETURN NEW;
    END IF;

    -- Bloqueio Estrito: Usuário órfão tentando inserir/modificar dados
    IF active_tenant IS NULL THEN
        RAISE EXCEPTION 'VIOLAÇÃO MULTI-TENANT: Usuário sem congregação ativa vinculada não possui permissão para gravar registros.'
            USING ERRCODE = '42501';
    END IF;

    -- Se inserção sem igreja_id, injetar automaticamente o tenant do usuário
    IF TG_OP = 'INSERT' THEN
        IF NEW.igreja_id IS NULL THEN
            NEW.igreja_id := active_tenant;
        ELSIF NEW.igreja_id <> active_tenant THEN
            RAISE EXCEPTION 'VIOLAÇÃO MULTI-TENANT: Tentativa de gravação cross-tenant bloqueada. igreja_id recebido (%) difere do tenant da sessão (%).', NEW.igreja_id, active_tenant
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Se atualização, impedir mudança arbitrária de igreja_id (Cross-Tenant Hijack)
    IF TG_OP = 'UPDATE' THEN
        IF NEW.igreja_id <> OLD.igreja_id THEN
            RAISE EXCEPTION 'VIOLAÇÃO MULTI-TENANT: Proibida a transferência de registros entre congregações distintas.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar Trigger de Integridade nas tabelas críticas
DROP TRIGGER IF EXISTS trg_escalas_tenant_guard ON escalas;
CREATE TRIGGER trg_escalas_tenant_guard
    BEFORE INSERT OR UPDATE ON escalas
    FOR EACH ROW EXECUTE FUNCTION enforce_tenant_integrity();

DROP TRIGGER IF EXISTS trg_eventos_tenant_guard ON eventos;
CREATE TRIGGER trg_eventos_tenant_guard
    BEFORE INSERT OR UPDATE ON eventos
    FOR EACH ROW EXECUTE FUNCTION enforce_tenant_integrity();

DROP TRIGGER IF EXISTS trg_atendimentos_tenant_guard ON atendimentos;
CREATE TRIGGER trg_atendimentos_tenant_guard
    BEFORE INSERT OR UPDATE ON atendimentos
    FOR EACH ROW EXECUTE FUNCTION enforce_tenant_integrity();

DROP TRIGGER IF EXISTS trg_visitantes_tenant_guard ON visitantes;
CREATE TRIGGER trg_visitantes_tenant_guard
    BEFORE INSERT OR UPDATE ON visitantes
    FOR EACH ROW EXECUTE FUNCTION enforce_tenant_integrity();

DROP TRIGGER IF EXISTS trg_musicas_tenant_guard ON musicas;
CREATE TRIGGER trg_musicas_tenant_guard
    BEFORE INSERT OR UPDATE ON musicas
    FOR EACH ROW EXECUTE FUNCTION enforce_tenant_integrity();

DROP TRIGGER IF EXISTS trg_registros_financeiros_tenant_guard ON registros_financeiros;
CREATE TRIGGER trg_registros_financeiros_tenant_guard
    BEFORE INSERT OR UPDATE ON registros_financeiros
    FOR EACH ROW EXECUTE FUNCTION enforce_tenant_integrity();
