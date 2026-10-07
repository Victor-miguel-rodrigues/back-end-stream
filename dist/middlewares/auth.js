"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAcao = exports.verificarPerfil = exports.validarToken = void 0;
const connection_1 = require("../database/connection");
// Middleware: Validar token de usuario
const validarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ mensagem: 'Token nao fornecido' });
            return;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({ mensagem: 'Formato de token invalido' });
            return;
        }
        const token = parts[1];
        const result = await (0, connection_1.query)(`SELECT
                s.*,
                u.nome_usuario,
                u.email,
                u.ativo AS usuario_ativo,
                p.nome AS perfil_nome
             FROM sessoes s
             JOIN usuarios u ON s.usuario_id = u.id
             JOIN perfis_acesso p ON s.perfil_id = p.id
             WHERE s.token = $1
               AND s.ativo = TRUE
               AND s.data_expiracao > NOW()
               AND u.ativo = TRUE`, [token]);
        if (result.rows.length === 0) {
            res.status(401).json({ mensagem: 'Token inválido ou expirado' });
            return;
        }
        const sessao = result.rows[0];
        const reqWithUser = req;
        reqWithUser.usuario = {
            id: sessao.usuario_id,
            nome: sessao.nome_usuario,
            email: sessao.email,
            perfil: sessao.perfil_nome,
            perfil_id: sessao.perfil_id,
            sessao_id: sessao.id
        };
        reqWithUser.token = token;
        next();
    }
    catch (error) {
        console.error('[validarToken] Erro:', error);
        res.status(500).json({ mensagem: 'Erro ao validar token' });
    }
};
exports.validarToken = validarToken;
// Middleware: Verificar perfil permitido
const verificarPerfil = (perfisPermitidos) => {
    return (req, res, next) => {
        const reqWithUser = req;
        if (!reqWithUser.usuario) {
            res.status(401).json({ mensagem: 'Usuario nao autenticado' });
            return;
        }
        if (!perfisPermitidos.includes(reqWithUser.usuario.perfil)) {
            res.status(403).json({
                mensagem: `Perfil sem permissao para esta acao`
            });
            return;
        }
        next();
    };
};
exports.verificarPerfil = verificarPerfil;
// Middleware: Registrar log de acao apos resposta bem-sucedida
const logAcao = (acao) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (data) {
            const reqWithUser = req;
            if (reqWithUser.usuario) {
                (0, connection_1.query)(`INSERT INTO logs_sistema (usuario_id, acao, descricao, ip)
                     VALUES ($1, $2, $3, $4)`, [
                    reqWithUser.usuario.id,
                    acao,
                    `Acao executada: ${acao}`,
                    req.ip ?? '0.0.0.0'
                ]).catch(err => console.error('[logAcao] Erro:', err));
            }
            return originalJson(data);
        };
        next();
    };
};
exports.logAcao = logAcao;
exports.default = { validarToken: exports.validarToken, verificarPerfil: exports.verificarPerfil, logAcao: exports.logAcao };
//# sourceMappingURL=auth.js.map