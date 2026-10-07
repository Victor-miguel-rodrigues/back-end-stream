"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = __importDefault(require("../controller/adminController"));
const adminAuth_1 = require("../middlewares/adminAuth");
const servidorController_1 = __importDefault(require("../controller/servidorController"));
const rateLimit_1 = require("../middlewares/rateLimit");
const router = (0, express_1.Router)();
// ============================================
// ROTAS PUBLICAS
// ============================================
router.get('/servidores', servidorController_1.default.listarServidoresPublicos);
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
// Servidores
router.get('/admin/servidores', adminAuth_1.validarTokenAdmin, servidorController_1.default.listarServidoresAdmin);
router.get('/admin/servidores/:id', adminAuth_1.validarTokenAdmin, servidorController_1.default.buscarServidor);
router.post('/admin/servidores', adminAuth_1.validarTokenAdmin, servidorController_1.default.criarServidor);
router.put('/admin/servidores/:id', adminAuth_1.validarTokenAdmin, servidorController_1.default.atualizarServidor);
router.delete('/admin/servidores/:id', adminAuth_1.validarTokenAdmin, servidorController_1.default.excluirServidor);
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
router.delete('/admin/sessoes/:id', adminAuth_1.validarTokenAdmin, adminController_1.default.revogarSessao);
router.delete('/admin/admins/:id/sessoes', adminAuth_1.validarTokenAdmin, adminController_1.default.revogarSessoesAdmin);
router.post('/admin/limpar-inativas-admin', adminAuth_1.validarTokenAdmin, adminController_1.default.limparSessoesInativasAdmin);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map