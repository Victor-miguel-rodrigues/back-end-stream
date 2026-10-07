-- ============================================
-- CODIGOS DE LOGIN
-- Rode uma vez no SQL Editor do Supabase.
--
-- UNIQUE (usuario_id) -> 1 usuario tem no maximo 1 codigo
-- UNIQUE (codigo)     -> 1 codigo pertence a 1 unico usuario
-- ativo + data_expiracao definem se o codigo ainda vale (12 horas)
--
-- Se voce JA rodou uma versao anterior e a tabela esta vazia,
-- rode antes:  DROP TABLE IF EXISTS codigos_login;
-- ============================================
CREATE TABLE IF NOT EXISTS codigos_login (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER     NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo         VARCHAR(6)  NOT NULL UNIQUE,
    ativo          BOOLEAN     NOT NULL DEFAULT TRUE,
    data_criacao   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_expiracao TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_codigos_login_ativo_expiracao
    ON codigos_login (ativo, data_expiracao);

-- Seguranca: tabelas no schema public do Supabase ficam expostas pela Data API
-- (chave anon). Ligando o RLS sem policies, so o backend (conexao direta via
-- DATABASE_URL, usuario postgres) consegue ler os codigos.
ALTER TABLE codigos_login ENABLE ROW LEVEL SECURITY;

-- ============================================
-- OPCIONAL: desativar o codigo junto com a sessao no pg_cron
-- O cron de inatividade desativa a SESSAO, mas nao o codigo, que continuaria
-- valido ate vencer as 12h. Para desativar junto, adicione ao job:
--
--   UPDATE codigos_login c
--   SET ativo = FALSE
--   WHERE c.ativo = TRUE
--     AND (c.data_expiracao < NOW()
--          OR NOT EXISTS (SELECT 1 FROM sessoes s
--                         WHERE s.usuario_id = c.usuario_id AND s.ativo = TRUE));
-- ============================================
