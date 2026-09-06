"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const cors_1 = require("./middlewares/cors");
const routing_1 = __importDefault(require("./routing/routing"));
const connection_1 = require("./database/connection");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// ============================================
// CORS - DEVE VIR ANTES DE QUALQUER ROTA
// ============================================
app.use(cors_1.corsLogger);
app.use(cors_1.corsMiddleware);
// ============================================
// PARSERS
// ============================================
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ============================================
// ROTAS
// ============================================
app.use(routing_1.default);
// ============================================
// HEALTH CHECK (público)
// ============================================
app.get("/health", (_req, res) => {
    res.json({
        status: "online",
        timestamp: new Date().toISOString(),
        versao: "1.0.0",
        ambiente: process.env.NODE_ENV || "development"
    });
});
// ============================================
// ROTA DE TESTE PARA VERIFICAR PARSER JSON
// ============================================
app.post("/teste", (req, res) => {
    console.log("📦 Body recebido:", req.body);
    res.json({
        status: "ok",
        body: req.body,
        content_type: req.headers['content-type'],
        body_keys: Object.keys(req.body)
    });
});
// ============================================
// TRATAMENTO DE ERRO 404
// ============================================
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: "Rota não encontrada",
        path: req.url
    });
});
// ============================================
// TRATAMENTO DE ERROS GLOBAIS - CORRIGIDO
// ============================================
app.use((err, _req, res, _next) => {
    console.error("❌ Erro global:", err);
    res.status(500).json({
        status: false,
        message: "Erro interno do servidor",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// ============================================
// INICIAR SERVIDOR
// ============================================
const server = app.listen(PORT, async () => {
    console.log("========================================");
    console.log("🚀 SERVIDOR INICIADO");
    console.log("========================================");
    console.log(`📡 Porta: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔧 Ambiente: ${process.env.NODE_ENV || "development"}`);
    console.log("========================================");
    await (0, connection_1.testConnection)();
    console.log("========================================");
});
// ============================================
// TRATAMENTO DE ENCERRAMENTO
// ============================================
const gracefulShutdown = () => {
    console.log("\n🛑 Recebido sinal de encerramento");
    server.close(async () => {
        console.log("🔌 Fechando conexões...");
        await (0, connection_1.closePool)();
        console.log("✅ Conexões fechadas");
        process.exit(0);
    });
};
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
// ============================================
// TRATAMENTO DE ERROS NÃO CAPTURADOS
// ============================================
process.on("uncaughtException", (error) => {
    console.error("❌ Erro não capturado:", error);
});
process.on("unhandledRejection", (reason) => {
    console.error("❌ Promessa rejeitada sem tratamento:", reason);
});
exports.default = app;
//# sourceMappingURL=serve.js.map