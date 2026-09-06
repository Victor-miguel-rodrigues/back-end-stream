import express from "express";
import "dotenv/config";
import { corsMiddleware, corsLogger } from "./middlewares/cors";
import router from "./routing/routing";

const app = express();

// ============================================
// CORS - DEVE VIR ANTES DE QUALQUER ROTA
// ============================================
app.use(corsLogger);  // Log das requisições CORS
app.use(corsMiddleware); // Middleware CORS configurado

// ============================================
// PARSERS
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROTAS
// ============================================
app.use(router);

// ============================================
// HEALTH CHECK (público)
// ============================================
app.get("/health", (req, res) => {
    res.json({
        status: "online",
        timestamp: new Date().toISOString(),
        versao: "1.0.0",
        ambiente: process.env.NODE_ENV || "development"
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

export default app;