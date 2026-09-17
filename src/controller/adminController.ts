// ============================================
// ADMIN CONTROLLER - CORRIGIDO + NOVOS ENDPOINTS
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

    // ============================================
    // 🆕 PERMISSÕES - LISTAR DISPONÍVEIS
    // ============================================
    async listarPermissoes(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const permissoes = await adminService.listarPermissoes();

            return res.json({
                status: true,
                dados: permissoes
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao listar permissoes"
            });
        }
    }

    // ============================================
    // 🆕 ADMINS - LISTAR
    // ============================================
    async listarAdmins(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }

            const admins = await adminService.listarAdmins();

            return res.json({
                status: true,
                dados: admins
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao listar admins"
            });
        }
    }

    // ============================================
    // 🆕 ADMINS - BUSCAR POR ID
    // ============================================
    async buscarAdmin(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const id = getParamId(req);

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }

            const admin = await adminService.buscarAdmin(id);

            if (!admin) {
                return res.status(404).json({
                    status: false,
                    message: "Admin nao encontrado"
                });
            }

            return res.json({
                status: true,
                dados: admin
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao buscar admin"
            });
        }
    }

    // ============================================
    // 🆕 ADMINS - CRIAR
    // ============================================
    async criarAdmin(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }

            const { nome, email, senha, permissoes } = req.body;

            if (!nome || !email || !senha) {
                return res.status(400).json({
                    status: false,
                    message: "Nome, email e senha sao obrigatorios"
                });
            }

            const admin = await adminService.criarAdmin({ nome, email, senha, permissoes });

            // Registra log
            try {
                await adminService.registrarLog({
                    admin_id: adminId,
                    acao: 'criar_admin',
                    descricao: `Admin criado: ${admin.email}`,
                    ip,
                    user_agent: userAgent
                });
            } catch (logError) {
                console.error("Erro ao registrar log (criarAdmin):", logError);
            }

            return res.status(201).json({
                status: true,
                message: "Admin criado com sucesso",
                dados: admin
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao criar admin"
            });
        }
    }

    // ============================================
    // 🆕 ADMINS - ATUALIZAR
    // ============================================
    async atualizarAdmin(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const id = getParamId(req);
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }

            const admin = await adminService.atualizarAdmin(id, req.body);

            try {
                await adminService.registrarLog({
                    admin_id: adminId,
                    acao: 'atualizar_admin',
                    descricao: `Admin atualizado: ${id}`,
                    ip,
                    user_agent: userAgent
                });
            } catch (logError) {
                console.error("Erro ao registrar log (atualizarAdmin):", logError);
            }

            return res.json({
                status: true,
                message: "Admin atualizado com sucesso",
                dados: admin
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao atualizar admin"
            });
        }
    }

    // ============================================
    // 🆕 ADMINS - EXCLUIR
    // ============================================
    async excluirAdmin(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const id = getParamId(req);
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            // Não pode excluir a si mesmo
            if (adminId === id) {
                return res.status(400).json({
                    status: false,
                    message: "Voce nao pode excluir sua propria conta"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'gerenciar_admins');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar admins"
                });
            }

            const ok = await adminService.excluirAdmin(id);

            if (!ok) {
                return res.status(404).json({
                    status: false,
                    message: "Admin nao encontrado"
                });
            }

            try {
                await adminService.registrarLog({
                    admin_id: adminId,
                    acao: 'excluir_admin',
                    descricao: `Admin excluido: ${id}`,
                    ip,
                    user_agent: userAgent
                });
            } catch (logError) {
                console.error("Erro ao registrar log (excluirAdmin):", logError);
            }

            return res.json({
                status: true,
                message: "Admin excluido com sucesso"
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao excluir admin"
            });
        }
    }

    // ============================================
    // 🆕 LOGS DO SISTEMA - LISTAR
    // ============================================
    async listarLogs(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'ver_logs');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para ver logs"
                });
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const acao = req.query.acao as string;
            const desde = req.query.desde as string;
            const ate = req.query.ate as string;
            const admin_id = req.query.admin_id ? parseInt(req.query.admin_id as string) : undefined;

            const resultado = await adminService.listarLogs({
                page,
                limit,
                acao,
                desde,
                ate,
                admin_id
            });

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
                message: error.message || "Erro ao listar logs"
            });
        }
    }

    // ============================================
    // 🆕 HISTORICO DE LOGINS DOS USUARIOS
    // ============================================
    async listarLogins(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'ver_logs');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para ver logs"
                });
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const busca = req.query.busca as string;
            const usuario_id = req.query.usuario_id ? parseInt(req.query.usuario_id as string) : undefined;

            const resultado = await adminService.listarLogins({
                page,
                limit,
                busca,
                usuario_id
            });

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
                message: error.message || "Erro ao listar logins"
            });
        }
    }

    // ============================================
    // 🆕 SESSOES ADMIN - LISTAR
    // ============================================
    async listarSessoes(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'ver_sessoes');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para ver sessoes"
                });
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const apenas_ativas = req.query.ativas === 'true';

            const resultado = await adminService.listarSessoesAdmin({
                page,
                limit,
                apenas_ativas
            });

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
                message: error.message || "Erro ao listar sessoes"
            });
        }
    }

    // ============================================
    // 🆕 SESSOES ADMIN - REVOGAR UMA
    // ============================================
    async revogarSessao(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const id = getParamId(req);
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'ver_sessoes');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar sessoes"
                });
            }

            const ok = await adminService.revogarSessaoAdmin(id);

            if (!ok) {
                return res.status(404).json({
                    status: false,
                    message: "Sessao nao encontrada"
                });
            }

            try {
                await adminService.registrarLog({
                    admin_id: adminId,
                    acao: 'revogar_sessao',
                    descricao: `Sessao revogada: ${id}`,
                    ip,
                    user_agent: userAgent
                });
            } catch (logError) {
                console.error("Erro ao registrar log (revogarSessao):", logError);
            }

            return res.json({
                status: true,
                message: "Sessao revogada com sucesso"
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao revogar sessao"
            });
        }
    }

    // ============================================
    // 🆕 SESSOES ADMIN - REVOGAR TODAS DE UM ADMIN
    // ============================================
    async revogarSessoesAdmin(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const targetId = getParamId(req);
            const ip = getClientIp(req);
            const userAgent = req.headers["user-agent"] || "";

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const temPermissao = await adminService.verificarPermissao(adminId, 'ver_sessoes');
            if (!temPermissao) {
                return res.status(403).json({
                    status: false,
                    message: "Sem permissao para gerenciar sessoes"
                });
            }

            const total = await adminService.revogarSessoesAdmin(targetId);

            try {
                await adminService.registrarLog({
                    admin_id: adminId,
                    acao: 'revogar_sessoes_admin',
                    descricao: `${total} sessoes revogadas do admin ${targetId}`,
                    ip,
                    user_agent: userAgent
                });
            } catch (logError) {
                console.error("Erro ao registrar log (revogarSessoesAdmin):", logError);
            }

            return res.json({
                status: true,
                message: `${total} sessoes revogadas`,
                sessoes_revogadas: total
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao revogar sessoes"
            });
        }
    }

    // ============================================
    // 🆕 LIMPAR SESSOES INATIVAS (autenticado)
    // ============================================
    async limparSessoesInativasAdmin(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;
            const ip = getClientIp(req);

            if (!adminId) {
                return res.status(401).json({
                    status: false,
                    message: "Nao autorizado"
                });
            }

            const total = await adminService.limparSessoesInativasAdmin();

            try {
                await adminService.registrarLog({
                    admin_id: adminId,
                    acao: 'limpar_sessoes_inativas',
                    descricao: `${total} sessoes inativas limpas`,
                    ip
                });
            } catch (logError) {
                console.error("Erro ao registrar log (limparSessoesInativasAdmin):", logError);
            }

            return res.json({
                status: true,
                sessoes_desativadas: total
            });

        } catch (error: any) {
            return res.status(500).json({
                status: false,
                message: error.message || "Erro ao limpar sessoes inativas"
            });
        }
    }
}

export default new AdminController();