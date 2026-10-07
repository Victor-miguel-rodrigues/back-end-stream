import { Router } from 'express';
import authController from '../controller/UserCadastroController';
import { validarUsuario, validarLogin } from '../validators/userValidator';
import { validarToken } from '../middlewares/auth';
import { loginLimiter, sensitiveLimiter } from '../middlewares/rateLimit';
import codigoLoginController from '../controller/codigoLoginController';

const router = Router();

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
router.post('/cadastrar', sensitiveLimiter, validarUsuario, authController.receber);
router.post('/login', loginLimiter, validarLogin, authController.logar);
router.post('/logout', authController.logout);
router.post('/validar-token', authController.validarToken);
router.get('/validar-token', authController.validarToken);
router.get('/check-pagamento', authController.checkPagamento);
router.get('/listar', authController.listar);

// Favoritos (protegidas)
router.get('/favoritos', validarToken, authController.listarFavoritos);
router.post('/favoritos', validarToken, authController.adicionarFavorito);
router.delete('/favoritos/:item_id', validarToken, authController.removerFavorito);

// Codigo de login (protegidas pelo token do usuario)
router.post('/codigo-login', validarToken, (req, res) => codigoLoginController.gerar(req, res));
router.get('/codigo-login', validarToken, (req, res) => codigoLoginController.consultar(req, res));
router.post('/codigo-login/desativar', validarToken, (req, res) => codigoLoginController.desativar(req, res));

// Heartbeat
router.post('/heartbeat', authController.heartbeat);

export default router;