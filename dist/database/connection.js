"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.testConnection = exports.transaction = exports.query = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});
pool.on('error', (err) => {
    console.error('[DB] Erro no pool PostgreSQL:', err.message);
});
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        if (process.env.NODE_ENV === 'development') {
            console.log('[DB] Query:', {
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${Date.now() - start}ms`,
                rows: res.rowCount
            });
        }
        return res;
    }
    catch (error) {
        console.error('[DB] Erro na query:', error);
        throw error;
    }
};
exports.query = query;
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.transaction = transaction;
const testConnection = async () => {
    try {
        await pool.query('SELECT NOW()');
        return true;
    }
    catch (error) {
        console.error('[DB] Falha ao testar conexao:', error);
        return false;
    }
};
exports.testConnection = testConnection;
const closePool = async () => {
    await pool.end();
};
exports.closePool = closePool;
exports.default = { pool, query: exports.query, transaction: exports.transaction, testConnection: exports.testConnection, closePool: exports.closePool };
//# sourceMappingURL=connection.js.map