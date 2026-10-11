-- ============================================================
-- CODIGOS GERADOS PELO APP (sem login)
-- Rode uma vez no SQL Editor do Supabase.
--
-- O app gera o codigo ANTES de existir usuario/token. Por isso o codigo e guardado
-- por aparelho (device_id, o mesmo id que o app ja usa na ponte):
--   UNIQUE (device_id) -> 1 codigo por app; gerar outro substitui o anterior
--   UNIQUE (codigo)    -> 1 codigo nunca pertence a dois aparelhos
-- Codigos vencidos (expira_em) sao apagados a cada novo salvamento.
-- ============================================================
CREATE TABLE IF NOT EXISTS codigos_app (
    id        SERIAL PRIMARY KEY,
    device_id VARCHAR(80)  NOT NULL UNIQUE,
    codigo    VARCHAR(6)   NOT NULL UNIQUE,
    criado_em TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expira_em TIMESTAMPTZ  NOT NULL
);

-- Seguranca: so o backend (conexao direta) acessa; bloqueia a Data API (chave anon).
ALTER TABLE codigos_app ENABLE ROW LEVEL SECURITY;
