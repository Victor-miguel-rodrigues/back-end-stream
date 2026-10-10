"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodigoLoginController = void 0;
const connection_1 = require("../database/connection");
const codigoLoginService_1 = require("../services/codigoLoginService");
// Registra no log sem nunca derrubar a resposta
const registrarLog = (usuarioId, perfilId, acao, descricao, ip) => {
    (0, connection_1.query)(`INSERT INTO logs_sistema (usuario_id, perfil_id, acao, descricao, ip)
         VALUES ($1, $2, $3, $4, $5)`, [usuarioId, perfilId, acao, descricao, ip ?? '0.0.0.0']).catch(err => console.error('[codigoLogin] Erro ao registrar log:', err));
};
class CodigoLoginController {
    // POST /codigo-login  -> gera (ou devolve o que ainda vale)
    async gerar(req, res) {
        try {
            const usuario = req.usuario;
            if (!usuario) {
                return res.status(401).json({ status: false, message: 'Usuario nao autenticado' });
            }
            // O app envia o codigo que ele mesmo gerou: guarda no banco (substitui o anterior)
            if (req.body?.codigo !== undefined) {
                const codigoEnviado = (0, codigoLoginService_1.normalizarCodigoExterno)(req.body.codigo);
                if (!codigoEnviado) {
                    return res.status(400).json({ status: false, message: 'Codigo invalido. Use 6 letras ou numeros' });
                }
                const salvo = await (0, codigoLoginService_1.salvarCodigoLogin)(usuario.id, codigoEnviado);
                if (salvo === 'EM_USO') {
                    return res.status(409).json({ status: false, message: 'Codigo ja esta em uso' });
                }
                registrarLog(usuario.id, usuario.perfil_id, 'codigo_login_salvo', 'Codigo de login salvo', req.ip);
                return res.status(201).json({
                    status: true,
                    message: 'Codigo salvo com sucesso',
                    dados: {
                        codigo: salvo.codigo,
                        ativo: salvo.ativo,
                        criado_em: salvo.data_criacao,
                        expira_em: salvo.data_expiracao
                    }
                });
            }
            const { criado, dados } = await (0, codigoLoginService_1.gerarCodigoLogin)(usuario.id);
            if (criado) {
                registrarLog(usuario.id, usuario.perfil_id, 'codigo_login_gerado', 'Codigo de login gerado', req.ip);
            }
            return res.status(criado ? 201 : 200).json({
                status: true,
                message: criado ? 'Codigo gerado com sucesso' : 'Voce ja possui um codigo ativo',
                dados: {
                    codigo: dados.codigo,
                    ativo: dados.ativo,
                    criado_em: dados.data_criacao,
                    expira_em: dados.data_expiracao
                }
            });
        }
        catch (error) {
            console.error('[codigoLogin.gerar] Erro:', error);
            return res.status(500).json({ status: false, message: 'Erro ao gerar codigo' });
        }
    }
    // GET /codigo-login  -> consulta o codigo ativo do usuario
    async consultar(req, res) {
        try {
            const usuario = req.usuario;
            if (!usuario) {
                return res.status(401).json({ status: false, message: 'Usuario nao autenticado' });
            }
            const codigo = await (0, codigoLoginService_1.buscarCodigoLoginAtivo)(usuario.id);
            if (!codigo) {
                return res.status(404).json({
                    status: false,
                    message: 'Nenhum codigo ativo',
                    dados: { ativo: false }
                });
            }
            return res.json({
                status: true,
                dados: {
                    codigo: codigo.codigo,
                    ativo: codigo.ativo,
                    criado_em: codigo.data_criacao,
                    expira_em: codigo.data_expiracao
                }
            });
        }
        catch (error) {
            console.error('[codigoLogin.consultar] Erro:', error);
            return res.status(500).json({ status: false, message: 'Erro ao consultar codigo' });
        }
    }
    // POST /codigo-login/desativar  -> disableOfCodLogin
    async desativar(req, res) {
        try {
            const usuario = req.usuario;
            if (!usuario) {
                return res.status(401).json({ status: false, message: 'Usuario nao autenticado' });
            }
            const desativou = await (0, codigoLoginService_1.disableOfCodLogin)(usuario.id);
            if (desativou) {
                registrarLog(usuario.id, usuario.perfil_id, 'codigo_login_desativado', 'Codigo de login desativado', req.ip);
            }
            return res.json({
                status: true,
                message: desativou ? 'Codigo desativado com sucesso' : 'Nenhum codigo ativo para desativar'
            });
        }
        catch (error) {
            console.error('[codigoLogin.desativar] Erro:', error);
            return res.status(500).json({ status: false, message: 'Erro ao desativar codigo' });
        }
    }
}
exports.CodigoLoginController = CodigoLoginController;
exports.default = new CodigoLoginController();
//# sourceMappingURL=codigoLoginController.js.map