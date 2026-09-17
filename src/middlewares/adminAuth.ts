// ============================================
// MIDDLEWARES ADMIN
// ============================================

import { Request, Response, NextFunction } from "express";
import adminService from "../services/adminService";
import { RequestWithAdmin } from "../types/admin";

export const validarTokenAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({ status: false, message: "Token nao fornecido" });
            return;
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({ status: false, message: "Formato de token invalido" });
            return;
        }

        const token = parts[1];
        const adminData = await adminService.validarTokenAdmin(token);

        if (!adminData) {
            res.status(401).json({ status: false, message: "Token invalido ou expirado" });
            return;
        }

        (req as RequestWithAdmin).admin = adminData;
        (req as RequestWithAdmin).token = token;

        next();

    } catch (error) {
        console.error("Erro ao validar token admin:", error);
        res.status(500).json({ status: false, message: "Erro ao validar token" });
    }
};

export const verificarPermissao = (permissao: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                res.status(401).json({ status: false, message: "Nao autorizado" });
                return;
            }

            const temPermissao = await adminService.verificarPermissao(adminId, permissao);

            if (!temPermissao) {
                res.status(403).json({
                    status: false,
                    message: `Sem permissao para executar esta acao (${permissao})`
                });
                return;
            }

            next();

        } catch (error) {
            console.error("Erro ao verificar permissao:", error);
            res.status(500).json({ status: false, message: "Erro ao verificar permissao" });
        }
    };
};

// ============================================
// 🆕 VERIFICAR PERMISSOES (múltiplas - OR)
// Aceita se o admin tem PELO MENOS UMA das permissões
// ============================================
export const verificarAlgumaPermissao = (permissoes: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                res.status(401).json({ status: false, message: "Nao autorizado" });
                return;
            }

            for (const permissao of permissoes) {
                const temPermissao = await adminService.verificarPermissao(adminId, permissao);
                if (temPermissao) {
                    next();
                    return;
                }
            }

            res.status(403).json({
                status: false,
                message: `Sem permissao para executar esta acao. Requer uma das: ${permissoes.join(', ')}`
            });

        } catch (error) {
            console.error("Erro ao verificar permissoes:", error);
            res.status(500).json({ status: false, message: "Erro ao verificar permissoes" });
        }
    };
};

// ============================================
// 🆕 VERIFICAR TODAS AS PERMISSOES (AND)
// Aceita somente se o admin tem TODAS as permissões
// ============================================
export const verificarTodasPermissoes = (permissoes: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                res.status(401).json({ status: false, message: "Nao autorizado" });
                return;
            }

            for (const permissao of permissoes) {
                const temPermissao = await adminService.verificarPermissao(adminId, permissao);
                if (!temPermissao) {
                    res.status(403).json({
                        status: false,
                        message: `Sem permissao para executar esta acao. Requer todas: ${permissoes.join(', ')}`
                    });
                    return;
                }
            }

            next();

        } catch (error) {
            console.error("Erro ao verificar permissoes:", error);
            res.status(500).json({ status: false, message: "Erro ao verificar permissoes" });
        }
    };
};

// ============================================
// 🆕 VERIFICAR SE É SUPER ADMIN
// (Se o admin tem permissao 'super_admin' ou é o admin master)
// ============================================
export const verificarSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const adminId = (req as RequestWithAdmin).admin?.admin_id;

        if (!adminId) {
            res.status(401).json({ status: false, message: "Nao autorizado" });
            return;
        }

        const temPermissao = await adminService.verificarPermissao(adminId, 'super_admin');

        if (!temPermissao) {
            res.status(403).json({
                status: false,
                message: "Acesso restrito a super administradores"
            });
            return;
        }

        next();

    } catch (error) {
        console.error("Erro ao verificar super admin:", error);
        res.status(500).json({ status: false, message: "Erro ao verificar super admin" });
    }
};

// ============================================
// 🆕 VALIDAR CRON SECRET
// Para rotas de cron job externo
// ============================================
export const validarCronSecret = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const secret = req.headers['x-cron-secret'];

        if (!secret) {
            res.status(401).json({ status: false, message: "Secret nao fornecido" });
            return;
        }

        if (secret !== process.env.CRON_SECRET) {
            res.status(403).json({ status: false, message: "Secret invalido" });
            return;
        }

        next();

    } catch (error) {
        console.error("Erro ao validar cron secret:", error);
        res.status(500).json({ status: false, message: "Erro ao validar cron secret" });
    }
};

// ============================================
// 🆕 HELPER: extrai string do header (string | string[])
// ============================================
const getHeaderString = (value: string | string[] | undefined): string => {
    if (!value) return '';
    return Array.isArray(value) ? value[0] : value;
};

// ============================================
// 🆕 REGISTRAR LOG DE AÇÃO DO ADMIN
// Middleware que intercepta a resposta e registra a ação
// Uso: router.post('/rota', validarTokenAdmin, registrarLog('acao_nome'), controller.metodo)
// ============================================
export const registrarLog = (acao: string, descricaoTemplate?: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const originalJson = res.json.bind(res);

        res.json = function (data: any): any {
            // Só registra log se a resposta foi sucesso
            const isSucesso = res.statusCode >= 200 && res.statusCode < 300;

            if (isSucesso) {
                const adminId = (req as RequestWithAdmin).admin?.admin_id;
                const ip = getHeaderString(req.ip || req.connection?.remoteAddress || '0.0.0.0');
                const userAgent = getHeaderString(req.headers['user-agent']);

                if (adminId) {
                    const descricao = descricaoTemplate
                        ? descricaoTemplate.replace(':id', String(req.params.id || ''))
                        : `${acao} executada`;

                    adminService
                        .logAdminAction(adminId, acao, descricao, ip, {
                            metodo: req.method,
                            rota: req.originalUrl,
                            params: req.params,
                            user_agent: userAgent,
                            body: sanitizarBody(req.body)
                        })
                        .catch((err) => console.error('Erro ao registrar log:', err));
                }
            }

            return originalJson(data);
        };

        next();
    };
};

// ============================================
// 🆕 HELPER: sanitiza body para não logar senhas
// ============================================
function sanitizarBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const SENSITIVE_FIELDS = ['senha', 'senha_hash', 'palavra_secreta', 'token', 'password'];
    const sanitized = { ...body };

    for (const field of SENSITIVE_FIELDS) {
        if (sanitized[field]) {
            sanitized[field] = '***';
        }
    }

    return sanitized;
}

// ============================================
// 🆕 EXPORT DEFAULT
// ============================================
export default {
    validarTokenAdmin,
    verificarPermissao,
    verificarAlgumaPermissao,
    verificarTodasPermissoes,
    verificarSuperAdmin,
    validarCronSecret,
    registrarLog
};