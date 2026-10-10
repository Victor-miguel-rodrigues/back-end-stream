"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserCadastroController_1 = __importDefault(require("../controller/UserCadastroController"));
const userValidator_1 = require("../validators/userValidator");
const auth_1 = require("../middlewares/auth");
const rateLimit_1 = require("../middlewares/rateLimit");
const codigoLoginController_1 = __importDefault(require("../controller/codigoLoginController"));
const router = (0, express_1.Router)();
// Health check
router.get('/health', (_req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        versao: '1.0.0',
        ambiente: process.env.NODE_ENV ?? 'development'
    });
});
// Rota raiz
router.get('/', (_req, res) => {
    res.json({ status: 'online', mensagem: 'API de Login', versao: '1.0.0' });
});
// Autenticacao
router.post('/cadastrar', rateLimit_1.sensitiveLimiter, userValidator_1.validarUsuario, UserCadastroController_1.default.receber);
router.post('/login', rateLimit_1.loginLimiter, userValidator_1.validarLogin, UserCadastroController_1.default.logar);
router.post('/logout', UserCadastroController_1.default.logout);
router.post('/validar-token', UserCadastroController_1.default.validarToken);
router.get('/validar-token', UserCadastroController_1.default.validarToken);
router.get('/check-pagamento', UserCadastroController_1.default.checkPagamento);
router.get('/listar', UserCadastroController_1.default.listar);
// Favoritos (protegidas)
router.get('/favoritos', auth_1.validarToken, UserCadastroController_1.default.listarFavoritos);
router.post('/favoritos', auth_1.validarToken, UserCadastroController_1.default.adicionarFavorito);
router.delete('/favoritos/:item_id', auth_1.validarToken, UserCadastroController_1.default.removerFavorito);
// Codigo de login (protegidas pelo token do usuario)
router.post('/codigo-login', auth_1.validarToken, rateLimit_1.codigoLoginLimiter, (req, res) => codigoLoginController_1.default.gerar(req, res));
router.get('/codigo-login', auth_1.validarToken, (req, res) => codigoLoginController_1.default.consultar(req, res));
router.post('/codigo-login/desativar', auth_1.validarToken, (req, res) => codigoLoginController_1.default.desativar(req, res));
// Heartbeat
router.post('/heartbeat', UserCadastroController_1.default.heartbeat);
exports.default = router;
//# sourceMappingURL=routing.js.map