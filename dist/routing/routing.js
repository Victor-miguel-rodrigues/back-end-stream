"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserCadastroController_1 = __importDefault(require("../controller/UserCadastroController"));
const userValidator_1 = require("../validators/userValidator");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Health check
router.get("/health", (_req, res) => {
    res.json({
        status: "online",
        timestamp: new Date().toISOString(),
        versao: "1.0.0",
        ambiente: process.env.NODE_ENV || "development"
    });
});
// Rota raiz
router.get("/", (_req, res) => {
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
router.get("/listar", UserCadastroController_1.default.listar);
router.post("/cadastrar", userValidator_1.validarUsuario, UserCadastroController_1.default.receber);
router.post("/login", userValidator_1.validarLogin, UserCadastroController_1.default.logar);
router.post("/validar-token", UserCadastroController_1.default.validarToken);
router.get("/validar-token", UserCadastroController_1.default.validarToken);
router.post("/logout", UserCadastroController_1.default.logout);
router.get("/check-pagamento", UserCadastroController_1.default.checkPagamento);
// ============================================
// ROTAS DE FAVORITOS (PROTEGIDAS)
// ============================================
// Listar favoritos
router.get("/favoritos", auth_1.validarToken, UserCadastroController_1.default.listarFavoritos);
// Adicionar favorito
router.post("/favoritos", auth_1.validarToken, UserCadastroController_1.default.adicionarFavorito);
// Remover favorito
router.delete("/favoritos/:item_id", auth_1.validarToken, UserCadastroController_1.default.removerFavorito);
exports.default = router;
//# sourceMappingURL=routing.js.map