// src/middlewares/cors.ts
import cors, { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// LISTA DE ORIGENS PERMITIDAS
// ============================================
// Pega do .env ou usa lista padrão
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [
        // Desenvolvimento local
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        // Produção - Vercel (frontend)
        'meu-front-rose.vercel.app', // ⚠️ SUBSTITUA PELO SEU FRONTEND
        // Produção - Vercel (backend - ela mesma)
        'https://back-end-stream.vercel.app',
    ];

console.log('📋 Origens CORS permitidas:', allowedOrigins);

export const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Permitir requisições sem origin (ex: Postman, mobile apps)
        if (!origin) {
            return callback(null, true);
        }

        // Verificar se a origem é permitida
        const isAllowed = allowedOrigins.some(allowed => {
            // Verificar se é exatamente igual
            if (allowed === origin) return true;
            
            // Verificar se é subdomínio (ex: *.vercel.app)
            if (allowed.includes('*')) {
                const pattern = allowed.replace('*', '.*');
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(origin);
            }
            
            return false;
        });

        // Em desenvolvimento, permitir qualquer origem
        if (process.env.NODE_ENV === 'development' || isAllowed) {
            return callback(null, true);
        }

        console.warn(`❌ CORS bloqueado para origem: ${origin}`);
        console.warn(`📋 Origens permitidas: ${allowedOrigins.join(', ')}`);
        
        callback(new Error(`Origem não permitida por CORS: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
};

// Middleware de CORS
export const corsMiddleware = cors(corsOptions);

// Middleware para log de CORS
export const corsLogger = (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin || 'Sem origem';
    const isAllowed = origin === 'Sem origem' || 
        allowedOrigins.some(allowed => {
            if (allowed === origin) return true;
            if (allowed.includes('*')) {
                const pattern = allowed.replace('*', '.*');
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(origin);
            }
            return false;
        }) || process.env.NODE_ENV === 'development';

    console.log(`🌐 ${req.method} ${req.url} - Origin: ${origin} ${isAllowed ? '✅' : '❌'}`);
    next();
};

export default {
    corsOptions,
    corsMiddleware,
    corsLogger
};