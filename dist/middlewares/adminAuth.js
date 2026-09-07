"use strict";
// ============================================
// MIDDLEWARES ADMIN
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificarPermissao = exports.validarTokenAdmin = void 0;
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
//# sourceMappingURL=adminAuth.js.map