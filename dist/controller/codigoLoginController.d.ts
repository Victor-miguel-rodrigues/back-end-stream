import { Request, Response } from 'express';
export declare class CodigoLoginController {
    usar(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    vincular(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    salvarApp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    gerar(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    consultar(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    desativar(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
declare const _default: CodigoLoginController;
export default _default;
//# sourceMappingURL=codigoLoginController.d.ts.map