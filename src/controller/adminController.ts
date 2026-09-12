// ============================================
// ADMIN CONTROLLER - CORRIGIDO
// ============================================

import { Request, Response } from "express";
import adminService from "../services/adminService";
import { RequestWithAdmin } from "../types/admin";
import { query } from "../database/connection";


// 🔴 FUNÇÃO AUXILIAR PARA PEGAR IP
const getClientIp = (req: Request): string => {
    const ip = req.ip || req.connection?.remoteAddress || "0.0.0.0";
    return Array.isArray(ip) ? ip[0] : ip;
};

// 🔴 FUNÇÃO AUXILIAR PARA PEGAR ID
const getParamId = (req: Request): number => {
    const id = req.params.id;
    const idStr = Array.isArray(id) ? id[0] : id;
    return parseInt(idStr, 10);
};

export class AdminController {
    // ============================================
    // PASSO 1: VERIFICAR CREDENCIAIS
    // ============================================
    async verificarCredenciais(req: Request, res: Response): Promise<Response> {
        try {
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({
                    status: false,
                    message: "Email e senha sao obrigatorios"
                });
            }

            const admin = await adminService.verificarCredenciais(email, senha);

            return res.json({
                status: true,
                message: "Credenciais verificadas. Digite a palavra secreta.",
                dados: {
                    admin_id: admin.admin_id,
                    nome: admin.nome,
                    email: admin.email
                }
            });

        } catch (error: any) {
            return res.status(error.status || 401).json({
                status: false,
                message: error.message || "Erro ao verificar credenciais"
            });
        }
    }

    // ============================================
    // PASSO 2: VERIFICAR PALAVRA SECRETA
    // ============================================
    async verificarPalavraSecreta(req: Request, res: Response): Promise<Response> {
        try {
            const { admin_id, palavra_secreta } = req.body;

            if (!admin_id || !palavra_secreta) {
                return res.status(400).json({
                    status: false,
                    message: "Admin ID e palavra secreta sao obrigatorios"
                });
            }

            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";

            const { token, expira_em } = await adminService.verificarPalavraSecreta(admin_id, palavra_secreta);

            await adminService.criarSessaoAdmin(admin_id, token, expira_em, ip, userAgent);

            const adminData = await adminService.validarTokenAdmin(token);

            return res.json({
                status: true,
                message: "Acesso concedido!",
                dados: {
                    admin: {
                        id: adminData?.admin_id,
                        nome: adminData?.nome,
                        email: adminData?.email,
                        permissoes: adminData?.permissoes || []
                    },
                    token: token,
                    expira_em: expira_em.toISOString()
                }
            });

        } catch (error: any) {
            return res.status(error.status || 401).json({
                status: false,
                message: error.message || "Erro ao verificar palavra secreta"
            });
        }
    }

    // ============================================
    // DASHBOARD
    // ============================================
    async dashboard(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'ver_dashboard');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para acessar o dashboard"
                });
            }

            const dados = await adminService.getDashboardData();

            return res.json({
                status: true,
                dados
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao carregar dashboard"
            });
        }
    }

    // ============================================
    // LISTAR USUARIOS
    // ============================================
    async listarUsuarios(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'ver_usuarios');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para ver usuarios"
                });
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const search = req.query.search as string;
            
            const pago = req.query.pago === 'true' ? true : req.query.pago === 'false' ? false : undefined;
            const ativo = req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined;

            const resultado = await adminService.listarUsuarios(page, limit, search, pago, ativo);

            return res.json({
                status: true,
                dados: resultado.dados,
                total: resultado.total,
                total_paginas: resultado.total_paginas,
                pagina_atual: page
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao listar usuarios"
            });
        }
    }

    // ============================================
    // MARCAR USUARIO COMO PAGO
    // ============================================
    async marcarPago(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            
            // 🔴 CORRIGIDO: usar função auxiliar para pegar ID
            const id = getParamId(req);
            const ip = getClientIp(req);

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'marcar_pago');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para marcar como pago"
                });
            }

            await adminService.marcarUsuarioPago(id, adminId, ip);

            return res.json({
                status: true,
                message: "Usuario marcado como pago com sucesso"
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao marcar usuario como pago"
            });
        }
    }

    // ============================================
    // DESMARCAR USUARIO COMO PAGO
    // ============================================
    async desmarcarPago(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            
            // 🔴 CORRIGIDO: usar função auxiliar para pegar ID
            const id = getParamId(req);
            const ip = getClientIp(req);

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'marcar_pago');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para desmarcar como pago"
                });
            }

            await adminService.desmarcarUsuarioPago(id, adminId, ip);

            return res.json({
                status: true,
                message: "Usuario desmarcado como pago com sucesso"
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao desmarcar usuario como pago"
            });
        }
    }

    // ============================================
    // LOGOUT ADMIN
    // ============================================
    async logout(req: Request, res: Response): Promise<Response> {
        try {
            const token = req.headers.authorization?.split(' ')[1] || req.body.token;

            if (token) {
                await adminService.logoutAdmin(token);
            }

            return res.json({
                status: true,
                message: "Logout realizado com sucesso"
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao fazer logout"
            });
        }
    }



    async excluirUsuario(
        req: Request<{ id: string }>,
        res: Response
        ): Promise<Response> {
            try {
                const raw = req.params.id;
                const idStr = Array.isArray(raw) ? raw[0] : raw;
                const id = Number(idStr);

                if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
                }

                // ✅ DELETE de verdade
                const result = await query(
                'DELETE FROM usuarios WHERE id = $1 RETURNING id, nome_usuario, email',
                [id]
                );

                if (!result || result.rowCount === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
                }

                return res.status(200).json({ ok: true, deletado: result.rows[0] });
            } catch (error) {
                console.error('Erro ao excluir usuário:', error);
                return res.status(500).json({ error: 'Erro interno' });
            }
    }

    
    async limparInativas(req: Request, res: Response) {
        try {
            const secret = req.headers['x-cron-secret'];
            if (secret !== process.env.CRON_SECRET) {
                return res.status(403).json({ status: false, message: "Não autorizado" });
            }
    
            // 👇 Importa a função do arquivo separado
            const { limparSessoesInativas } = await import('../services/sessaoService');
            const total = await limparSessoesInativas();
    
            return res.json({
                status: true,
                sessoes_desativadas: total
            });
        } catch (error) {
            console.error("Erro:", error);
            return res.status(500).json({ status: false, message: "Erro interno" });
        }
    }
}

export default new AdminController();