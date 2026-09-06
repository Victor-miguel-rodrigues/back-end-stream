import cors, { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
export declare const corsOptions: CorsOptions;
export declare const corsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
export declare const corsLogger: (req: Request, _res: Response, next: NextFunction) => void;
declare const _default: {
    corsOptions: CorsOptions;
    corsMiddleware: (req: cors.CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void;
    corsLogger: typeof corsLogger;
};
export default _default;
//# sourceMappingURL=cors.d.ts.map