import { Request, Response } from "express";
export declare class UserCadastroController {
    listar(_req: any, res: any): any;
    receber(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logar(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    checkPagamento(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    validarToken(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    listarFavoritos(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    adicionarFavorito(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    removerFavorito(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
declare const _default: UserCadastroController;
export default _default;
//# sourceMappingURL=UserCadastroController.d.ts.map