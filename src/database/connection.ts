import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import dotenv from "dotenv";

dotenv.config();

// ============================================
// CONEXÃO COM SUPABASE (USANDO DATABASE_URL)
// ============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Necessário para conexões com Supabase
    },
    max: 20, // Máximo de conexões no pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// ============================================
// EVENTOS DO POOL
// ============================================
pool.on("connect", () => {
    console.log(" Conectado ao PostgreSQL (Supabase)");
});

pool.on("error", (err: Error) => {
    console.error(" Erro no PostgreSQL:", err.message);
});

// ============================================
// FUNÇÃO PARA EXECUTAR QUERIES
// ============================================
export const query = async <T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> => {
    const start = Date.now();
    try {
        const res = await pool.query<T>(text, params);
        const duration = Date.now() - start;

        if (process.env.NODE_ENV === "development") {
            console.log(" Query:", {
                text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
                duration: `${duration}ms`,
                rows: res.rowCount,
            });
        }

        return res;
    } catch (error) {
        console.error(" Erro na query:", error);
        throw error;
    }
};

// ============================================
// FUNÇÃO PARA TRANSAÇÕES
// ============================================
export const transaction = async <T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

// ============================================
// FUNÇÃO PARA TESTAR CONEXÃO
// ============================================
export const testConnection = async (): Promise<boolean> => {
    try {
        const result = await pool.query("SELECT NOW()");
        console.log(" Conexão testada com sucesso:", result.rows[0].now);
        return true;
    } catch (error) {
        console.error(" Falha ao testar conexão:", error);
        return false;
    }
};

// ============================================
// FUNÇÃO PARA FECHAR POOL
// ============================================
export const closePool = async (): Promise<void> => {
    await pool.end();
    console.log("🔌 Pool de conexões fechado");
};

// ============================================
// EXPORTAR TUDO (APENAS 1 DEFAULT)
// ============================================
export default {
    pool,
    query,
    transaction,
    testConnection,
    closePool,
};