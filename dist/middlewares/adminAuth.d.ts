import { Request, Response, NextFunction } from "express";
export declare const validarTokenAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verificarPermissao: (permissao: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=adminAuth.d.ts.map