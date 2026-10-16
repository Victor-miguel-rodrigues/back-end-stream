"use strict";
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
const express_1 = __importStar(require("express"));
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const adminController_1 = __importDefault(require("../controller/adminController"));
const adminAuth_1 = require("../middlewares/adminAuth");
const servidorController_1 = __importDefault(require("../controller/servidorController"));
const rateLimit_1 = require("../middlewares/rateLimit");
const pedidoController_1 = __importDefault(require("../controller/pedidoController"));
const router = (0, express_1.Router)();
// Envio publico de comprovante: 8 por hora por IP (a imagem fica salva no banco)
const comprovanteLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 8,
    message: { status: false, message: 'Muitos envios. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)((req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0'))
});
// ============================================
// ROTAS PUBLICAS
// ============================================
router.get('/servidores', servidorController_1.default.listarServidoresPublicos);
// Comprovante de pagamento: o usuario envia o e-mail (?email=) e a imagem no corpo (PNG, JPG ou WEBP, ate 4 MB)
router.post('/comprovantes', comprovanteLimiter, express_1.default.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '4mb' }), adminController_1.default.enviarComprovante);
// Auth admin (2 fatores)
router.post('/admin/verificar-credenciais', rateLimit_1.loginLimiter, adminController_1.default.verificarCredenciais);
router.post('/admin/verificar-palavra-secreta', rateLimit_1.loginLimiter, adminController_1.default.verificarPalavraSecreta);
// ============================================
// ROTAS PROTEGIDAS
// ============================================
// Dashboard
router.get('/admin/dashboard', adminAuth_1.validarTokenAdmin, adminController_1.default.dashboard);
// Usuarios
router.get('/admin/usuarios', adminAuth_1.validarTokenAdmin, adminController_1.default.listarUsuarios);
router.put('/admin/marcar-pago/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.marcarPago);
router.put('/admin/desmarcar-pago/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.desmarcarPago);
router.delete('/admin/usuarios/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.excluirUsuario);
router.put('/admin/renovar/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.renovarUsuario);
router.put('/admin/bloquear/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.bloquearUsuario);
router.put('/admin/desbloquear/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.desbloquearUsuario);
router.get('/admin/usuarios/:id/sessoes', adminAuth_1.validarTokenAdmin, adminController_1.default.listarSessoesUsuario);
router.post('/admin/usuarios/:id/deslogar', adminAuth_1.validarTokenAdmin, adminController_1.default.deslogarUsuario);
// Pagamentos (historico e resumo)
router.get('/admin/pagamentos', adminAuth_1.validarTokenAdmin, adminController_1.default.listarPagamentos);
router.get('/admin/pagamentos/resumo', adminAuth_1.validarTokenAdmin, adminController_1.default.resumoPagamentos);
// Comprovantes enviados pelos usuarios (confirmacao manual)
router.get('/admin/comprovantes', adminAuth_1.validarTokenAdmin, adminController_1.default.listarComprovantes);
router.get('/admin/comprovantes/:id/imagem', adminAuth_1.validarTokenAdmin, adminController_1.default.imagemComprovante);
router.put('/admin/comprovantes/:id/confirmar', adminAuth_1.validarTokenAdmin, adminController_1.default.confirmarComprovante);
router.put('/admin/comprovantes/:id/recusar', adminAuth_1.validarTokenAdmin, adminController_1.default.recusarComprovante);
// Seguranca: usuarios com muitos IPs diferentes
router.get('/admin/ips-suspeitos', adminAuth_1.validarTokenAdmin, adminController_1.default.listarIpsSuspeitos);
// Servidores
router.get('/admin/servidores', adminAuth_1.validarTokenAdmin, servidorController_1.default.listarServidoresAdmin);
router.get('/admin/servidores/:id', adminAuth_1.validarTokenAdmin, servidorController_1.default.buscarServidor);
router.post('/admin/servidores', adminAuth_1.validarTokenAdmin, servidorController_1.default.criarServidor);
router.put('/admin/servidores/:id', adminAuth_1.validarTokenAdmin, servidorController_1.default.atualizarServidor);
router.delete('/admin/servidores/:id', adminAuth_1.validarTokenAdmin, servidorController_1.default.excluirServidor);
// Pedidos de conta (dashboard)
router.get('/admin/pedidos', adminAuth_1.validarTokenAdmin, (req, res) => pedidoController_1.default.listar(req, res));
router.put('/admin/pedidos/:id/status', adminAuth_1.validarTokenAdmin, (req, res) => pedidoController_1.default.atualizarStatus(req, res));
router.delete('/admin/pedidos/:id', adminAuth_1.validarTokenAdmin, (req, res) => pedidoController_1.default.excluir(req, res));
// Logout
router.post('/admin/logout', adminAuth_1.validarTokenAdmin, adminController_1.default.logout);
// Cron de limpeza (autenticado via x-cron-secret)
router.get('/admin/limpar-inativas', adminAuth_1.validarCronSecret, adminController_1.default.limparInativas);
router.post('/admin/limpar-inativas', adminAuth_1.validarCronSecret, adminController_1.default.limparInativas);
// Permissoes
router.get('/admin/permissoes', adminAuth_1.validarTokenAdmin, adminController_1.default.listarPermissoes);
// Admins CRUD
router.get('/admin/admins', adminAuth_1.validarTokenAdmin, adminController_1.default.listarAdmins);
router.get('/admin/admins/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.buscarAdmin);
router.post('/admin/admins', adminAuth_1.validarTokenAdmin, adminController_1.default.criarAdmin);
router.put('/admin/admins/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.atualizarAdmin);
router.delete('/admin/admins/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.excluirAdmin);
// Logs
router.get('/admin/logs', adminAuth_1.validarTokenAdmin, adminController_1.default.listarLogs);
router.get('/admin/logins', adminAuth_1.validarTokenAdmin, adminController_1.default.listarLogins);
// Sessoes
router.get('/admin/sessoes', adminAuth_1.validarTokenAdmin, adminController_1.default.listarSessoes);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map