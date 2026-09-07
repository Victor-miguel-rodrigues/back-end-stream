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