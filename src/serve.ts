import express from 'express';
import helmet from 'helmet';
import 'dotenv/config';
import router from './routing/routing';
import adminRoutes from './routing/adminRoutes';
import { corsMiddleware } from './middlewares/cors';
import { apiLimiter } from './middlewares/rateLimit';

const app = express();

// Vercel roda atras de proxy
app.set('trust proxy', 1);

// Seguranca de headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS
app.use(corsMiddleware);

// Rate limit global
app.use(apiLimiter);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rotas
app.use(router);
app.use(adminRoutes);

// 404
app.use((_req, res) => {
    res.status(404).json({
        status: false,
        message: 'Rota nao encontrada'
    });
});

// Error handler global
app.use((
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
) => {
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

export default app;