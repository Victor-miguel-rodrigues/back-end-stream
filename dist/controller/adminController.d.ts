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
    }>, res: Response): Promise<Response>;
    limparInativas(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    listarPermissoes(req: Request, res: Response): Promise<Response>;
    listarAdmins(req: Request, res: Response): Promise<Response>;
    buscarAdmin(req: Request, res: Response): Promise<Response>;
    criarAdmin(req: Request, res: Response): Promise<Response>;
    atualizarAdmin(req: Request, res: Response): Promise<Response>;
    excluirAdmin(req: Request, res: Response): Promise<Response>;
    listarLogs(req: Request, res: Response): Promise<Response>;
    listarLogins(req: Request, res: Response): Promise<Response>;
    listarSessoes(req: Request, res: Response): Promise<Response>;
    revogarSessao(req: Request, res: Response): Promise<Response>;
    revogarSessoesAdmin(req: Request, res: Response): Promise<Response>;
    limparSessoesInativasAdmin(req: Request, res: Response): Promise<Response>;
}
declare const _default: AdminController;
export default _default;
//# sourceMappingURL=adminController.d.ts.map