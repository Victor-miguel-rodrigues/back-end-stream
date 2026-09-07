// ============================================
// ROTAS ADMIN
// ============================================

import { Router } from "express";
import adminController from "../controller/adminController";
import { validarTokenAdmin } from "../middlewares/adminAuth";

const router = Router();

// ============================================
// ROTAS PUBLICAS (SEM AUTENTICACAO)
// ============================================

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

// Logout
router.post("/admin/logout", validarTokenAdmin, adminController.logout);

export default router;