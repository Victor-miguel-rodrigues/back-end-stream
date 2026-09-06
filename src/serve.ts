import express from "express";
import "dotenv/config";
import { corsMiddleware, corsLogger } from "./middlewares/cors";
import router from "./routing/routing";
import { testConnection, closePool } from "./database/connection";

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CORS - DEVE VIR ANTES DE QUALQUER ROTA
// ============================================
app.use(corsLogger);
app.use(corsMiddleware);

// ============================================
// PARSERS
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// ROTAS
// ============================================
app.use(router);

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
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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

    await testConnection();
    console.log("========================================");
});

// ============================================
// TRATAMENTO DE ENCERRAMENTO
// ============================================
const gracefulShutdown = () => {
    console.log("\n🛑 Recebido sinal de encerramento");
    server.close(async () => {
        console.log("🔌 Fechando conexões...");
        await closePool();
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

export default app;