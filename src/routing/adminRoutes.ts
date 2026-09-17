// ============================================
// ROTAS ADMIN
// ============================================

import { Router } from "express";
import adminController from "../controller/adminController";
import { validarTokenAdmin } from "../middlewares/adminAuth";
import servidorController from "../controller/servidorController";




const router = Router();

// ============================================
// ROTAS PUBLICAS (SEM AUTENTICACAO)
// ============================================
router.get("/servidores", servidorController.listarServidoresPublicos);

// PASSO 1: Verificar email + senha
router.post("/admin/verificar-credenciais", adminController.verificarCredenciais);

// PASSO 2: Verificar palavra secreta e criar sessão
router.post("/admin/verificar-palavra-secreta", adminController.verificarPalavraSecreta);

// ============================================
// ROTAS PROTEGIDAS (COM TOKEN ADMIN)
// ============================================

// Dashboard
router.get("/admin/dashboard", validarTokenAdmin, adminController.dashboard);

// Usuarios
router.get("/admin/usuarios", validarTokenAdmin, adminController.listarUsuarios);

// Marcar/desmarcar pago
router.put("/admin/marcar-pago/:id", validarTokenAdmin, adminController.marcarPago);
router.put("/admin/desmarcar-pago/:id", validarTokenAdmin, adminController.desmarcarPago);


// 🔴 SERVIDORES (ADMIN)
router.get("/admin/servidores", validarTokenAdmin, servidorController.listarServidoresAdmin);
router.get("/admin/servidores/:id", validarTokenAdmin, servidorController.buscarServidor);
router.post("/admin/servidores", validarTokenAdmin, servidorController.criarServidor);
router.put("/admin/servidores/:id", validarTokenAdmin, servidorController.atualizarServidor);
router.delete("/admin/servidores/:id", validarTokenAdmin, servidorController.excluirServidor);

// Excluir usuário
router.delete("/admin/usuarios/:id", validarTokenAdmin, adminController.excluirUsuario);

// Logout
router.post("/admin/logout", validarTokenAdmin, adminController.logout);

// Cron de limpeza
router.get('/admin/limpar-inativas', adminController.limparInativas);
router.post('/admin/limpar-inativas', adminController.limparInativas);

// ============================================
// 🆕 PERMISSOES
// ============================================
router.get("/admin/permissoes", validarTokenAdmin, adminController.listarPermissoes);

// ============================================
// 🆕 ADMINS - CRUD
// ============================================
router.get("/admin/admins", validarTokenAdmin, adminController.listarAdmins);
router.get("/admin/admins/:id", validarTokenAdmin, adminController.buscarAdmin);
router.post("/admin/admins", validarTokenAdmin, adminController.criarAdmin);
router.put("/admin/admins/:id", validarTokenAdmin, adminController.atualizarAdmin);
router.delete("/admin/admins/:id", validarTokenAdmin, adminController.excluirAdmin);

// ============================================
// 🆕 LOGS DO SISTEMA
// ============================================
router.get("/admin/logs", validarTokenAdmin, adminController.listarLogs);

// ============================================
// 🆕 HISTORICO DE LOGINS DOS USUARIOS
// ============================================
router.get("/admin/logins", validarTokenAdmin, adminController.listarLogins);

// ============================================
// 🆕 SESSOES ADMIN
// ============================================
router.get("/admin/sessoes", validarTokenAdmin, adminController.listarSessoes);
router.delete("/admin/sessoes/:id", validarTokenAdmin, adminController.revogarSessao);
router.delete("/admin/admins/:id/sessoes", validarTokenAdmin, adminController.revogarSessoesAdmin);

// ============================================
// 🆕 LIMPAR SESSOES INATIVAS (autenticado)
// ============================================
router.post("/admin/limpar-inativas-admin", validarTokenAdmin, adminController.limparSessoesInativasAdmin);

export default router;