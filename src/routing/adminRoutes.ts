import express, { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import adminController from '../controller/adminController';
import { validarTokenAdmin, validarCronSecret } from '../middlewares/adminAuth';
import servidorController from '../controller/servidorController';
import { loginLimiter } from '../middlewares/rateLimit';
import pedidoController from '../controller/pedidoController';

const router = Router();

// Envio publico de comprovante: 8 por hora por IP (a imagem fica salva no banco)
const comprovanteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    message: { status: false, message: 'Muitos envios. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator((req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0') as string)
});

// ============================================
// ROTAS PUBLICAS
// ============================================
router.get('/servidores', servidorController.listarServidoresPublicos);

// Comprovante de pagamento: o usuario envia o e-mail (?email=) e a imagem no corpo (PNG, JPG ou WEBP, ate 4 MB)
router.post(
    '/comprovantes',
    comprovanteLimiter,
    express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '4mb' }),
    adminController.enviarComprovante
);

// Auth admin (2 fatores)
router.post('/admin/verificar-credenciais', loginLimiter, adminController.verificarCredenciais);
router.post('/admin/verificar-palavra-secreta', loginLimiter, adminController.verificarPalavraSecreta);

// ============================================
// ROTAS PROTEGIDAS
// ============================================

// Dashboard
router.get('/admin/dashboard', validarTokenAdmin, adminController.dashboard);

// Usuarios
router.get('/admin/usuarios', validarTokenAdmin, adminController.listarUsuarios);
router.put('/admin/marcar-pago/:id', validarTokenAdmin, adminController.marcarPago);
router.put('/admin/desmarcar-pago/:id', validarTokenAdmin, adminController.desmarcarPago);
router.delete('/admin/usuarios/:id', validarTokenAdmin, adminController.excluirUsuario);
router.put('/admin/renovar/:id', validarTokenAdmin, adminController.renovarUsuario);
router.put('/admin/bloquear/:id', validarTokenAdmin, adminController.bloquearUsuario);
router.put('/admin/desbloquear/:id', validarTokenAdmin, adminController.desbloquearUsuario);
router.get('/admin/usuarios/:id/sessoes', validarTokenAdmin, adminController.listarSessoesUsuario);
router.post('/admin/usuarios/:id/deslogar', validarTokenAdmin, adminController.deslogarUsuario);

// Pagamentos (historico e resumo)
router.get('/admin/pagamentos', validarTokenAdmin, adminController.listarPagamentos);
router.get('/admin/pagamentos/resumo', validarTokenAdmin, adminController.resumoPagamentos);

// Comprovantes enviados pelos usuarios (confirmacao manual)
router.get('/admin/comprovantes', validarTokenAdmin, adminController.listarComprovantes);
router.get('/admin/comprovantes/:id/imagem', validarTokenAdmin, adminController.imagemComprovante);
router.put('/admin/comprovantes/:id/confirmar', validarTokenAdmin, adminController.confirmarComprovante);
router.put('/admin/comprovantes/:id/recusar', validarTokenAdmin, adminController.recusarComprovante);

// Seguranca: usuarios com muitos IPs diferentes
router.get('/admin/ips-suspeitos', validarTokenAdmin, adminController.listarIpsSuspeitos);

// Servidores
router.get('/admin/servidores', validarTokenAdmin, servidorController.listarServidoresAdmin);
router.get('/admin/servidores/:id', validarTokenAdmin, servidorController.buscarServidor);
router.post('/admin/servidores', validarTokenAdmin, servidorController.criarServidor);
router.put('/admin/servidores/:id', validarTokenAdmin, servidorController.atualizarServidor);
router.delete('/admin/servidores/:id', validarTokenAdmin, servidorController.excluirServidor);

// Pedidos de conta (dashboard)
router.get('/admin/pedidos', validarTokenAdmin, (req, res) => pedidoController.listar(req, res));
router.put('/admin/pedidos/:id/status', validarTokenAdmin, (req, res) => pedidoController.atualizarStatus(req, res));
router.delete('/admin/pedidos/:id', validarTokenAdmin, (req, res) => pedidoController.excluir(req, res));

// Logout
router.post('/admin/logout', validarTokenAdmin, adminController.logout);

// Cron de limpeza (autenticado via x-cron-secret)
router.get('/admin/limpar-inativas', validarCronSecret, adminController.limparInativas);
router.post('/admin/limpar-inativas', validarCronSecret, adminController.limparInativas);

// Permissoes
router.get('/admin/permissoes', validarTokenAdmin, adminController.listarPermissoes);

// Admins CRUD
router.get('/admin/admins', validarTokenAdmin, adminController.listarAdmins);
router.get('/admin/admins/:id', validarTokenAdmin, adminController.buscarAdmin);
router.post('/admin/admins', validarTokenAdmin, adminController.criarAdmin);
router.put('/admin/admins/:id', validarTokenAdmin, adminController.atualizarAdmin);
router.delete('/admin/admins/:id', validarTokenAdmin, adminController.excluirAdmin);

// Logs
router.get('/admin/logs', validarTokenAdmin, adminController.listarLogs);
router.get('/admin/logins', validarTokenAdmin, adminController.listarLogins);

// Sessoes
router.get('/admin/sessoes', validarTokenAdmin, adminController.listarSessoes);

export default router;