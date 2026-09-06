import { Request, Response, NextFunction } from "express";
export declare function validarUsuario(req: Request, res: Response, next: NextFunction): void;
export declare function validarLogin(req: Request, res: Response, next: NextFunction): void;
export declare function validarPerfilUsuario(req: Request, res: Response, next: NextFunction): void;
export declare function validarCriarPerfil(req: Request, res: Response, next: NextFunction): void;
export declare function validarAtualizarPerfil(req: Request, res: Response, next: NextFunction): void;
export declare function validarToken(req: Request, res: Response, next: NextFunction): void;
export declare function validarId(req: Request, res: Response, next: NextFunction): void;
export declare function validarEmailParam(req: Request, res: Response, next: NextFunction): void;
export declare function validarPaginacao(req: Request, res: Response, next: NextFunction): void;
declare const _default: {
    validarUsuario: typeof validarUsuario;
    validarLogin: typeof validarLogin;
    validarPerfilUsuario: typeof validarPerfilUsuario;
    validarCriarPerfil: typeof validarCriarPerfil;
    validarAtualizarPerfil: typeof validarAtualizarPerfil;
    validarToken: typeof validarToken;
    validarId: typeof validarId;
    validarEmailParam: typeof validarEmailParam;
    validarPaginacao: typeof validarPaginacao;
};
export default _default;
//# sourceMappingURL=userValidator.d.ts.map