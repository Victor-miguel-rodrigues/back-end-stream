// src/middlewares/cors.ts
import cors, { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://meu-front-rose.vercel.app', // ✅ SEU FRONTEND
        'https://back-end-stream.vercel.app',
        // 🔴 ADICIONE TAMBÉM COM A BARRA NO FINAL SE NECESSÁRIO
        'https://meu-front-rose.vercel.app/',
    ];

console.log('Origens CORS permitidas:', allowedOrigins);

export const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) {
            return callback(null, true);
        }

        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed === origin) return true;
            if (allowed.includes('*')) {
                const pattern = allowed.replace('*', '.*');
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(origin);
            }
            return false;
        });

        if (process.env.NODE_ENV === 'development' || isAllowed) {
            return callback(null, true);
        }

        console.warn('CORS bloqueado para origem:', origin);
        callback(new Error('Origem nao permitida por CORS: ' + origin));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
};

export const corsMiddleware = cors(corsOptions);

// ADICIONOU _ antes de res (não usado)
export const corsLogger = (req: Request, _res: Response, next: NextFunction): void => {
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

    console.log(`CORS ${req.method} ${req.url} - Origin: ${origin} ${isAllowed ? 'OK' : 'BLOQUEADO'}`);
    next();
};

export default {
    corsOptions,
    corsMiddleware,
    corsLogger
};