import { Router } from "express";
import authController from "../controller/UserCadastroController";
import { validarUsuario, validarLogin } from "../validators/userValidator";
import { validarToken } from "../middlewares/auth";

const router = Router();

// Health check
router.get("/health", (_req, res) => {  // ADICIONOU _
    res.json({
        status: "online",
        timestamp: new Date().toISOString(),
        versao: "1.0.0",
        ambiente: process.env.NODE_ENV || "development"
    });
});

// Rota raiz
router.get("/", (_req, res) => {  // ADICIONOU _
    res.json({
        status: "online",
        mensagem: "API de Login",
        versao: "1.0.0",
        endpoints: [
            "GET /",
        ]
    });
});

/*
"GET /health",
    "GET /listar",
    "POST /cadastrar",
    "POST /login",
    "POST /validar-token",
    "GET /validar-token",
    "POST /logout"
*/

router.get("/listar", authController.listar);
router.post("/cadastrar", validarUsuario, authController.receber);
router.post("/login", validarLogin, authController.logar);
router.post("/validar-token", authController.validarToken);
router.get("/validar-token", authController.validarToken);
router.post("/logout", authController.logout);
router.get("/check-pagamento", authController.checkPagamento);

// ============================================
// ROTAS DE FAVORITOS (PROTEGIDAS)
// ============================================

// Listar favoritos
router.get("/favoritos", validarToken, authController.listarFavoritos);

// Adicionar favorito
router.post("/favoritos", validarToken, authController.adicionarFavorito);

// Remover favorito
router.delete("/favoritos/:item_id", validarToken, authController.removerFavorito);


export default router;