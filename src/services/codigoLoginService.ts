import crypto from 'crypto';
import { PoolClient } from 'pg';
import { query, transaction } from '../database/connection';

const DURACAO_HORAS = 12;
const TAMANHO_CODIGO = 6;
const MAX_TENTATIVAS = 5;

// Sem 0/O, 1/I/L para evitar confusao na hora de digitar
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface CodigoLogin {
    codigo: string;
    ativo: boolean;
    data_criacao: Date;
    data_expiracao: Date;
}

const gerarCodigo = (): string => {
    let codigo = '';
    for (let i = 0; i < TAMANHO_CODIGO; i++) {
        codigo += ALFABETO[crypto.randomInt(0, ALFABETO.length)];
    }
    return codigo;
};

// Busca o codigo do usuario somente se ainda estiver valido (ativo e dentro das 12h)
export async function buscarCodigoLoginAtivo(usuarioId: number): Promise<CodigoLogin | null> {
    const result = await query<CodigoLogin>(
        `SELECT codigo, ativo, data_criacao, data_expiracao
         FROM codigos_login
         WHERE usuario_id = $1
           AND ativo = TRUE
           AND data_expiracao > NOW()`,
        [usuarioId]
    );
    return result.rows[0] ?? null;
}

// Gera o codigo do usuario. Retorna { criado: false } se ja existe um valido.
// Regras:
//  - 1 usuario = 1 linha (UNIQUE usuario_id), reaproveitada quando o codigo vence ou e desativado
//  - 1 codigo = 1 usuario (UNIQUE codigo); em colisao gera outro e tenta de novo
export async function gerarCodigoLogin(
    usuarioId: number
): Promise<{ criado: boolean; dados: CodigoLogin }> {
    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
        try {
            // So sobrescreve se o codigo atual estiver desativado ou vencido (WHERE do DO UPDATE).
            // Se ainda esta valido, nenhuma linha e retornada e cai no SELECT abaixo.
            const result = await query<CodigoLogin>(
                `INSERT INTO codigos_login (usuario_id, codigo, ativo, data_criacao, data_expiracao)
                 VALUES ($1, $2, TRUE, NOW(), NOW() + INTERVAL '${DURACAO_HORAS} hours')
                 ON CONFLICT (usuario_id) DO UPDATE
                    SET codigo         = EXCLUDED.codigo,
                        ativo          = TRUE,
                        data_criacao   = NOW(),
                        data_expiracao = NOW() + INTERVAL '${DURACAO_HORAS} hours'
                    WHERE codigos_login.ativo = FALSE
                       OR codigos_login.data_expiracao <= NOW()
                 RETURNING codigo, ativo, data_criacao, data_expiracao`,
                [usuarioId, gerarCodigo()]
            );

            if (result.rows.length > 0) {
                return { criado: true, dados: result.rows[0] };
            }

            const existente = await buscarCodigoLoginAtivo(usuarioId);
            if (existente) {
                return { criado: false, dados: existente };
            }
            // Venceu ou foi desativado entre o INSERT e o SELECT: tenta de novo
        } catch (error: any) {
            // 23505 = unique_violation: outro usuario ja tem esse codigo -> sorteia outro
            if (error?.code === '23505') continue;
            throw error;
        }
    }

    throw new Error('Nao foi possivel gerar um codigo unico');
}

// Aceita somente 6 letras/numeros (o formato do codigo gerado pelo app). Retorna o codigo em maiusculas ou null
export const normalizarCodigoExterno = (valor: unknown): string | null => {
    if (typeof valor !== 'string') return null;
    const codigo = valor.trim().toUpperCase();
    return /^[A-Z0-9]{6}$/.test(codigo) ? codigo : null;
};

// Guarda o codigo que o APP gerou. Cada chamada substitui o codigo anterior do usuario
// (1 usuario = 1 codigo). Retorna 'EM_USO' se o codigo pertence a OUTRO usuario ainda valido.
export async function salvarCodigoLogin(
    usuarioId: number,
    codigo: string
): Promise<CodigoLogin | 'EM_USO'> {
    // Libera o codigo caso esteja preso a outro usuario, mas ja desativado ou vencido
    await query(
        `DELETE FROM codigos_login
         WHERE codigo = $1 AND usuario_id <> $2
           AND (ativo = FALSE OR data_expiracao <= NOW())`,
        [codigo, usuarioId]
    );

    try {
        const result = await query<CodigoLogin>(
            `INSERT INTO codigos_login (usuario_id, codigo, ativo, data_criacao, data_expiracao)
             VALUES ($1, $2, TRUE, NOW(), NOW() + INTERVAL '${DURACAO_HORAS} hours')
             ON CONFLICT (usuario_id) DO UPDATE
                SET codigo         = EXCLUDED.codigo,
                    ativo          = TRUE,
                    data_criacao   = NOW(),
                    data_expiracao = NOW() + INTERVAL '${DURACAO_HORAS} hours'
             RETURNING codigo, ativo, data_criacao, data_expiracao`,
            [usuarioId, codigo]
        );
        return result.rows[0];
    } catch (error: any) {
        // 23505 = unique_violation: outro usuario ainda valido ja usa esse codigo
        if (error?.code === '23505') return 'EM_USO';
        throw error;
    }
}

// Desativa o codigo do usuario (chamado no logout e pela rota de desativar).
// Aceita um client para rodar dentro de uma transacao existente.
export async function disableOfCodLogin(
    usuarioId: number,
    client?: PoolClient
): Promise<boolean> {
    const sql = `UPDATE codigos_login
                 SET ativo = FALSE
                 WHERE usuario_id = $1 AND ativo = TRUE
                 RETURNING id`;

    const result = client
        ? await client.query(sql, [usuarioId])
        : await query(sql, [usuarioId]);

    return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Codigo gerado pelo APP, sem login: 1 codigo por aparelho (device_id) na tabela codigos_login
// (usuario_id fica vazio ate o site vincular a conta)
// ---------------------------------------------------------------------------

// Identificador do aparelho (o app usa um UUID guardado no celular)
export const normalizarDeviceId = (valor: unknown): string | null => {
    if (typeof valor !== 'string') return null;
    const id = valor.trim();
    return /^[A-Za-z0-9._-]{8,80}$/.test(id) ? id : null;
};

// Guarda o codigo do aparelho. Cada chamada substitui o codigo anterior do mesmo aparelho.
// Retorna 'EM_USO' se o codigo ja pertence a OUTRO aparelho e ainda nao venceu.
export async function salvarCodigoApp(
    deviceId: string,
    codigo: string
): Promise<{ codigo: string; criado_em: Date; expira_em: Date } | 'EM_USO'> {
    // Limpeza: apaga codigos de app vencidos (sem usuario) e libera este codigo se ele
    // estiver preso a outro registro ja desativado ou vencido
    await query(
        `DELETE FROM codigos_login
         WHERE (usuario_id IS NULL AND data_expiracao <= NOW())
            OR (codigo = $1 AND device_id IS DISTINCT FROM $2
                AND (ativo = FALSE OR data_expiracao <= NOW()))`,
        [codigo, deviceId]
    );

    try {
        const result = await query<{ codigo: string; criado_em: Date; expira_em: Date }>(
            `INSERT INTO codigos_login (device_id, codigo, ativo, data_criacao, data_expiracao)
             VALUES ($1, $2, TRUE, NOW(), NOW() + INTERVAL '${DURACAO_HORAS} hours')
             ON CONFLICT (device_id) DO UPDATE
                SET codigo         = EXCLUDED.codigo,
                    ativo          = TRUE,
                    data_criacao   = NOW(),
                    data_expiracao = NOW() + INTERVAL '${DURACAO_HORAS} hours',
                    usuario_id     = NULL,
                    inserido_em    = NULL,
                    vinculado_em   = NULL
             RETURNING codigo, data_criacao AS criado_em, data_expiracao AS expira_em`,
            [deviceId, codigo]
        );
        return result.rows[0];
    } catch (error: any) {
        // 23505 = unique_violation: outro aparelho ja usa esse codigo
        if (error?.code === '23505') return 'EM_USO';
        throw error;
    }
}

// ---------------------------------------------------------------------------
// Site: inserir o codigo (abre a janela de 5 min para logar) e vincular a conta
// ---------------------------------------------------------------------------
const JANELA_LOGIN_MIN = 5;

export type ResultadoUsar =
    | { estado: 'OK'; login_ate: Date }
    | { estado: 'INVALIDO' }
    | { estado: 'VINCULADO' };

// O site inseriu o codigo: confere no banco e abre os 5 minutos para a pessoa logar.
// Inserir de novo depois de passados os 5 minutos (sem ter logado) reinicia a janela.
export async function usarCodigoSite(codigo: string): Promise<ResultadoUsar> {
    const upd = await query<{ inserido_em: Date }>(
        `UPDATE codigos_login
         SET inserido_em = CASE
                WHEN inserido_em IS NULL OR inserido_em < NOW() - INTERVAL '${JANELA_LOGIN_MIN} minutes'
                THEN NOW() ELSE inserido_em END
         WHERE codigo = $1 AND usuario_id IS NULL AND ativo = TRUE AND data_expiracao > NOW()
         RETURNING inserido_em`,
        [codigo]
    );

    if (upd.rows.length > 0) {
        const inicio = new Date(upd.rows[0].inserido_em).getTime();
        return { estado: 'OK', login_ate: new Date(inicio + JANELA_LOGIN_MIN * 60 * 1000) };
    }

    // Nao abriu a janela: ou o codigo nao vale mais, ou ja pertence a uma conta
    const vinculado = await query(
        `SELECT 1 FROM codigos_login
         WHERE codigo = $1 AND usuario_id IS NOT NULL AND ativo = TRUE AND data_expiracao > NOW()`,
        [codigo]
    );
    return vinculado.rows.length > 0 ? { estado: 'VINCULADO' } : { estado: 'INVALIDO' };
}

export type ResultadoVincular = 'OK' | 'NAO_ENCONTRADO' | 'TEMPO_ESGOTADO' | 'EM_USO';

// A pessoa logou (token): liga a conta ao codigo, dentro dos 5 minutos.
// 1 conta = 1 codigo: o codigo antigo da conta e removido. Depois de vinculado, so essa conta usa o codigo.
export async function vincularCodigoUsuario(
    usuarioId: number,
    codigo: string
): Promise<ResultadoVincular> {
    return transaction(async (client) => {
        const sel = await client.query(
            `SELECT id, usuario_id,
                    (inserido_em IS NOT NULL AND inserido_em > NOW() - INTERVAL '${JANELA_LOGIN_MIN} minutes') AS na_janela
             FROM codigos_login
             WHERE codigo = $1 AND ativo = TRUE AND data_expiracao > NOW()
             FOR UPDATE`,
            [codigo]
        );

        const linha = sel.rows[0];
        if (!linha) return 'NAO_ENCONTRADO' as ResultadoVincular;
        if (linha.usuario_id !== null) {
            return (linha.usuario_id === usuarioId ? 'OK' : 'EM_USO') as ResultadoVincular;
        }
        if (!linha.na_janela) return 'TEMPO_ESGOTADO' as ResultadoVincular;

        await client.query(`DELETE FROM codigos_login WHERE usuario_id = $1 AND id <> $2`, [usuarioId, linha.id]);
        await client.query(
            `UPDATE codigos_login SET usuario_id = $1, vinculado_em = NOW() WHERE id = $2`,
            [usuarioId, linha.id]
        );
        return 'OK' as ResultadoVincular;
    });
}
