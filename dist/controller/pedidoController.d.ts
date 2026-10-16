import { Request, Response } from 'express';
declare class PedidoController {
    criar(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    listar(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    atualizarStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    excluir(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
declare const _default: PedidoController;
export default _default;
//# sourceMappingURL=pedidoController.d.ts.map