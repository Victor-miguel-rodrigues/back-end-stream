import express from "express";
import "dotenv/config";
import { corsMiddleware, corsLogger } from "./middlewares/cors";
import router from "./routing/routing";

const app = express();

// ============================================
// CORS - DEVE VIR ANTES DE QUALQUER ROTA
// ============================================
app.use(corsLogger);
app.use(corsMiddleware);

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
// TRATAMENTO DE ERRO 404
// ============================================
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: "Rota nao encontrada",
        path: req.url
    });
});

export default app;