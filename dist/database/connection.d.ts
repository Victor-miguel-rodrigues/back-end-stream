import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
export declare const query: <T extends QueryResultRow = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
export declare const transaction: <T>(callback: (client: PoolClient) => Promise<T>) => Promise<T>;
export declare const testConnection: () => Promise<boolean>;
export declare const closePool: () => Promise<void>;
declare const _default: {
    pool: Pool;
    query: typeof query;
    transaction: typeof transaction;
    testConnection: typeof testConnection;
    closePool: typeof closePool;
};
export default _default;
//# sourceMappingURL=connection.d.ts.map