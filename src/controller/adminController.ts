// ============================================
// ADMIN CONTROLLER - CORRIGIDO + NOVOS ENDPOINTS
// ============================================

import { Request, Response } from "express";
import adminService from "../services/adminService";
import { RequestWithAdmin } from "../types/admin";
import { query } from "../database/connection";


// Funcao auxiliar para pegar IP
const getClientIp = (req: Request): string => {
    const ip = req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0';
    return Array.isArray(ip) ? ip[0] : ip;
};

// Funcao auxiliar para pegar ID numerico do param
const getParamId = (req: Request): number => {
    const id = req.params.id;
    const idStr = Array.isArray(id) ? id[0] : id;
    return parseInt(idStr, 10);
};

// Confere o token e a permissao; responde 401/403 e devolve null se nao autorizado
const autorizar = async (req: Request, res: Response, permissao: string, mensagem: string): Promise<number | null> => {
    const adminId = (req as RequestWithAdmin).admin?.admin_id;

    if (!adminId) {
        res.status(401).json({ status: false, message: "Nao autorizado" });
        return null;
    }

    const temPermissao = await adminService.verificarPermissao(adminId, permissao);
    if (!temPermissao) {
        res.status(403).json({ status: false, message: mensagem });
        return null;
    }

    return adminId;
};

// Detecta o tipo da imagem pelos primeiros bytes (nao confia no Content-Type enviado)
const detectarMimeImagem = (b: Buffer): string | null => {
    if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
    return null;
};

// Confere a ESTRUTURA da imagem (nao so o cabecalho): dimensoes reais, marcador de fim e nada sobrando
// depois dele. Barra arquivo "disfarçado" de imagem (shell/script colado no fim ou dentro do arquivo).
const estruturaImagemValida = (b: Buffer, mime: string): boolean => {
    const MAX_LADO = 20000;
    const ladoOk = (w: number, h: number): boolean => w > 0 && h > 0 && w <= MAX_LADO && h <= MAX_LADO;

    // Assinaturas de codigo nunca aparecem numa imagem normal
    const texto = b.toString('latin1').toLowerCase();
    if (texto.includes('<?php') || texto.includes('<script') || texto.includes('#!/bin/') || texto.includes('eval(base64')) {
        return false;
    }

    if (mime === 'image/png') {
        if (b.length < 45) return false;
        let pos = 8;
        let temIhdr = false;
        while (pos + 12 <= b.length) {
            const tam = b.readUInt32BE(pos);
            const tipo = b.toString('ascii', pos + 4, pos + 8);
            const fim = pos + 12 + tam;
            if (fim > b.length) return false;
            if (!temIhdr) {
                if (tipo !== 'IHDR' || tam !== 13) return false;
                if (!ladoOk(b.readUInt32BE(pos + 8), b.readUInt32BE(pos + 12))) return false;
                temIhdr = true;
            }
            if (tipo === 'IEND') return fim === b.length;
            pos = fim;
        }
        return false;
    }

    if (mime === 'image/jpeg') {
        let fim = b.length;
        while (fim > 2 && b[fim - 1] === 0x00) fim--; // alguns celulares deixam zeros no final
        if (b[fim - 2] !== 0xff || b[fim - 1] !== 0xd9) return false;
        let pos = 2;
        while (pos + 4 <= fim) {
            if (b[pos] !== 0xff) return false;
            const marcador = b[pos + 1];
            if (marcador === 0xff) { pos++; continue; }
            if ((marcador >= 0xc0 && marcador <= 0xc2) || marcador === 0xc3) {
                if (pos + 9 > fim) return false;
                return ladoOk(b.readUInt16BE(pos + 7), b.readUInt16BE(pos + 5));
            }
            if (marcador === 0xda || marcador === 0xd9) return false; // dados/fim antes de achar as dimensoes
            pos += 2 + b.readUInt16BE(pos + 2);
        }
        return false;
    }

    if (mime === 'image/webp') {
        if (b.length < 30) return false;
        if (b.readUInt32LE(4) + 8 !== b.length) return false; // tamanho declarado = tamanho real
        const tipo = b.toString('ascii', 12, 16);
        if (tipo !== 'VP8 ' && tipo !== 'VP8L' && tipo !== 'VP8X') return false;
        if (tipo === 'VP8X') {
            const w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
            const h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
            return ladoOk(w, h);
        }
        return true;
    }

    return false;
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

            await adminService.marcarUsuarioPago(id, adminId, ip, req.body?.valor);

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

    
    async limparInativas(_req: Request, res: Response) {
        try {
            const { limparSessoesInativas } = await import('../services/sessaoService');
            const total = await limparSessoesInativas();

            return res.json({ status: true, sessoes_desativadas: total });
        } catch (error) {
            console.error('[limparInativas] Erro:', error);
            return res.status(500).json({ status: false, message: 'Erro interno' });
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

    // ============================================
    // RENOVAR USUARIO
    // ============================================
    async renovarUsuario(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'marcar_pago', "Sem permissao para renovar usuarios");
            if (adminId === null) return res;

            const id = getParamId(req);
            if (isNaN(id)) {
                return res.status(400).json({ status: false, message: "ID invalido" });
            }

            const { dias, data_validade, valor } = req.body ?? {};
            const resultado = await adminService.renovarUsuario(id, adminId, getClientIp(req), { dias, data_validade, valor });

            return res.json({
                status: true,
                message: "Usuario renovado com sucesso",
                dados: resultado
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao renovar usuario"
            });
        }
    }

    // ============================================
    // PAGAMENTOS - HISTORICO
    // ============================================
    async listarPagamentos(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'ver_usuarios', "Sem permissao para ver pagamentos");
            if (adminId === null) return res;

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 30;
            const busca = req.query.busca as string;
            const usuario_id = req.query.usuario_id ? parseInt(req.query.usuario_id as string) : undefined;

            const resultado = await adminService.listarPagamentos({ page, limit, busca, usuario_id });

            return res.json({
                status: true,
                dados: resultado.dados,
                total: resultado.total,
                total_paginas: resultado.total_paginas,
                soma: resultado.soma,
                pagina_atual: page
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao listar pagamentos"
            });
        }
    }

    // ============================================
    // PAGAMENTOS - RESUMO
    // ============================================
    async resumoPagamentos(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'ver_dashboard', "Sem permissao para ver o resumo financeiro");
            if (adminId === null) return res;

            const dados = await adminService.resumoPagamentos();

            return res.json({ status: true, dados });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao carregar resumo de pagamentos"
            });
        }
    }

    // ============================================
    // BLOQUEAR / DESBLOQUEAR USUARIO
    // ============================================
    async bloquearUsuario(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'excluir_usuario', "Sem permissao para bloquear usuarios");
            if (adminId === null) return res;

            const id = getParamId(req);
            if (isNaN(id)) {
                return res.status(400).json({ status: false, message: "ID invalido" });
            }

            const resultado = await adminService.alterarBloqueioUsuario(id, adminId, getClientIp(req), true, req.body?.motivo);

            return res.json({
                status: true,
                message: "Usuario bloqueado com sucesso",
                dados: resultado
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao bloquear usuario"
            });
        }
    }

    async desbloquearUsuario(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'excluir_usuario', "Sem permissao para desbloquear usuarios");
            if (adminId === null) return res;

            const id = getParamId(req);
            if (isNaN(id)) {
                return res.status(400).json({ status: false, message: "ID invalido" });
            }

            await adminService.alterarBloqueioUsuario(id, adminId, getClientIp(req), false);

            return res.json({
                status: true,
                message: "Usuario desbloqueado com sucesso"
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao desbloquear usuario"
            });
        }
    }

    // ============================================
    // SESSOES / IPS DE UM USUARIO + DESLOGAR
    // ============================================
    async listarSessoesUsuario(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'ver_sessoes', "Sem permissao para ver sessoes");
            if (adminId === null) return res;

            const id = getParamId(req);
            if (isNaN(id)) {
                return res.status(400).json({ status: false, message: "ID invalido" });
            }

            const dados = await adminService.listarSessoesUsuario(id);

            return res.json({ status: true, dados });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao listar sessoes do usuario"
            });
        }
    }

    async deslogarUsuario(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'ver_sessoes', "Sem permissao para gerenciar sessoes");
            if (adminId === null) return res;

            const id = getParamId(req);
            if (isNaN(id)) {
                return res.status(400).json({ status: false, message: "ID invalido" });
            }

            const resultado = await adminService.deslogarUsuario(id, adminId, getClientIp(req));

            return res.json({
                status: true,
                message: resultado.sessoes_encerradas > 0
                    ? "Usuario deslogado com sucesso"
                    : "Usuario nao tinha sessao ativa",
                dados: resultado
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao deslogar usuario"
            });
        }
    }

    // ============================================
    // USUARIOS COM MUITOS IPS DIFERENTES
    // ============================================
    async listarIpsSuspeitos(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'ver_logs', "Sem permissao para ver logs");
            if (adminId === null) return res;

            const dias = Math.min(Math.max(parseInt(req.query.dias as string) || 7, 1), 90);
            const minimo = Math.min(Math.max(parseInt(req.query.minimo as string) || 3, 2), 50);

            const dados = await adminService.listarIpsSuspeitos(dias, minimo);

            return res.json({ status: true, dados, dias, minimo });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao listar IPs suspeitos"
            });
        }
    }

    // ============================================
    // COMPROVANTE - ENVIO PUBLICO (usuario manda e-mail + imagem)
    // POST /comprovantes?email=...  com a imagem no corpo (Content-Type: image/png|jpeg|webp)
    // ============================================
    async enviarComprovante(req: Request, res: Response): Promise<Response> {
        try {
            const email = String(req.query.email ?? '').trim().toLowerCase();

            if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ status: false, message: "E-mail invalido" });
            }

            const imagem = req.body;
            if (!Buffer.isBuffer(imagem) || imagem.length === 0) {
                return res.status(415).json({ status: false, message: "Envie uma imagem PNG, JPG ou WEBP" });
            }
            if (imagem.length < 1024) {
                return res.status(400).json({ status: false, message: "Imagem muito pequena" });
            }

            const mime = detectarMimeImagem(imagem);
            if (!mime) {
                return res.status(415).json({ status: false, message: "Arquivo nao e uma imagem PNG, JPG ou WEBP valida" });
            }

            if (!estruturaImagemValida(imagem, mime)) {
                return res.status(415).json({ status: false, message: "Imagem invalida ou corrompida" });
            }

            await adminService.salvarComprovante({
                email,
                imagem,
                mime,
                ip: getClientIp(req),
                userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300)
            });

            // Mesma resposta exista ou nao uma conta com esse e-mail
            return res.status(201).json({
                status: true,
                message: "Comprovante enviado! Aguarde a confirmacao."
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.status ? error.message : "Erro ao enviar comprovante"
            });
        }
    }

    // ============================================
    // COMPROVANTES - PAINEL
    // ============================================
    async listarComprovantes(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'ver_usuarios', "Sem permissao para ver comprovantes");
            if (adminId === null) return res;

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 30;
            const status = req.query.status as string;
            const busca = req.query.busca as string;

            const resultado = await adminService.listarComprovantes({ page, limit, status, busca });

            return res.json({
                status: true,
                dados: resultado.dados,
                total: resultado.total,
                total_paginas: resultado.total_paginas,
                pendentes: resultado.pendentes,
                pagina_atual: page
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao listar comprovantes"
            });
        }
    }

    async imagemComprovante(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'ver_usuarios', "Sem permissao para ver comprovantes");
            if (adminId === null) return res;

            const id = getParamId(req);
            if (isNaN(id)) {
                return res.status(400).json({ status: false, message: "ID invalido" });
            }

            const { mime, imagem } = await adminService.buscarImagemComprovante(id);

            res.setHeader('Content-Type', mime);
            res.setHeader('Cache-Control', 'private, max-age=300');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            return res.send(imagem);

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao carregar imagem"
            });
        }
    }

    async confirmarComprovante(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'marcar_pago', "Sem permissao para confirmar pagamentos");
            if (adminId === null) return res;

            const id = getParamId(req);
            if (isNaN(id)) {
                return res.status(400).json({ status: false, message: "ID invalido" });
            }

            const { dias, data_validade, valor } = req.body ?? {};
            const resultado = await adminService.confirmarComprovante(id, adminId, getClientIp(req), { dias, data_validade, valor });

            return res.json({
                status: true,
                message: "Comprovante confirmado e conta renovada",
                dados: resultado
            });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao confirmar comprovante"
            });
        }
    }

    async recusarComprovante(req: Request, res: Response): Promise<Response> {
        try {
            const adminId = await autorizar(req, res, 'marcar_pago', "Sem permissao para recusar comprovantes");
            if (adminId === null) return res;

            const id = getParamId(req);
            if (isNaN(id)) {
                return res.status(400).json({ status: false, message: "ID invalido" });
            }

            await adminService.recusarComprovante(id, adminId, getClientIp(req), req.body?.motivo);

            return res.json({ status: true, message: "Comprovante recusado" });

        } catch (error: any) {
            return res.status(error.status || 500).json({
                status: false,
                message: error.message || "Erro ao recusar comprovante"
            });
        }
    }
}

export default new AdminController();