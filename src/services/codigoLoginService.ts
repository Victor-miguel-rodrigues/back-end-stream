import crypto from 'crypto';
import { PoolClient } from 'pg';
import { query } from '../database/connection';

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
