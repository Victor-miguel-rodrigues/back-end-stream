import { Request, Response, NextFunction } from 'express';
import adminService from '../services/adminService';
import { RequestWithAdmin } from '../types/admin';
import { compararSecretSeguro } from '../utils/crypto';

export const validarTokenAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({ status: false, message: 'Token nao fornecido' });
            return;
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({ status: false, message: 'Formato de token invalido' });
            return;
        }

        const token = parts[1];
        const adminData = await adminService.validarTokenAdmin(token);

        if (!adminData) {
            res.status(401).json({ status: false, message: 'Token invalido ou expirado' });
            return;
        }

        (req as RequestWithAdmin).admin = adminData;
        (req as RequestWithAdmin).token = token;

        next();
    } catch (error) {
        console.error('[validarTokenAdmin] Erro:', error);
        res.status(500).json({ status: false, message: 'Erro ao validar token' });
    }
};

export const verificarPermissao = (permissao: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                res.status(401).json({ status: false, message: 'Nao autorizado' });
                return;
            }

            const temPermissao = await adminService.verificarPermissao(adminId, permissao);
            if (!temPermissao) {
                res.status(403).json({ status: false, message: 'Sem permissao para executar esta acao' });
                return;
            }

            next();
        } catch (error) {
            console.error('[verificarPermissao] Erro:', error);
            res.status(500).json({ status: false, message: 'Erro ao verificar permissao' });
        }
    };
};

// Aceita se admin tem PELO MENOS UMA das permissoes (OR)
export const verificarAlgumaPermissao = (permissoes: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                res.status(401).json({ status: false, message: 'Nao autorizado' });
                return;
            }

            for (const permissao of permissoes) {
                const temPermissao = await adminService.verificarPermissao(adminId, permissao);
                if (temPermissao) { next(); return; }
            }

            res.status(403).json({ status: false, message: 'Sem permissao para executar esta acao' });
        } catch (error) {
            console.error('[verificarAlgumaPermissao] Erro:', error);
            res.status(500).json({ status: false, message: 'Erro ao verificar permissoes' });
        }
    };
};

// Aceita somente se admin tem TODAS as permissoes (AND)
export const verificarTodasPermissoes = (permissoes: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const adminId = (req as RequestWithAdmin).admin?.admin_id;

            if (!adminId) {
                res.status(401).json({ status: false, message: 'Nao autorizado' });
                return;
            }

            for (const permissao of permissoes) {
                const temPermissao = await adminService.verificarPermissao(adminId, permissao);
                if (!temPermissao) {
                    res.status(403).json({ status: false, message: 'Sem permissao para executar esta acao' });
                    return;
                }
            }

            next();
        } catch (error) {
            console.error('[verificarTodasPermissoes] Erro:', error);
            res.status(500).json({ status: false, message: 'Erro ao verificar permissoes' });
        }
    };
};

// Verifica se e super admin
export const verificarSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const adminId = (req as RequestWithAdmin).admin?.admin_id;

        if (!adminId) {
            res.status(401).json({ status: false, message: 'Nao autorizado' });
            return;
        }

        const temPermissao = await adminService.verificarPermissao(adminId, 'super_admin');
        if (!temPermissao) {
            res.status(403).json({ status: false, message: 'Acesso restrito a super administradores' });
            return;
        }

        next();
    } catch (error) {
        console.error('[verificarSuperAdmin] Erro:', error);
        res.status(500).json({ status: false, message: 'Erro ao verificar super admin' });
    }
};

// Valida o secret de cron jobs externos via header x-cron-secret (timing-safe)
export const validarCronSecret = (req: Request, res: Response, next: NextFunction): void => {
    const secret = req.headers['x-cron-secret'];
    const cronSecret = process.env.CRON_SECRET ?? '';

    if (!secret || !cronSecret) {
        res.status(401).json({ status: false, message: 'Secret nao fornecido' });
        return;
    }

    const secretStr = Array.isArray(secret) ? secret[0] : secret;
    if (!compararSecretSeguro(secretStr, cronSecret)) {
        res.status(403).json({ status: false, message: 'Secret invalido' });
        return;
    }

    next();
};

// Helper: extrai string de header que pode ser array
const getHeaderString = (value: string | string[] | undefined): string => {
    if (!value) return '';
    return Array.isArray(value) ? value[0] : value;
};

// Helper: sanitiza body para nao logar senhas
function sanitizarBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const SENSITIVE = ['senha', 'senha_hash', 'palavra_secreta', 'token', 'password'];
    const sanitized = { ...body };
    for (const field of SENSITIVE) {
        if (sanitized[field]) sanitized[field] = '***';
    }
    return sanitized;
}

// Middleware: Registrar log de acao do admin (so em respostas de sucesso)
export const registrarLog = (acao: string, descricaoTemplate?: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const originalJson = res.json.bind(res);

        res.json = function (data: any): any {
            const isSucesso = res.statusCode >= 200 && res.statusCode < 300;

            if (isSucesso) {
                const adminId = (req as RequestWithAdmin).admin?.admin_id;
                const ip = getHeaderString(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0');
                const userAgent = getHeaderString(req.headers['user-agent']);

                if (adminId) {
                    const descricao = descricaoTemplate
                        ? descricaoTemplate.replace(':id', String(req.params.id ?? ''))
                        : `${acao} executada`;

                    adminService
                        .logAdminAction(adminId, acao, descricao, ip, {
                            metodo: req.method,
                            rota: req.originalUrl,
                            params: req.params,
                            user_agent: userAgent,
                            body: sanitizarBody(req.body)
                        })
                        .catch(err => console.error('[registrarLog] Erro:', err));
                }
            }

            return originalJson(data);
        };

        next();
    };
};

export default {
    validarTokenAdmin,
    verificarPermissao,
    verificarAlgumaPermissao,
    verificarTodasPermissoes,
    verificarSuperAdmin,
    validarCronSecret,
    registrarLog
};