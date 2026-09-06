import { Request, Response, NextFunction } from 'express';
export declare const validarToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verificarPerfil: (perfisPermitidos: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const logAcao: (acao: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    validarToken: typeof validarToken;
    verificarPerfil: typeof verificarPerfil;
    logAcao: typeof logAcao;
};
export default _default;
//# sourceMappingURL=auth.d.ts.map