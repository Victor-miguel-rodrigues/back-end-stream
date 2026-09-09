import { Request, Response } from "express";
export declare class ServidorController {
    listarServidoresPublicos(req: Request, res: Response): Promise<Response>;
    listarServidoresAdmin(req: Request, res: Response): Promise<Response>;
    buscarServidor(req: Request, res: Response): Promise<Response>;
    criarServidor(req: Request, res: Response): Promise<Response>;
    atualizarServidor(req: Request, res: Response): Promise<Response>;
    excluirServidor(req: Request, res: Response): Promise<Response>;
}
declare const _default: ServidorController;
export default _default;
//# sourceMappingURL=servidorController.d.ts.map