-- ============================================
-- CODIGOS DE LOGIN
-- Rode uma vez no SQL Editor do Supabase.
--
-- UNIQUE (usuario_id) -> 1 usuario tem no maximo 1 codigo
-- UNIQUE (codigo)     -> 1 codigo nunca pertence a dois registros
-- UNIQUE (device_id)  -> 1 codigo por app (aparelho); o app gera o codigo SEM login
-- usuario_id vazio    -> codigo gerado pelo app, ainda esperando o site vincular a conta
-- inserido_em         -> quando o site inseriu o codigo (a pessoa tem 5 minutos para logar)
-- vinculado_em        -> quando a conta foi vinculada (depois disso so essa conta usa o codigo)
-- ativo + data_expiracao definem se o codigo ainda vale (12 horas)
--
-- Serve para banco novo E para a tabela que voce ja criou: so adiciona o que falta
-- (o bloco "app sem login" abaixo e seguro para rodar de novo).
-- ============================================
CREATE TABLE IF NOT EXISTS codigos_login (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER     UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    device_id      VARCHAR(80) UNIQUE,
    inserido_em    TIMESTAMPTZ,
    vinculado_em   TIMESTAMPTZ,
    codigo         VARCHAR(6)  NOT NULL UNIQUE,
    ativo          BOOLEAN     NOT NULL DEFAULT TRUE,
    data_criacao   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_expiracao TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_codigos_login_ativo_expiracao
    ON codigos_login (ativo, data_expiracao);

-- App sem login: para a tabela que JA existe (usuario_id era obrigatorio e nao havia device_id)
ALTER TABLE codigos_login ADD COLUMN IF NOT EXISTS device_id VARCHAR(80);
ALTER TABLE codigos_login ALTER COLUMN usuario_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS codigos_login_device_id_key ON codigos_login (device_id);

-- Site: quando o codigo foi inserido (abre a janela de 5 min para logar) e quando a conta foi vinculada
ALTER TABLE codigos_login ADD COLUMN IF NOT EXISTS inserido_em  TIMESTAMPTZ;
ALTER TABLE codigos_login ADD COLUMN IF NOT EXISTS vinculado_em TIMESTAMPTZ;

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
--     AND c.usuario_id IS NOT NULL          -- nao mexe nos codigos do app (sem usuario)
--     AND (c.data_expiracao < NOW()
--          OR NOT EXISTS (SELECT 1 FROM sessoes s
--                         WHERE s.usuario_id = c.usuario_id AND s.ativo = TRUE));
-- ============================================
