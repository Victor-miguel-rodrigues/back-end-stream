"use strict";
// ============================================
// MIDDLEWARES ADMIN
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarLog = exports.validarCronSecret = exports.verificarSuperAdmin = exports.verificarTodasPermissoes = exports.verificarAlgumaPermissao = exports.verificarPermissao = exports.validarTokenAdmin = void 0;
const adminService_1 = __importDefault(require("../services/adminService"));
const validarTokenAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ status: false, message: "Token nao fornecido" });
            return;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({ status: false, message: "Formato de token invalido" });
            return;
        }
        const token = parts[1];
        const adminData = await adminService_1.default.validarTokenAdmin(token);
        if (!adminData) {
            res.status(401).json({ status: false, message: "Token invalido ou expirado" });
            return;
        }
        req.admin = adminData;
        req.token = token;
        next();
    }
    catch (error) {
        console.error("Erro ao validar token admin:", error);
        res.status(500).json({ status: false, message: "Erro ao validar token" });
    }
};
exports.validarTokenAdmin = validarTokenAdmin;
const verificarPermissao = (permissao) => {
    return async (req, res, next) => {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                res.status(401).json({ status: false, message: "Nao autorizado" });
                return;
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, permissao);
            if (!temPermissao) {
                res.status(403).json({
                    status: false,
                    message: `Sem permissao para executar esta acao (${permissao})`
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error("Erro ao verificar permissao:", error);
            res.status(500).json({ status: false, message: "Erro ao verificar permissao" });
        }
    };
};
exports.verificarPermissao = verificarPermissao;
// ============================================
// 🆕 VERIFICAR PERMISSOES (múltiplas - OR)
// Aceita se o admin tem PELO MENOS UMA das permissões
// ============================================
const verificarAlgumaPermissao = (permissoes) => {
    return async (req, res, next) => {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                res.status(401).json({ status: false, message: "Nao autorizado" });
                return;
            }
            for (const permissao of permissoes) {
                const temPermissao = await adminService_1.default.verificarPermissao(adminId, permissao);
                if (temPermissao) {
                    next();
                    return;
                }
            }
            res.status(403).json({
                status: false,
                message: `Sem permissao para executar esta acao. Requer uma das: ${permissoes.join(', ')}`
            });
        }
        catch (error) {
            console.error("Erro ao verificar permissoes:", error);
            res.status(500).json({ status: false, message: "Erro ao verificar permissoes" });
        }
    };
};
exports.verificarAlgumaPermissao = verificarAlgumaPermissao;
// ============================================
// 🆕 VERIFICAR TODAS AS PERMISSOES (AND)
// Aceita somente se o admin tem TODAS as permissões
// ============================================
const verificarTodasPermissoes = (permissoes) => {
    return async (req, res, next) => {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                res.status(401).json({ status: false, message: "Nao autorizado" });
                return;
            }
            for (const permissao of permissoes) {
                const temPermissao = await adminService_1.default.verificarPermissao(adminId, permissao);
                if (!temPermissao) {
                    res.status(403).json({
                        status: false,
                        message: `Sem permissao para executar esta acao. Requer todas: ${permissoes.join(', ')}`
                    });
                    return;
                }
            }
            next();
        }
        catch (error) {
            console.error("Erro ao verificar permissoes:", error);
            res.status(500).json({ status: false, message: "Erro ao verificar permissoes" });
        }
    };
};
exports.verificarTodasPermissoes = verificarTodasPermissoes;
// ============================================
// 🆕 VERIFICAR SE É SUPER ADMIN
// (Se o admin tem permissao 'super_admin' ou é o admin master)
// ============================================
const verificarSuperAdmin = async (req, res, next) => {
    try {
        const adminId = req.admin?.admin_id;
        if (!adminId) {
            res.status(401).json({ status: false, message: "Nao autorizado" });
            return;
        }
        const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'super_admin');
        if (!temPermissao) {
            res.status(403).json({
                status: false,
                message: "Acesso restrito a super administradores"
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error("Erro ao verificar super admin:", error);
        res.status(500).json({ status: false, message: "Erro ao verificar super admin" });
    }
};
exports.verificarSuperAdmin = verificarSuperAdmin;
// ============================================
// 🆕 VALIDAR CRON SECRET
// Para rotas de cron job externo
// ============================================
const validarCronSecret = (req, res, next) => {
    try {
        const secret = req.headers['x-cron-secret'];
        if (!secret) {
            res.status(401).json({ status: false, message: "Secret nao fornecido" });
            return;
        }
        if (secret !== process.env.CRON_SECRET) {
            res.status(403).json({ status: false, message: "Secret invalido" });
            return;
        }
        next();
    }
    catch (error) {
        console.error("Erro ao validar cron secret:", error);
        res.status(500).json({ status: false, message: "Erro ao validar cron secret" });
    }
};
exports.validarCronSecret = validarCronSecret;
// ============================================
// 🆕 HELPER: extrai string do header (string | string[])
// ============================================
const getHeaderString = (value) => {
    if (!value)
        return '';
    return Array.isArray(value) ? value[0] : value;
};
// ============================================
// 🆕 REGISTRAR LOG DE AÇÃO DO ADMIN
// Middleware que intercepta a resposta e registra a ação
// Uso: router.post('/rota', validarTokenAdmin, registrarLog('acao_nome'), controller.metodo)
// ============================================
const registrarLog = (acao, descricaoTemplate) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (data) {
            // Só registra log se a resposta foi sucesso
            const isSucesso = res.statusCode >= 200 && res.statusCode < 300;
            if (isSucesso) {
                const adminId = req.admin?.admin_id;
                const ip = getHeaderString(req.ip || req.connection?.remoteAddress || '0.0.0.0');
                const userAgent = getHeaderString(req.headers['user-agent']);
                if (adminId) {
                    const descricao = descricaoTemplate
                        ? descricaoTemplate.replace(':id', String(req.params.id || ''))
                        : `${acao} executada`;
                    adminService_1.default
                        .logAdminAction(adminId, acao, descricao, ip, {
                        metodo: req.method,
                        rota: req.originalUrl,
                        params: req.params,
                        user_agent: userAgent,
                        body: sanitizarBody(req.body)
                    })
                        .catch((err) => console.error('Erro ao registrar log:', err));
                }
            }
            return originalJson(data);
        };
        next();
    };
};
exports.registrarLog = registrarLog;
// ============================================
// 🆕 HELPER: sanitiza body para não logar senhas
// ============================================
function sanitizarBody(body) {
    if (!body || typeof body !== 'object')
        return body;
    const SENSITIVE_FIELDS = ['senha', 'senha_hash', 'palavra_secreta', 'token', 'password'];
    const sanitized = { ...body };
    for (const field of SENSITIVE_FIELDS) {
        if (sanitized[field]) {
            sanitized[field] = '***';
        }
    }
    return sanitized;
}
// ============================================
// 🆕 EXPORT DEFAULT
// ============================================
exports.default = {
    validarTokenAdmin: exports.validarTokenAdmin,
    verificarPermissao: exports.verificarPermissao,
    verificarAlgumaPermissao: exports.verificarAlgumaPermissao,
    verificarTodasPermissoes: exports.verificarTodasPermissoes,
    verificarSuperAdmin: exports.verificarSuperAdmin,
    validarCronSecret: exports.validarCronSecret,
    registrarLog: exports.registrarLog
};
//# sourceMappingURL=adminAuth.js.map