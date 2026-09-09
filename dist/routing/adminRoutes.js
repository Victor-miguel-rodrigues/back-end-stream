"use strict";
// ============================================
// ROTAS ADMIN
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = __importDefault(require("../controller/adminController"));
const adminAuth_1 = require("../middlewares/adminAuth");
const servidorController_1 = __importDefault(require("../controller/servidorController"));
const router = (0, express_1.Router)();
// ============================================
// ROTAS PUBLICAS (SEM AUTENTICACAO)
// ============================================
router.get("/servidores", servidorController_1.default.listarServidoresPublicos);
// PASSO 1: Verificar email + senha
router.post("/admin/verificar-credenciais", adminController_1.default.verificarCredenciais);
// PASSO 2: Verificar palavra secreta e criar sessão
router.post("/admin/verificar-palavra-secreta", adminController_1.default.verificarPalavraSecreta);
// ============================================
// ROTAS PROTEGIDAS (COM TOKEN ADMIN)
// ============================================
// Dashboard
router.get("/admin/dashboard", adminAuth_1.validarTokenAdmin, adminController_1.default.dashboard);
// Usuarios
router.get("/admin/usuarios", adminAuth_1.validarTokenAdmin, adminController_1.default.listarUsuarios);
// Marcar/desmarcar pago
router.put("/admin/marcar-pago/:id", adminAuth_1.validarTokenAdmin, adminController_1.default.marcarPago);
router.put("/admin/desmarcar-pago/:id", adminAuth_1.validarTokenAdmin, adminController_1.default.desmarcarPago);
// 🔴 SERVIDORES (ADMIN)
router.get("/admin/servidores", adminAuth_1.validarTokenAdmin, servidorController_1.default.listarServidoresAdmin);
router.get("/admin/servidores/:id", adminAuth_1.validarTokenAdmin, servidorController_1.default.buscarServidor);
router.post("/admin/servidores", adminAuth_1.validarTokenAdmin, servidorController_1.default.criarServidor);
router.put("/admin/servidores/:id", adminAuth_1.validarTokenAdmin, servidorController_1.default.atualizarServidor);
router.delete("/admin/servidores/:id", adminAuth_1.validarTokenAdmin, servidorController_1.default.excluirServidor);
// Logout
router.post("/admin/logout", adminAuth_1.validarTokenAdmin, adminController_1.default.logout);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map