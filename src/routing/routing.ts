import { Router } from "express";
import authController from "../controller/UserCadastroController";
import { validarUsuario, validarLogin } from "../validators/userValidator";

const router = Router();

// ============================================
// ROTAS PÚBLICAS
// ============================================

// Health check
router.get("/health", (req, res) => {
    res.json({
        status: "online",
        timestamp: new Date().toISOString(),
        versao: "1.0.0"
    });
});

// Listar (teste)
router.get("/listar", authController.listar);

// Cadastrar usuário
router.post("/cadastrar", validarUsuario, authController.receber);

// Login
router.post("/login", validarLogin, authController.logar);

// Validar token
router.post("/validar-token", authController.validarToken);
router.get("/validar-token", authController.validarToken);

// ============================================
// ROTAS PROTEGIDAS (com token)
// ============================================

// Logout
router.post("/logout", authController.logout);

export default router;