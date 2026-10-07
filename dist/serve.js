"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
require("dotenv/config");
const routing_1 = __importDefault(require("./routing/routing"));
const adminRoutes_1 = __importDefault(require("./routing/adminRoutes"));
const cors_1 = require("./middlewares/cors");
const rateLimit_1 = require("./middlewares/rateLimit");
const app = (0, express_1.default)();
// Vercel roda atras de proxy
app.set('trust proxy', 1);
// Seguranca de headers
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false }));
// CORS
app.use(cors_1.corsMiddleware);
// Rate limit global
app.use(rateLimit_1.apiLimiter);
// Body parsers
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
// Rotas
app.use(routing_1.default);
app.use(adminRoutes_1.default);
// 404
app.use((_req, res) => {
    res.status(404).json({
        status: false,
        message: 'Rota nao encontrada'
    });
});
// Error handler global
app.use((err, _req, res, _next) => {
    if (err.message?.includes('CORS')) {
        return res.status(403).json({ status: false, message: 'Origem bloqueada pelo CORS' });
    }
    console.error('[ERRO GLOBAL]', err?.message ?? err);
    const status = err.status ?? err.statusCode ?? 500;
    const message = process.env.NODE_ENV === 'production'
        ? (status < 500 ? err.message : 'Erro interno do servidor')
        : (err.message ?? 'Erro interno do servidor');
    return res.status(status).json({ status: false, message });
});
exports.default = app;
//# sourceMappingURL=serve.js.map