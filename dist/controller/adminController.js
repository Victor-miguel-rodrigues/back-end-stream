"use strict";
// ============================================
// ADMIN CONTROLLER - CORRIGIDO
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const adminService_1 = __importDefault(require("../services/adminService"));
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
}
exports.AdminController = AdminController;
exports.default = new AdminController();
//# sourceMappingURL=adminController.js.map