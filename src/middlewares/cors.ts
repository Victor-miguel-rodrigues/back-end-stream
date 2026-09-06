import cors, { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

// ✅ ADICIONE A URL DO SEU FRONTEND AQUI
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

// 🔴 DEBUG: Verificar no console
console.log('🔍 CORS - Origens permitidas:', allowedOrigins);
console.log('🔍 CORS - Ambiente:', process.env.NODE_ENV);

export const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // 🔴 DEBUG: Mostrar a origem recebida
        console.log('🔍 CORS - Origem recebida:', origin);

        if (!origin) {
            return callback(null, true);
        }

        // 🔴 VERIFICAR SE A ORIGEM ESTÁ NA LISTA (IGNORANDO BARRA FINAL)
        const cleanOrigin = origin.replace(/\/$/, ''); // Remove barra final
        const isAllowed = allowedOrigins.some(allowed => {
            const cleanAllowed = allowed.replace(/\/$/, '');
            return cleanAllowed === cleanOrigin;
        });

        if (process.env.NODE_ENV === 'development' || isAllowed) {
            console.log('🔍 CORS - ✅ Permitido:', origin);
            return callback(null, true);
        }

        console.log('🔍 CORS - ❌ Bloqueado:', origin);
        console.log('🔍 CORS - Lista de permitidas:', allowedOrigins);
        
        callback(new Error('Origem nao permitida por CORS: ' + origin));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
};

export const corsMiddleware = cors(corsOptions);

export const corsLogger = (req: Request, _res: Response, next: NextFunction): void => {
    const origin = req.headers.origin || 'Sem origem';
    console.log(`🌐 CORS ${req.method} ${req.url} - Origin: ${origin}`);
    next();
};

export default {
    corsOptions,
    corsMiddleware,
    corsLogger
};