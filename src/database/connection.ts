import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

pool.on('error', (err: Error) => {
    console.error('[DB] Erro no pool PostgreSQL:', err.message);
});

export const query = async <T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> => {
    const start = Date.now();
    try {
        const res = await pool.query<T>(text, params);

        if (process.env.NODE_ENV === 'development') {
            console.log('[DB] Query:', {
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${Date.now() - start}ms`,
                rows: res.rowCount
            });
        }

        return res;
    } catch (error) {
        console.error('[DB] Erro na query:', error);
        throw error;
    }
};

export const transaction = async <T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const testConnection = async (): Promise<boolean> => {
    try {
        await pool.query('SELECT NOW()');
        return true;
    } catch (error) {
        console.error('[DB] Falha ao testar conexao:', error);
        return false;
    }
};

export const closePool = async (): Promise<void> => {
    await pool.end();
};

export default { pool, query, transaction, testConnection, closePool };