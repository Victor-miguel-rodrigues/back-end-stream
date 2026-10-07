"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarCodigoLoginAtivo = buscarCodigoLoginAtivo;
exports.gerarCodigoLogin = gerarCodigoLogin;
exports.disableOfCodLogin = disableOfCodLogin;
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../database/connection");
const DURACAO_HORAS = 12;
const TAMANHO_CODIGO = 6;
const MAX_TENTATIVAS = 5;
// Sem 0/O, 1/I/L para evitar confusao na hora de digitar
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const gerarCodigo = () => {
    let codigo = '';
    for (let i = 0; i < TAMANHO_CODIGO; i++) {
        codigo += ALFABETO[crypto_1.default.randomInt(0, ALFABETO.length)];
    }
    return codigo;
};
// Busca o codigo do usuario somente se ainda estiver valido (ativo e dentro das 12h)
async function buscarCodigoLoginAtivo(usuarioId) {
    const result = await (0, connection_1.query)(`SELECT codigo, ativo, data_criacao, data_expiracao
         FROM codigos_login
         WHERE usuario_id = $1
           AND ativo = TRUE
           AND data_expiracao > NOW()`, [usuarioId]);
    return result.rows[0] ?? null;
}
// Gera o codigo do usuario. Retorna { criado: false } se ja existe um valido.
// Regras:
//  - 1 usuario = 1 linha (UNIQUE usuario_id), reaproveitada quando o codigo vence ou e desativado
//  - 1 codigo = 1 usuario (UNIQUE codigo); em colisao gera outro e tenta de novo
async function gerarCodigoLogin(usuarioId) {
    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
        try {
            // So sobrescreve se o codigo atual estiver desativado ou vencido (WHERE do DO UPDATE).
            // Se ainda esta valido, nenhuma linha e retornada e cai no SELECT abaixo.
            const result = await (0, connection_1.query)(`INSERT INTO codigos_login (usuario_id, codigo, ativo, data_criacao, data_expiracao)
                 VALUES ($1, $2, TRUE, NOW(), NOW() + INTERVAL '${DURACAO_HORAS} hours')
                 ON CONFLICT (usuario_id) DO UPDATE
                    SET codigo         = EXCLUDED.codigo,
                        ativo          = TRUE,
                        data_criacao   = NOW(),
                        data_expiracao = NOW() + INTERVAL '${DURACAO_HORAS} hours'
                    WHERE codigos_login.ativo = FALSE
                       OR codigos_login.data_expiracao <= NOW()
                 RETURNING codigo, ativo, data_criacao, data_expiracao`, [usuarioId, gerarCodigo()]);
            if (result.rows.length > 0) {
                return { criado: true, dados: result.rows[0] };
            }
            const existente = await buscarCodigoLoginAtivo(usuarioId);
            if (existente) {
                return { criado: false, dados: existente };
            }
            // Venceu ou foi desativado entre o INSERT e o SELECT: tenta de novo
        }
        catch (error) {
            // 23505 = unique_violation: outro usuario ja tem esse codigo -> sorteia outro
            if (error?.code === '23505')
                continue;
            throw error;
        }
    }
    throw new Error('Nao foi possivel gerar um codigo unico');
}
// Desativa o codigo do usuario (chamado no logout e pela rota de desativar).
// Aceita um client para rodar dentro de uma transacao existente.
async function disableOfCodLogin(usuarioId, client) {
    const sql = `UPDATE codigos_login
                 SET ativo = FALSE
                 WHERE usuario_id = $1 AND ativo = TRUE
                 RETURNING id`;
    const result = client
        ? await client.query(sql, [usuarioId])
        : await (0, connection_1.query)(sql, [usuarioId]);
    return (result.rowCount ?? 0) > 0;
}
//# sourceMappingURL=codigoLoginService.js.map