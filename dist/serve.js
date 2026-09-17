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
// CORS - configuração completa
// ============================================
app.use((0, cors_1.default)({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret'],
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));
// Responde preflight OPTIONS
app.options('*', (0, cors_1.default)());
// ============================================
// BODY PARSERS
// ============================================
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ============================================
// ROTAS PRINCIPAIS
// ============================================
app.use(routing_1.default);
// ============================================
// ROTAS ADMIN
// ============================================
app.use(adminRoutes_1.default);
// ============================================
// 🆕 404 - Rota não encontrada (JSON)
// ============================================
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: `Rota nao encontrada: ${req.method} ${req.originalUrl}`
    });
});
// ============================================
// 🆕 ERROR HANDLER GLOBAL (JSON)
// Os parâmetros _req e _next são obrigatórios para o Express
// reconhecer como error handler, mesmo não sendo usados.
// ============================================
app.use((err, _req, res, _next) => {
    console.error('[ERRO GLOBAL]', err);
    res.status(err.status || 500).json({
        status: false,
        message: err.message || 'Erro interno do servidor'
    });
});
exports.default = app;
//# sourceMappingURL=serve.js.map