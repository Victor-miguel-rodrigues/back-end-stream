import { Request, Response } from "express";
export declare class AdminController {
    verificarCredenciais(req: Request, res: Response): Promise<Response>;
    verificarPalavraSecreta(req: Request, res: Response): Promise<Response>;
    dashboard(req: Request, res: Response): Promise<Response>;
    listarUsuarios(req: Request, res: Response): Promise<Response>;
    marcarPago(req: Request, res: Response): Promise<Response>;
    desmarcarPago(req: Request, res: Response): Promise<Response>;
    logout(req: Request, res: Response): Promise<Response>;
    excluirUsuario(req: Request<{
        id: string;
    }>, // resolve o string | string[]
    res: Response): Promise<Response>;
}
declare const _default: AdminController;
export default _default;
//# sourceMappingURL=adminController.d.ts.map