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
    limparInativas(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
    renovarUsuario(req: Request, res: Response): Promise<Response>;
    listarPagamentos(req: Request, res: Response): Promise<Response>;
    resumoPagamentos(req: Request, res: Response): Promise<Response>;
    bloquearUsuario(req: Request, res: Response): Promise<Response>;
    desbloquearUsuario(req: Request, res: Response): Promise<Response>;
    listarSessoesUsuario(req: Request, res: Response): Promise<Response>;
    deslogarUsuario(req: Request, res: Response): Promise<Response>;
    listarIpsSuspeitos(req: Request, res: Response): Promise<Response>;
    enviarComprovante(req: Request, res: Response): Promise<Response>;
    listarComprovantes(req: Request, res: Response): Promise<Response>;
    imagemComprovante(req: Request, res: Response): Promise<Response>;
    confirmarComprovante(req: Request, res: Response): Promise<Response>;
    recusarComprovante(req: Request, res: Response): Promise<Response>;
}
declare const _default: AdminController;
export default _default;
//# sourceMappingURL=adminController.d.ts.map