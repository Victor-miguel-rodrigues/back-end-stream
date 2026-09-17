"use strict";
// ============================================
// ADMIN CONTROLLER - CORRIGIDO + NOVOS ENDPOINTS
// ============================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const adminService_1 = __importDefault(require("../services/adminService"));
const connection_1 = require("../database/connection");
// 🔴 FUNÇÃO AUXILIAR PARA PEGAR IP
const getClientIp = (req) => {
    const ip = req.ip || req.connection?.remoteAddress || "0.0.0.0";
    return Array.isArray(ip) ? ip[0] : ip;
};
// 🔴 FUNÇÃO AUXILIAR PARA PEGAR ID
const getParamId = (req) => {
    const id = req.params.id;
    const idStr = Array.isArray(id) ? id[0] : id;
    return parseInt(idStr, 10);
};
class AdminController {
    // ============================================
    // PASSO 1: VERIFICAR CREDENCIAIS
    // ============================================
    async verificarCredenciais(req, res) {
        try {
            const { email, senha } = req.body;
            if (!email || !senha) {
                return res.status(400).json({
                    status: false,
                    message: "Email e senha sao obrigatorios"
                });
            }
            const admin = await adminService_1.default.verificarCredenciais(email, senha);
            return res.json({
                status: true,
                message: "Credenciais verificadas. Digite a palavra secreta.",
                dados: {
                    admin_id: admin.admin_id,
                    nome: admin.nome,
                    email: admin.email
                }
            });
        }
        catch (error) {
            return res.status(error.status || 401).json({
                status: false,
                message: error.message || "Erro ao verificar credenciais"
            });
        }
    }
    // ============================================
    // PASSO 2: VERIFICAR PALAVRA SECRETA
    // ============================================
    async verificarPalavraSecreta(req, res) {
        try {
            const { admin_id, palavra_secreta } = req.body;
            if (!admin_id || !palavra_secreta) {
                return res.status(400).json({
                    status: false,
                    message: "Admin ID e palavra secreta sao obrigatorios"
                });
            }
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";
            const { token, expira_em } = await adminService_1.default.verificarPalavraSecreta(admin_id, palavra_secreta);
            await adminService_1.default.criarSessaoAdmin(admin_id, token, expira_em, ip, userAgent);
            const adminData = await adminService_1.default.validarTokenAdmin(token);
            return res.json({
                status: true,
                message: "Acesso concedido!",
                dados: {
                    admin: {
                        id: adminData?.admin_id,
                        nome: adminData?.nome,
                        email: adminData?.email,
                        permissoes: adminData?.permissoes || []
                    },
                    token: token,
                    expira_em: expira_em.toISOString()
                }
            });
        }
        catch (error) {
            return res.status(error.status || 401).json({
                status: false,
                message: error.message || "Erro ao verificar palavra secreta"
            });
        }
    }
    // ============================================
    // DASHBOARD
    // ============================================
    async dashboard(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'ver_dashboard');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para acessar o dashboard"
                });
            }
            const dados = await adminService_1.default.getDashboardData();
            return res.json({
                status: true,
                dados
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao carregar dashboard"
            });
        }
    }
    // ============================================
    // LISTAR USUARIOS
    // ============================================
    async listarUsuarios(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'ver_usuarios');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para ver usuarios"
                });
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search;
            const pago = req.query.pago === 'true' ? true : req.query.pago === 'false' ? false : undefined;
            const ativo = req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined;
            const resultado = await adminService_1.default.listarUsuarios(page, limit, search, pago, ativo);
            return res.json({
                status: true,
                dados: resultado.dados,
                total: resultado.total,
                total_paginas: resultado.total_paginas,
                pagina_atual: page
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao listar usuarios"
            });
        }
    }
    // ============================================
    // MARCAR USUARIO COMO PAGO
    // ============================================
    async marcarPago(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            // 🔴 CORRIGIDO: usar função auxiliar para pegar ID
            const id = getParamId(req);
            const ip = getClientIp(req);
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'marcar_pago');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para marcar como pago"
                });
            }
            await adminService_1.default.marcarUsuarioPago(id, adminId, ip);
            return res.json({
                status: true,
                message: "Usuario marcado como pago com sucesso"
            });
        }
        catch (error) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao marcar usuario como pago"
            });
        }
    }
    // ============================================
    // DESMARCAR USUARIO COMO PAGO
    // ============================================
    async desmarcarPago(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            // 🔴 CORRIGIDO: usar função auxiliar para pegar ID
            const id = getParamId(req);
            const ip = getClientIp(req);
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'marcar_pago');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para desmarcar como pago"
                });
            }
            await adminService_1.default.desmarcarUsuarioPago(id, adminId, ip);
            return res.json({
                status: true,
                message: "Usuario desmarcado como pago com sucesso"
            });
        }
        catch (error) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao desmarcar usuario como pago"
            });
        }
    }
    // ============================================
    // LOGOUT ADMIN
    // ============================================
    async logout(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1] || req.body.token;
            if (token) {
                await adminService_1.default.logoutAdmin(token);
            }
            return res.json({
                status: true,
                message: "Logout realizado com sucesso"
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao fazer logout"
            });
        }
    }
    async excluirUsuario(req, res) {
        try {
            const raw = req.params.id;
            const idStr = Array.isArray(raw) ? raw[0] : raw;
            const id = Number(idStr);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }
            // ✅ DELETE de verdade
            const result = await (0, connection_1.query)('DELETE FROM usuarios WHERE id = $1 RETURNING id, nome_usuario, email', [id]);
            if (!result || result.rowCount === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            return res.status(200).json({ ok: true, deletado: result.rows[0] });
        }
        catch (error) {
            console.error('Erro ao excluir usuário:', error);
            return res.status(500).json({ error: 'Erro interno' });
        }
    }
    async limparInativas(req, res) {
        try {
            const secret = req.headers['x-cron-secret'];
            if (secret !== process.env.CRON_SECRET) {
                return res.status(403).json({ status: false, message: "Não autorizado" });
            }
            // 👇 Importa a função do arquivo separado
            const { limparSessoesInativas } = await Promise.resolve().then(() => __importStar(require('../services/sessaoService')));
            const total = await limparSessoesInativas();
            return res.json({
                status: true,
                sessoes_desativadas: total
            });
        }
        catch (error) {
            console.error("Erro:", error);
            return res.status(500).json({ status: false, message: "Erro interno" });
        }
    }
    // ============================================
    // 🆕 PERMISSÕES - LISTAR DISPONÍVEIS
    // ============================================
    async listarPermissoes(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const permissoes = await adminService_1.default.listarPermissoes();
            return res.json({
                status: true,
                dados: permissoes
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao listar permissoes"
            });
        }
    }
    // ============================================
    // 🆕 ADMINS - LISTAR
    // ============================================
    async listarAdmins(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }
            const admins = await adminService_1.default.listarAdmins();
            return res.json({
                status: true,
                dados: admins
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao listar admins"
            });
        }
    }
    // ============================================
    // 🆕 ADMINS - BUSCAR POR ID
    // ============================================
    async buscarAdmin(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            const id = getParamId(req);
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }
            const admin = await adminService_1.default.buscarAdmin(id);
            if (!admin) {
                return res.status(404).json({
                    status: false,
                    message: "Admin nao encontrado"
                });
            }
            return res.json({
                status: true,
                dados: admin
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao buscar admin"
            });
        }
    }
    // ============================================
    // 🆕 ADMINS - CRIAR
    // ============================================
    async criarAdmin(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }
            const { nome, email, senha, permissoes } = req.body;
            if (!nome || !email || !senha) {
                return res.status(400).json({
                    status: false,
                    message: "Nome, email e senha sao obrigatorios"
                });
            }
            const admin = await adminService_1.default.criarAdmin({ nome, email, senha, permissoes });
            // Registra log
            try {
                await adminService_1.default.registrarLog({
                    admin_id: adminId,
                    acao: 'criar_admin',
                    descricao: `Admin criado: ${admin.email}`,
                    ip,
                    user_agent: userAgent
                });
            }
            catch (logError) {
                console.error("Erro ao registrar log (criarAdmin):", logError);
            }
            return res.status(201).json({
                status: true,
                message: "Admin criado com sucesso",
                dados: admin
            });
        }
        catch (error) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao criar admin"
            });
        }
    }
    // ============================================
    // 🆕 ADMINS - ATUALIZAR
    // ============================================
    async atualizarAdmin(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            const id = getParamId(req);
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }
            const admin = await adminService_1.default.atualizarAdmin(id, req.body);
            try {
                await adminService_1.default.registrarLog({
                    admin_id: adminId,
                    acao: 'atualizar_admin',
                    descricao: `Admin atualizado: ${id}`,
                    ip,
                    user_agent: userAgent
                });
            }
            catch (logError) {
                console.error("Erro ao registrar log (atualizarAdmin):", logError);
            }
            return res.json({
                status: true,
                message: "Admin atualizado com sucesso",
                dados: admin
            });
        }
        catch (error) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao atualizar admin"
            });
        }
    }
    // ============================================
    // 🆕 ADMINS - EXCLUIR
    // ============================================
    async excluirAdmin(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            const id = getParamId(req);
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            // Não pode excluir a si mesmo
            if (adminId === id) {
                return res.status(400).json({
                    status: false,
                    message: "Voce nao pode excluir sua propria conta"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }
            const ok = await adminService_1.default.excluirAdmin(id);
            if (!ok) {
                return res.status(404).json({
                    status: false,
                    message: "Admin nao encontrado"
                });
            }
            try {
                await adminService_1.default.registrarLog({
                    admin_id: adminId,
                    acao: 'excluir_admin',
                    descricao: `Admin excluido: ${id}`,
                    ip,
                    user_agent: userAgent
                });
            }
            catch (logError) {
                console.error("Erro ao registrar log (excluirAdmin):", logError);
            }
            return res.json({
                status: true,
                message: "Admin excluido com sucesso"
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao excluir admin"
            });
        }
    }
    // ============================================
    // 🆕 LOGS DO SISTEMA - LISTAR
    // ============================================
    async listarLogs(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'ver_logs');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para ver logs"
                });
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const acao = req.query.acao;
            const desde = req.query.desde;
            const ate = req.query.ate;
            const admin_id = req.query.admin_id ? parseInt(req.query.admin_id) : undefined;
            const resultado = await adminService_1.default.listarLogs({
                page,
                limit,
                acao,
                desde,
                ate,
                admin_id
            });
            return res.json({
                status: true,
                dados: resultado.dados,
                total: resultado.total,
                total_paginas: resultado.total_paginas,
                pagina_atual: page
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao listar logs"
            });
        }
    }
    // ============================================
    // 🆕 HISTORICO DE LOGINS DOS USUARIOS
    // ============================================
    async listarLogins(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'ver_logs');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para ver logs"
                });
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const busca = req.query.busca;
            const usuario_id = req.query.usuario_id ? parseInt(req.query.usuario_id) : undefined;
            const resultado = await adminService_1.default.listarLogins({
                page,
                limit,
                busca,
                usuario_id
            });
            return res.json({
                status: true,
                dados: resultado.dados,
                total: resultado.total,
                total_paginas: resultado.total_paginas,
                pagina_atual: page
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao listar logins"
            });
        }
    }
    // ============================================
    // 🆕 SESSOES ADMIN - LISTAR
    // ============================================
    async listarSessoes(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'ver_sessoes');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para ver sessoes"
                });
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const apenas_ativas = req.query.ativas === 'true';
            const resultado = await adminService_1.default.listarSessoesAdmin({
                page,
                limit,
                apenas_ativas
            });
            return res.json({
                status: true,
                dados: resultado.dados,
                total: resultado.total,
                total_paginas: resultado.total_paginas,
                pagina_atual: page
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao listar sessoes"
            });
        }
    }
    // ============================================
    // 🆕 SESSOES ADMIN - REVOGAR UMA
    // ============================================
    async revogarSessao(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            const id = getParamId(req);
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'ver_sessoes');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar sessoes"
                });
            }
            const ok = await adminService_1.default.revogarSessaoAdmin(id);
            if (!ok) {
                return res.status(404).json({
                    status: false,
                    message: "Sessao nao encontrada"
                });
            }
            try {
                await adminService_1.default.registrarLog({
                    admin_id: adminId,
                    acao: 'revogar_sessao',
                    descricao: `Sessao revogada: ${id}`,
                    ip,
                    user_agent: userAgent
                });
            }
            catch (logError) {
                console.error("Erro ao registrar log (revogarSessao):", logError);
            }
            return res.json({
                status: true,
                message: "Sessao revogada com sucesso"
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao revogar sessao"
            });
        }
    }
    // ============================================
    // 🆕 SESSOES ADMIN - REVOGAR TODAS DE UM ADMIN
    // ============================================
    async revogarSessoesAdmin(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            const targetId = getParamId(req);
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'ver_sessoes');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar sessoes"
                });
            }
            const total = await adminService_1.default.revogarSessoesAdmin(targetId);
            try {
                await adminService_1.default.registrarLog({
                    admin_id: adminId,
                    acao: 'revogar_sessoes_admin',
                    descricao: `${total} sessoes revogadas do admin ${targetId}`,
                    ip,
                    user_agent: userAgent
                });
            }
            catch (logError) {
                console.error("Erro ao registrar log (revogarSessoesAdmin):", logError);
            }
            return res.json({
                status: true,
                message: `${total} sessoes revogadas`,
                sessoes_revogadas: total
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao revogar sessoes"
            });
        }
    }
    // ============================================
    // 🆕 LIMPAR SESSOES INATIVAS (autenticado)
    // ============================================
    async limparSessoesInativasAdmin(req, res) {
        try {
            const adminId = req.admin?.admin_id;
            const ip = getClientIp(req);
            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }
            const total = await adminService_1.default.limparSessoesInativasAdmin();
            try {
                await adminService_1.default.registrarLog({
                    admin_id: adminId,
                    acao: 'limpar_sessoes_inativas',
                    descricao: `${total} sessoes inativas limpas`,
                    ip
                });
            }
            catch (logError) {
                console.error("Erro ao registrar log (limparSessoesInativasAdmin):", logError);
            }
            return res.json({
                status: true,
                sessoes_desativadas: total
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao limpar sessoes inativas"
            });
        }
    }
}
exports.AdminController = AdminController;
exports.default = new AdminController();
//# sourceMappingURL=adminController.js.map