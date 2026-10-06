import { Router } from 'express';
import adminController from '../controller/adminController';
import { validarTokenAdmin, validarCronSecret } from '../middlewares/adminAuth';
import servidorController from '../controller/servidorController';
import { loginLimiter } from '../middlewares/rateLimit';

const router = Router();

// ============================================
// ROTAS PUBLICAS
// ============================================
router.get('/servidores', servidorController.listarServidoresPublicos);

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

// Servidores
router.get('/admin/servidores', validarTokenAdmin, servidorController.listarServidoresAdmin);
router.get('/admin/servidores/:id', validarTokenAdmin, servidorController.buscarServidor);
router.post('/admin/servidores', validarTokenAdmin, servidorController.criarServidor);
router.put('/admin/servidores/:id', validarTokenAdmin, servidorController.atualizarServidor);
router.delete('/admin/servidores/:id', validarTokenAdmin, servidorController.excluirServidor);

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
router.delete('/admin/sessoes/:id', validarTokenAdmin, adminController.revogarSessao);
router.delete('/admin/admins/:id/sessoes', validarTokenAdmin, adminController.revogarSessoesAdmin);
router.post('/admin/limpar-inativas-admin', validarTokenAdmin, adminController.limparSessoesInativasAdmin);

export default router;