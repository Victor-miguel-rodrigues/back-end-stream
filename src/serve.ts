import express from "express";
import cors from "cors";
import "dotenv/config";
import router from "./routing/routing";
import adminRoutes from "./routing/adminRoutes";

const app = express();

// ============================================
// CORS - configuração completa
// ============================================
app.use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret'],
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Responde preflight OPTIONS
app.options('*', cors());

// ============================================
// BODY PARSERS
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROTAS PRINCIPAIS
// ============================================
app.use(router);

// ============================================
// ROTAS ADMIN
// ============================================
app.use(adminRoutes);

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
app.use((
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
) => {
    console.error('[ERRO GLOBAL]', err);
    res.status(err.status || 500).json({
        status: false,
        message: err.message || 'Erro interno do servidor'
    });
});

export default app;