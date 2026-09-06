"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.testConnection = exports.transaction = exports.query = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ============================================
// CONEXÃO COM SUPABASE (USANDO DATABASE_URL)
// ============================================
const pool = new pg_1.Pool({
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
pool.on("error", (err) => {
    console.error(" Erro no PostgreSQL:", err.message);
});
// ============================================
// FUNÇÃO PARA EXECUTAR QUERIES
// ============================================
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === "development") {
            console.log(" Query:", {
                text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
                duration: `${duration}ms`,
                rows: res.rowCount,
            });
        }
        return res;
    }
    catch (error) {
        console.error(" Erro na query:", error);
        throw error;
    }
};
exports.query = query;
// ============================================
// FUNÇÃO PARA TRANSAÇÕES
// ============================================
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
};
exports.transaction = transaction;
// ============================================
// FUNÇÃO PARA TESTAR CONEXÃO
// ============================================
const testConnection = async () => {
    try {
        const result = await pool.query("SELECT NOW()");
        console.log(" Conexão testada com sucesso:", result.rows[0].now);
        return true;
    }
    catch (error) {
        console.error(" Falha ao testar conexão:", error);
        return false;
    }
};
exports.testConnection = testConnection;
// ============================================
// FUNÇÃO PARA FECHAR POOL
// ============================================
const closePool = async () => {
    await pool.end();
    console.log("🔌 Pool de conexões fechado");
};
exports.closePool = closePool;
// ============================================
// EXPORTAR TUDO (APENAS 1 DEFAULT)
// ============================================
exports.default = {
    pool,
    query: exports.query,
    transaction: exports.transaction,
    testConnection: exports.testConnection,
    closePool: exports.closePool,
};
//# sourceMappingURL=connection.js.map