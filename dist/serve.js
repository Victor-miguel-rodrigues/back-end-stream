"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const routing_1 = __importDefault(require("./routing/routing"));
const adminRoutes_1 = __importDefault(require("./routing/adminRoutes"));
const app = (0, express_1.default)();
// ============================================
// 🔴 Vercel roda atrás de proxy
// ============================================
app.set('trust proxy', 1);
app.use((0, cors_1.default)());
// ============================================
// CORS - aceita qualquer projeto .vercel.app + localhost
// ============================================
/*
app.use(cors({
    origin: (origin, callback) => {
        // ✅ Permite requests sem origin (curl, Postman, apps mobile, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        // ✅ Qualquer subdomínio .vercel.app
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
            return callback(null, true);
        }

        // ✅ Localhost em qualquer porta (dev)
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }

        // ❌ Bloqueia o resto
        console.warn(`[CORS] Origem bloqueada: ${origin}`);
        return callback(new Error('Origem nao permitida pelo CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret'],
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
})); */
// ============================================
// BODY PARSERS
// ============================================
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ============================================
// ROTAS
// ============================================
app.use(routing_1.default);
app.use(adminRoutes_1.default);
// ============================================
// 404 JSON
// ============================================
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: `Rota nao encontrada: ${req.method} ${req.originalUrl}`
    });
});
// ============================================
// ERROR HANDLER GLOBAL
// ============================================
app.use((err, _req, res, _next) => {
    // 🔴 Se for erro de CORS, retorna 403 em vez de 500
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({
            status: false,
            message: 'Origem bloqueada pelo CORS'
        });
    }
    console.error('[ERRO GLOBAL]', err);
    return res.status(err.status || 500).json({
        status: false,
        message: err.message || 'Erro interno do servidor'
    });
});
exports.default = app;
//# sourceMappingURL=serve.js.map