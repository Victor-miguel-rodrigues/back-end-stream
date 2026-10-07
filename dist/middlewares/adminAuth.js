"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarLog = exports.validarCronSecret = exports.verificarSuperAdmin = exports.verificarTodasPermissoes = exports.verificarAlgumaPermissao = exports.verificarPermissao = exports.validarTokenAdmin = void 0;
const adminService_1 = __importDefault(require("../services/adminService"));
const crypto_1 = require("../utils/crypto");
const validarTokenAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ status: false, message: 'Token nao fornecido' });
            return;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({ status: false, message: 'Formato de token invalido' });
            return;
        }
        const token = parts[1];
        const adminData = await adminService_1.default.validarTokenAdmin(token);
        if (!adminData) {
            res.status(401).json({ status: false, message: 'Token invalido ou expirado' });
            return;
        }
        req.admin = adminData;
        req.token = token;
        next();
    }
    catch (error) {
        console.error('[validarTokenAdmin] Erro:', error);
        res.status(500).json({ status: false, message: 'Erro ao validar token' });
    }
};
exports.validarTokenAdmin = validarTokenAdmin;
const verificarPermissao = (permissao) => {
    return async (req, res, next) => {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                res.status(401).json({ status: false, message: 'Nao autorizado' });
                return;
            }
            const temPermissao = await adminService_1.default.verificarPermissao(adminId, permissao);
            if (!temPermissao) {
                res.status(403).json({ status: false, message: 'Sem permissao para executar esta acao' });
                return;
            }
            next();
        }
        catch (error) {
            console.error('[verificarPermissao] Erro:', error);
            res.status(500).json({ status: false, message: 'Erro ao verificar permissao' });
        }
    };
};
exports.verificarPermissao = verificarPermissao;
// Aceita se admin tem PELO MENOS UMA das permissoes (OR)
const verificarAlgumaPermissao = (permissoes) => {
    return async (req, res, next) => {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                res.status(401).json({ status: false, message: 'Nao autorizado' });
                return;
            }
            for (const permissao of permissoes) {
                const temPermissao = await adminService_1.default.verificarPermissao(adminId, permissao);
                if (temPermissao) {
                    next();
                    return;
                }
            }
            res.status(403).json({ status: false, message: 'Sem permissao para executar esta acao' });
        }
        catch (error) {
            console.error('[verificarAlgumaPermissao] Erro:', error);
            res.status(500).json({ status: false, message: 'Erro ao verificar permissoes' });
        }
    };
};
exports.verificarAlgumaPermissao = verificarAlgumaPermissao;
// Aceita somente se admin tem TODAS as permissoes (AND)
const verificarTodasPermissoes = (permissoes) => {
    return async (req, res, next) => {
        try {
            const adminId = req.admin?.admin_id;
            if (!adminId) {
                res.status(401).json({ status: false, message: 'Nao autorizado' });
                return;
            }
            for (const permissao of permissoes) {
                const temPermissao = await adminService_1.default.verificarPermissao(adminId, permissao);
                if (!temPermissao) {
                    res.status(403).json({ status: false, message: 'Sem permissao para executar esta acao' });
                    return;
                }
            }
            next();
        }
        catch (error) {
            console.error('[verificarTodasPermissoes] Erro:', error);
            res.status(500).json({ status: false, message: 'Erro ao verificar permissoes' });
        }
    };
};
exports.verificarTodasPermissoes = verificarTodasPermissoes;
// Verifica se e super admin
const verificarSuperAdmin = async (req, res, next) => {
    try {
        const adminId = req.admin?.admin_id;
        if (!adminId) {
            res.status(401).json({ status: false, message: 'Nao autorizado' });
            return;
        }
        const temPermissao = await adminService_1.default.verificarPermissao(adminId, 'super_admin');
        if (!temPermissao) {
            res.status(403).json({ status: false, message: 'Acesso restrito a super administradores' });
            return;
        }
        next();
    }
    catch (error) {
        console.error('[verificarSuperAdmin] Erro:', error);
        res.status(500).json({ status: false, message: 'Erro ao verificar super admin' });
    }
};
exports.verificarSuperAdmin = verificarSuperAdmin;
// Valida o secret de cron jobs externos via header x-cron-secret (timing-safe)
const validarCronSecret = (req, res, next) => {
    const secret = req.headers['x-cron-secret'];
    const cronSecret = process.env.CRON_SECRET ?? '';
    if (!secret || !cronSecret) {
        res.status(401).json({ status: false, message: 'Secret nao fornecido' });
        return;
    }
    const secretStr = Array.isArray(secret) ? secret[0] : secret;
    if (!(0, crypto_1.compararSecretSeguro)(secretStr, cronSecret)) {
        res.status(403).json({ status: false, message: 'Secret invalido' });
        return;
    }
    next();
};
exports.validarCronSecret = validarCronSecret;
// Helper: extrai string de header que pode ser array
const getHeaderString = (value) => {
    if (!value)
        return '';
    return Array.isArray(value) ? value[0] : value;
};
// Helper: sanitiza body para nao logar senhas
function sanitizarBody(body) {
    if (!body || typeof body !== 'object')
        return body;
    const SENSITIVE = ['senha', 'senha_hash', 'palavra_secreta', 'token', 'password'];
    const sanitized = { ...body };
    for (const field of SENSITIVE) {
        if (sanitized[field])
            sanitized[field] = '***';
    }
    return sanitized;
}
// Middleware: Registrar log de acao do admin (so em respostas de sucesso)
const registrarLog = (acao, descricaoTemplate) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (data) {
            const isSucesso = res.statusCode >= 200 && res.statusCode < 300;
            if (isSucesso) {
                const adminId = req.admin?.admin_id;
                const ip = getHeaderString(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0');
                const userAgent = getHeaderString(req.headers['user-agent']);
                if (adminId) {
                    const descricao = descricaoTemplate
                        ? descricaoTemplate.replace(':id', String(req.params.id ?? ''))
                        : `${acao} executada`;
                    adminService_1.default
                        .logAdminAction(adminId, acao, descricao, ip, {
                        metodo: req.method,
                        rota: req.originalUrl,
                        params: req.params,
                        user_agent: userAgent,
                        body: sanitizarBody(req.body)
                    })
                        .catch(err => console.error('[registrarLog] Erro:', err));
                }
            }
            return originalJson(data);
        };
        next();
    };
};
exports.registrarLog = registrarLog;
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