import cors, { CorsOptions } from 'cors';
export declare const corsOptions: CorsOptions;
export declare const corsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
declare const _default: {
    corsOptions: CorsOptions;
    corsMiddleware: (req: cors.CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void;
};
export default _default;
//# sourceMappingURL=cors.d.ts.map