import { Request, Response, NextFunction } from "express";
export declare const validarTokenAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verificarPermissao: (permissao: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verificarAlgumaPermissao: (permissoes: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verificarTodasPermissoes: (permissoes: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verificarSuperAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validarCronSecret: (req: Request, res: Response, next: NextFunction) => void;
export declare const registrarLog: (acao: string, descricaoTemplate?: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    validarTokenAdmin: typeof validarTokenAdmin;
    verificarPermissao: typeof verificarPermissao;
    verificarAlgumaPermissao: typeof verificarAlgumaPermissao;
    verificarTodasPermissoes: typeof verificarTodasPermissoes;
    verificarSuperAdmin: typeof verificarSuperAdmin;
    validarCronSecret: typeof validarCronSecret;
    registrarLog: typeof registrarLog;
};
export default _default;
//# sourceMappingURL=adminAuth.d.ts.map